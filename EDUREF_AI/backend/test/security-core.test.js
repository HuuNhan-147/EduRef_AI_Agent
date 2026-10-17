// Regression cho các bản vá bảo mật thuần logic (không DB, không mạng).
import '../testSupport/securityTestEnv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripServerAuthoritativeFields, sanitizeDocumentUrl, SERVER_AUTHORITATIVE_INPUT_KEYS } from '../services/ClientInputGuard.js';
import { evaluateStudentConfirmation } from '../services/StudentConfirmationDecisionService.js';
import { scopeSessionId } from '../modules/ai-agent/memory/sessionScope.js';
import { isInsecureJwtSecret, KNOWN_PUBLIC_JWT_SECRETS } from '../config/jwtSecret.js';
import { isInternalError, publicErrorMessage, GENERIC_ERROR_MESSAGE } from '../services/ErrorShield.js';
import { checkRateLimit } from '../middlewares/rateLimit.js';
import { ConversationMemory } from '../modules/ai-agent/memory/ConversationMemory.js';
import { agentTerminalLogger } from '../modules/ai-agent/core/AgentTerminalLogger.js';

const baseInput = {
  formCode: 'GENERAL_CONFIRMATION',
  purpose: 'Làm vé tháng xe buýt',
  phone: '0901234567',
  pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
};

// ---------------------------------------------------------------------------
// Chặn client tự khai các khóa do máy chủ tính (né quy chế)
// ---------------------------------------------------------------------------
test('policy: baseline - khóa 2022 quá hạn KHÔNG tự duyệt, đã có 1 bản KHÔNG tự duyệt', () => {
  const nhan = { studentCode: '2280602154', status: 'ACTIVE' };
  assert.notEqual(evaluateStudentConfirmation({ student: nhan, inputData: baseInput }).decision, 'AUTO_APPROVED');

  const an = { studentCode: '2380600001', status: 'ACTIVE' };
  const history = [{ status: 'APPROVED', createdAt: new Date(), inputData: { formCode: 'GENERAL_CONFIRMATION' } }];
  const r = evaluateStudentConfirmation({ student: an, inputData: { ...baseInput, historyRequests: history } });
  assert.equal(r.rule, 'REQ_REISSUE_REASON');
});

test('policy: submissionDate do client gửi bị loại nên không né được điều hướng nợ môn', () => {
  const nhan = { studentCode: '2280602154', status: 'ACTIVE' };
  // Chứng minh mối đe dọa là có thật nếu không lọc...
  const unfiltered = evaluateStudentConfirmation({ student: nhan, inputData: { ...baseInput, submissionDate: '2025-01-01' } });
  assert.equal(unfiltered.decision, 'AUTO_APPROVED', 'hàm thuần tin submissionDate nên lớp lọc ở biên là bắt buộc');
  // ...và lớp lọc chặn được nó.
  const filtered = evaluateStudentConfirmation({
    student: nhan,
    inputData: stripServerAuthoritativeFields({ ...baseInput, submissionDate: '2025-01-01' }),
  });
  assert.notEqual(filtered.decision, 'AUTO_APPROVED');
});

test('policy: existingApprovedCount=0 do client gửi bị loại nên không né được hạn ngạch cấp lại', () => {
  const an = { studentCode: '2380600001', status: 'ACTIVE' };
  const history = [{ status: 'APPROVED', createdAt: new Date(), inputData: { formCode: 'GENERAL_CONFIRMATION' } }];
  const clientInput = stripServerAuthoritativeFields({ ...baseInput, existingApprovedCount: 0 });
  const r = evaluateStudentConfirmation({ student: an, inputData: { ...clientInput, historyRequests: history } });
  assert.equal(r.rule, 'REQ_REISSUE_REASON');
});

test('stripServerAuthoritativeFields: loại đủ khóa, giữ khóa hợp lệ, không đột biến, đầu vào lạ -> {}', () => {
  const src = { purpose: 'x', repeatReason: 'mất giấy', pickupCampus: 'A' };
  for (const key of SERVER_AUTHORITATIVE_INPUT_KEYS) src[key] = 'attacker';
  const copy = { ...src };
  const out = stripServerAuthoritativeFields(src);
  for (const key of SERVER_AUTHORITATIVE_INPUT_KEYS) assert.ok(!(key in out), `phải loại ${key}`);
  assert.equal(out.purpose, 'x');
  assert.equal(out.repeatReason, 'mất giấy');
  assert.deepEqual(src, copy, 'không được sửa đối tượng gốc');
  for (const v of [null, undefined, [], 'text', 5]) assert.deepEqual(stripServerAuthoritativeFields(v), {});
});

test('sanitizeDocumentUrl: chặn javascript:/data:/file:/ftp:/protocol-relative, cho phép https và /đường-dẫn', () => {
  const fallback = 'https://storage.eduref.edu.vn/a.pdf';
  for (const bad of ['javascript:alert(1)', 'data:text/html;base64,AAA', 'file:///etc/passwd', '//evil.com/x', 'ftp://x/y', '', null, undefined, 'a b']) {
    assert.equal(sanitizeDocumentUrl(bad, 'a.pdf'), fallback, String(bad));
  }
  assert.equal(sanitizeDocumentUrl('https://ok.example/a.pdf', 'a.pdf'), 'https://ok.example/a.pdf');
  assert.equal(sanitizeDocumentUrl('/demo_certs/x.png', 'a.pdf'), '/demo_certs/x.png');
  assert.equal(sanitizeDocumentUrl('https://x/' + 'a'.repeat(3000), 'a.pdf'), fallback, 'URL quá dài bị loại');
  assert.equal(sanitizeDocumentUrl('', '../../x y.pdf'), 'https://storage.eduref.edu.vn/..%2F..%2Fx%20y.pdf', 'tên file được encode');
});

// ---------------------------------------------------------------------------
// Phiên, JWT secret
// ---------------------------------------------------------------------------
test('scopeSessionId: tách người dùng, idempotent, giữ nguyên khi không có chủ', () => {
  const a = scopeSessionId({ studentCode: 'A001' }, 'sess_1');
  const b = scopeSessionId({ studentCode: 'B002' }, 'sess_1');
  assert.notEqual(a, b);
  assert.equal(scopeSessionId({ studentCode: 'A001' }, a), a);
  assert.equal(scopeSessionId({ username: 'staff_daotao' }, 'x'), 'staff_daotao::x');
  assert.match(scopeSessionId({ studentCode: 'A001' }, ''), /^A001::sess_\d+$/);
  assert.equal(scopeSessionId(null, 'raw'), 'raw');
});

test('jwtSecret: nhận diện khóa mẫu công khai, quá ngắn, rỗng; chấp nhận khóa mạnh', () => {
  for (const known of KNOWN_PUBLIC_JWT_SECRETS) assert.ok(isInsecureJwtSecret(known));
  assert.ok(isInsecureJwtSecret('short'));
  assert.ok(isInsecureJwtSecret(undefined));
  assert.ok(isInsecureJwtSecret(''));
  assert.ok(!isInsecureJwtSecret('a'.repeat(64)));
});

// ---------------------------------------------------------------------------
// ErrorShield
// ---------------------------------------------------------------------------
test('ErrorShield.isInternalError: phân loại lỗi nội bộ và lỗi nghiệp vụ', () => {
  const prismaLike = Object.assign(new Error('Invalid `prisma.student.findUnique()` invocation'), { name: 'PrismaClientKnownRequestError', code: 'P2002' });
  assert.ok(isInternalError(prismaLike));
  assert.ok(isInternalError(new TypeError('x is not a function')));
  assert.ok(isInternalError(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' })));
  assert.ok(isInternalError(new Error('Invalid `prisma.user.findMany()` invocation')));
  assert.ok(isInternalError({ isAxiosError: true, message: 'Request failed' }));
  assert.ok(!isInternalError(new Error('Không thể duyệt đơn: Vi phạm quy chế')));
  assert.ok(!isInternalError(Object.assign(new Error('chậm'), { code: 'ESTREAMTIMEOUT', expose: true })));
  assert.ok(!isInternalError(null));
});

test('ErrorShield.publicErrorMessage: che lỗi nội bộ (kèm mã tham chiếu), giữ thông báo nghiệp vụ', () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const masked = publicErrorMessage(new TypeError('chi tiết bí mật xyz'));
    assert.ok(!masked.includes('bí mật'));
    assert.ok(masked.startsWith(GENERIC_ERROR_MESSAGE));
    assert.match(masked, /ERR-[0-9A-F]{6}/);
  } finally {
    console.error = originalError;
  }
  assert.equal(publicErrorMessage(new Error('Hồ sơ đã được xử lý')), 'Hồ sơ đã được xử lý');
});

// ---------------------------------------------------------------------------
// Rate limit, bộ nhớ hội thoại, terminal log
// ---------------------------------------------------------------------------
test('missing AI configuration gives students a recovery message without backend variable names', () => {
  for (const provider of ['OPENAI', 'GEMINI']) {
    const text = publicErrorMessage(new Error(`${provider}_API_KEY chưa được cấu hình. Vui lòng kiểm tra file .env.`));
    assert.doesNotMatch(text, /API_KEY|\.env/);
    assert.match(text, /Dịch vụ AI hiện chưa sẵn sàng/);
  }
});
test('rateLimit: cho phép tới max rồi chặn kèm retryAfter; khóa độc lập nhau', () => {
  const opts = { max: 3, windowMs: 60_000 };
  for (let i = 0; i < 3; i++) assert.ok(checkRateLimit('core-test:k1', opts).allowed);
  const blocked = checkRateLimit('core-test:k1', opts);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1 && blocked.retryAfterSec <= 60);
  assert.ok(checkRateLimit('core-test:k2', opts).allowed);
});

test('ConversationMemory: giới hạn 200 tin/phiên, dọn phiên hết hạn, timer không giữ tiến trình sống', () => {
  const memory = new ConversationMemory();
  assert.equal(memory.cleanupTimer.hasRef(), false);
  for (let i = 0; i < 250; i++) memory.saveUserMessage('s1', `m${i}`);
  const messages = memory.sessions.get('s1').messages;
  assert.equal(messages.length, 200);
  assert.equal(messages.at(-1).content, 'm249');
  memory.sessions.get('s1').lastActive = Date.now() - 3 * 3600 * 1000;
  memory.cleanupExpiredSessions();
  assert.equal(memory.sessions.has('s1'), false);
  clearInterval(memory.cleanupTimer);
});

test('AgentTerminalLogger: log có chủ chỉ phát cho phòng của chủ + staff, log hệ thống phát chung', () => {
  const calls = [];
  const chain = (rooms) => ({ to: (room) => chain([...rooms, room]), emit: (event) => calls.push({ rooms, event }) });
  agentTerminalLogger.setIO({ to: (room) => chain([room]), emit: (event) => calls.push({ rooms: ['*'], event }) });
  try {
    agentTerminalLogger.log({ step: 'X', text: 'tin nhắn riêng', sessionId: 'A001::sess_1' });
    agentTerminalLogger.log({ step: 'Y', text: 'harness' });
  } finally {
    agentTerminalLogger.setIO(null);
  }
  const originalLog = calls.slice(0, 2);
  assert.deepEqual(originalLog[0].rooms, ['user:A001', 'staff']);
  assert.deepEqual(originalLog[1].rooms, ['*']);
});

test('AgentTerminalLogger.getRecentLogs: sinh viên chỉ thấy log của mình + hệ thống, staff thấy tất cả', () => {
  agentTerminalLogger.buffer = [];
  agentTerminalLogger.log({ text: 'A-private', sessionId: 'A::s' });
  agentTerminalLogger.log({ text: 'B-private', sessionId: 'B::s' });
  agentTerminalLogger.log({ text: 'system' });
  const texts = (viewer) => agentTerminalLogger.getRecentLogs(50, viewer).map((e) => e.text).sort();
  assert.deepEqual(texts({ key: 'A', isStaff: false }), ['A-private', 'system']);
  assert.deepEqual(texts({ key: 'B', isStaff: false }), ['B-private', 'system']);
  assert.deepEqual(texts({ key: null, isStaff: false }), ['system']);
  assert.equal(texts({ key: 'x', isStaff: true }).length, 3);
  agentTerminalLogger.buffer = [];
});
