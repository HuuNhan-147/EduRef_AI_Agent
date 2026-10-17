import '../testSupport/securityTestEnv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { workflowFixture } from '../testSupport/workflowFixture.js';
import Drafts from '../services/PetitionDraftService.js';
import ToolResolver from '../modules/ai-agent/tools/ToolResolver.js';
import { agentTerminalLogger } from '../modules/ai-agent/core/AgentTerminalLogger.js';
import { AgentOrchestrator } from '../modules/ai-agent/core/AgentOrchestrator.js';

function setup(t) {
  const fixture = workflowFixture();
  const drafts = [];
  fixture.mocks.stub(prisma.petitionDraft, 'findUnique', async ({ where }) => structuredClone(drafts.find(d => where.id ? d.id === where.id : d.submittedRequestId === where.submittedRequestId) || null));
  fixture.mocks.stub(prisma.petitionDraft, 'findFirst', async ({ where }) => structuredClone(drafts.find(d => d.studentCode === where.studentCode && d.formCode === where.formCode && where.state.in.includes(d.state)) || null));
  fixture.mocks.stub(prisma.petitionDraft, 'findMany', async ({ where }) => structuredClone(drafts.filter(d => d.studentCode === where.studentCode && d.state !== 'CANCELLED').slice(-1)));
  fixture.mocks.stub(prisma.petitionDraft, 'create', async ({ data }) => { const draft = { id: `draft-${drafts.length + 1}`, revision: 1, ...data }; drafts.push(draft); return structuredClone(draft); });
  fixture.mocks.stub(prisma.petitionDraft, 'update', async ({ where, data }) => {
    const draft = drafts.find(d => d.id === where.id); const next = { ...data };
    if (next.revision?.increment) next.revision = draft.revision + next.revision.increment;
    Object.assign(draft, next); return structuredClone(draft);
  });
  fixture.mocks.stub(prisma.studentRequest, 'count', async () => 0);
  fixture.mocks.stub(console, 'log', () => {});
  t.after(() => fixture.mocks.restoreAll());
  return { ...fixture, drafts };
}
const input = { studentCode: '2380600001', formCode: 'GENERAL_CONFIRMATION',
  inputData: { purpose: 'Làm vé tháng xe buýt', pickupCampus: 'Sai Gon Campus' } };

test('preparation reuses backend personal data, locks school identity and creates no business request', async t => {
  const s = setup(t);
  const view = await Drafts.prepare({ ...input, inputData: { ...input.inputData, studentCode: 'OTHER', fullName: 'Forged', existingApprovedCount: 0 } });
  assert.equal(view.state, 'READY'); assert.equal(view.data.phone, '0901234568');
  assert.equal(view.data.fullName, 'Sinh viên benchmark'); assert.equal(view.data.studentCode, input.studentCode);
  assert.equal('existingApprovedCount' in view.data, false); assert.equal(s.state.records.length, 0);
  assert.equal((await Drafts.prepare(input)).id, view.id);
});
test('final confirmation is revision-bound, single-use and repeat submission is idempotent', async t => {
  const s = setup(t); const view = await Drafts.prepare(input);
  await assert.rejects(Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: 0, action: 'SUBMIT' }), e => e.status === 409);
  const submitted = await Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'SUBMIT' });
  assert.equal(submitted.result.status, 'APPROVED'); assert.equal(s.state.records.length, 1);
  const retry = await Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'SUBMIT' });
  assert.equal(retry.result.requestId, submitted.result.requestId); assert.equal(s.state.records.length, 1);
  assert.ok(s.state.audits.some(row => row.action === 'DRAFT_CONFIRMED_AND_SUBMITTED'));
});
test('missing loan facts are named once, explicit zero is retained, no text confirmation or extra request is needed', async t => {
  const s = setup(t); const view = await Drafts.prepare({ ...input, formCode: 'BANK_LOAN', inputData: { pickupCampus: 'Sai Gon Campus' } });
  assert.deepEqual(view.missingFields.map(f => f.key), ['orphanStatus', 'loanGrantedCount', 'lastLoanAmount']);
  const ready = await Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'UPDATE', inputData: { orphanStatus: 'Không', loanGrantedCount: 0, lastLoanAmount: 0 } });
  assert.equal(ready.id, view.id); assert.equal(ready.state, 'READY'); assert.equal(ready.data.lastLoanAmount, '0');
  assert.equal(s.state.records.length, 0);
});
test('military address consent cannot be invented by LLM or survive a changed revision', async t => {
  setup(t); const view = await Drafts.prepare({ ...input, formCode: 'MILITARY_DEFERMENT', inputData: { pickupCampus: 'Sai Gon Campus' } });
  await assert.rejects(Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'SUBMIT' }), /NVQS/);
  const changed = await Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'UPDATE', inputData: { permanentAddress: 'Phường An Phú, TP. Thủ Đức', isAddressConfirmed: true } });
  await assert.rejects(Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'SUBMIT', acknowledgeAddress: true }), e => e.status === 409);
  const submitted = await Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: changed.revision, action: 'SUBMIT', acknowledgeAddress: true });
  assert.equal(submitted.result.status, 'APPROVED');
});
test('draft access and cancellation do not cross accounts or create a business request', async t => {
  const s = setup(t); const view = await Drafts.prepare(input);
  await assert.rejects(Drafts.action({ studentCode: '2150200002', draftId: view.id, revision: view.revision, action: 'SUBMIT' }), e => e.status === 404);
  await Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'CANCEL' });
  assert.equal(await Drafts.latest(input.studentCode), null); assert.equal(s.state.records.length, 0);
});
test('LLM execution tools prepare a draft and cannot approve a request before the user confirms', async t => {
  const s = setup(t);
  const result = await ToolResolver.resolve('process_student_confirmation', { ...input.inputData,
    formCode: input.formCode, userMessage: `${input.inputData.purpose}; ${input.inputData.pickupCampus}`, currentUser: { role: 'STUDENT', studentCode: input.studentCode } });
  assert.equal(result.draft.state, 'READY'); assert.equal(s.state.records.length, 0);
  const blocked = await ToolResolver.resolve('process_request', { currentUser: { role: 'STUDENT', studentCode: input.studentCode } });
  assert.equal(blocked.success, false);
});
test('a legacy waiting request is adopted and resumed without replacing its request ID', async t => {
  const s = setup(t);
  const existing = s.add({ status: 'WAITING_STUDENT', inputData: { formCode: input.formCode, ...input.inputData } });
  const view = await Drafts.fromRequest(input.studentCode, existing.id);
  assert.equal(view.state, 'READY'); assert.equal(view.result.requestId, existing.id);
  const result = await Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'SUBMIT' });
  assert.equal(result.result.requestId, existing.id); assert.equal(result.result.status, 'APPROVED'); assert.equal(s.state.records.length, 1);
});
test('missing academic records go to staff verification instead of asking the student to invent school facts', async t => {
  const s = setup(t);
  s.students.push({ id: 'unknown-academic', studentCode: '2399999999', fullName: 'Sinh viên kiểm thử', status: 'ACTIVE', department: { name: 'Khoa kiểm thử' } });
  const view = await Drafts.prepare({ studentCode: '2399999999', formCode: input.formCode, inputData: { ...input.inputData,
    birthDate: '01/01/2004', gender: 'Nam', studentClass: '23TEST', phone: '0901234568', idCard: '000000000000', idCardDate: '01/01/2020', idCardPlace: 'Cơ quan cấp kiểm thử', major: 'Ngành kiểm thử' } });
  assert.equal(view.state, 'READY');
  const result = await Drafts.action({ studentCode: '2399999999', draftId: view.id, revision: view.revision, action: 'SUBMIT' });
  assert.equal(result.result.status, 'ESCALATED'); assert.equal(result.result.contextCapsule.retainHumanReview, true);
});

function overdue(s) {
  s.students.push({ id: 'overdue-debt', studentCode: '2280602154', fullName: 'Sinh viên khóa 2022', status: 'ACTIVE', department: { name: 'Khoa kiểm thử' } });
  return { studentCode: '2280602154', formCode: 'MILITARY_DEFERMENT' };
}
test('overdue course debt is a final policy denial, never a ready NVQS consent or missing-data prompt', async t => {
  const s = setup(t); const request = overdue(s);
  const view = await Drafts.prepare(request);
  assert.equal(view.state, 'REJECTED'); assert.equal(view.targetForm, 'COURSE_DEBT');
  assert.equal(view.addressConsentRequired, false); assert.deepEqual(view.missingFields, []);
  assert.deepEqual(view.actions, ['START_RECOMMENDED']); assert.equal(s.state.records.length, 0);
  assert.equal(s.drafts[0].state, 'REJECTED'); assert.equal(s.drafts[0].resolution.reason, view.notice);
  assert.ok(s.state.audits.some(a => a.action === 'DRAFT_REJECTED_POLICY'));
  const reloaded = await Drafts.latest(request.studentCode);
  assert.deepEqual(reloaded.resolution, view.resolution); assert.equal(reloaded.revision, view.revision);
  for (const action of ['UPDATE', 'SUBMIT', 'CANCEL', 'SWITCH_FORM']) await assert.rejects(Drafts.action({ ...request,
    draftId: view.id, revision: view.revision, action, acknowledgeAddress: true, inputData: { formCode: 'COURSE_DEBT' } }), e => e.status === 409);
  assert.match(Drafts.agentResult(view).message, /Quy trình này đã kết thúc/);
});
test('a recommended procedure starts a separate task and keeps the original denial immutable', async t => {
  const s = setup(t); const request = overdue(s);
  const denied = await Drafts.prepare({ ...request, inputData: { phone: '0901111222', permanentAddress: 'Địa chỉ riêng kiểm thử' } });
  const next = await Drafts.action({ ...request, draftId: denied.id, revision: denied.revision, action: 'START_RECOMMENDED' });
  assert.notEqual(next.id, denied.id); assert.equal(next.formCode, 'COURSE_DEBT'); assert.equal(next.state, 'NEEDS_INPUT');
  assert.equal(next.data.phone, '0901111222'); assert.equal(next.data.permanentAddress, 'Địa chỉ riêng kiểm thử');
  assert.notEqual(next.data.purpose, denied.data.purpose); assert.ok(next.missingFields.some(f => f.key === 'debtCourses'));
  assert.equal(s.drafts[0].state, 'REJECTED'); assert.deepEqual(s.drafts[0].resolution, denied.resolution);
  assert.equal(s.state.records.length, 0);
});
test('dropped students receive a closed denial without an inappropriate course-debt alternative', async t => {
  const s = setup(t); const view = await Drafts.prepare({ studentCode: '2150200002', formCode: 'GENERAL_CONFIRMATION' });
  assert.equal(view.state, 'REJECTED'); assert.equal(view.targetForm, null); assert.deepEqual(view.actions, []);
  assert.match(view.resolution.nextStep, /liên hệ/); assert.equal(s.state.records.length, 0);
});
test('legacy open drafts are closed and audited once when refreshed, without creating a request', async t => {
  const s = setup(t); const request = overdue(s);
  s.drafts.push({ id: 'legacy-denied', ...request, revision: 1, state: 'COLLECTING', inputData: {}, fieldSources: {} });
  const closed = await Drafts.latest(request.studentCode);
  assert.equal(closed.state, 'REJECTED'); assert.equal(s.drafts[0].state, 'REJECTED');
  const auditCount = s.state.audits.length;
  await Drafts.latest(request.studentCode); assert.equal(s.state.audits.length, auditCount);
});
test('an ineligible legacy waiting request is closed with its draft, preserving the original request ID', async t => {
  const s = setup(t); const request = overdue(s);
  const existing = s.add({ studentId: 'overdue-debt', status: 'WAITING_STUDENT', inputData: { formCode: request.formCode } });
  const view = await Drafts.fromRequest(request.studentCode, existing.id);
  assert.equal(view.state, 'REJECTED'); assert.equal(view.result.status, 'REJECTED'); assert.equal(view.result.requestId, existing.id);
  assert.equal(s.state.records[0].status, 'REJECTED'); assert.equal(s.state.records.length, 1);
});
test('sidebar operations emit real scoped steps, preserve privacy and do not invent activity on polling', async t => {
  setup(t); const start = agentTerminalLogger.buffer.length;
  const view = await Drafts.prepare(input);
  const logs = agentTerminalLogger.buffer.slice(start);
  assert.deepEqual(logs.map(l => l.step), ['WORKFLOW_START', 'PROFILE_LOADED', 'DRAFT_SAVED', 'REQUIREMENTS_CHECK', 'POLICY_CHECK', 'WAITING_CONFIRMATION']);
  assert.ok(logs.every(l => l.ownerKey === input.studentCode));
  assert.doesNotMatch(JSON.stringify(logs), /0901234568|permanentAddress":\s*"[^\"]+/);
  assert.ok(agentTerminalLogger.getRecentLogs(300, { key: input.studentCode }).some(l => l.details?.draftId === view.id));
  assert.ok(!agentTerminalLogger.getRecentLogs(300, { key: 'other-student' }).some(l => l.details?.draftId === view.id && l.sessionId === logs[0].sessionId));
  const before = agentTerminalLogger.buffer.length;
  await Drafts.latest(input.studentCode); assert.equal(agentTerminalLogger.buffer.length, before);
  await Drafts.action({ studentCode: input.studentCode, draftId: view.id, revision: view.revision, action: 'SUBMIT' });
  assert.ok(agentTerminalLogger.buffer.slice(before).some(l => l.step === 'WORKFLOW_EXECUTION'));
  assert.ok(agentTerminalLogger.buffer.slice(before).some(l => l.step === 'WORKFLOW_RESULT' && l.details.status === 'APPROVED'));
});
test('a yes reply after a policy denial ends deterministically, without LLM calls or another draft', async t => {
  const s = setup(t); const request = overdue(s); const denied = await Drafts.prepare(request);
  const agent = new AgentOrchestrator(null, `${request.studentCode}::closed-task`);
  agent.llmClient.streamGenerateContent = async () => { throw new Error('A closed task must not call the LLM for confirmation'); };
  const reply = await agent.run({ message: 'Có', currentUser: { role: 'STUDENT', studentCode: request.studentCode } });
  assert.equal(reply.decision, 'REJECTED_POLICY'); assert.equal(reply.toolResult.draft.id, denied.id);
  assert.match(reply.reply, /Quy trình này đã kết thúc/); assert.equal(s.drafts.length, 1);
});
