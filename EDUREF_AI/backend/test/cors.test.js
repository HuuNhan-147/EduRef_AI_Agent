import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createOriginChecker } from '../config/cors.js';

const isAllowedOrigin = createOriginChecker({
  FRONTEND_URL: ' https://portal.example.edu/student/, https://second.example.edu/ ',
});
const domainOrigins = ['https://eduref.tech', 'https://www.eduref.tech'];
let io;
let baseUrl;

before(async () => {
  const app = express();
  const corsOptions = {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.post('/api/auth/demo-login', (_req, res) => res.json({ reachedRoute: true }));
  const server = http.createServer(app);
  io = new Server(server, { cors: corsOptions });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => io.close(resolve));
});

test('custom domains pass demo-login preflight and receive matching credentialed CORS headers', async () => {
  for (const origin of domainOrigins) {
    const response = await fetch(`${baseUrl}/api/auth/demo-login`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.match(response.headers.get('access-control-allow-methods'), /POST/);
    assert.match(response.headers.get('access-control-allow-headers'), /authorization/);

    const login = await fetch(`${baseUrl}/api/auth/demo-login`, { method: 'POST', headers: { Origin: origin } });
    assert.equal(login.headers.get('access-control-allow-origin'), origin);
    assert.deepEqual(await login.json(), { reachedRoute: true });
  }
});

test('Socket.IO polling handshake allows both custom domains', async () => {
  for (const origin of domainOrigins) {
    const response = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: origin },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.match(await response.text(), /^0\{"sid":/);
  }
});

test('untrusted origins receive no CORS permission on REST or Socket.IO', async () => {
  const origin = 'https://www.eduref.tech.attacker.example';
  for (const path of ['/api/auth/demo-login', '/socket.io/?EIO=4&transport=polling']) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    await response.text();
  }
});

test('FRONTEND_URL copied with paths, trailing slashes or multiple values matches browser origins', () => {
  assert.equal(isAllowedOrigin('https://portal.example.edu'), true);
  assert.equal(isAllowedOrigin('https://second.example.edu'), true);
  const singleOrigin = createOriginChecker({ FRONTEND_URL: 'https://custom.example.edu/' });
  assert.equal(singleOrigin('https://custom.example.edu'), true);
  assert.equal(singleOrigin('http://custom.example.edu'), false);
  assert.equal(singleOrigin('https://custom.example.edu:8443'), false);
});

test('local, Vercel and non-browser clients retain access', () => {
  for (const origin of [
    undefined,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'https://edu-ref-ai-agent.vercel.app',
    'https://edu-ref-ai-agent-git-main-hu-nhans-projects.vercel.app',
  ]) assert.equal(isAllowedOrigin(origin), true, String(origin));
});

test('invalid configuration and domain lookalikes do not grant extra origins', () => {
  const check = createOriginChecker({
    FRONTEND_URL: '*, null, invalid, ftp://files.example.edu, https://user:pass@private.example.edu',
  });
  for (const origin of [
    'null',
    'https://unknown.example.edu',
    'https://private.example.edu',
    'https://files.example.edu',
    'https://eduref.tech.attacker.example',
    'http://www.eduref.tech',
    'https://www.eduref.tech:8443',
    'https://edu-ref-ai-agent.vercel.app.attacker.example',
  ]) assert.equal(check(origin), false, origin);
});
