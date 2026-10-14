import { createRequire } from 'node:module';
import { createTraceTracker } from '../../EDUREF_AI/frontend/src/lib/agentTrace.js';

const require = createRequire(new URL('../../EDUREF_AI/frontend/package.json', import.meta.url));
const { io } = require('socket.io-client');
const base = 'http://127.0.0.1:5000';
const login = await fetch(base + '/api/auth/demo-login', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4173' },
  body: JSON.stringify({ accountKey: 'STUDENT_ACTIVE' }), signal: AbortSignal.timeout(5000),
});
const session = await login.json();
if (!login.ok || !session.token) throw new Error('Demo login unavailable; token not displayed.');
const sessionId = 'ui_trace_check_' + Date.now();
let snapshot;
const tracker = createTraceTracker((value) => { snapshot = value['live-check']; });
const socket = io(base, {
  auth: { token: session.token }, transports: ['websocket'], reconnection: false,
  extraHeaders: { Origin: 'http://127.0.0.1:4173' },
});

try {
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.emit('client_stop_generation', { sessionId });
      reject(new Error('Live trace check timed out; stop requested.'));
    }, 30000);
    const fail = (code) => { clearTimeout(timeout); reject(new Error(code)); };
    socket.on('connect_error', () => fail('Socket connection failed.'));
    socket.on('agent_terminal_log', tracker.log);
    socket.on('agent_error', (data) => { if (data.sessionId === sessionId) fail('Agent returned an error; raw details not displayed.'); });
    socket.on('agent_response_end', (data) => {
      if (data.sessionId !== sessionId) return;
      tracker.end(data);
      clearTimeout(timeout);
      resolve({ status: snapshot.status, durationMs: snapshot.durationMs, steps: snapshot.steps.map(({ step }) => step), replyReceived: Boolean(data.reply), unexpectedBusinessRequest: Boolean(data.toolResult?.requestId || data.toolResult?.requestCode) });
    });
    socket.on('connect', () => {
      tracker.start('live-check', sessionId);
      socket.emit('client_send_message', {
        message: 'Xin chao. Hay gioi thieu ngan ve EduRef AI. Chi hoi thong tin, khong tao hoac xu ly don.',
        sessionId, token: session.token, studentCode: '2280602154',
        currentUser: { studentCode: '2280602154', role: 'STUDENT', type: 'STUDENT' },
      });
    });
  });
  console.log(JSON.stringify(result));
} finally {
  socket.removeAllListeners();
  socket.disconnect();
}
