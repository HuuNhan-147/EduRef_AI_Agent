// backend/modules/ai-agent/core/AgentTerminalLogger.js
// LIVE AGENT TERMINAL LOGGER — Bắn log thời gian thực về Web Console (Chuẩn hoá theo DA_IELS_NEW)

class AgentTerminalLoggerManager {
  constructor() {
    this.buffer = [];
    this.maxBufferSize = 300;
    this.io = null;
  }

  setIO(ioInstance) {
    this.io = ioInstance;
  }

  log({ step, message, text, type = 'info', meta = null, details = null, sessionId = null }) {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
    const timeFormatted = new Date().toLocaleTimeString('vi-VN');
    const logText = text || message || '';
    const logDetails = details || meta || null;

    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sessionId,
      timestamp,
      timeFormatted,
      step: step || type.toUpperCase(),
      type: type.toUpperCase(), // 'INFO', 'REASONING', 'TOOL_CALL', 'TOOL_RESULT', 'DECISION', 'ERROR', 'START'
      text: logText,
      message: logText,
      details: logDetails,
      meta: logDetails,
    };

    // 1. Lưu vào buffer xoay vòng trong RAM
    this.buffer.push(logEntry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // 2. In ra console backend
    const prefixMap = {
      INFO: 'ℹ️',
      START: 'ℹ️',
      REASONING: '🧠',
      THOUGHT: '🧠',
      TOOL_CALL: '🛠️',
      TOOL_INVOCATION: '🛠️',
      TOOL_RESULT: '📥',
      TOOL_OBSERVATION: '📥',
      DECISION: '⚡',
      COMPLETE: '⚡',
      AUDIT: '🛡️',
      ERROR: '❌',
    };
    const prefix = prefixMap[logEntry.type] || prefixMap[step] || '👉';
    console.log(`[${timestamp}] ${prefix} [${logEntry.step}] ${logText}`);

    // 3. Broadcast thời gian thực tới TẤT CẢ web client qua Socket.IO
    if (this.io) {
      try {
        this.io.emit('agent_terminal_log', logEntry);
      } catch (err) {
        console.warn('⚠️ [AgentTerminalLogger] Lỗi emit socket toàn cục:', err.message);
      }
    }

    return logEntry;
  }

  getRecentLogs(limit = 150) {
    return this.buffer.slice(-limit);
  }

  clear() {
    this.buffer = [];
    if (this.io) {
      try {
        this.io.emit('agent_terminal_clear');
      } catch (err) {
        console.warn('⚠️ [AgentTerminalLogger] Lỗi emit clear:', err.message);
      }
    }
  }
}

export const agentTerminalLogger = new AgentTerminalLoggerManager();

// Class bọc phục vụ AgentOrchestrator hiện tại
export class AgentTerminalLogger {
  constructor(socket = null, sessionId = null) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.stepIndex = 1;
  }

  log({ step, message, text, type = 'info', meta = null, details = null }) {
    const currentStep = step || `STEP_${this.stepIndex++}`;
    
    // Ghi vào manager toàn cục để lưu buffer và broadcast
    const entry = agentTerminalLogger.log({
      step: currentStep,
      message,
      text,
      type,
      meta,
      details,
      sessionId: this.sessionId,
    });

    // Nếu có socket riêng và manager chưa có io, emit fallback
    if (this.socket && !agentTerminalLogger.io) {
      try {
        this.socket.emit('agent_terminal_log', entry);
      } catch (err) {
        console.warn('⚠️ [AgentTerminalLogger] Lỗi emit socket riêng:', err.message);
      }
    }

    return entry;
  }
}

export default AgentTerminalLogger;
