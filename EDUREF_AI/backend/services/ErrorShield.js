// backend/services/ErrorShield.js
// Che chi tiết lỗi nội bộ khỏi người dùng. `error.message` của Prisma/axios/TypeError chứa tên bảng,
// cột, câu truy vấn, URL nội bộ... nên chỉ ghi vào log máy chủ, còn phía client nhận mã tham chiếu.

import crypto from 'crypto';

const INTERNAL_ERROR_NAMES = new Set(['TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'EvalError', 'URIError']);

export const GENERIC_ERROR_MESSAGE = 'Hệ thống gặp sự cố nội bộ';

export function newErrorId() {
  return `ERR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Lỗi "nội bộ" = lỗi lập trình / hạ tầng (Prisma, axios, mạng, TypeError...), không phải thông báo
 * nghiệp vụ do mình chủ động `throw new Error('Không thể duyệt đơn: ...')`.
 * Lỗi có `expose === true` luôn được coi là an toàn để hiển thị.
 */
export function isInternalError(err) {
  if (!err || typeof err !== 'object') return false;
  if (err.expose === true) return false;
  if (INTERNAL_ERROR_NAMES.has(err.name)) return true;
  if (typeof err.name === 'string' && err.name.startsWith('PrismaClient')) return true;
  if (err.isAxiosError) return true;
  // Prisma (P2002...) và lỗi hệ thống Node (ECONNRESET, ENOENT...)
  if (typeof err.code === 'string' && /^(P\d{4}|E[A-Z0-9_]+)$/.test(err.code)) return true;
  // Prisma đôi khi ném Error thường với nội dung "Invalid `prisma.student.findUnique()` invocation"
  if (/prisma\.\w+\.\w+\(|\bprisma:/i.test(String(err.message || ''))) return true;
  return false;
}

/**
 * Dùng cho các hàm service/tool trả `{ error }` về cho LLM/client: giữ thông báo nghiệp vụ,
 * che lỗi nội bộ (ghi chi tiết vào log kèm mã tham chiếu).
 */
export function publicErrorMessage(err, context = '') {
  if (!isInternalError(err)) return err?.message || GENERIC_ERROR_MESSAGE;
  const id = newErrorId();
  console.error(`❌ [${id}]${context ? ` ${context}` : ''}:`, err);
  return `${GENERIC_ERROR_MESSAGE} (mã tham chiếu ${id}).`;
}

/**
 * Dùng cho catch của route Express: luôn trả 500 chung + mã tham chiếu, chi tiết chỉ ở log.
 */
export function respondServerError(req, res, err) {
  const id = newErrorId();
  console.error(`❌ [${id}] ${req?.method || ''} ${req?.originalUrl || ''}:`, err);
  if (res.headersSent) return;
  res.status(500).json({
    success: false,
    error: `Lỗi máy chủ nội bộ. Vui lòng thử lại; nếu lỗi lặp lại hãy báo mã tham chiếu ${id} cho quản trị viên.`,
    errorId: id,
  });
}

export default { isInternalError, publicErrorMessage, respondServerError, newErrorId, GENERIC_ERROR_MESSAGE };
