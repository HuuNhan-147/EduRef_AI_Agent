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

    // sessionId đã được scope theo chủ sở hữu ("<MSSV|username>::<sess>", xem sessionScope.js).
    // Log của phiên nào chỉ được phát cho chính chủ + cán bộ, vì `meta` chứa kết quả tool
    // (CCCD, SĐT, địa chỉ...) và `text` chứa nguyên văn tin nhắn của sinh viên.
    const sep = typeof sessionId === 'string' ? sessionId.indexOf('::') : -1;
    const ownerKey = sep > 0 ? sessionId.slice(0, sep) : null;

    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sessionId,
      ownerKey,
      createdAt: new Date().toISOString(),
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

    // 3. Phát thời gian thực qua Socket.IO: log có chủ sở hữu chỉ tới phòng của chủ đó + phòng cán bộ;
    //    log hệ thống/verify (không gắn phiên) vẫn phát cho tất cả để giám khảo theo dõi.
    if (this.io) {
      try {
        if (ownerKey) {
          this.io.to(`user:${ownerKey}`).to('staff').emit('agent_terminal_log', logEntry);
        } else {
          this.io.emit('agent_terminal_log', logEntry);
        }
      } catch (err) {
        console.warn('⚠️ [AgentTerminalLogger] Lỗi emit socket toàn cục:', err.message);
      }
    }

    return logEntry;
  }

  /**
   * @param {number} limit
   * @param {{ key: string|null, isStaff: boolean }|null} viewer  null = nội bộ (không lọc)
   */
  getRecentLogs(limit = 150, viewer = null) {
    const visible = viewer
      ? this.buffer.filter((e) => !e.ownerKey || viewer.isStaff || (viewer.key && e.ownerKey === viewer.key))
      : this.buffer;
    return visible.slice(-limit);
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
