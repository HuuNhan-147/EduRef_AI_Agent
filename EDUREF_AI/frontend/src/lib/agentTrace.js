const STEP_LABELS = {
  START: 'Đã tiếp nhận yêu cầu',
  CONTEXT_RESOLVED: 'Đã nối ngữ cảnh hội thoại',
  REASONING: 'Đang phân tích yêu cầu và dữ kiện',
  MULTIMODAL_VISION: 'Đang đọc tài liệu được cung cấp',
  VISION_RESULT: 'Đã nhận kết quả đọc tài liệu',
  TOOL_INVOCATION: 'Đang gọi công cụ nghiệp vụ',
  TOOL_OBSERVATION: 'Đã nhận kết quả từ công cụ',
  SYNTHESIS: 'Đang tổng hợp phản hồi',
  MAX_STEPS_ESCALATION: 'Đã chạm giới hạn xử lý; cần cán bộ xem xét',
  DECISION_FINAL: 'Đã nhận kết quả xử lý',
  ERROR: 'Có lỗi trong lượt xử lý',
  USER_ABORTED: 'Đã nhận tín hiệu dừng xử lý',
};

export function visibleTraceStep(entry) {
  const label = STEP_LABELS[entry.step];
  if (!label || !entry.id) return null;
  return { id: entry.id, step: entry.step, label };
}

export function createTraceTracker(onChange, limit = 60) {
  let traces = {};
  let active = null;
  const uncertainSessions = new Set();
  const publish = () => onChange({ ...traces });
  const update = (patch) => {
    if (!active) return;
    traces = { ...traces, [active.turnId]: { ...traces[active.turnId], ...patch } };
    publish();
  };

  const finish = (status, data = {}) => {
    if (!active || (data.sessionId && data.sessionId !== active.sessionId)) return;
    const current = traces[active.turnId];
    if (!['running', 'stopping'].includes(current.status)) return;
    const durationMs = typeof data.totalDuration === 'number' && Number.isFinite(data.totalDuration) && data.totalDuration >= 0 ? data.totalDuration : null;
    update({ status, durationMs });
    active.accepting = false;
  };

  return {
    start(turnId, sessionId) {
      if (active && ['running', 'stopping'].includes(traces[active.turnId]?.status)) {
        uncertainSessions.add(active.sessionId);
        update({ status: 'interrupted' });
      }
      const entries = Object.entries(traces).slice(-(limit - 1));
      traces = Object.fromEntries(entries);
      active = { turnId, sessionId, accepting: false };
      traces[turnId] = { turnId, sessionId, status: 'running', steps: [], durationMs: null, limited: uncertainSessions.has(sessionId) };
      publish();
    },
    log(entry) {
      if (!active || entry.sessionId !== active.sessionId || traces[active.turnId].status !== 'running' || uncertainSessions.has(active.sessionId)) return;
      if (traces[active.turnId].steps.some((item) => item.id === entry.id)) return;
      if (entry.step === 'START') {
        if (active.accepting) {
          // No run ID exists: overlapping starts cannot be assigned safely.
          uncertainSessions.add(active.sessionId);
          active.accepting = false;
          update({ steps: [], limited: true });
          return;
        }
        active.accepting = true;
      }
      if (!active.accepting) return;
      const step = visibleTraceStep(entry);
      const current = traces[active.turnId];
      if (!step || current.steps.some((item) => item.id === step.id)) return;
      update({ steps: [...current.steps, step].slice(-30) });
    },
    end(data) {
      if (!active || data.sessionId !== active.sessionId) return;
      if (uncertainSessions.has(active.sessionId)) return;
      finish(data.isAborted ? 'stopped' : 'completed', data);
    },
    error(data) {
      if (!data.sessionId || uncertainSessions.has(data.sessionId)) return;
      finish('failed', data);
    },
    requestStop() {
      if (!active || !['running', 'stopping'].includes(traces[active.turnId]?.status)) return;
      uncertainSessions.add(active.sessionId);
      active.accepting = false;
      update({ status: 'stopping', limited: true });
    },
    stopped(data) {
      if (data.sessionId) finish('stopped', data);
    },
    settle(message) {
      if (!active) return;
      const status = traces[active.turnId]?.status;
      if (status === 'stopping') finish('stopRequested');
      else if (status === 'running') {
        if (message?.isError) finish('failed');
        else if (uncertainSessions.has(active.sessionId)) finish('limited');
        else if (message?.sender === 'agent' && !message.isStreaming) finish('completed');
        else finish('interrupted');
      }
    },
    disconnect() {
      if (!active) return;
      uncertainSessions.add(active.sessionId);
      active.accepting = false;
      finish('disconnected');
    },
    changeSession(sessionId) {
      if (active && active.sessionId !== sessionId) {
        if (['running', 'stopping'].includes(traces[active.turnId]?.status)) update({ status: 'interrupted' });
        active = null;
      }
    },
  };
}
