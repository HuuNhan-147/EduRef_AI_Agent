// backend/modules/ai-agent/memory/ConversationMemory.js
// Quản lý bộ nhớ phiên hội thoại đa lượt In-Memory với TTL 2 giờ

export class ConversationMemory {
  constructor() {
    this.sessions = new Map(); // sessionId -> { studentCode, messages: [], meta: {}, lastActive: Date }
    this.sessionTTL = 2 * 60 * 60 * 1000; // 2 giờ
  }

  getOrCreateSession(sessionId = null, studentCode = null) {
    const id = sessionId || `sess_${studentCode || 'anon'}_${Date.now()}`;
    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        studentCode,
        messages: [],
        meta: {},
        lastActive: Date.now(),
      });
    } else {
      const s = this.sessions.get(id);
      s.lastActive = Date.now();
      if (studentCode && !s.studentCode) s.studentCode = studentCode;
    }
    return id;
  }

  loadHistory(sessionId, limit = 10) {
    if (!sessionId || !this.sessions.has(sessionId)) return [];
    const session = this.sessions.get(sessionId);
    session.lastActive = Date.now();

    return session.messages.slice(-limit).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  saveUserMessage(sessionId, content, meta = null) {
    const id = this.getOrCreateSession(sessionId);
    const session = this.sessions.get(id);
    session.messages.push({
      role: 'user',
      content,
      meta,
      timestamp: Date.now(),
    });
  }

  saveAssistantMessage(sessionId, content, functionCalls = null) {
    const id = this.getOrCreateSession(sessionId);
    const session = this.sessions.get(id);
    session.messages.push({
      role: 'assistant',
      content,
      functionCalls,
      timestamp: Date.now(),
    });
  }

  setSessionMeta(sessionId, key, value) {
    if (!sessionId) return;
    const id = this.getOrCreateSession(sessionId);
    const session = this.sessions.get(id);
    session.meta[key] = value;
  }

  getSessionMeta(sessionId, key) {
    if (!sessionId || !this.sessions.has(sessionId)) return null;
    return this.sessions.get(sessionId).meta[key] || null;
  }

  clearSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
    }
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.sessionTTL) {
        this.sessions.delete(id);
      }
    }
  }
}

export const conversationMemory = new ConversationMemory();
export default conversationMemory;
