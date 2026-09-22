import AgentOrchestrator from './core/AgentOrchestrator.js';

/**
 * Entrypoint thực thi EduRef AI Agent
 */
export async function runAgent({ message, currentUser = null, socket = null, sessionId = null, onChunk = null, attachments = null, inputData = null }) {
  const orchestrator = new AgentOrchestrator(socket, sessionId);
  return await orchestrator.run({ message, currentUser, onChunk, attachments, inputData });
}

export default { runAgent };
