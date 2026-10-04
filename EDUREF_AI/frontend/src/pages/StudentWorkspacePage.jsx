import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, FileText, Info, LayoutList, PanelRightOpen, Send, WifiOff } from 'lucide-react';
import ActivityInspector from '../components/agent/ActivityInspector';
import ConversationTimeline from '../components/agent/ConversationTimeline';
import DraftReviewCard from '../components/agent/DraftReviewCard';
import ProcedurePanel from '../components/agent/ProcedurePanel';
import Dialog from '../components/ui/Dialog';
import StatusBadge from '../components/ui/StatusBadge';
import api, { DEMO_ACCOUNTS } from '../services/api';
import getSocket from '../services/socket';
import { createEmptyDecision, getOrCreateSessionId, normalizeDecision } from '../lib/ui';

const RESPONSE_SLOW_MS = 30000;

function nowLabel() {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function welcomeMessage(account) {
  return {
    id: `welcome_${account.code}`,
    sender: 'agent',
    text: `Xin chào **${account.name}**. Tôi có thể tiếp nhận yêu cầu **xác nhận sinh viên**, giúp bạn chuẩn bị thông tin và chuyển hồ sơ tới đúng cán bộ Phòng Đào tạo.\n\nBạn có thể mô tả mục đích bằng ngôn ngữ tự nhiên hoặc chọn biểu mẫu để bắt đầu. Quyết định cuối cùng luôn do người có thẩm quyền thực hiện.`,
    timestamp: nowLabel(),
  };
}

function loadStored(key, fallback) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default function StudentWorkspacePage({ currentAccountKey, onOpenDynamicForm, externalPrompt, onClearExternalPrompt }) {
  const currentAccount = DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  const socket = useMemo(() => getSocket(), []);
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId(currentAccount.code));
  const sessionIdRef = useRef(sessionId);
  const [messages, setMessages] = useState(() => loadStored(`eduref_messages_${currentAccount.code}`, [welcomeMessage(currentAccount)]));
  const [runs, setRuns] = useState(() => loadStored(`eduref_runs_${currentAccount.code}`, {}));
  const [activeDecision, setActiveDecision] = useState(() => loadStored(`eduref_decision_${currentAccount.code}`, createEmptyDecision()));
  const [activeDraft, setActiveDraft] = useState(() => loadStored(`eduref_draft_${currentAccount.code}`, null));
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const activeRunIdRef = useRef(null);
  const [slowResponse, setSlowResponse] = useState(false);
  const slowTimerRef = useRef(null);
  const [connectionNotice, setConnectionNotice] = useState('');
  const [requestType, setRequestType] = useState(null);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState('');
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const scrollRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const streamBufferRef = useRef('');
  const streamFrameRef = useRef(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const nextSession = getOrCreateSessionId(currentAccount.code);
    sessionIdRef.current = nextSession;
    setSessionId(nextSession);
    setMessages(loadStored(`eduref_messages_${currentAccount.code}`, [welcomeMessage(currentAccount)]));
    setRuns(loadStored(`eduref_runs_${currentAccount.code}`, {}));
    setActiveDecision(loadStored(`eduref_decision_${currentAccount.code}`, createEmptyDecision()));
    setActiveDraft(loadStored(`eduref_draft_${currentAccount.code}`, null));
    setSubmittingDraft(false);
    setDraftError('');
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    if (streamFrameRef.current) window.cancelAnimationFrame(streamFrameRef.current);
    streamFrameRef.current = null;
    streamBufferRef.current = '';
    setIsProcessing(false);
    processingRef.current = false;
    setSlowResponse(false);
    activeRunIdRef.current = null;
    setConnectionNotice('');
  }, [currentAccount.code, currentAccount.name]);

  useEffect(() => {
    sessionStorage.setItem(`eduref_messages_${currentAccount.code}`, JSON.stringify(messages));
  }, [messages, currentAccount.code]);

  useEffect(() => {
    sessionStorage.setItem(`eduref_runs_${currentAccount.code}`, JSON.stringify(runs));
  }, [runs, currentAccount.code]);

  useEffect(() => {
    sessionStorage.setItem(`eduref_decision_${currentAccount.code}`, JSON.stringify(activeDecision));
  }, [activeDecision, currentAccount.code]);

  useEffect(() => {
    if (activeDraft) sessionStorage.setItem(`eduref_draft_${currentAccount.code}`, JSON.stringify(activeDraft));
    else sessionStorage.removeItem(`eduref_draft_${currentAccount.code}`);
  }, [activeDraft, currentAccount.code]);

  const fetchRequestType = useCallback(async () => {
    setTypesLoading(true);
    setTypesError('');
    try {
      const response = await api.get('/petitions/types');
      const confirmation = response.data?.data?.find((item) => item.code === 'STUDENT_CONFIRMATION');
      if (!confirmation) throw new Error('Không tìm thấy dịch vụ STUDENT_CONFIRMATION đang hoạt động.');
      setRequestType(confirmation);
    } catch (error) {
      setTypesError(error.response?.data?.message || error.message);
      setRequestType(null);
    } finally {
      setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequestType();
  }, [fetchRequestType]);

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    slowTimerRef.current = null;
  }, []);

  const finishProcessing = useCallback(() => {
    clearSlowTimer();
    processingRef.current = false;
    setIsProcessing(false);
    setSlowResponse(false);
  }, [clearSlowTimer]);

  const applyResult = useCallback((result) => {
    if (result?.decision === 'ANSWERED') return;
    const nextDecision = normalizeDecision(result?.toolResult, result?.decision);
    if (nextDecision) setActiveDecision(nextDecision);
  }, []);

  const applyProgressEvent = useCallback((event = {}) => {
    const runId = event.runId || activeRunIdRef.current;
    if (!runId || !event.phase) return;
    setRuns((current) => {
      const run = current[runId] || { id: runId, status: 'RUNNING', startedAt: Date.now(), steps: [] };
      let steps = [...(run.steps || [])];
      const matchingIndex = [...steps].reverse().findIndex((step) => step.phase === event.phase && step.status === 'RUNNING');
      const actualIndex = matchingIndex < 0 ? -1 : steps.length - 1 - matchingIndex;

      if (event.status !== 'RUNNING' && actualIndex >= 0) {
        steps[actualIndex] = { ...steps[actualIndex], ...event };
      } else {
        if (event.status === 'RUNNING') {
          steps = steps.map((step) => step.status === 'RUNNING' ? { ...step, status: 'COMPLETED' } : step);
        }
        steps.push(event);
      }

      const terminalStatus = event.phase === 'COMPLETED'
        ? run.status
        : event.status === 'FAILED'
          ? 'FAILED'
          : event.status === 'CANCELLED'
            ? 'CANCELLED'
            : run.status;
      return { ...current, [runId]: { ...run, status: terminalStatus, steps } };
    });
  }, []);

  const flushStream = useCallback(() => {
    const chunk = streamBufferRef.current;
    streamBufferRef.current = '';
    streamFrameRef.current = null;
    if (!chunk) return;
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.sender === 'agent' && last.isStreaming) {
        return [...current.slice(0, -1), { ...last, text: `${last.text}${chunk}` }];
      }
      return [...current, { id: `agent_${Date.now()}`, sender: 'agent', runId: activeRunIdRef.current, text: chunk, isStreaming: true, timestamp: nowLabel() }];
    });
  }, []);

  useEffect(() => {
    const handleProgress = (data = {}) => {
      if (data.sessionId && data.sessionId !== sessionIdRef.current) return;
      applyProgressEvent(data);
    };

    const handleChunk = (data = {}) => {
      if (data.sessionId && data.sessionId !== sessionIdRef.current) return;
      if (data.runId) activeRunIdRef.current = data.runId;
      streamBufferRef.current += data.chunk || '';
      if (!streamFrameRef.current) streamFrameRef.current = window.requestAnimationFrame(flushStream);
    };

    const handleEnd = (data = {}) => {
      if (data.sessionId && data.sessionId !== sessionIdRef.current) return;
      if (streamFrameRef.current) window.cancelAnimationFrame(streamFrameRef.current);
      streamFrameRef.current = null;
      streamBufferRef.current = '';
      finishProcessing();
      const runId = data.runId || activeRunIdRef.current;
      setRuns((current) => {
        if (!runId || !current[runId]) return current;
        const run = current[runId];
        return {
          ...current,
          [runId]: {
            ...run,
            status: 'COMPLETED',
            durationMs: data.totalDuration || Date.now() - run.startedAt,
            steps: (run.steps || []).map((step) => step.status === 'RUNNING' ? { ...step, status: 'COMPLETED' } : step),
          },
        };
      });
      setMessages((current) => {
        const last = current[current.length - 1];
        const completed = {
          id: last?.sender === 'agent' ? last.id : `agent_${Date.now()}`,
          sender: 'agent',
          runId,
          text: data.reply || (last?.sender === 'agent' ? last.text : 'Yêu cầu đã được xử lý.'),
          isStreaming: false,
          toolResult: data.toolResult,
          decision: data.decision,
          timestamp: last?.timestamp || nowLabel(),
        };
        return last?.sender === 'agent' ? [...current.slice(0, -1), completed] : [...current, completed];
      });
      if (data.intakeDraft) {
        setActiveDraft(data.intakeDraft);
        setDraftError('');
      }
      applyResult(data);
      activeRunIdRef.current = null;
    };

    const handleError = (data = {}) => {
      if (data.sessionId && data.sessionId !== sessionIdRef.current) return;
      finishProcessing();
      const runId = data.runId || activeRunIdRef.current;
      applyProgressEvent({
        runId,
        phase: 'FAILED',
        status: 'FAILED',
        sequence: Date.now(),
        label: 'Chưa thể hoàn tất yêu cầu',
        summary: 'Bạn có thể kiểm tra kết nối và thử lại.',
      });
      setMessages((current) => [...current, {
        id: `error_${Date.now()}`,
        sender: 'agent',
        runId,
        isError: true,
        text: `Không thể hoàn tất yêu cầu: ${data.error || data.message || 'Dịch vụ gặp lỗi không xác định'}. Bạn có thể kiểm tra kết nối và thử lại.`,
        timestamp: nowLabel(),
      }]);
      setActiveDecision((current) => ({ ...current, status: 'FAILED', reason: data.error || data.message || 'Dịch vụ gặp lỗi.' }));
      activeRunIdRef.current = null;
    };

    const handleCancelled = (data = {}) => {
      if (data.sessionId && data.sessionId !== sessionIdRef.current) return;
      finishProcessing();
      const runId = data.runId || activeRunIdRef.current;
      applyProgressEvent({
        runId,
        phase: 'CANCELLED',
        status: 'CANCELLED',
        sequence: Date.now(),
        label: 'Đã dừng xử lý theo yêu cầu của bạn',
        summary: 'Bạn có thể chỉnh lại nội dung và gửi một yêu cầu mới.',
      });
      setRuns((current) => current[runId]
        ? { ...current, [runId]: { ...current[runId], status: 'CANCELLED', durationMs: data.totalDuration || Date.now() - current[runId].startedAt } }
        : current);
      activeRunIdRef.current = null;
    };

    const handleDisconnect = () => {
      if (processingRef.current) setConnectionNotice('Kết nối thời gian thực bị gián đoạn. Agent có thể vẫn đang xử lý; vui lòng chờ kết nối lại.');
    };
    const handleConnect = () => setConnectionNotice('');

    socket.on('agent_progress', handleProgress);
    socket.on('agent_response_chunk', handleChunk);
    socket.on('agent_response_end', handleEnd);
    socket.on('agent_response_cancelled', handleCancelled);
    socket.on('agent_error', handleError);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);
    return () => {
      socket.off('agent_progress', handleProgress);
      socket.off('agent_response_chunk', handleChunk);
      socket.off('agent_response_end', handleEnd);
      socket.off('agent_response_cancelled', handleCancelled);
      socket.off('agent_error', handleError);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
      if (streamFrameRef.current) window.cancelAnimationFrame(streamFrameRef.current);
    };
  }, [applyProgressEvent, applyResult, finishProcessing, flushStream, socket]);

  const handleSendMessage = useCallback(async (textToSend = null, extraContext = {}) => {
    const text = String(textToSend ?? inputMessage).trim();
    if (!text || processingRef.current) return;
    const runId = typeof globalThis.crypto?.randomUUID === 'function'
      ? `run_${globalThis.crypto.randomUUID()}`
      : `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      message: text,
      sessionId: sessionIdRef.current,
      runId,
      attachments: extraContext.attachments || null,
      inputData: {
        formFields: extraContext.inputData || null,
        draftFields: activeDraft?.fields || null,
      },
    };

    activeRunIdRef.current = runId;
    setRuns((current) => ({
      ...current,
      [runId]: {
        id: runId,
        status: 'RUNNING',
        startedAt: Date.now(),
        steps: [{
          phase: 'REQUEST_SENT',
          status: 'COMPLETED',
          sequence: 0,
          label: 'Tin nhắn đã tới trợ lý',
          summary: 'Trò chuyện chưa tạo hoặc gửi hồ sơ tới Phòng Đào tạo.',
        }],
      },
    }));
    setMessages((current) => [...current, { id: `user_${Date.now()}`, sender: 'user', runId, text, timestamp: nowLabel() }]);
    setInputMessage('');
    processingRef.current = true;
    setIsProcessing(true);
    setSlowResponse(false);
    setActiveDecision({ ...createEmptyDecision(), status: 'PROCESSING', requirementsCheck: 'CHECKING' });
    clearSlowTimer();
    slowTimerRef.current = window.setTimeout(() => setSlowResponse(true), RESPONSE_SLOW_MS);

    if (socket.connected) {
      socket.emit('client_send_message', payload);
      return;
    }

    setConnectionNotice('Kết nối realtime chưa sẵn sàng. Yêu cầu đang được gửi qua kênh dự phòng.');
    try {
      const response = await api.post('/agent/chat', payload);
      if (!response.data?.success) throw new Error(response.data?.message || 'Dịch vụ không trả về kết quả hợp lệ.');
      const result = response.data.data;
      (result.progressEvents || []).forEach(applyProgressEvent);
      setRuns((current) => ({
        ...current,
        [runId]: {
          ...current[runId],
          status: 'COMPLETED',
          durationMs: result.totalDuration || Date.now() - current[runId].startedAt,
          steps: (current[runId]?.steps || []).map((step) => step.status === 'RUNNING' ? { ...step, status: 'COMPLETED' } : step),
        },
      }));
      setMessages((current) => [...current, { id: `agent_${Date.now()}`, sender: 'agent', runId, text: result.reply || 'Yêu cầu đã được xử lý.', toolResult: result.toolResult, decision: result.decision, timestamp: nowLabel() }]);
      if (result.intakeDraft) {
        setActiveDraft(result.intakeDraft);
        setDraftError('');
      }
      applyResult(result);
      setConnectionNotice('');
    } catch (error) {
      applyProgressEvent({ runId, phase: 'FAILED', status: 'FAILED', sequence: Date.now(), label: 'Chưa thể hoàn tất yêu cầu', summary: 'Kết nối dự phòng gặp lỗi.' });
      setMessages((current) => [...current, { id: `error_${Date.now()}`, sender: 'agent', runId, isError: true, text: `Không thể kết nối dịch vụ: ${error.response?.data?.message || error.message}. Vui lòng thử lại.`, timestamp: nowLabel() }]);
      setActiveDecision((current) => ({ ...current, status: 'FAILED', reason: error.response?.data?.message || error.message }));
    } finally {
      finishProcessing();
      activeRunIdRef.current = null;
    }
  }, [activeDraft?.fields, applyProgressEvent, applyResult, clearSlowTimer, finishProcessing, inputMessage, socket]);

  const submitDraft = useCallback(async () => {
    if (!activeDraft?.ready || submittingDraft) return;
    setSubmittingDraft(true);
    setDraftError('');
    try {
      const response = await api.post('/petitions', {
        requestTypeCode: 'STUDENT_CONFIRMATION',
        formData: activeDraft.fields,
      });
      const petition = response.data?.data;
      if (!response.data?.success || !petition?.requestCode) {
        throw new Error(response.data?.message || 'Máy chủ chưa xác nhận đã tiếp nhận hồ sơ.');
      }
      const receipt = petition.status === 'WAITING_STUDENT'
        ? `Hồ sơ **${petition.requestCode}** đã được tiếp nhận và đang chờ bạn bổ sung thông tin. Bạn có thể xem trạng thái trong **Hồ sơ của tôi**.`
        : `Hồ sơ **${petition.requestCode}** đã được gửi tới **Phòng Đào tạo**. Cán bộ có thẩm quyền sẽ kiểm tra và quyết định; bạn có thể theo dõi trong **Hồ sơ của tôi**.`;
      setMessages((current) => [...current, { id: `receipt_${Date.now()}`, sender: 'agent', text: receipt, timestamp: nowLabel() }]);
      setActiveDecision(normalizeDecision(petition, petition.decision));
      setActiveDraft(null);
    } catch (error) {
      setDraftError(error.response?.data?.message || error.message || 'Chưa thể gửi hồ sơ. Bạn có thể thử lại.');
    } finally {
      setSubmittingDraft(false);
    }
  }, [activeDraft, submittingDraft]);

  const handleCancelRun = useCallback((runId) => {
    if (!runId || activeRunIdRef.current !== runId) return;
    setRuns((current) => current[runId]
      ? { ...current, [runId]: { ...current[runId], status: 'CANCELLING' } }
      : current);
    socket.emit('client_cancel_run', { sessionId: sessionIdRef.current, runId });
  }, [socket]);

  useEffect(() => {
    if (!externalPrompt || processingRef.current) return;
    const prompt = typeof externalPrompt === 'object' ? externalPrompt.text : externalPrompt;
    const context = typeof externalPrompt === 'object' ? externalPrompt : {};
    handleSendMessage(prompt, context);
    onClearExternalPrompt?.();
  }, [externalPrompt, handleSendMessage, onClearExternalPrompt]);

  useEffect(() => () => clearSlowTimer(), [clearSlowTimer]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (isNearBottomRef.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: messages.length > 1 ? 'smooth' : 'auto' });
      setHasNewActivity(false);
    } else {
      setHasNewActivity(true);
    }
  }, [messages, isProcessing]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) setHasNewActivity(false);
  };

  const scrollToLatest = () => {
    const container = scrollRef.current;
    if (!container) return;
    isNearBottomRef.current = true;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    setHasNewActivity(false);
  };

  const handleUploaded = (document) => {
    setMessages((current) => [...current, {
      id: `upload_${Date.now()}`,
      sender: 'agent',
      text: `Máy chủ đã tiếp nhận tài liệu **${document.fileName || 'đính kèm'}**. Tài liệu đang chờ backend kích hoạt bước tái thẩm định.`,
      timestamp: nowLabel(),
    }]);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 bg-canvas xl:grid-cols-[248px_minmax(0,1fr)]">
      <div className="hidden min-h-0 xl:block"><ProcedurePanel requestType={requestType} loading={typesLoading} error={typesError} onOpenForm={onOpenDynamicForm} onQuickPrompt={handleSendMessage} /></div>

      <main className="flex min-h-0 min-w-0 flex-col bg-[radial-gradient(circle_at_top,rgb(30_64_175_/_0.10),transparent_36%)]">
        <header className="flex min-h-[72px] items-center justify-between gap-3 border-b border-ui-border bg-canvas/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-sm font-semibold text-foreground sm:text-base">Trợ lý xác nhận sinh viên</h1><StatusBadge status={isProcessing ? 'PROCESSING' : activeDecision.status} /></div>
            <p className="mt-1 truncate text-xs text-slate-500">AI chuẩn bị và định tuyến hồ sơ; Phòng Đào tạo đưa ra quyết định cuối cùng.</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setProcedureOpen(true)} className="ui-icon-button xl:hidden" aria-label="Mở danh mục dịch vụ"><LayoutList className="h-5 w-5" /></button>
            <button type="button" onClick={() => setInspectorOpen(true)} className="ui-icon-button" aria-label="Mở trạng thái yêu cầu"><PanelRightOpen className="h-5 w-5" /></button>
          </div>
        </header>

        {connectionNotice && <div className="flex items-center gap-2 border-b border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-xs text-amber-100" role="status"><WifiOff className="h-4 w-4 shrink-0" />{connectionNotice}</div>}

        <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto overscroll-contain">
          <ConversationTimeline key={currentAccount.code} messages={messages} runs={runs} onCancelRun={handleCancelRun} />
          {activeDraft?.ready && (
            <div className="px-4 sm:px-6">
              <DraftReviewCard
                draft={activeDraft}
                submitting={submittingDraft}
                error={draftError}
                onChange={(fields) => setActiveDraft((current) => ({ ...current, fields }))}
                onSubmit={submitDraft}
                onDiscard={() => setActiveDraft(null)}
              />
            </div>
          )}
          {hasNewActivity && <button type="button" onClick={scrollToLatest} className="sticky bottom-4 left-1/2 z-10 mx-auto flex min-h-10 -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-surface-raised px-4 text-xs font-semibold text-primary shadow-panel"><ArrowDown className="h-4 w-4" />Hoạt động mới</button>}
        </div>

        <footer className="border-t border-ui-border bg-canvas/90 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto max-w-3xl">
            {slowResponse && <div className="mb-3 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100" role="status"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>Phản hồi đang lâu hơn bình thường. Yêu cầu vẫn đang được xử lý; không cần gửi lại để tránh tạo trùng hồ sơ.</span></div>}
            <form onSubmit={(event) => { event.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2 rounded-2xl border border-ui-border bg-surface-raised p-2 shadow-panel focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
              <label htmlFor="agent-message" className="sr-only">Nhắn hoặc bổ sung thông tin cho EduRef AI</label>
              <textarea id="agent-message" value={inputMessage} onChange={(event) => setInputMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendMessage(); } }} disabled={isProcessing} rows={1} className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-base leading-5 text-foreground outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm" placeholder={isProcessing ? 'Agent đang xử lý yêu cầu hiện tại…' : 'Mô tả mục đích hoặc bổ sung thông tin…'} />
              <button type="submit" disabled={isProcessing || !inputMessage.trim()} className="ui-icon-button border-blue-400/20 bg-blue-500 text-white hover:bg-blue-400" aria-label="Gửi tin nhắn"><Send className="h-4 w-4" /></button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-slate-600"><span>Enter để gửi · Shift + Enter để xuống dòng</span><button type="button" onClick={() => onOpenDynamicForm?.(requestType || { code: 'STUDENT_CONFIRMATION', name: 'Giấy xác nhận sinh viên' })} className="inline-flex items-center gap-1.5 text-slate-400 hover:text-blue-200"><FileText className="h-3.5 w-3.5" />Mở biểu mẫu</button></div>
          </div>
        </footer>
      </main>

      <Dialog open={procedureOpen} onClose={() => setProcedureOpen(false)} title="Dịch vụ Sprint 2" className="sm:max-w-sm"><div className="-m-5 h-[65dvh] sm:-m-6"><ProcedurePanel requestType={requestType} loading={typesLoading} error={typesError} onOpenForm={(type) => { setProcedureOpen(false); onOpenDynamicForm?.(type); }} onQuickPrompt={(prompt) => { setProcedureOpen(false); handleSendMessage(prompt); }} /></div></Dialog>
      <Dialog open={inspectorOpen} onClose={() => setInspectorOpen(false)} title="Trạng thái yêu cầu" className="sm:max-w-md"><div className="-m-5 h-[70dvh] sm:-m-6"><ActivityInspector account={currentAccount} decision={activeDecision} onUploaded={handleUploaded} /></div></Dialog>
    </div>
  );
}
