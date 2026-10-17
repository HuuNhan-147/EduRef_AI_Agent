import { displayLabel, FORM_LABELS } from './displayText.js';

export function isOpenWorkflow(draft) {
  if (!draft) return false;
  if (['REJECTED', 'CANCELLED'].includes(draft.state)) return false;
  return draft.state !== 'SUBMITTED' || draft.result?.status === 'WAITING_STUDENT';
}
export function workflowOutcome(draft) {
  const { id, revision, formCode, formName, state, notice, resolution, targetForm, result, missingFields } = draft;
  return { id, revision, formCode, formName: FORM_LABELS[formCode] || formName, state, notice, resolution,
    targetForm, result, missingFields };
}
export function reconcileWorkflowMessages(messages, draft) {
  if (!draft?.id) return messages;
  const key = `workflow_${draft.id}`;
  const index = messages.findIndex(message => message.id === key || message.workflowOutcome?.id === draft.id || message.toolResult?.draft?.id === draft.id);
  const outcome = workflowOutcome(draft);
  if (index >= 0 && JSON.stringify(messages[index].workflowOutcome) === JSON.stringify(outcome)) return messages;
  const entry = { ...(index >= 0 ? messages[index] : {}), id: index >= 0 ? messages[index].id : key, sender: 'agent',
    text: `${outcome.formName}: ${displayLabel(draft.state === 'REJECTED' ? 'REJECTED_POLICY' : draft.result?.status || draft.state)}.`,
    workflowOutcome: outcome, timestamp: index >= 0 ? messages[index].timestamp
      : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
  const append = (previous, item) => previous.at(-1)?.isStreaming
    ? [...previous.slice(0, -1), item, previous.at(-1)] : [...previous, item];
  // Show a newly completed task once at the current end of the conversation.
  // Subsequent polls and later chat replies leave it at that historical position.
  if (index >= 0 && messages[index].workflowOutcome && isOpenWorkflow(messages[index].workflowOutcome) && !isOpenWorkflow(draft)) {
    return append(messages.filter((_, i) => i !== index), { ...entry,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) });
  }
  return index >= 0 ? messages.map((message, i) => i === index ? entry : message) : append(messages, entry);
}
