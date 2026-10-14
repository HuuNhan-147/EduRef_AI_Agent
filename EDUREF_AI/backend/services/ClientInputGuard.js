// backend/services/ClientInputGuard.js
// Ranh giới tin cậy cho inputData: các khóa dưới đây do MÁY CHỦ tự tính từ DB/đồng hồ,
// dữ liệu đến từ client (REST body, Socket.IO, tham số tool do LLM sinh) không được phép gán.
// Nếu để lọt, sinh viên có thể tự khai `existingApprovedCount: 0` để né hạn ngạch cấp lại,
// hoặc `submissionDate` lùi về quá khứ để né điều hướng sang Biểu mẫu nợ môn.

export const SERVER_AUTHORITATIVE_INPUT_KEYS = Object.freeze([
  'submissionDate',
  'referenceDate',
  'existingApprovedCount',
  'historyRequests',
  'isOverdueCohort',
  'isReissue',
  'originalRequestId',
  'originalRequestCode',
  'originalApprovedAt',
  'hasSchedule',
  'enrolledCredits',
  'completedCredits',
  'accumulatedCredits',
  'credits',
]);

/**
 * Trả về bản sao của inputData đã loại bỏ các khóa thuộc thẩm quyền máy chủ.
 * Luôn trả về object thuần (kể cả khi đầu vào null/mảng/chuỗi).
 */
export function stripServerAuthoritativeFields(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const clean = { ...data };
  for (const key of SERVER_AUTHORITATIVE_INPUT_KEYS) {
    delete clean[key];
  }
  return clean;
}

export default { SERVER_AUTHORITATIVE_INPUT_KEYS, stripServerAuthoritativeFields };
