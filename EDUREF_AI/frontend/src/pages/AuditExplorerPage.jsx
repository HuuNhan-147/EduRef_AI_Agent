import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock3, List, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import LiveTerminalConsole from '../components/common/LiveTerminalConsole';
import Dialog from '../components/ui/Dialog';
import StatusBadge from '../components/ui/StatusBadge';
import { cn, formatDateTime } from '../lib/ui';
import api from '../services/api';

const VIEWS = [
  ['TABLE', 'Danh sách', List],
  ['TIMELINE', 'Dòng thời gian', Clock3],
  ['ACTIVITY', 'Hoạt động', Activity],
];

export default function AuditExplorerPage({ userRole = 'STUDENT' }) {
  const [viewMode, setViewMode] = useState('TABLE');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [chainVerification, setChainVerification] = useState(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const isStaff = ['STAFF', 'DEAN'].includes(userRole);

  const fetchAuditLogs = useCallback(async () => {
    if (!isStaff) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/audit/logs?limit=50');
      setLogs(response.data?.success ? response.data.data || [] : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.error || 'Không thể tải nhật ký kiểm toán.');
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const verifyChain = async () => {
    setIsVerifyingChain(true);
    setChainVerification(null);
    try {
      const response = await api.get('/audit/verify-chain');
      setChainVerification(response.data);
    } catch (requestError) {
      setChainVerification({ chainValid: false, error: requestError.response?.data?.message || requestError.response?.data?.error || requestError.message });
    } finally {
      setIsVerifyingChain(false);
    }
  };

  return (
    <div className="min-h-full bg-canvas p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="ui-panel p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="ui-eyebrow">Trách nhiệm giải trình</p>
              <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
                <ShieldCheck className="h-5 w-5 text-success" /> Đối soát quyết định
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
                Chuỗi SHA-256 giúp phát hiện dữ liệu bị thay đổi khi kiểm tra. Đây là bằng chứng toàn vẹn, không phải chữ ký số hay cam kết dữ liệu không thể bị xóa.
              </p>
            </div>
            <button type="button" onClick={verifyChain} disabled={isVerifyingChain} className="ui-button-primary self-start">
              {isVerifyingChain ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {isVerifyingChain ? 'Đang đối chiếu…' : 'Kiểm tra toàn chuỗi'}
            </button>
          </div>

          {chainVerification && (
            <div
              role="status"
              className={cn(
                'mt-4 flex items-start gap-3 rounded-xl border p-4',
                chainVerification.chainValid ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10',
              )}
            >
              {chainVerification.chainValid
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                : <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
              <div>
                <p className="text-sm font-medium">{chainVerification.chainValid ? 'Chuỗi khớp tại thời điểm kiểm tra' : 'Phát hiện vấn đề toàn vẹn'}</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">{chainVerification.message || chainVerification.reason || chainVerification.error}</p>
                <p className="mt-1 font-mono text-[10px] text-text-subtle">
                  {chainVerification.totalBlocks != null ? `${chainVerification.totalBlocks} bản ghi · ` : ''}{formatDateTime(chainVerification.verifiedAt)}
                </p>
              </div>
            </div>
          )}
        </header>

        {!isStaff ? (
          <section className="ui-panel grid min-h-72 place-items-center p-8 text-center">
            <div>
              <ShieldCheck className="mx-auto h-8 w-8 text-text-subtle" />
              <h2 className="mt-4 text-sm font-semibold">Chi tiết nhật ký chỉ dành cho cán bộ</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted">
                Sinh viên có thể kiểm tra kết quả toàn vẹn tổng thể ở trên. Danh sách sự kiện chứa dữ liệu nghiệp vụ của nhiều hồ sơ nên được giới hạn theo vai trò.
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-fit rounded-xl bg-surface-muted p-1">
                {VIEWS.map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setViewMode(value)}
                    aria-pressed={viewMode === value}
                    className={cn('flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors', viewMode === value ? 'bg-surface-elevated text-white' : 'text-text-muted hover:text-white')}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
              {viewMode !== 'ACTIVITY' && (
                <button type="button" onClick={fetchAuditLogs} disabled={loading} className="ui-button-secondary self-start">
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Làm mới
                </button>
              )}
            </div>

            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}

            {viewMode === 'TABLE' && (
              <div className="ui-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-xs">
                    <thead className="border-b border-border bg-surface-muted text-[10px] uppercase tracking-wider text-text-subtle">
                      <tr>
                        <th className="px-4 py-3 font-medium">Thời gian</th>
                        <th className="px-4 py-3 font-medium">Tác nhân</th>
                        <th className="px-4 py-3 font-medium">Hành động</th>
                        <th className="px-4 py-3 font-medium">Quyết định</th>
                        <th className="px-4 py-3 font-medium">Hồ sơ</th>
                        <th className="px-4 py-3 font-medium">Mã băm</th>
                        <th className="px-4 py-3 text-right font-medium">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loading && logs.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-text-muted">Đang tải nhật ký…</td></tr>
                      ) : logs.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-text-muted">Chưa có bản ghi kiểm toán.</td></tr>
                      ) : logs.map((log) => (
                        <tr key={log.id} className="transition-colors hover:bg-surface-muted/60">
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-text-muted">{formatDateTime(log.createdAt)}</td>
                          <td className="px-4 py-3"><span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-[10px] text-blue-200">{log.actorType}</span></td>
                          <td className="px-4 py-3 font-medium">{log.action}</td>
                          <td className="px-4 py-3"><StatusBadge status={log.decision} /></td>
                          <td className="px-4 py-3 font-mono font-semibold text-blue-300">{log.request?.requestCode || '—'}</td>
                          <td className="max-w-48 truncate px-4 py-3 font-mono text-[10px] text-text-subtle">{log.sha256Hash || '—'}</td>
                          <td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelectedLog(log)} className="ui-button-ghost ml-auto">Xem</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === 'TIMELINE' && (
              <div className="ui-panel p-5">
                {logs.length === 0 ? <p className="py-10 text-center text-sm text-text-muted">Chưa có bản ghi kiểm toán.</p> : (
                  <ol className="relative space-y-5 border-l border-border pl-6">
                    {logs.map((log) => (
                      <li key={log.id} className="relative">
                        <span className="absolute -left-[1.78rem] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-accent" />
                        <button type="button" onClick={() => setSelectedLog(log)} className="w-full rounded-xl border border-border bg-surface-muted/45 p-4 text-left transition-colors hover:bg-surface-muted">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <span className="text-sm font-medium">{log.action}</span>
                            <time className="font-mono text-[10px] text-text-subtle">{formatDateTime(log.createdAt)}</time>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-text-muted">{log.reason || 'Sự kiện được ghi nhận trong chuỗi kiểm toán.'}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={log.decision} /><span className="font-mono text-[10px] text-text-subtle">{log.request?.requestCode || 'Không gắn hồ sơ'}</span></div>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {viewMode === 'ACTIVITY' && <LiveTerminalConsole userRole={userRole} maxHeight="max-h-[35rem]" className="min-h-[30rem]" />}
          </section>
        )}
      </div>

      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Chi tiết bản ghi kiểm toán"
        description={selectedLog ? `${selectedLog.action} · ${formatDateTime(selectedLog.createdAt)}` : ''}
        className="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-text-subtle">Tác nhân</dt><dd className="mt-1 font-medium">{selectedLog.actorType}</dd></div>
              <div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-text-subtle">Quyết định</dt><dd className="mt-1"><StatusBadge status={selectedLog.decision} /></dd></div>
              <div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-text-subtle">Hồ sơ</dt><dd className="mt-1 font-mono">{selectedLog.request?.requestCode || '—'}</dd></div>
              <div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-text-subtle">Thời gian xử lý</dt><dd className="mt-1 font-mono">{selectedLog.decisionTimeMs != null ? `${selectedLog.decisionTimeMs} ms` : '—'}</dd></div>
            </dl>
            <div>
              <h3 className="text-xs font-medium text-text-muted">Lý do được ghi nhận</h3>
              <p className="mt-2 rounded-xl border border-border p-3 leading-6">{selectedLog.reason || 'Không có lý do bổ sung.'}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-text-muted">Liên kết trước</h3>
              <p className="mt-2 break-all rounded-xl bg-surface-muted p-3 font-mono text-[10px] text-text-subtle">{selectedLog.previousHash || 'GENESIS_HASH_EDUREF_2026'}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-text-muted">SHA-256 bản ghi này</h3>
              <p className="mt-2 break-all rounded-xl border border-success/25 bg-success/10 p-3 font-mono text-[10px] text-emerald-200">{selectedLog.sha256Hash}</p>
            </div>
            <button type="button" onClick={() => setSelectedLog(null)} className="ui-button-primary w-full">Đóng</button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
