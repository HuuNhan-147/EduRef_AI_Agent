import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { completeAgentMessage, agentDecisionState, matchesAgentResponse } from '../src/config/agentOutcome.js';

function callbacks(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const functions = new Map();
  traverseModule.default(parse(source, { sourceType: 'module', plugins: ['jsx'] }), {
    VariableDeclarator(path) {
      if (path.node.init?.type === 'ArrowFunctionExpression') functions.set(path.node.id.name, source.slice(path.node.init.start, path.node.init.end));
    },
  });
  return functions;
}
const student = callbacks('../src/pages/StudentWorkspacePage.jsx');
const staff = callbacks('../src/pages/StaffEscalationPage.jsx');
test('a prepared draft waits for user confirmation and does not stay in processing or claim approval', () => {
  const state = agentDecisionState({ toolResult: { decision: 'DRAFT_READY', draft: { id: 'd1', state: 'READY', missingFields: [] } } });
  assert.equal(state.status, 'DRAFT'); assert.equal(state.requestId, null);
  assert.equal(state.finalDecision, 'CHỜ XÁC NHẬN NỘP'); assert.equal(state.sha256Proof, null);
});
test('a policy-denied draft reports a final rejection without pending confirmations or missing fields', () => {
  const state = agentDecisionState({ toolResult: { draft: { state: 'REJECTED', resolution: { reason: 'Không đủ điều kiện', nextStep: 'Liên hệ phòng ban' } } } });
  assert.equal(state.status, 'REJECTED'); assert.equal(state.policiesCheck, 'FAILED');
  assert.match(state.finalDecision, /ĐÃ KẾT THÚC/); assert.match(state.reason, /Liên hệ phòng ban/); assert.deepEqual(state.missingFields, []);
});

test('a final reply without a streamed chunk is appended without overwriting the previous answer', () => {
  const before = [{ sender: 'agent', text: 'Câu trả lời cũ' }, { sender: 'user', text: 'Yêu cầu mới' }];
  const result = completeAgentMessage(before, { reply: 'Vui lòng bổ sung mục đích' }, 12);
  assert.equal(result.length, 3); assert.equal(result[0].text, 'Câu trả lời cũ');
  assert.equal(result[2].text, 'Vui lòng bổ sung mục đích');
});

test('actual Socket callback preserves WAITING_STUDENT and opens the supplement contract', () => {
  let messages = [{ sender: 'user', text: 'Xin giấy' }]; let decision;
  const env = vm.createContext({ completeAgentMessage, agentDecisionState, matchesAgentResponse,
    activeRequestRef: { current: { sessionId: 's', clientRequestId: 'r' } },
    timerIntervalRef: { current: null }, startTimeRef: { current: null }, elapsedMs: 0,
    setIsProcessing() {}, setLastModelUsed() {},
    setMessages(update) { messages = update(messages); }, setActiveDecision(value) { decision = value; },
  });
  const complete = vm.runInContext(`(${student.get('handleEnd')})`, env);
  complete({ sessionId: 's', clientRequestId: 'r', reply: 'Bổ sung SĐT', toolResult: {
    status: 'WAITING_STUDENT', decision: 'ASK_CLARIFICATION', requestId: 'waiting-1', missing: [{ code: 'REQ_PHONE' }],
  } });
  assert.equal(decision.status, 'WAITING_STUDENT'); assert.equal(decision.requestId, 'waiting-1');
  assert.equal(messages.at(-1).text, 'Bổ sung SĐT');
});

test('actual HTTP fallback updates the decision and returns out of PROCESSING', async () => {
  let messages = []; let decision; let processing = false;
  const env = vm.createContext({ completeAgentMessage, agentDecisionState, matchesAgentResponse,
    activeRequestRef: { current: null }, httpAbortRef: { current: null }, AbortController,
    crypto: { randomUUID: () => 'http-1' },
    currentAccount: { code: '2380600001', name: 'Benchmark', role: 'STUDENT' },
    inputMessage: '', selectedModel: 'auto', sessionId: 's', elapsedMs: 0,
    startTimeRef: { current: null }, timerIntervalRef: { current: null }, performance: { now: () => 100 },
    setInterval: () => 1, clearInterval() {}, setElapsedMs() {}, setActiveStep() {},
    setInputMessage() {}, setMobileTab() {}, localStorage: { getItem: () => 'synthetic-token' }, socket: { connected: false },
    setIsProcessing(value) { processing = value; },
    setMessages(update) { messages = update(messages); },
    setActiveDecision(update) { decision = typeof update === 'function' ? update(decision || {}) : update; },
    api: { post: async () => ({ data: { success: true, data: { reply: 'Đã thẩm định', toolResult: {
      status: 'APPROVED', decision: 'AUTO_APPROVED', requestId: 'approved-1',
    } } } }) },
  });
  await vm.runInContext(`(${student.get('handleSendMessage')})('Xin giấy vé xe buýt')`, env);
  assert.equal(processing, false); assert.equal(decision.status, 'APPROVED');
  assert.equal(messages.at(-1).toolResult.requestId, 'approved-1');
});

test('late replies from a stopped or different request cannot update the active chat', () => {
  const active = { clientRequestId: 'new', sessionId: 'owner-session' };
  assert.equal(matchesAgentResponse(active, { clientRequestId: 'old', sessionId: 'owner-session' }), false);
  assert.equal(matchesAgentResponse(null, { clientRequestId: 'old' }), false);
  assert.equal(matchesAgentResponse(active, { clientRequestId: 'new', sessionId: 'other-session' }), false);
  assert.equal(matchesAgentResponse(active, { clientRequestId: 'new', sessionId: 'student::owner-session' }), true);
  assert.equal(agentDecisionState({ reply: 'Tư vấn' }).status, 'IDLE', 'a plain answer is not an approval');
});

test('staff detail keeps the latest selected petition when responses arrive in reverse order', async () => {
  let selected; const pending = new Map();
  const env = vm.createContext({ detailSequence: { current: 0 }, setDetailLoading() {},
    setSelectedPetition(value) { selected = value; }, console,
    api: { get: (url) => new Promise((resolve) => pending.set(url, resolve)) } });
  const select = vm.runInContext(`(${staff.get('handleSelectPetition')})`, env);
  const first = select({ id: 'A' }); const second = select({ id: 'B' });
  pending.get('/petitions/B')({ data: { success: true, data: { id: 'B' } } }); await second;
  pending.get('/petitions/A')({ data: { success: true, data: { id: 'A' } } }); await first;
  assert.equal(selected.id, 'B');
});

test('staff business failure leaves the action modal and review note available, with a visible error', async () => {
  let modal = 'APPROVE'; const errors = [];
  const env = vm.createContext({ selectedPetition: { id: 'A' }, actionModal: modal, actionNote: 'Ghi chú cần giữ',
    detailLoading: false, detailSequence: { current: 1 }, setIsSubmitting() {},
    setActionModal(value) { modal = value; }, setActionNote() { throw new Error('Must preserve note on failure'); },
    showToast(message, type) { errors.push({ message, type }); },
    api: { post: async () => ({ data: { success: false, error: 'Hồ sơ đã được người khác xử lý' } }) },
  });
  await vm.runInContext(`(${staff.get('handleExecuteAction')})()`, env);
  assert.equal(modal, 'APPROVE'); assert.match(errors[0].message, /người khác/); assert.equal(errors[0].type, 'error');
});

test('changing a queue filter invalidates an in-flight list before the debounce starts', async () => {
  let petitions = [{ id: 'old' }]; let selected = { id: 'old' }; let resolve;
  const env = vm.createContext({ listSequence: { current: 0 }, detailSequence: { current: 0 },
    page: 1, statusFilter: 'ESCALATED', searchQuery: '', selectedPetition: selected, console,
    setLoading() {}, setHasMore() {}, setDetailLoading() {}, setActionModal() {},
    setPetitions(value) { petitions = value; }, setSelectedPetition(value) { selected = value; },
    handleSelectPetition() { throw new Error('Stale list must not select a petition'); },
    api: { get: () => new Promise((done) => { resolve = done; }) },
  });
  const pending = vm.runInContext(`(${staff.get('fetchEscalations')})()`, env);
  vm.runInContext(`(${staff.get('invalidateQueue')})()`, env);
  resolve({ data: { success: true, data: [{ id: 'stale' }] } }); await pending;
  assert.equal(petitions.length, 0); assert.equal(selected, null);
});

test('an empty queue clears the previous actionable detail', async () => {
  let selected = { id: 'old' };
  const env = vm.createContext({ listSequence: { current: 0 }, detailSequence: { current: 0 },
    page: 1, statusFilter: 'ESCALATED', searchQuery: '', selectedPetition: selected, console,
    setLoading() {}, setHasMore() {}, setDetailLoading() {}, setPetitions() {},
    setSelectedPetition(value) { selected = value; },
    api: { get: async () => ({ data: { success: true, data: [] } }) },
  });
  await vm.runInContext(`(${staff.get('fetchEscalations')})()`, env);
  assert.equal(selected, null);
});
