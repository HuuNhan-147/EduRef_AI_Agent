// Regression cho các bản vá bảo mật ở tầng HTTP: dựng Express với router thật,
// Prisma/service được stub nên KHÔNG chạm DB (xem testSupport/securityTestEnv.js).
import { TEST_JWT_SECRET, restorer } from '../testSupport/securityTestEnv.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import prisma from '../config/prisma.js';
import Drafts from '../services/PetitionDraftService.js';
import authRoutes from '../routes/authRoutes.js';
import agentRoutes from '../routes/agentRoutes.js';
import auditRoutes from '../routes/auditRoutes.js';
import petitionRoutes from '../routes/petitionRoutes.js';
import verifyTools from '../modules/ai-agent/tools/actions/verifyTools.js';
import AuditLogService from '../services/AuditLogService.js';
import petitionWorkflowCore from '../modules/petition-core/PetitionWorkflowCore.js';
import { agentTerminalLogger } from '../modules/ai-agent/core/AgentTerminalLogger.js';

const mocks = restorer();
let server;
let baseUrl;

const token = (payload) => jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '5m' });
const student = token({ id: 'sid-1', studentCode: '2380600001', role: 'STUDENT', fullName: 'An' });
const staff = token({ id: 'uid-1', username: 'staff_daotao', role: 'STAFF', fullName: 'Staff' });

async function call(method, path, { auth, body, headers = {} } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, headers: res.headers, json: await res.json().catch(() => ({})) };
}

async function withDemoMode(value, fn) {
  const previous = process.env.ALLOW_DEMO_ROLE_SWITCH;
  process.env.ALLOW_DEMO_ROLE_SWITCH = value;
  try {
    return await fn();
  } finally {
    process.env.ALLOW_DEMO_ROLE_SWITCH = previous;
  }
}

before(async () => {
  // Log lỗi 500 có chủ đích sẽ làm nhiễu output test
  mocks.stub(console, 'error', () => {});
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/agent', agentRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/petitions', petitionRoutes);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  mocks.restoreAll();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

// ---------------------------------------------------------------------------
// verify-custom-prompt: sinh viên không được tạo đơn thay người khác
// ---------------------------------------------------------------------------
test('verify-custom-prompt: sinh viên nhắm hồ sơ thật của người khác -> 403', async () => {
  const r = await call('POST', '/api/agent/verify-custom-prompt', {
    auth: token({ id: 'v1', studentCode: '2380600001', role: 'STUDENT' }),
    body: { prompt: 'xin giấy xe buýt', studentCode: '2399999999' },
  });
  assert.equal(r.status, 403);
});

test('verify-custom-prompt: không gửi studentCode / gõ mssv trong prompt -> khóa vào MSSV của chính mình', async () => {
  let seen = null;
  const original = verifyTools.run_custom_prompt;
  verifyTools.run_custom_prompt = async (args) => { seen = args; return { success: true }; };
  try {
    const r = await call('POST', '/api/agent/verify-custom-prompt', {
      auth: token({ id: 'v2', studentCode: '2380600001', role: 'STUDENT' }),
      body: { prompt: 'mssv 2399999999 xin giấy' },
    });
    assert.equal(r.status, 200);
    assert.equal(seen.studentCode, '2380600001');
  } finally {
    verifyTools.run_custom_prompt = original;
  }
});

test('verify-custom-prompt: sinh viên được chạy trên hồ sơ benchmark; staff không bị giới hạn', async () => {
  const seen = [];
  const original = verifyTools.run_custom_prompt;
  verifyTools.run_custom_prompt = async (args) => { seen.push(args.studentCode); return { success: true }; };
  try {
    const asStudent = await call('POST', '/api/agent/verify-custom-prompt', {
      auth: token({ id: 'v3', studentCode: '2380600001', role: 'STUDENT' }),
      body: { prompt: 'x', studentCode: '2280602154' },
    });
    const asStaff = await call('POST', '/api/agent/verify-custom-prompt', {
      auth: token({ id: 'v4', username: 'staff_daotao', role: 'STAFF' }),
      body: { prompt: 'x', studentCode: '2399999999' },
    });
    assert.equal(asStudent.status, 200);
    assert.equal(asStaff.status, 200);
    assert.deepEqual(seen, ['2280602154', '2399999999']);
  } finally {
    verifyTools.run_custom_prompt = original;
  }
});

// ---------------------------------------------------------------------------
// Chat HTTP: danh tính khóa theo JWT
// ---------------------------------------------------------------------------
test('/agent/chat: STUDENT không đóng vai sinh viên khác qua body.studentCode', async () => {
  const lookedUp = [];
  const original = prisma.student.findUnique;
  prisma.student.findUnique = async ({ where }) => { lookedUp.push(where.studentCode); return null; }; // null -> 403, không chạy agent
  try {
    const r = await call('POST', '/api/agent/chat', {
      auth: token({ id: 'c1', studentCode: '2380600001', role: 'STUDENT' }),
      body: { message: 'xin chào', studentCode: '2150200002' },
    });
    assert.equal(r.status, 403);
    assert.deepEqual(lookedUp, ['2380600001']);
  } finally {
    prisma.student.findUnique = original;
  }
});

test('/agent/chat: tin nhắn quá 4000 ký tự bị từ chối', async () => {
  const r = await call('POST', '/api/agent/chat', {
    auth: token({ id: 'c2', studentCode: '2380600001', role: 'STUDENT' }),
    body: { message: 'a'.repeat(4001) },
  });
  assert.equal(r.status, 400);
});

// ---------------------------------------------------------------------------
// Audit log + terminal log: không rò rỉ PII giữa sinh viên
// ---------------------------------------------------------------------------
test('/audit/logs: STUDENT chỉ thấy log hồ sơ của mình, limit bị chặn trần 200', async () => {
  let args = null;
  const original = prisma.auditLog.findMany;
  prisma.auditLog.findMany = async (a) => { args = a; return []; };
  try {
    const r = await call('GET', '/api/audit/logs?limit=999999', { auth: student });
    assert.equal(r.status, 200);
    assert.deepEqual(args.where, { request: { studentId: 'sid-1' } });
    assert.equal(args.take, 200);
  } finally {
    prisma.auditLog.findMany = original;
  }
});

test('/audit/logs: STAFF xem toàn bộ; tham số action dạng object bị bỏ qua (chống Prisma filter injection)', async () => {
  let args = null;
  const original = prisma.auditLog.findMany;
  prisma.auditLog.findMany = async (a) => { args = a; return []; };
  try {
    await call('GET', '/api/audit/logs?limit=abc', { auth: staff });
    assert.deepEqual(args.where, {});
    assert.equal(args.take, 50);
    await call('GET', '/api/audit/logs?action[contains]=a', { auth: staff });
    assert.deepEqual(args.where, {});
  } finally {
    prisma.auditLog.findMany = original;
  }
});

test('/audit/verify-chain: bị rate limit sau 6 lần/phút', async () => {
  const original = AuditLogService.verifyEntireChain;
  AuditLogService.verifyEntireChain = async () => ({ chainValid: true });
  try {
    const auth = token({ id: 'rl-chain', username: 'x', role: 'STAFF' });
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await call('GET', '/api/audit/verify-chain', { auth })).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 200, 429]);
  } finally {
    AuditLogService.verifyEntireChain = original;
  }
});

test('/agent/terminal-logs: sinh viên chỉ thấy log của mình + hệ thống; staff thấy tất cả', async () => {
  agentTerminalLogger.buffer = [];
  agentTerminalLogger.log({ text: 'mine', sessionId: '2380600001::s' });
  agentTerminalLogger.log({ text: 'other-student-pii', sessionId: '2150200002::s' });
  agentTerminalLogger.log({ text: 'system' });
  try {
    const asStudent = await call('GET', '/api/agent/terminal-logs', { auth: student });
    assert.deepEqual(asStudent.json.data.map((e) => e.text).sort(), ['mine', 'system']);
    const asStaff = await call('GET', '/api/agent/terminal-logs', { auth: staff });
    assert.equal(asStaff.json.data.length, 3);
  } finally {
    agentTerminalLogger.buffer = [];
  }
});

// ---------------------------------------------------------------------------
// Gate chế độ demo
// ---------------------------------------------------------------------------
test('chế độ demo TẮT: login MSSV, custom-student, reset-test, demo-accounts đều bị 403', async () => {
  await withDemoMode('false', async () => {
    assert.equal((await call('POST', '/api/auth/login', { body: { studentCode: '2380600001' } })).status, 403);
    assert.equal((await call('POST', '/api/auth/custom-student', { body: { fullName: 'x', studentCode: '2399999999' } })).status, 403);
    assert.equal((await call('POST', '/api/petitions/reset-test', { auth: student, body: {} })).status, 403);
    assert.equal((await call('GET', '/api/auth/demo-accounts')).status, 403);
  });
});

test('login username/password: mật khẩu mặc định seed bị từ chối khi tắt demo, vẫn dùng được khi bật demo', async () => {
  const passwordHash = await bcrypt.hash('123456', 4);
  const original = prisma.user.findUnique;
  prisma.user.findUnique = async () => ({ id: 'u1', username: 'staff_daotao', fullName: 'S', email: 'e', role: 'STAFF', active: true, passwordHash });
  try {
    await withDemoMode('false', async () => {
      assert.equal((await call('POST', '/api/auth/login', { body: { username: 'staff_daotao', password: '123456' } })).status, 403);
    });
    await withDemoMode('true', async () => {
      const r = await call('POST', '/api/auth/login', { body: { username: 'staff_daotao', password: '123456' } });
      assert.equal(r.status, 200);
      assert.ok(r.json.token);
    });
  } finally {
    prisma.user.findUnique = original;
  }
});

test('demo-accounts: chỉ liệt kê hồ sơ benchmark, không liệt kê hồ sơ do người dùng tự tạo', async () => {
  let where = null;
  const originals = [prisma.student.findMany, prisma.user.findMany];
  prisma.student.findMany = async (a) => { where = a.where; return []; };
  prisma.user.findMany = async () => [];
  try {
    const r = await call('GET', '/api/auth/demo-accounts');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(where?.studentCode?.in), 'truy vấn DB phải giới hạn danh sách MSSV benchmark');
    assert.ok(where.studentCode.in.includes('2380600001'));
    assert.ok(!where.studentCode.in.includes('2399999999'));
  } finally {
    [prisma.student.findMany, prisma.user.findMany] = originals;
  }
});

test('custom-student: từ chối MSSV không phải số, tên quá dài, status không hợp lệ', async () => {
  const bad = [
    { fullName: 'x', studentCode: 'AB::12' },
    { fullName: 'x'.repeat(101), studentCode: '2399999999' },
    { fullName: 'x', studentCode: '2399999999', status: 'HACKED' },
  ];
  for (const body of bad) {
    assert.equal((await call('POST', '/api/auth/custom-student', { body })).status, 400, JSON.stringify(body).slice(0, 60));
  }
});

// ---------------------------------------------------------------------------
// POST /api/petitions: lọc input + nạp lịch sử từ DB + không điền mặc định
// ---------------------------------------------------------------------------
test('POST /petitions prepares a draft, locks the JWT owner and strips server-only facts before submission', async () => {
  let captured;
  const original = Drafts.prepare;
  Drafts.prepare = async args => { captured = args; return { id: 'draft-1', state: 'READY' }; };
  try {
    const r = await call('POST', '/api/petitions', { auth: student, body: {
      requestCode: 'STUDENT_CONFIRMATION', studentCode: 'OTHER',
      inputData: { purpose: 'bus pass', existingApprovedCount: 0, submissionDate: '2020-01-01', historyRequests: ['fake'] },
    } });
    assert.equal(r.status, 200);
    assert.equal(captured.studentCode, '2380600001');
    assert.equal('existingApprovedCount' in captured.inputData, false);
    assert.equal('submissionDate' in captured.inputData, false);
    assert.equal('historyRequests' in captured.inputData, false);
    assert.equal(captured.inputData.phone, undefined);
    assert.equal(r.json.data.draft.id, 'draft-1');
    assert.equal(r.json.data.decision, 'DRAFT_READY');
  } finally { Drafts.prepare = original; }
});

test('POST /petitions/:id/resume: additionalData bị lọc khóa do máy chủ tính', async () => {
  let captured = null;
  const originals = [prisma.studentRequest.findUnique, petitionWorkflowCore.resumePetitionWorkflow];
  prisma.studentRequest.findUnique = async () => ({ id: 'r1', requestCode: 'XNSV-1', studentId: 'sid-1', status: 'WAITING_STUDENT', student: { studentCode: '2380600001' } });
  petitionWorkflowCore.resumePetitionWorkflow = async (args) => { captured = args; return { success: true }; };
  try {
    const r = await call('POST', '/api/petitions/r1/resume', {
      auth: student,
      body: { additionalData: { phone: '0901234567', existingApprovedCount: 0, submissionDate: '2020-01-01' } },
    });
    assert.equal(r.status, 200);
    assert.deepEqual(captured.additionalData, { phone: '0901234567' });
  } finally {
    [prisma.studentRequest.findUnique, petitionWorkflowCore.resumePetitionWorkflow] = originals;
  }
});

test('POST /petitions/:id/documents: fileUrl nguy hiểm bị thay bằng đường dẫn kho mặc định', async () => {
  let data = null;
  const originals = [prisma.studentRequest.findUnique, prisma.requestDocument.create];
  prisma.studentRequest.findUnique = async () => ({ id: 'r1', studentId: 'sid-1' });
  prisma.requestDocument.create = async (a) => { data = a.data; return a.data; };
  try {
    const bad = await call('POST', '/api/petitions/r1/documents', { auth: student, body: { fileName: 'a.pdf', fileUrl: 'javascript:alert(1)' } });
    assert.equal(bad.status, 200);
    assert.equal(data.fileUrl, 'https://storage.eduref.edu.vn/a.pdf');
    await call('POST', '/api/petitions/r1/documents', { auth: student, body: { fileName: 'a.pdf', fileUrl: 'https://cdn.example/a.pdf' } });
    assert.equal(data.fileUrl, 'https://cdn.example/a.pdf');
  } finally {
    [prisma.studentRequest.findUnique, prisma.requestDocument.create] = originals;
  }
});

test('GET /petitions: rejects invalid status, bounds page size and filters before pagination', async () => {
  const seen = [];
  const original = prisma.studentRequest.findMany;
  prisma.studentRequest.findMany = async (a) => { seen.push(a); return []; };
  try {
    const invalid = await call('GET', '/api/petitions?status[not]=APPROVED&limit=abc', { auth: student });
    assert.equal(invalid.status, 400);
    await call('GET', '/api/petitions?limit=abc', { auth: student });
    await call('GET', '/api/petitions?limit=99999', { auth: student });
    assert.equal(seen[0].where.status, undefined);
    assert.equal(seen[0].take, 51); // One extra row tells the client whether there is another page.
    assert.equal(seen[1].take, 201);
    assert.equal(seen[1].where.studentId, 'sid-1', 'sinh viên luôn bị lọc theo chính mình');
    await call('GET', '/api/petitions?status=ESCALATED&page=2&limit=50&q=An', { auth: staff });
    assert.equal(seen[2].where.status, 'ESCALATED');
    assert.equal(seen[2].skip, 50);
    assert.ok(seen[2].where.OR.length);
  } finally {
    prisma.studentRequest.findMany = original;
  }
});

test('General Verify is reachable in one request and requires a valid session', async () => {
  const original = verifyTools.run_general_verify;
  verifyTools.run_general_verify = async () => ({ success: true, totalCases: 4, passedCases: 4, allPassed: true });
  try {
    assert.notEqual((await call('POST', '/api/agent/verify-general')).status, 200);
    const result = await call('POST', '/api/agent/verify-general', { auth: staff });
    assert.equal(result.status, 200); assert.equal(result.json.totalCases, 4);
  } finally { verifyTools.run_general_verify = original; }
});

// ---------------------------------------------------------------------------
// Che lỗi 500 + rate limit
// ---------------------------------------------------------------------------
test('lỗi 500: không lộ error.message (Prisma, mật khẩu, host), có errorId, vẫn success:false + error là chuỗi', async () => {
  const original = prisma.studentRequest.findMany;
  prisma.studentRequest.findMany = async () => {
    throw new Error('Invalid `prisma.studentRequest.findMany()` invocation: host=10.0.0.5 password=hunter2');
  };
  try {
    const r = await call('GET', '/api/petitions', { auth: staff });
    assert.equal(r.status, 500);
    assert.equal(r.json.success, false);
    assert.equal(typeof r.json.error, 'string');
    assert.match(r.json.errorId, /^ERR-[0-9A-F]{6}$/);
    assert.doesNotMatch(JSON.stringify(r.json), /prisma|hunter2|10\.0\.0\.5/i);
  } finally {
    prisma.studentRequest.findMany = original;
  }
});

test('auth routes: request thứ 61 trong 1 phút từ cùng IP -> 429 kèm Retry-After; IP khác không bị ảnh hưởng', async () => {
  const headers = { 'x-forwarded-for': '203.0.113.77' };
  let last;
  for (let i = 0; i < 61; i++) {
    last = await call('POST', '/api/auth/demo-login', { body: { accountKey: 'NOPE' }, headers });
  }
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get('retry-after')) >= 1);
  const other = await call('POST', '/api/auth/demo-login', { body: { accountKey: 'NOPE' }, headers: { 'x-forwarded-for': '203.0.113.78' } });
  assert.equal(other.status, 400);
});
