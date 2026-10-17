import { supplementDecisionState } from './petitionSupplement.js';

export function matchesAgentResponse(active, response) {
  return Boolean(active) && (!response.clientRequestId || response.clientRequestId === active.clientRequestId)
    && (!response.sessionId || response.sessionId === active.sessionId || response.sessionId.endsWith(`::${active.sessionId}`));
}

export function completeAgentMessage(messages, result, durationMs) {
  const previous = messages.at(-1);
  const message = { id: `agent_${Date.now()}`, sender: 'agent', text: result.reply || '',
    isStreaming: false, toolResult: result.toolResult, decision: result.decision,
    durationMs, modelUsed: result.modelUsed, executionEvidence: result.executionEvidence || [],
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
  return previous?.sender === 'agent' && previous.isStreaming
    ? [...messages.slice(0, -1), { ...previous, ...message, text: result.reply || previous.text }]
    : [...messages, message];
}

export function agentDecisionState(result) {
  if (result?.toolResult?.draft) {
    const draft = result.toolResult.draft;
    if (draft.state === 'SUBMITTED' && draft.result) return supplementDecisionState(draft.result);
    if (draft.state === 'REJECTED') return { status: 'REJECTED', finalDecision: 'TỪ CHỐI · ĐÃ KẾT THÚC',
      requirementsCheck: 'NOT_REQUIRED', policiesCheck: 'FAILED', authorityCheck: 'NOT_REQUIRED',
      reason: `${draft.resolution?.reason || draft.notice} Quy trình này đã kết thúc. ${draft.resolution?.nextStep || ''}`,
      requestId: draft.result?.requestId || null, requestCode: draft.result?.requestCode || null,
      sha256Proof: draft.result?.sha256Proof || null, missingFields: [] };
    return { status: 'DRAFT', finalDecision: draft.state === 'READY' ? 'CHỜ XÁC NHẬN NỘP' : draft.state === 'BLOCKED' ? 'CẦN KIỂM TRA ĐIỀU KIỆN' : 'ĐANG CHUẨN BỊ HỒ SƠ',
      requirementsCheck: draft.state === 'READY' ? 'PASSED' : 'INCOMPLETE', policiesCheck: 'PENDING', authorityCheck: 'PENDING',
      reason: 'Thông tin đang được lưu trong bản nháp. Quyết định chính thức chỉ thực hiện sau khi bạn xác nhận nộp.',
      requestId: null, requestCode: null, sha256Proof: null, missingFields: draft.missingFields || [] };
  }
  if (result?.toolResult?.decision) return supplementDecisionState(result.toolResult);
  return { status: 'IDLE', finalDecision: result?.decision || null, requirementsCheck: 'PENDING',
    policiesCheck: 'PENDING', authorityCheck: 'PENDING', requestId: null, requestCode: null,
    reason: '', missingFields: [] };
}
