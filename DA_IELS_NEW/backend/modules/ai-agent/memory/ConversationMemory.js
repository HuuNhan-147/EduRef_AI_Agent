// backend/modules/ai-agent/memory/ConversationMemory.js
// Quản lý bộ nhớ phiên hội thoại đa người dùng (In-Memory + TTL an toàn)

export class ConversationMemory {
  constructor() {
    this.sessions = new Map(); // sessionId -> { messages: [], meta: {}, lastActive: Date }
    this.sessionTTL = 2 * 60 * 60 * 1000; // 2 giờ
  }

  getOrCreateSession(userId, sessionId = null) {
    const id = sessionId || (userId ? `sess_${userId}_${Date.now()}` : `anon_${Date.now()}`);
    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        userId,
        messages: [],
        meta: {},
        lastActive: Date.now(),
      });
    } else {
      const s = this.sessions.get(id);
      s.lastActive = Date.now();
    }
    return id;
  }

  loadHistory(userId, sessionId, limit = 8) {
    if (!sessionId || !this.sessions.has(sessionId)) return [];
    const session = this.sessions.get(sessionId);
    session.lastActive = Date.now();
    return session.messages.slice(-limit).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      content: msg.content,
      _timestamp: msg.timestamp,
    }));
  }

  saveUserMessage(userId, sessionId, content, meta = null) {
    const id = this.getOrCreateSession(userId, sessionId);
    const session = this.sessions.get(id);
    session.messages.push({
      role: "user",
      content,
      meta,
      timestamp: Date.now(),
    });
  }

  saveAssistantMessage(userId, sessionId, content, functionCalls = null) {
    const id = this.getOrCreateSession(userId, sessionId);
    const session = this.sessions.get(id);
    session.messages.push({
      role: "assistant",
      content,
      functionCalls,
      timestamp: Date.now(),
    });
  }

  getSessionSummary(userId, sessionId) {
    if (!sessionId || !this.sessions.has(sessionId)) return null;
    const session = this.sessions.get(sessionId);
    const meta = session.meta;
    if (!meta || !meta.lastViewedEquipment) return null;
    return `THIẾT BỊ VỪA XEM: ${meta.lastViewedEquipment.name} (${meta.lastViewedEquipment.assetCode || meta.lastViewedEquipment.modelCode})`;
  }

  setSessionMeta(sessionId, key, value) {
    if (!sessionId) return;
    const id = this.getOrCreateSession(null, sessionId);
    const session = this.sessions.get(id);
    session.meta[key] = value;
  }
}

export const conversationMemory = new ConversationMemory();
