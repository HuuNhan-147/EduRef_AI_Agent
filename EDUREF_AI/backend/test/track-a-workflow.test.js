import '../testSupport/securityTestEnv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { workflowFixture } from '../testSupport/workflowFixture.js';
import { PetitionWorkflowCore } from '../modules/petition-core/PetitionWorkflowCore.js';
import AcademicWorkflowService from '../services/AcademicWorkflowService.js';
import AgentOrchestrator from '../modules/ai-agent/core/AgentOrchestrator.js';
import ToolResolver from '../modules/ai-agent/tools/ToolResolver.js';
import verifyTools from '../modules/ai-agent/tools/actions/verifyTools.js';
import { getStudentFullProfile } from '../config/studentRegistry.js';
import { conversationMemory } from '../modules/ai-agent/memory/ConversationMemory.js';

const input = { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé tháng xe buýt',
  phone: '0901234568', pickupCampus: 'Sai Gon Campus' };
function setup(t) {
  const fixture = workflowFixture();
  t.after(() => fixture.mocks.restoreAll());
  fixture.mocks.stub(console, 'log', () => {});
  return { ...fixture, core: new PetitionWorkflowCore() };
}
const submit = (core, data = input) => core.processPetitionWorkflow({ studentCode: '2380600001', requestTypeCode: 'STUDENT_CONFIRMATION', inputData: data, forceNewRequest: true });

test('a new form cannot rewrite a request already transferred to staff', async (t) => {
  const s = setup(t);
  const old = s.add({ status: 'ESCALATED', inputData: { ...input, formCode: 'MILITARY_DEFERMENT' }, contextCapsule: { reason: 'Cần cán bộ xác minh' } });
  const result = await s.core.processPetitionWorkflow({ studentCode: '2380600001', requestTypeCode: 'STUDENT_CONFIRMATION', inputData: input });
  assert.notEqual(result.requestId, old.id);
  assert.equal(s.state.records.find((r) => r.id === old.id).status, 'ESCALATED');
  assert.equal(result.status, 'APPROVED');
});

test('resume reloads quota and excludes the current request under the decision lock', async (t) => {
  const s = setup(t);
  const waiting = s.add({ status: 'WAITING_STUDENT', inputData: { ...input, historyRequests: [], existingApprovedCount: 0 } });
  s.add({ status: 'APPROVED', inputData: input });
  const result = await s.core.resumePetitionWorkflow({ requestId: waiting.id, additionalData: { existingApprovedCount: 0 } });
  assert.equal(result.decision, 'ASK_CLARIFICATION');
  assert.match(result.actionableQuestion, /lý do/);
  assert.ok(s.state.locks > 0);
});

test('staged create/ask/escalate tools preserve a transferred request and its context', async (t) => {
  const s = setup(t);
  const capsule = { reason: 'Cần cán bộ xác minh', actionableQuestion: 'Có chấp thuận ngoại lệ không?' };
  const old = s.add({ status: 'ESCALATED', inputData: input, contextCapsule: capsule });
  const created = await AcademicWorkflowService.createRequest({ studentCode: '2380600001', requestTypeCode: 'STUDENT_CONFIRMATION', inputData: input });
  assert.equal(created.success, true);
  assert.notEqual(created.requestId, old.id);
  const asked = await AcademicWorkflowService.askStudent({ requestId: old.id, question: 'Hỏi lại?' });
  assert.equal(asked.success, false);
  const escalated = await AcademicWorkflowService.escalateRequest({ requestId: old.id, reason: 'Ghi đè', actionableQuestion: 'Khác?' });
  assert.equal(escalated.success, true);
  const stored = s.state.records.find((r) => r.id === old.id);
  assert.equal(stored.status, 'ESCALATED');
  assert.deepEqual(stored.contextCapsule, capsule);
  assert.equal(s.state.audits.filter((a) => a.requestId === old.id).length, 0);
});

test('staged creation rolls back its request if audit persistence fails', async (t) => {
  const s = setup(t);
  const prisma = (await import('../config/prisma.js')).default;
  s.mocks.stub(prisma.auditLog, 'create', async () => { throw new Error('Audit unavailable'); });
  const result = await AcademicWorkflowService.createRequest({ studentCode: '2380600001', requestTypeCode: 'STUDENT_CONFIRMATION', inputData: input });
  assert.equal(result.success, false);
  assert.equal(s.state.records.length, 0);
});

test('concurrent routine submissions cannot both consume the same quota', async (t) => {
  const s = setup(t);
  const results = await Promise.all([submit(s.core), submit(s.core, { ...input, existingApprovedCount: 0 })]);
  assert.deepEqual(results.map((r) => r.decision), ['AUTO_APPROVED', 'ASK_CLARIFICATION']);
  assert.equal(s.state.records.filter((r) => r.status === 'APPROVED').length, 1);
});

test('the small process_request tool uses the same COURSE_DEBT requirements as the core', async (t) => {
  const s = setup(t);
  const request = s.add({ inputData: { ...input, formCode: 'COURSE_DEBT', purpose: 'Xác nhận sinh viên nợ môn' } });
  const result = await AcademicWorkflowService.processRequest(request.id);
  assert.equal(result.decision, 'ASK_CLARIFICATION');
  assert.ok(result.missing.some((field) => field.code === 'REQ_DEBT_COURSES'));
});

test('loan metadata asks for named facts and accepts an explicit zero on resume', async (t) => {
  const s = setup(t);
  const asked = await submit(s.core, { ...input, formCode: 'BANK_LOAN', purpose: 'Vay vốn ngân hàng chính sách' });
  assert.equal(asked.decision, 'ASK_CLARIFICATION');
  assert.match(asked.question, /số lần đã được vay vốn/i);
  assert.ok(asked.missing.some((field) => field.code === 'REQ_LOANGRANTEDCOUNT'));
  const result = await s.core.resumePetitionWorkflow({ requestId: asked.requestId,
    additionalData: { orphanStatus: 'Không', loanFormCount: 0, loanGrantedCount: 0, lastLoanAmount: 0 } });
  assert.equal(result.decision, 'AUTO_APPROVED');
  assert.equal(s.state.records[0].inputData.loanGrantedCount, 0);
});

test('a committed decision on step five is retained instead of inventing an escalation', async (t) => {
  const s = setup(t);
  const agent = new AgentOrchestrator(null, 'cap-compliance');
  let calls = 0;
  agent.geminiClient.streamGenerateContent = async () => ({ parts: [{ functionCall: {
    name: ++calls === 5 ? 'process_student_confirmation' : 'get_student_profile', args: input,
  } }] });
  s.mocks.stub(ToolResolver, 'resolve', async (name) => name === 'process_student_confirmation' ? submit(s.core) : { found: true });
  const result = await agent.run({ message: 'Xin giấy xác nhận làm vé xe buýt', currentUser: { role: 'STUDENT', studentCode: '2380600001' } });
  assert.equal(result.decision, 'AUTO_APPROVED');
  assert.ok(result.toolResult.requestId);
  assert.equal(s.state.records[0].status, 'APPROVED');
  assert.equal(result.executionEvidence.length, 5);
});

test('the step limit with no request honestly reports that no transfer was persisted', async (t) => {
  const s = setup(t);
  const agent = new AgentOrchestrator(null, 'no-request-cap');
  agent.geminiClient.streamGenerateContent = async () => ({ parts: [{ functionCall: { name: 'get_student_profile', args: {} } }] });
  s.mocks.stub(ToolResolver, 'resolve', async () => ({ found: true }));
  const result = await agent.run({ message: 'Tra cứu', currentUser: { role: 'STUDENT', studentCode: '2380600001' } });
  assert.equal(result.decision, 'NEEDS_HUMAN_REVIEW');
  assert.equal(result.toolResult.status, 'NOT_SUBMITTED');
  assert.equal(s.state.records.length, 0);
});

test('a petition name or LLM boolean cannot confirm an address; consent is bound to the pending address', async (t) => {
  const s = setup(t);
  for (const [message, pending, address, expected] of [
    ['Em xin giấy xác nhận tạm hoãn NVQS', null, 'Địa chỉ A', false],
    ['Xác nhận đúng', { address: 'Địa chỉ A' }, 'Địa chỉ A', true],
    ['Xác nhận đúng', { address: 'Địa chỉ A' }, 'Địa chỉ B', false],
    ['Không xác nhận đúng', { address: 'Địa chỉ A' }, 'Địa chỉ A', false],
  ]) {
    const session = `consent-${message}-${address}`;
    conversationMemory.setSessionMeta(session, 'pendingAddress', pending);
    const agent = new AgentOrchestrator(null, session);
    let calls = 0; let captured;
    agent.geminiClient.streamGenerateContent = async () => ++calls === 1
      ? { parts: [{ functionCall: { name: 'process_student_confirmation', args: { ...input, formCode: 'MILITARY_DEFERMENT', permanentAddress: address, isAddressConfirmed: true } } }] }
      : { text: 'Cần kiểm tra' };
    s.mocks.stub(ToolResolver, 'resolve', async (_name, args) => { captured = args; return { decision: 'ASK_CLARIFICATION', status: 'WAITING_STUDENT', message: 'Cần kiểm tra' }; });
    await agent.run({ message, currentUser: { role: 'STUDENT', studentCode: '2380600001' } });
    assert.equal(captured.isAddressConfirmed, expected, message + address);
    conversationMemory.clearSession(session);
  }
});

test('unknown profiles do not acquire fabricated identity or credit fields', () => {
  const profile = getStudentFullProfile('2399999999', { fullName: 'Sinh viên mới' });
  for (const field of ['birthDate', 'idCard', 'studentClass', 'enrolledCredits', 'permanentAddress']) assert.equal(profile[field], null, field);
});

test('both Verify suites are repeatable, persisted, classified, audited and excluded from ordinary quota', async (t) => {
  const s = setup(t);
  const general = await verifyTools.run_general_verify();
  assert.equal(general.totalCases, 4);
  assert.equal(general.allPassed, true, JSON.stringify(general.results));
  const track = await verifyTools.run_verify_90s();
  assert.equal(track.totalCases, 4);
  assert.equal(track.allPassed, true, JSON.stringify(track.results));
  assert.equal(track.autoCount, 1); assert.equal(track.escalationCount, 1);
  for (const row of [...general.results, ...track.results]) {
    assert.ok(row.classificationMatched); assert.ok(row.persistenceMatched); assert.ok(row.sha256Proof);
    assert.ok(row.startedAt); assert.ok(row.completedAt);
  }
  const actual = await submit(s.core);
  assert.equal(actual.decision, 'AUTO_APPROVED', 'synthetic runs cannot consume the normal quota');
});

test('Verify fails wrong classifications even when the escalation decision matches', async (t) => {
  const s = setup(t);
  const { petitionWorkflowCore } = await import('../modules/petition-core/PetitionWorkflowCore.js');
  const original = petitionWorkflowCore.processPetitionWorkflow.bind(petitionWorkflowCore);
  s.mocks.stub(petitionWorkflowCore, 'processPetitionWorkflow', async (args) => {
    const result = await original(args);
    return result.status === 'ESCALATED' ? { ...result, classification: 'WRONG_CLASSIFICATION' } : result;
  });
  const result = await verifyTools.run_verify_90s();
  assert.equal(result.allPassed, false);
  assert.equal(result.passedCases, 3);
});
