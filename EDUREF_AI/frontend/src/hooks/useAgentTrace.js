import { useCallback, useEffect, useRef, useState } from 'react';
import { createTraceTracker } from '../lib/agentTrace';

export default function useAgentTrace(socket, sessionId, messages, isProcessing) {
  const [traces, setTraces] = useState({});
  const trackerRef = useRef(null);
  const turnIdRef = useRef(null);
  if (!trackerRef.current) trackerRef.current = createTraceTracker(setTraces);
  const tracker = trackerRef.current;

  useEffect(() => {
    tracker.changeSession(sessionId);
  }, [tracker, sessionId]);

  useEffect(() => {
    const listeners = {
      agent_terminal_log: tracker.log,
      agent_response_end: tracker.end,
      agent_error: tracker.error,
      agent_stopped: tracker.stopped,
      disconnect: tracker.disconnect,
    };
    Object.entries(listeners).forEach(([event, handler]) => socket.on(event, handler));
    return () => Object.entries(listeners).forEach(([event, handler]) => socket.off(event, handler));
  }, [socket, tracker]);

  useEffect(() => {
    if (isProcessing || !turnIdRef.current) return;
    const index = messages.findIndex((message) => message.id === turnIdRef.current);
    const answer = index < 0 ? null : messages.slice(index + 1).reverse().find((message) => message.sender === 'agent');
    tracker.settle(answer);
  }, [isProcessing, messages, tracker]);

  const startTrace = useCallback((turnId) => {
    turnIdRef.current = turnId;
    tracker.start(turnId, sessionId);
  }, [tracker, sessionId]);

  return { traces, startTrace, requestTraceStop: tracker.requestStop };
}
