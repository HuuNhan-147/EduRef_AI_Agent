import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, RefreshCw, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/ui';
import api from '../../services/api';
import getSocket from '../../services/socket';

const VISIBLE_EVENTS = new Set([
  'REQUEST',
  'START',
  'INTENT',
  'CONTEXT_RESOLVED',
  'TOOL_CALL',
  'TOOL_INVOCATION',
  'TOOL_RESULT',
  'TOOL_OBSERVATION',
  'DECISION',
  'COMPLETE',
  'ERROR',
  'CUSTOM_CASE',
]);

function isObservableEvent(entry) {
  const kind = String(entry?.step || entry?.type || 'INFO').toUpperCase();
  return VISIBLE_EVENTS.has(kind);
}

function eventTone(kind) {
  if (kind === 'ERROR') return 'border-danger/30 bg-danger/10 text-red-200';
  if (kind === 'DECISION' || kind === 'COMPLETE') return 'border-success/30 bg-success/10 text-emerald-200';
  if (kind.startsWith('TOOL')) return 'border-warning/30 bg-warning/10 text-amber-200';
  return 'border-accent/30 bg-accent/10 text-blue-200';
}

export default function LiveTerminalConsole({ maxHeight = 'max-h-[350px]', className = '', userRole, sessionId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const logContainerRef = useRef(null);
  const canView = ['STAFF', 'DEAN'].includes(userRole);

  const belongsToScope = useCallback(
    (entry) => isObservableEvent(entry) && (!sessionId || !entry.sessionId || entry.sessionId === sessionId),
    [sessionId],
  );

  const fetchLogs = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/agent/terminal-logs?limit=100');
      const visible = (response.data?.data || []).filter(belongsToScope).slice(-100);
      setLogs(visible);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.error || 'Không thể tải hoạt động hệ thống.');
    } finally {
      setLoading(false);
    }
  }, [belongsToScope, canView]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!canView) return undefined;
    const socket = getSocket();
    const handleLog = (entry) => {
      if (!belongsToScope(entry)) return;
      setLogs((current) => {
        if (entry.id && current.some((item) => item.id === entry.id)) return current;
        return [...current, entry].slice(-100);
      });
    };
    const handleClear = () => setLogs([]);
    socket.on('agent_terminal_log', handleLog);
    socket.on('agent_terminal_clear', handleClear);
    return () => {
      socket.off('agent_terminal_log', handleLog);
      socket.off('agent_terminal_clear', handleClear);
    };
  }, [belongsToScope, canView]);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  if (!canView) {
    return (
      <div className={cn('ui-panel grid min-h-48 place-items-center p-6 text-center', className)}>
        <div>
          <ShieldAlert className="mx-auto h-6 w-6 text-text-subtle" />
          <p className="mt-3 text-sm font-medium">Hoạt động kỹ thuật chỉ dành cho cán bộ</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-text-muted">
            Giao diện sinh viên chỉ hiển thị tiến trình của chính yêu cầu hiện tại để bảo vệ dữ liệu phiên khác.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className={cn('flex flex-col overflow-hidden rounded-2xl border border-border bg-[#080c14]', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-success" /> Hoạt động tác vụ
          </div>
          <p className="mt-0.5 truncate text-[11px] text-text-subtle">Chỉ hiển thị sự kiện quan sát được, không hiển thị suy luận nội bộ.</p>
        </div>
        <button type="button" onClick={fetchLogs} disabled={loading} className="ui-icon-button" aria-label="Làm mới hoạt động">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </header>

      <div ref={logContainerRef} className={cn('flex-1 space-y-2 overflow-y-auto p-3 font-mono text-[11px]', maxHeight)} aria-live="polite">
        {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 font-sans text-xs text-red-200">{error}</p>}
        {!error && logs.length === 0 && (
          <div className="grid min-h-36 place-items-center px-4 text-center font-sans text-xs text-text-muted">
            Chưa có hoạt động quan sát được. Chạy một ca kiểm thử để xem các mốc xử lý.
          </div>
        )}
        {logs.map((log, index) => {
          const kind = String(log.step || log.type || 'INFO').toUpperCase();
          return (
            <div key={log.id || `${kind}-${index}`} className="border-b border-border/50 pb-2 last:border-0">
              <div className="flex flex-wrap items-start gap-2">
                <span className="shrink-0 text-[10px] text-text-subtle">{log.timeFormatted || log.timestamp || '—'}</span>
                <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold', eventTone(kind))}>{kind}</span>
                <span className="min-w-0 flex-1 break-words leading-5 text-slate-300">{log.text || log.message || 'Sự kiện hệ thống'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
