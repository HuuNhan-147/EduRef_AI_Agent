// backend/modules/ai-agent/memory/sessionScope.js
// sessionId do client tự đặt (frontend dùng `sess_<MSSV>_<timestamp>` nên đoán được).
// Gắn tiền tố chủ sở hữu đã xác thực để hai người dùng không bao giờ dùng chung
// ConversationMemory (lịch sử chat đưa vào LLM) dù trùng/đoán đúng sessionId.

export function scopeSessionId(user, sessionId) {
  const raw = sessionId ? String(sessionId) : '';
  const owner = user?.studentCode || user?.username || user?.id || null;
  if (!owner) return raw || null;
  const prefix = `${owner}::`;
  if (!raw) return `${prefix}sess_${Date.now()}`;
  // Idempotent: client có thể gửi lại sessionId đã được scope từ phản hồi trước
  return raw.startsWith(prefix) ? raw : `${prefix}${raw}`;
}

export default { scopeSessionId };
