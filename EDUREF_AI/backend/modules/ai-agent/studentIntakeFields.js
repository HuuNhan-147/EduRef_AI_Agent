const LIMITS = Object.freeze({ purpose: 500, recipient: 160, note: 1000 });

function clean(value, limit) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, limit + 1);
}

function isGenericPurpose(value) {
  const normalized = value.toLocaleLowerCase('vi').replace(/[.!?]+$/u, '').trim()
    .replace(/^(?:tôi|em|mình)\s+/u, '')
    .replace(/^(?:muốn|cần)\s+/u, '')
    .replace(/^(?:xin|đăng ký|lấy|cấp|cho tôi|cho em|hãy cấp)\s+/u, '');
  return /^(?:một\s+)?(?:giấy|đơn)\s+xác\s+nhận\s+sinh\s+viên$/u.test(normalized)
    || normalized === 'giấy';
}

export function normalizeIntakeFields(source = {}) {
  return {
    purpose: clean(source.purpose, LIMITS.purpose),
    recipient: clean(source.recipient, LIMITS.recipient),
    note: clean(source.note, LIMITS.note),
  };
}

export function validateIntakeFields(source = {}) {
  const fields = normalizeIntakeFields(source);
  const errors = {};
  if (!fields.purpose) errors.purpose = 'Bạn cần cho biết mục đích sử dụng giấy xác nhận.';
  else if (fields.purpose.length < 4) errors.purpose = 'Mục đích cần rõ hơn một chút để cán bộ hiểu yêu cầu.';
  else if (isGenericPurpose(fields.purpose)) errors.purpose = 'Bạn cần giấy xác nhận sinh viên để làm gì? Hãy nêu mục đích sử dụng cụ thể.';
  else if (fields.purpose.length > LIMITS.purpose) errors.purpose = `Mục đích tối đa ${LIMITS.purpose} ký tự.`;
  if (fields.recipient.length > LIMITS.recipient) errors.recipient = `Nơi tiếp nhận tối đa ${LIMITS.recipient} ký tự.`;
  if (fields.note.length > LIMITS.note) errors.note = `Ghi chú tối đa ${LIMITS.note} ký tự.`;
  return { fields, errors, valid: Object.keys(errors).length === 0 };
}

export function mergeIntakeFields(previous = {}, extracted = {}, provided = {}) {
  const next = { ...normalizeIntakeFields(previous) };
  for (const key of Object.keys(next)) {
    const value = provided[key] ?? extracted[key];
    if (typeof value === 'string' && value.trim()) next[key] = value;
  }
  return normalizeIntakeFields(next);
}
