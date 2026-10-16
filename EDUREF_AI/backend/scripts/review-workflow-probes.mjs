// Diagnostic reproductions for the 2026-10-15 code review, not acceptance tests.
// Every database/LLM operation is stubbed. No app .env, DB, socket or Gemini calls.
import { restorer } from '../testSupport/securityTestEnv.js';
import fs from 'node:fs';
import prisma from '../config/prisma.js';
import { PetitionWorkflowCore } from '../modules/petition-core/PetitionWorkflowCore.js';
import AcademicWorkflowService from '../services/AcademicWorkflowService.js';
import AgentOrchestrator from '../modules/ai-agent/core/AgentOrchestrator.js';
import ToolResolver from '../modules/ai-agent/tools/ToolResolver.js';
import { studentConfirmationHandler } from '../modules/petition-core/handlers/StudentConfirmationHandler.js';
import { evaluateStudentConfirmation } from '../services/StudentConfirmationDecisionService.js';

const student = { id: 'review-student', studentCode: '2380600001', fullName: 'Sinh viên kiểm tra', status: 'ACTIVE', department: { name: 'Khoa test' } };
const requestType = { id: 'review-type', code: 'STUDENT_CONFIRMATION', name: 'Xác nhận sinh viên', requirements: [
  { code: 'REQ_PHONE', name: 'SĐT', isRequired: true },
  { code: 'REQ_CAMPUS', name: 'Cơ sở nhận', isRequired: true },
  { code: 'REQ_PURPOSE', name: 'Mục đích', isRequired: true },
], policies: [], authorityRules: [] };
const input = { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé xe buýt',
  phone: '0901234567', pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)', historyRequests: [] };
const makeRequest = (overrides = {}) => ({ id: 'review-request', requestCode: 'XNSV-123456',
  studentId: student.id, requestTypeId: requestType.id, student, requestType, documents: [],
  status: 'WAITING_STUDENT', createdAt: new Date(), inputData: { ...input }, ...overrides });

function sandbox(records = []) {
  const mocks = restorer();
  const audits = [];
  let historyReads = 0;
  const update = async ({ where, data }) => {
    const record = records.find((item) => item.id === where.id);
    if (!record) throw new Error('Probe fixture missing request');
    Object.assign(record, data);
    return { ...record };
  };
  mocks.stub(console, 'log', () => {});
  mocks.stub(prisma.student, 'findUnique', async () => student);
  mocks.stub(prisma.requestType, 'findUnique', async () => requestType);
  mocks.stub(prisma.studentRequest, 'findFirst', async ({ where }) => {
    if (where.OR) return records.find((r) => where.OR.some((entry) => entry.id === r.id || entry.requestCode === r.requestCode)) || null;
    return records.find((r) => where.status?.in?.includes(r.status)) || null;
  });
  mocks.stub(prisma.studentRequest, 'findMany', async () => {
    historyReads++;
    return records.filter((r) => ['APPROVED', 'COMPLETED', 'ESCALATED'].includes(r.status));
  });
  mocks.stub(prisma.studentRequest, 'create', async ({ data }) => {
    const record = makeRequest({ ...data, id: `new-${records.length}` });
    records.push(record);
    return { ...record };
  });
  mocks.stub(prisma.studentRequest, 'update', update);
  mocks.stub(prisma.auditLog, 'findFirst', async () => audits.at(-1) || null);
  mocks.stub(prisma.auditLog, 'create', async ({ data }) => { audits.push(data); return data; });
  mocks.stub(prisma, '$transaction', async (fn) => fn({
    auditLog: { findFirst: async () => audits.at(-1) || null, create: async ({ data }) => {
      audits.push(data); return data;
    } }, studentRequest: { update },
  }));
  return { mocks, records, audits, historyReads: () => historyReads, core: new PetitionWorkflowCore() };
}

const results = [];
async function probe(id, run) {
  const originalLog = console.log;
  try { results.push({ id, ...(await run()) }); }
  finally { console.log = originalLog; }
}

await probe('resume_uses_stale_quota_snapshot', async () => {
  const waiting = makeRequest();
  const alreadyIssued = makeRequest({ id: 'already-issued', requestCode: 'XNSV-654321', status: 'APPROVED' });
  const s = sandbox([waiting, alreadyIssued]);
  try {
    const expected = evaluateStudentConfirmation({ student, inputData: { ...input, historyRequests: [alreadyIssued] } });
    const actual = await s.core.resumePetitionWorkflow({ requestId: waiting.id });
    return { reproduced: actual.status === 'APPROVED' && expected.decision === 'ASK_CLARIFICATION',
      observed: actual.decision, expectedWithFreshHistory: expected.decision, historyReads: s.historyReads() };
  } finally { s.mocks.restoreAll(); }
});

await probe('submit_rewrites_different_escalated_form', async () => {
  const existing = makeRequest({ status: 'ESCALATED', inputData: { ...input, formCode: 'MILITARY_DEFERMENT', purpose: 'Tạm hoãn nghĩa vụ quân sự' },
    escalationReason: 'Cần cán bộ xác minh NVQS', contextCapsule: { reason: 'Cần cán bộ xác minh NVQS' } });
  const s = sandbox([existing]);
  try {
    const actual = await s.core.processPetitionWorkflow({ studentCode: student.studentCode, requestTypeCode: requestType.code,
      inputData: { ...input, historyRequests: [{ status: 'ESCALATED', inputData: { formCode: 'MILITARY_DEFERMENT' }, createdAt: new Date() }] } });
    return { reproduced: s.records.length === 1 && existing.status === 'APPROVED' && existing.inputData.formCode === 'GENERAL_CONFIRMATION',
      observed: { sameRequestId: actual.requestId === existing.id, status: existing.status, formCode: existing.inputData.formCode,
        capsuleReason: existing.contextCapsule?.reason }, expected: 'Keep the escalated military request and create a distinct general request' };
  } finally { s.mocks.restoreAll(); }
});

await probe('parallel_submissions_both_auto_approve', async () => {
  const s = sandbox();
  try {
    const replies = await Promise.all([0, 1].map(() => s.core.processPetitionWorkflow({
      studentCode: student.studentCode, requestTypeCode: requestType.code, inputData: { ...input }, forceNewRequest: true,
    })));
    return { reproduced: replies.every((r) => r.status === 'APPROVED'), observed: replies.map((r) => r.decision),
      approvedRequests: s.records.filter((r) => r.status === 'APPROVED').length,
      expected: 'At most one routine approval for the same student/form/semester' };
  } finally { s.mocks.restoreAll(); }
});

await probe('small_tools_skip_course_debt_requirement', async () => {
  const request = makeRequest({ status: 'PENDING', inputData: { ...input, formCode: 'COURSE_DEBT', purpose: 'Xác nhận sinh viên còn nợ môn' } });
  const s = sandbox([request]);
  try {
    const canonical = await studentConfirmationHandler.validateRequirements(request, request.inputData, []);
    const smallTool = await AcademicWorkflowService.processRequest(request.id);
    return { reproduced: !canonical.complete && smallTool.status === 'APPROVED', observed: smallTool.status,
      canonicalMissing: canonical.missing.map((item) => item.code), expected: 'ASK_CLARIFICATION for missing debtCourses' };
  } finally { s.mocks.restoreAll(); }
});

await probe('requesting_confirmation_counts_as_address_consent', async () => {
  const s = sandbox();
  try {
    const args = { ...input, formCode: 'MILITARY_DEFERMENT', purpose: 'Tạm hoãn nghĩa vụ quân sự',
      permanentAddress: 'Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu', isAddressConfirmed: false };
    let captured;
    s.mocks.stub(ToolResolver, 'resolve', async (_name, merged) => {
      captured = merged;
      return { decision: 'ASK_CLARIFICATION', status: 'WAITING_STUDENT', message: 'Thông tin cần bổ sung' };
    });
    const agent = new AgentOrchestrator(null, 'review-address-consent');
    let calls = 0;
    agent.geminiClient.streamGenerateContent = async () => ++calls === 1
      ? { parts: [{ functionCall: { name: 'process_student_confirmation', args } }] }
      : { text: 'Thông tin cần bổ sung' };
    await agent.run({ message: 'Em xin giấy xác nhận tạm hoãn nghĩa vụ quân sự',
      currentUser: { ...student, role: 'STUDENT' }, inputData: args });
    const original = evaluateStudentConfirmation({ student, inputData: args });
    const after = evaluateStudentConfirmation({ student, inputData: { ...args, isAddressConfirmed: captured.isAddressConfirmed } });
    return { reproduced: captured.isAddressConfirmed && original.decision === 'ASK_CLARIFICATION' && after.decision === 'AUTO_APPROVED',
      explicitAddressConfirmation: false, mergedAddressConfirmation: captured.isAddressConfirmed,
      originalPolicyDecision: original.decision, decisionAfterInferredConsent: after.decision };
  } finally { s.mocks.restoreAll(); }
});

await probe('step_cap_replaces_committed_approval_with_fake_escalation', async () => {
  const s = sandbox();
  try {
    const agent = new AgentOrchestrator(null, 'review-step-cap');
    let calls = 0;
    agent.geminiClient.streamGenerateContent = async () => ({ parts: [{ functionCall: {
      name: ++calls === 5 ? 'process_student_confirmation' : 'get_student_profile', args: { ...input },
    } }] });
    s.mocks.stub(ToolResolver, 'resolve', async (name) => name === 'process_student_confirmation'
      ? s.core.processPetitionWorkflow({ studentCode: student.studentCode, requestTypeCode: requestType.code, inputData: { ...input } })
      : { found: true, studentCode: student.studentCode });
    const reply = await agent.run({ message: 'Em xin giấy xác nhận để làm vé xe buýt', currentUser: { ...student, role: 'STUDENT' } });
    return { reproduced: reply.decision === 'ESCALATE_TO_STAFF' && s.records[0]?.status === 'APPROVED',
      observed: { replyDecision: reply.decision, replyRequestId: reply.toolResult?.requestId || null,
        databaseStatus: s.records[0]?.status, escalatedQueueCount: s.records.filter((r) => r.status === 'ESCALATED').length },
      expected: 'Preserve the committed approval when the final tool already completed the workflow' };
  } finally { s.mocks.restoreAll(); }
});

const report = { date: '2026-10-15', scope: 'Isolated diagnostics; fake Prisma/LLM only; observations are unfixed bugs', results };
fs.writeFileSync(new URL('../../docs/REVIEW_WORKFLOW_PROBES.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
