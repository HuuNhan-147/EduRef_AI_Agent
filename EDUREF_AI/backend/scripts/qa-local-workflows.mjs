import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { io } from '../../frontend/node_modules/socket.io-client/build/esm/index.js';
const base = 'http://127.0.0.1:5000';
const rows = [];
const drafts = new Map();
const requests = new Set();
const output = new URL('../../qa/automation-audit-2026-10-17/local-workflows.json', import.meta.url);
const save = async (id, result) => { rows.push({ id, ...result }); console.log(JSON.stringify(rows.at(-1))); await fs.writeFile(output, JSON.stringify(rows, null, 2)); };
async function api(url, token, body) {
  const started = Date.now();
  const res = await fetch(base + '/api' + url, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(120000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, durationMs: Date.now() - started, body: await res.json() };
}
const login = async accountKey => {
  const response = await api('/auth/demo-login', null, { accountKey });
  assert.equal(response.body.success, true); return response.body.token;
};
const student = await login('STUDENT_ACTIVE');
const staff = await login('STAFF_DAOTAO');
const dean = await login('DEAN_DAOTAO');
const action = async (view, name, inputData = {}, extra = {}) => {
  const response = await api(`/drafts/${view.id}/actions`, student, { action: name, revision: view.revision, inputData, ...extra });
  if (response.body.data) {
    drafts.set(view.id, response.body.data);
    if (response.body.data.result?.requestId) requests.add(response.body.data.result.requestId);
  }
  return response;
};
const values = { pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
  purpose: 'Làm vé tháng xe buýt', orphanStatus: 'Không', loanGrantedCount: 0, lastLoanAmount: 0,
  debtCourses: 'Học phần kiểm thử automation', reissueReason: 'Hồ sơ kiểm thử automation local, không dùng cho nghiệp vụ thực tế.' };
try {
  const baseline = (await api('/petitions?limit=200', student)).body.data.length;
  for (const formCode of ['TAX_DEDUCTION', 'BANK_LOAN', 'COURSE_DEBT', 'MILITARY_DEFERMENT', 'GENERAL_CONFIRMATION']) {
    const prepared = await api('/drafts', student, { formCode });
    assert.equal(prepared.status, 200, prepared.body.message);
    let view = prepared.body.data; drafts.set(view.id, view);
    assert.ok(view.data.phone && view.data.permanentAddress);
    assert.equal((await api('/petitions?limit=200', student)).body.data.length, baseline + requests.size, 'prepare must not create a business request');
    await save(`${formCode}-prepare`, { state: view.state, missing: view.missingFields.map(field => field.key), durationMs: prepared.durationMs });
    if (view.state !== 'READY') {
      const inputData = Object.fromEntries(view.missingFields.map(field => {
        if (!(field.key in values)) throw new Error(`Unexpected missing fact: ${field.key}`);
        return [field.key, values[field.key]];
      }));
      const updated = await action(view, 'UPDATE', inputData);
      assert.equal(updated.status, 200, updated.body.message); view = updated.body.data;
    }
    assert.equal(view.state, 'READY', view.notice);
    if (formCode === 'MILITARY_DEFERMENT') {
      assert.equal((await action(view, 'SUBMIT')).status, 400);
    }
    const [first, duplicate] = await Promise.all([action(view, 'SUBMIT', {}, { acknowledgeAddress: view.addressConsentRequired }), action(view, 'SUBMIT', {}, { acknowledgeAddress: view.addressConsentRequired })]);
    assert.equal(first.status, 200, first.body.message); assert.equal(duplicate.status, 200, duplicate.body.message);
    assert.equal(first.body.data.result.requestId, duplicate.body.data.result.requestId);
    assert.equal(first.body.data.result.status, 'APPROVED');
    assert.equal((await api('/drafts/active', student)).body.data.id, view.id);
    await save(`${formCode}-submit`, { status: first.body.data.result.status, sameIdOnRetry: true, requestId: first.body.data.result.requestId, durationMs: first.durationMs });
  }
  let repeat = (await api('/drafts', student, { formCode: 'GENERAL_CONFIRMATION', inputData: values })).body.data;
  drafts.set(repeat.id, repeat); assert.equal(repeat.state, 'READY');
  repeat = (await action(repeat, 'SUBMIT')).body.data;
  assert.equal(repeat.result.status, 'ESCALATED');
  const id = repeat.result.requestId;
  const socket = io(base, { auth: { token: student }, transports: ['websocket'], reconnection: false });
  const events = [];
  socket.on('petition_status_updated', event => events.push(event));
  await new Promise((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); });
  const supplement = await api(`/petitions/${id}/request-supplement`, staff, { fields: ['phone'], reason: 'Đối chiếu số điện thoại trong hồ sơ QA.' });
  assert.equal(supplement.body.success, true);
  let waiting = (await api('/drafts/active', student)).body.data;
  assert.equal(waiting.result.requestId, id); assert.ok(waiting.missingFields.some(field => field.key === 'phone'));
  waiting = (await action(waiting, 'UPDATE', { phone: '0901234568' })).body.data;
  waiting = (await action(waiting, 'SUBMIT')).body.data;
  assert.equal(waiting.result.requestId, id); assert.equal(waiting.result.status, 'ESCALATED', 'human review must survive supplementation');
  assert.equal((await api(`/petitions/${id}/transfer`, staff, {})).body.success, true);
  assert.equal((await api(`/petitions/${id}/approve`, staff, {})).body.success, false);
  assert.equal((await api(`/petitions/${id}/approve`, dean, {})).body.success, true);
  await new Promise(resolve => setTimeout(resolve, 300)); socket.disconnect();
  assert.ok(events.some(event => event.requestId === id && event.status === 'APPROVED'));
  await save('staff-supplement-transfer-approve', { sameRequest: true, retainedHumanReview: true, deanRequired: true, realtimeStatusReceived: true });
  const beforeAI = (await api('/petitions?limit=200', student)).body.data.length;
  const ai = await api('/agent/chat', student, { sessionId: `qa_local_${Date.now()}`, message: 'Tôi muốn xin giấy xác nhận sinh viên để xin visa.', requestedModel: 'auto' });
  assert.equal(ai.body.success, true);
  assert.equal((await api('/petitions?limit=200', student)).body.data.length, beforeAI);
  const result = ai.body.data;
  if (result.toolResult?.draft) drafts.set(result.toolResult.draft.id, result.toolResult.draft);
  await save('real-ai-chat', { decision: result.decision, modelUsed: result.modelUsed, draftReturned: Boolean(result.toolResult?.draft), durationMs: ai.durationMs });
  assert.ok(result.toolResult?.draft, 'execution intent must prepare a draft');
} catch (error) { await save('failure', { message: error.message, stack: error.stack }); process.exitCode = 1; }
finally {
  for (const requestId of requests) {
    const result = await api(`/petitions/${requestId}/rollback`, staff, { reason: 'Kết thúc kiểm thử local automation; thu hồi đúng hồ sơ QA, giữ audit.' });
    assert.equal(result.body.success, true);
  }
  for (const [id] of drafts) {
    const response = await api('/drafts/active', student);
    // Fetch exact revision, including revisions changed by the staff supplement test.
    const current = response.body.data?.id === id ? response.body.data : drafts.get(id);
    const cancelled = await action(current, 'CANCEL');
    if (cancelled.status === 409) await save('cleanup-needs-refresh', { draftId: id });
  }
  await save('cleanup', { requestsRolledBack: requests.size, draftIds: [...drafts.keys()] });
}
