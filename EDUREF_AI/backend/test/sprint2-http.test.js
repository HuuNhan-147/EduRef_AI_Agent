import { TEST_JWT_SECRET } from '../testSupport/securityTestEnv.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import sprint2Routes from '../routes/sprint2Routes.js';
import petitionRoutes from '../routes/petitionRoutes.js';
import { sprint2Fixture, staffUser, deanUser } from '../testSupport/sprint2Fixture.js';

let server; let base;
before(async () => {
  const app = express(); app.use(express.json()); app.use('/api/sprint2', sprint2Routes); app.use('/api/petitions', petitionRoutes);
  server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
const token = (user) => jwt.sign(user, TEST_JWT_SECRET, { expiresIn: '5m' });
async function call(path, user, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(user ? { authorization: `Bearer ${token(user)}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
function setup(t) { const s = sprint2Fixture(); t.after(() => s.mocks.restoreAll()); return s; }

test('Sprint 2 endpoints require a staff session; students cannot read datasets or submit governance feedback', async (t) => {
  setup(t);
  assert.equal((await call('/api/sprint2/overview')).status, 401);
  const student = { id: 'student', role: 'STUDENT', studentCode: '2380600001' };
  assert.equal((await call('/api/sprint2/overview', student)).status, 403);
  assert.equal((await call('/api/sprint2/feedback', student, 'POST', {})).status, 403);
  assert.equal((await call('/api/sprint2/overview', staffUser)).data.data.measurement.measurementStatus, 'PARTIAL');
});
test('staff cannot freeze or activate; missing proposal inputs return a useful 400', async (t) => {
  setup(t);
  assert.equal((await call('/api/sprint2/datasets/any/freeze', staffUser, 'POST', { note: 'Review' })).status, 403);
  assert.equal((await call('/api/sprint2/policies/any/activate', staffUser, 'POST', { reportId: 'any', note: 'Review' })).status, 403);
  const bad = await call('/api/sprint2/policies/propose', staffUser, 'POST', { feedbackIds: [], reason: 'No samples' });
  assert.equal(bad.status, 400); assert.match(bad.data.message, /feedback/);
});
test('untrusted bulk imports and incomplete comparison inputs do not become 500s or measured rates', async (t) => {
  setup(t);
  assert.equal((await call('/api/sprint2/datasets', staffUser, 'POST', [])).status, 400);
  assert.equal((await call('/api/sprint2/datasets', staffUser, 'POST', { cases: [null] })).status, 400);
  assert.equal((await call('/api/sprint2/datasets', staffUser, 'POST', { cases: [{}], sourceSha256: [] })).status, 400);
  assert.equal((await call('/api/sprint2/feedback', staffUser, 'POST', { requestId: {} })).status, 400);
  assert.equal((await call('/api/sprint2/datasets/unknown/compare', staffUser, 'POST', {})).status, 400);
  assert.equal((await call('/api/sprint2/policies/BASELINE/activate', deanUser, 'POST', { note: 'No report' })).status, 400);
});
test('legacy metrics exclude Verify data and keep unmeasured rates null rather than deriving them from counts', async (t) => {
  const s = setup(t); const queries = [];
  s.mocks.stub(prisma.studentRequest, 'count', async (args) => { queries.push(args); return 4; });
  s.mocks.stub(prisma.auditLog, 'aggregate', async () => ({ _avg: { decisionTimeMs: 10 } }));
  const response = await call('/api/petitions/stats/metrics', staffUser);
  assert.equal(response.status, 200); assert.equal(response.data.data.metrics.measurementStatus, 'PARTIAL');
  assert.equal(response.data.data.metrics.missedEscalationRate, null); assert.equal(response.data.data.metrics.falseEscalationRate, null);
  assert.equal(response.data.data.metrics.routineAutomationRate, null);
  assert.ok(queries.every((q) => q.where.verificationRunId === null));
});
