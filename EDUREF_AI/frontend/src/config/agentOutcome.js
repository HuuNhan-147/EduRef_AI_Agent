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
  if (result?.toolResult?.decision) return supplementDecisionState(result.toolResult);
  return { status: 'IDLE', finalDecision: result?.decision || null, requirementsCheck: 'PENDING',
    policiesCheck: 'PENDING', authorityCheck: 'PENDING', requestId: null, requestCode: null,
    reason: '', missingFields: [] };
}
