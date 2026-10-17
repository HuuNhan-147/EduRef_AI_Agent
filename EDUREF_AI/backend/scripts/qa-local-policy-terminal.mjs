import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { io } from '../../frontend/node_modules/socket.io-client/build/esm/index.js';

// Local HTTP + actual authenticated Socket.IO; never submit a business request.
const base = 'http://127.0.0.1:5000';
async function api(path, token, body) {
  const response = await fetch(`${base}/api${path}`, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(30000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, ...await response.json() };
}
async function login(accountKey) {
  const response = await api('/auth/demo-login', null, { accountKey });
  assert.equal(response.success, true); return response.token;
}
async function connect(token, logs) {
  const socket = io(base, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 10000 });
  socket.on('agent_terminal_log', entry => logs.push(entry));
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  return socket;
}
const overdueToken = await login('STUDENT_OVERDUE_2022');
const otherToken = await login('STUDENT_ACTIVE');
const droppedToken = await login('STUDENT_DROPPED');
const logs = []; const otherLogs = [];
const studentSocket = await connect(overdueToken, logs);
const otherSocket = await connect(otherToken, otherLogs);
let recommended = null;
const report = { checkedAt: new Date().toISOString(), base, passed: false };
try {
  const before = await api('/petitions?limit=200', overdueToken);
  const prepared = await api('/drafts', overdueToken, { formCode: 'MILITARY_DEFERMENT' });
  assert.equal(prepared.status, 200, prepared.message);
  const denied = prepared.data;
  assert.equal(denied.state, 'REJECTED'); assert.equal(denied.addressConsentRequired, false);
  assert.deepEqual(denied.missingFields, []); assert.deepEqual(denied.actions, ['START_RECOMMENDED']);
  assert.equal(denied.targetForm, 'COURSE_DEBT'); assert.ok(denied.resolution.closedAt);
  const restored = (await api('/drafts/active', overdueToken)).data;
  assert.deepEqual(restored.resolution, denied.resolution); assert.equal(restored.revision, denied.revision);
  for (const name of ['SUBMIT', 'UPDATE']) {
    const blocked = await api(`/drafts/${denied.id}/actions`, overdueToken, { action: name, revision: denied.revision,
      inputData: { purpose: 'Cố tiếp tục công việc đã bị từ chối' }, acknowledgeAddress: true });
    assert.equal(blocked.status, 409); assert.match(blocked.message, /đã kết thúc/);
  }
  const reply = await api('/agent/chat', overdueToken, { sessionId: `qa_closed_${Date.now()}`, message: 'Có' });
  assert.equal(reply.success, true); assert.equal(reply.data.decision, 'REJECTED_POLICY');
  assert.equal(reply.data.toolResult.draft.id, denied.id); assert.match(reply.data.reply, /Quy trình này đã kết thúc/);
  assert.equal(reply.data.modelUsed, undefined);
  const next = await api(`/drafts/${denied.id}/actions`, overdueToken, { action: 'START_RECOMMENDED', revision: denied.revision });
  assert.equal(next.status, 200, next.message); recommended = next.data;
  assert.notEqual(recommended.id, denied.id); assert.equal(recommended.formCode, 'COURSE_DEBT');
  assert.notEqual(recommended.state, 'REJECTED'); assert.equal(recommended.addressConsentRequired, false);
  const dropped = await api('/drafts', droppedToken, { formCode: 'GENERAL_CONFIRMATION' });
  assert.equal(dropped.data.state, 'REJECTED'); assert.equal(dropped.data.targetForm, null); assert.deepEqual(dropped.data.actions, []);
  await new Promise(resolve => setTimeout(resolve, 250));
  const completed = logs.find(e => e.step === 'WORKFLOW_CLOSED' && e.details?.draftId === denied.id);
  assert.ok(completed, 'sidebar must emit a final policy decision on the actual student socket');
  const runLogs = logs.filter(e => e.sessionId === completed.sessionId);
  for (const step of ['WORKFLOW_START', 'PROFILE_LOADED', 'DRAFT_SAVED', 'REQUIREMENTS_CHECK', 'POLICY_CHECK', 'DECISION_SAVED', 'WORKFLOW_CLOSED']) {
    assert.ok(runLogs.some(e => e.step === step), `missing real execution step: ${step}`);
  }
  assert.ok(!otherLogs.some(e => e.ownerKey === '2280602154'), 'another student must not receive this workflow trace');
  const history = await api('/agent/terminal-logs?limit=300', overdueToken);
  assert.ok(history.data.some(e => e.id === completed.id), 'HTTP history must recover the socket trace on reload');
  const after = await api('/petitions?limit=200', overdueToken);
  assert.equal(after.data.length, before.data.length, 'denied preparation must not create a submitted business request');
  Object.assign(report, { passed: true, policyDenial: { draftId: denied.id, state: denied.state, rule: denied.policyRule,
    persistedOnReload: true, editsAndSubmissionBlocked: true, yesReplyKeepsClosed: true, modelCallForYes: false },
  recommended: { separateTask: true, state: recommended.state, missingFields: recommended.missingFields.map(f => f.key) },
  dropped: { state: dropped.data.state, noIncorrectAlternative: true },
  terminal: { actualSocketReceived: true, steps: runLogs.map(e => e.step), historyRecoversTrace: true, isolatedBetweenStudents: true },
  businessRequestsCreated: 0 });
} catch (error) { report.error = error.message; process.exitCode = 1; }
finally {
  if (recommended && ['READY', 'NEEDS_INPUT', 'BLOCKED'].includes(recommended.state)) {
    const cleanup = await api(`/drafts/${recommended.id}/actions`, overdueToken, { action: 'CANCEL', revision: recommended.revision });
    report.recommendedDraftCancelled = cleanup.status === 200;
    if (!report.recommendedDraftCancelled) process.exitCode = 1;
  }
  studentSocket.disconnect(); otherSocket.disconnect();
  await fs.writeFile(new URL('../../qa/automation-audit-2026-10-17/local-policy-terminal.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
