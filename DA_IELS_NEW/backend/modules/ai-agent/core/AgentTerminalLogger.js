// backend/modules/ai-agent/core/AgentTerminalLogger.js
// ========================================================
// LIVE AGENT TERMINAL LOGGER — Bắn log thời gian thực về Web Console
// ========================================================

class AgentTerminalLogger {
  constructor() {
    this.buffer = [];
    this.maxBufferSize = 300;
    this.io = null;
  }

  setIO(ioInstance) {
    this.io = ioInstance;
  }

  log({ type = "INFO", text, details = null, sessionId = null }) {
    const timestamp = new Date().toISOString();
    const timeFormatted = new Date().toLocaleTimeString("vi-VN");

    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      timeFormatted,
      type, // 'REQUEST' | 'INTENT' | 'REASONING' | 'TOOL_CALL' | 'TOOL_RESULT' | 'DECISION' | 'ERROR' | 'INFO'
      text,
      details,
      sessionId,
    };

    // Lưu vào buffer xoay vòng
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Broadcast thời gian thực tới tất cả web client qua Socket.IO
    if (this.io) {
      try {
        this.io.emit("agent_terminal_log", entry);
      } catch (err) {
        console.warn("[AgentTerminalLogger] Emit error:", err.message);
      }
    }

    return entry;
  }

  getRecentLogs(limit = 100) {
    return this.buffer.slice(-limit);
  }

  clear() {
    this.buffer = [];
    if (this.io) {
      this.io.emit("agent_terminal_clear");
    }
  }
}

export const agentTerminalLogger = new AgentTerminalLogger();
export default agentTerminalLogger;
