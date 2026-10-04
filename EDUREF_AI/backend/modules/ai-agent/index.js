import AgentOrchestrator from './core/AgentOrchestrator.js';

/**
 * Entrypoint thực thi EduRef AI Agent
 */
export async function runAgent({
  message,
  currentUser = null,
  socket = null,
  sessionId = null,
  runId = null,
  onChunk = null,
  onProgress = null,
  signal = null,
  attachments = null,
  inputData = null,
}) {
  const orchestrator = new AgentOrchestrator(socket, sessionId, { runId, onProgress, signal });
  const result = await orchestrator.run({ message, currentUser, onChunk, attachments, inputData });
  return { ...result, runId: orchestrator.runId };
}

export default { runAgent };
