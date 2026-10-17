// Regression cho lớp agent/tool/service: quyền sở hữu hồ sơ, state guard, compare-and-set,
// lọc input ở orchestrator, che lỗi nội bộ. Prisma được stub nên KHÔNG chạm DB.
import { restorer, transactionClient } from '../testSupport/securityTestEnv.js';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import prisma from '../config/prisma.js';
import { ToolResolver } from '../modules/ai-agent/tools/ToolResolver.js';
import ToolRegistry from '../modules/ai-agent/tools/ToolRegistry.js';
import verifyTools from '../modules/ai-agent/tools/actions/verifyTools.js';
import petitionTools from '../modules/ai-agent/tools/actions/petitionTools.js';
import AcademicWorkflowService from '../services/AcademicWorkflowService.js';
import { AgentOrchestrator } from '../modules/ai-agent/core/AgentOrchestrator.js';
import { CertificateVisionService } from '../services/CertificateVisionService.js';

const mocks = restorer();
mocks.stub(console, 'error', () => {});
mocks.stub(console, 'warn', () => {});
mocks.stub(prisma.petitionDraft, 'findMany', async () => []);
after(() => mocks.restoreAll());

/** Giả lập prisma.$transaction để quan sát commit/rollback và bản ghi audit. */
function fakeTransaction({ updateManyCount }) {
  const state = { committed: false, auditCreated: false, updateManyWhere: null };
  const tx = {
    auditLog: {
      findFirst: async () => null,
      create: async ({ data }) => { state.auditCreated = true; return { ...data, sha256Hash: 'hash-test' }; },
    },
    studentRequest: {
      updateMany: async ({ where }) => { state.updateManyWhere = where; return { count: updateManyCount }; },
      update: async () => ({}),
    },
  };
  mocks.stub(prisma, '$transaction', async (fn) => {
    const result = await fn(transactionClient(prisma, tx));
    state.committed = true;
    return result;
  });
  return state;
}

// ---------------------------------------------------------------------------
// ToolResolver: quyền sở hữu hồ sơ (chặn IDOR qua prompt/LLM)
// ---------------------------------------------------------------------------
test('ToolResolver.denyIfNotOwner: sinh viên không thao tác được trên hồ sơ của người khác', async () => {
  mocks.stub(prisma.studentRequest, 'findFirst', async () => ({ student: { studentCode: 'VICTIM' } }));
  const attacker = { role: 'STUDENT', type: 'STUDENT', studentCode: 'ATTACKER' };
  const REQUEST_SCOPED = ['get_request', 'check_requirements', 'evaluate_policy', 'check_authority', 'process_request', 'ask_student', 'escalate_request', 'get_execution_trace'];
  for (const tool of REQUEST_SCOPED) {
    const denied = await ToolResolver.denyIfNotOwner(tool, { requestId: 'XNSV-1', currentUser: attacker });
    assert.equal(denied?.error, 'FORBIDDEN', tool);
  }
});

test('ToolResolver.denyIfNotOwner: chủ hồ sơ và cán bộ được phép; tool không gắn requestId không tra DB', async () => {
  mocks.stub(prisma.studentRequest, 'findFirst', async () => ({ student: { studentCode: 'VICTIM' } }));
  assert.equal(await ToolResolver.denyIfNotOwner('get_request', { requestId: 'X', currentUser: { role: 'STUDENT', studentCode: 'VICTIM' } }), null);
  assert.equal(await ToolResolver.denyIfNotOwner('process_request', { requestId: 'X', currentUser: { role: 'STAFF', type: 'STAFF' } }), null);

  mocks.stub(prisma.studentRequest, 'findFirst', async () => { throw new Error('không được tra DB'); });
  assert.equal(await ToolResolver.denyIfNotOwner('get_student_profile', { requestId: 'X', currentUser: { role: 'STUDENT', studentCode: 'A' } }), null);
});

test('ToolResolver: run_verify_90s qua LLM bị giới hạn 3 lần/10 phút mỗi người dùng', async () => {
  mocks.stub(verifyTools, 'run_verify_90s', async () => ({ success: true, ran: true }));
  const args = { currentUser: { studentCode: 'CAP-1', role: 'STUDENT' } };
  for (let i = 0; i < 3; i++) assert.equal((await ToolResolver.resolve('run_verify_90s', args)).ran, true);
  assert.equal((await ToolResolver.resolve('run_verify_90s', args)).error, 'RATE_LIMITED');
  assert.equal((await ToolResolver.resolve('run_verify_90s', { currentUser: { studentCode: 'CAP-2', role: 'STUDENT' } })).ran, true);
});

test('ToolRegistry: không khai báo tool mồ côi (mọi tool khai báo đều có nhánh trong ToolResolver)', async () => {
  const names = ToolRegistry.getDeclarations().map((d) => d.name);
  assert.ok(!names.includes('run_general_verify'), 'tool này từng được khai báo nhưng không có hàm thực thi');
  const resolverSource = readFileSync(new URL('../modules/ai-agent/tools/ToolResolver.js', import.meta.url), 'utf8');
  for (const name of names) {
    assert.ok(resolverSource.includes(`case '${name}'`), `Tool khai báo cho LLM nhưng ToolResolver không xử lý: ${name}`);
  }
  await assert.rejects(() => ToolResolver.resolve('tool_khong_ton_tai', { currentUser: { role: 'STAFF' } }), /không được hỗ trợ/);
});

// ---------------------------------------------------------------------------
// State guard: không kéo đơn đã chốt ngược trạng thái
// ---------------------------------------------------------------------------
test('escalateRequest / askStudent: từ chối khi đơn đã APPROVED/REJECTED/CANCELLED, không ghi audit', async () => {
  const state = fakeTransaction({ updateManyCount: 1 });
  for (const status of ['APPROVED', 'REJECTED', 'CANCELLED']) {
    mocks.stub(prisma.studentRequest, 'findFirst', async () => ({
      id: 'r1', requestCode: 'XNSV-1', status, student: { studentCode: 'A', fullName: 'A' }, requestType: { name: 'x' },
    }));
    const escalated = await AcademicWorkflowService.escalateRequest({ requestId: 'r1', reason: 'r', actionableQuestion: 'q' });
    const asked = await AcademicWorkflowService.askStudent({ requestId: 'r1', question: 'q' });
    assert.equal(escalated.success, false, `escalate ${status}`);
    assert.equal(asked.success, false, `ask ${status}`);
  }
  // Read-only guard transactions may commit; no mutation or audit may be written.
  assert.equal(state.auditCreated, false);
});

test('escalateRequest: đơn đang xử lý vẫn chuyển tiếp được (guard không chặn nhầm)', async () => {
  const state = fakeTransaction({ updateManyCount: 1 });
  mocks.stub(prisma.studentRequest, 'findFirst', async () => ({
    id: 'r1', requestCode: 'XNSV-1', status: 'PROCESSING', student: { studentCode: 'A', fullName: 'A' }, requestType: { name: 'x' },
  }));
  const r = await AcademicWorkflowService.escalateRequest({ requestId: 'r1', reason: 'r', actionableQuestion: 'q' });
  assert.equal(r.success, true);
  assert.equal(state.committed, true);
});

// ---------------------------------------------------------------------------
// Compare-and-set khi cán bộ duyệt/từ chối
// ---------------------------------------------------------------------------
const escalatedRequest = { id: 'r1', requestCode: 'XNSV-1', status: 'ESCALATED', contextCapsule: {}, escalationReason: 'x', qrCodeUrl: null, student: { fullName: 'A' } };

test('staffDecision: thua race (updateMany count=0) -> thất bại, rollback, không ghi audit', async () => {
  const state = fakeTransaction({ updateManyCount: 0 });
  mocks.stub(prisma.studentRequest, 'findFirst', async () => escalatedRequest);
  const r = await AcademicWorkflowService.staffDecision({ requestId: 'r1', decision: 'APPROVE', actorType: 'STAFF', staffName: 'S' });
  assert.equal(r.success, false);
  assert.match(r.error, /vừa được người khác xử lý/);
  assert.deepEqual(state.updateManyWhere, { id: 'r1', status: 'ESCALATED' });
});

test('staffDecision: trường hợp bình thường thành công và commit', async () => {
  const state = fakeTransaction({ updateManyCount: 1 });
  mocks.stub(prisma.studentRequest, 'findFirst', async () => escalatedRequest);
  const r = await AcademicWorkflowService.staffDecision({ requestId: 'r1', decision: 'APPROVE', actorType: 'DEAN', staffName: 'S' });
  assert.equal(r.success, true);
  assert.equal(state.committed, true);
});

test('staff_confirm_request: thua race -> thất bại; ghi đúng actorType/staffName khi thành công', async () => {
  mocks.stub(prisma.studentRequest, 'findFirst', async () => escalatedRequest);
  let state = fakeTransaction({ updateManyCount: 0 });
  const lost = await petitionTools.staff_confirm_request({ requestId: 'r1', approved: true, actorType: 'DEAN', staffName: 'Trưởng phòng' });
  assert.equal(lost.success, false);
  assert.equal(state.committed, false);

  const audits = [];
  state = fakeTransaction({ updateManyCount: 1 });
  mocks.stub(prisma, '$transaction', async (fn) => fn(transactionClient(prisma, {
    auditLog: { findFirst: async () => null, create: async ({ data }) => { audits.push(data); return { ...data, sha256Hash: 'h' }; } },
    studentRequest: { updateMany: async () => ({ count: 1 }) },
  })));
  const ok = await petitionTools.staff_confirm_request({ requestId: 'r1', approved: true, actorType: 'DEAN', staffName: 'Trưởng phòng' });
  assert.equal(ok.success, true);
  assert.equal(ok.status, 'APPROVED');
  assert.equal(audits[0].decision, 'APPROVED');
  assert.equal(audits[0].actorType, 'DEAN');
  assert.equal(audits[0].inputSnapshot.staffName, 'Trưởng phòng');

  audits.length = 0;
  await petitionTools.staff_confirm_request({ requestId: 'r1', approved: true, actorType: 'HACKER' });
  assert.equal(audits[0].actorType, 'STAFF', 'actorType lạ phải quy về STAFF');
});

// ---------------------------------------------------------------------------
// Hạn ngạch: lịch sử lấy từ DB
// ---------------------------------------------------------------------------
test('loadApprovalHistory: chỉ lấy đơn APPROVED/COMPLETED/ESCALATED của đúng sinh viên và rút gọn inputData', async () => {
  let args = null;
  mocks.stub(prisma.student, 'findUnique', async ({ where }) => (where.studentCode === '2380600001' ? { id: 'sid-1' } : null));
  mocks.stub(prisma.studentRequest, 'findMany', async (a) => {
    args = a;
    return [{ id: 'h1', requestCode: 'XNSV-9', status: 'APPROVED', createdAt: new Date(), inputData: { formCode: 'MILITARY_DEFERMENT', fullName: 'không được rò', idCard: '1' } }];
  });
  const history = await AcademicWorkflowService.loadApprovalHistory({ studentCode: '2380600001' });
  assert.equal(args.where.studentId, 'sid-1');
  assert.deepEqual(args.where.status.in, ['APPROVED', 'COMPLETED', 'ESCALATED']);
  assert.deepEqual(history[0].inputData, { formCode: 'MILITARY_DEFERMENT' });
  assert.deepEqual(await AcademicWorkflowService.loadApprovalHistory({ studentCode: 'khong-ton-tai' }), []);
});

// ---------------------------------------------------------------------------
// Orchestrator: lọc input không tin cậy trước khi gọi tool; khóa MSSV theo JWT
// ---------------------------------------------------------------------------
test('AgentOrchestrator: inputData của client và của LLM bị lọc khóa máy chủ; MSSV khóa theo phiên đăng nhập', async () => {
  const orchestrator = new AgentOrchestrator(null, 'A::sess');
  let call = 0;
  orchestrator.geminiClient.streamGenerateContent = async () => {
    call += 1;
    if (call === 1) {
      return {
        text: '',
        parts: [{
          functionCall: {
            name: 'process_student_confirmation',
            args: { studentCode: '9999999999', purpose: 'xe buýt', inputData: { existingApprovedCount: 0, historyRequests: ['x'], repeatReason: 'mất giấy' } },
          },
        }],
      };
    }
    return { text: 'xong', parts: [{ text: 'xong' }] };
  };
  let captured = null;
  mocks.stub(ToolResolver, 'resolve', async (name, args) => { captured = args; return { decision: 'ASK_CLARIFICATION', actionableQuestion: 'q' }; });
  mocks.stub(console, 'log', () => {});

  await orchestrator.run({
    message: 'xin giấy xác nhận',
    currentUser: { role: 'STUDENT', type: 'STUDENT', studentCode: '2380600001', fullName: 'An' },
    inputData: { submissionDate: '2020-01-01', existingApprovedCount: 0, purpose: 'xe buýt' },
  });

  assert.equal(captured.studentCode, '2380600001', 'tham số studentCode do LLM sinh bị bỏ qua');
  for (const key of ['submissionDate', 'existingApprovedCount', 'historyRequests']) {
    assert.equal(key in captured.inputData, false, `phải loại ${key}`);
  }
  assert.equal(captured.inputData.repeatReason, 'mất giấy', 'khóa hợp lệ được giữ');
  assert.equal(captured.inputData.purpose, 'xe buýt');
});

test('AgentOrchestrator: lỗi nội bộ không lộ ra reply, có mã tham chiếu', async () => {
  const orchestrator = new AgentOrchestrator(null, 'A::sess2');
  orchestrator.geminiClient.streamGenerateContent = async () => {
    throw Object.assign(new Error('Invalid `prisma.student.findUnique()` invocation: password=hunter2'), { name: 'PrismaClientKnownRequestError', code: 'P1001' });
  };
  const result = await orchestrator.run({ message: 'xin chào', currentUser: { role: 'STUDENT', studentCode: 'A', fullName: 'A' } });
  assert.doesNotMatch(JSON.stringify(result), /prisma|hunter2/i);
  assert.match(result.reply, /ERR-[0-9A-F]{6}/);
});

// ---------------------------------------------------------------------------
// Service: che lỗi nội bộ nhưng giữ cấu trúc kết quả tool; Vision rỗng
// ---------------------------------------------------------------------------
test('AcademicWorkflowService: lỗi Prisma bị che, kết quả tool vẫn đúng hình dạng', async () => {
  mocks.stub(prisma.student, 'findUnique', async () => {
    throw Object.assign(new Error('Invalid `prisma.student.findUnique()` invocation: table "Student" secret'), { name: 'PrismaClientKnownRequestError', code: 'P1001' });
  });
  const r = await AcademicWorkflowService.getStudentProfile('1');
  assert.equal(r.found, false);
  assert.doesNotMatch(r.error, /secret|prisma|Student/);
  assert.match(r.error, /ERR-[0-9A-F]{6}/);
});

test('CertificateVisionService: Gemini trả rỗng -> yêu cầu cán bộ thẩm định, không trả undefined', async () => {
  const service = new CertificateVisionService();
  service.geminiClient.generateJson = async () => undefined;
  const result = await service.verifyCertificate({ imageBase64: 'x'.repeat(100), expectedType: 'B1', studentName: 'A' });
  assert.ok(result);
  assert.equal(result.requiresManualReview, true);
  assert.equal(result.isValid, false);
});
