import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FlaskConical, Play, RotateCw, Send, XCircle } from 'lucide-react';
import LiveTerminalConsole from '../components/common/LiveTerminalConsole';
import StatusBadge from '../components/ui/StatusBadge';
import { cn, formatDateTime } from '../lib/ui';
import api from '../services/api';

const GENERAL_CASES = [
  { id: 'G-01', title: 'Thường quy: làm vé xe buýt', expectedDecision: 'ESCALATE_TO_STAFF', category: 'ROUTINE' },
  { id: 'G-02', title: 'Thiếu mục đích sử dụng', expectedDecision: 'ASK_CLARIFICATION', category: 'UNKNOWN_FACT' },
  { id: 'G-03', title: 'Sinh viên đã thôi học', expectedDecision: 'ESCALATE_TO_STAFF', category: 'ROUTINE_POLICY_DENY' },
  { id: 'G-04', title: 'Yêu cầu duyệt ngoại lệ', expectedDecision: 'ESCALATE_TO_STAFF', category: 'BEYOND_AUTHORITY' },
];

const TRACK_A_CASES = [
  { id: 'A-01', title: 'Thường quy: làm vé xe buýt', expectedDecision: 'ESCALATE_TO_STAFF', category: 'ROUTINE' },
  { id: 'A-02', title: 'Thường quy: hồ sơ học bổng', expectedDecision: 'ESCALATE_TO_STAFF', category: 'ROUTINE' },
  { id: 'A-03', title: 'Thường quy: vay vốn sinh viên', expectedDecision: 'ESCALATE_TO_STAFF', category: 'ROUTINE' },
  { id: 'A-04', title: 'Mục đích chưa có trong policy', expectedDecision: 'ESCALATE_TO_STAFF', category: 'OUTSIDE_POLICY' },
  { id: 'A-05', title: 'Yêu cầu vượt thẩm quyền', expectedDecision: 'ESCALATE_TO_STAFF', category: 'BEYOND_AUTHORITY' },
];

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/45 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-text-muted">{detail}</p>}
    </div>
  );
}

export default function VerifyHarnessPage({ userRole = 'STUDENT' }) {
  const [mode, setMode] = useState('track');
  const [runs, setRuns] = useState({ general: null, track: null });
  const [selectedId, setSelectedId] = useState('A-01');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('Em cần giấy xác nhận sinh viên để nộp hồ sơ xin việc');
  const [customResult, setCustomResult] = useState(null);
  const [isCustomRunning, setIsCustomRunning] = useState(false);

  const definitions = mode === 'track' ? TRACK_A_CASES : GENERAL_CASES;
  const run = runs[mode];
  const cases = run?.results || definitions;
  const selected = cases.find((item) => item.id === selectedId) || cases[0];
  const passRate = run?.totalCases ? Math.round((run.passedCases / run.totalCases) * 100) : null;
  const distribution = useMemo(() => {
    if (!run) return mode === 'track' ? 'Mục tiêu: 5/5 chuyển đúng người' : '4 tình huống chính';
    return `HUMAN REVIEW ${run.escalationCount} · HỎI BỔ SUNG ${run.clarificationCount || 0}`;
  }, [mode, run]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setSelectedId(nextMode === 'track' ? 'A-01' : 'G-01');
    setError('');
  };

  const runSuite = async () => {
    setIsRunning(true);
    setError('');
    try {
      const endpoint = mode === 'track' ? '/agent/verify-90s' : '/agent/verify-general';
      const response = await api.post(endpoint);
      setRuns((current) => ({ ...current, [mode]: response.data }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.error || requestError.message);
    } finally {
      setIsRunning(false);
    }
  };

  const runCustom = async () => {
    if (!customPrompt.trim()) return;
    setIsCustomRunning(true);
    setCustomResult(null);
    try {
      const response = await api.post('/agent/verify-custom-prompt', { prompt: customPrompt.trim() });
      setCustomResult(response.data);
    } catch (requestError) {
      setCustomResult({ success: false, error: requestError.response?.data?.message || requestError.response?.data?.error || requestError.message });
    } finally {
      setIsCustomRunning(false);
    }
  };

  const customDecision = customResult?.data?.decision;
  const customQuestion = customResult?.data?.question
    || customResult?.data?.actionableQuestion
    || customResult?.data?.contextCapsule?.actionableQuestion;

  return (
    <div className="min-h-full bg-canvas p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="ui-panel p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="ui-eyebrow">Kết quả từ backend</p>
              <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
                <FlaskConical className="h-5 w-5 text-accent" /> Verify Harness
              </h1>
              <p className="mt-1 text-sm text-text-muted">Kịch bản được định nghĩa trước; kết quả và thời gian chỉ xuất hiện sau khi thực thi.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex rounded-xl bg-surface-muted p-1">
                {[['general', 'General · 4 ca'], ['track', 'Track A · 5 ca']].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => switchMode(value)}
                    aria-pressed={mode === value}
                    className={cn('min-h-10 rounded-lg px-3 text-xs font-medium transition-colors', mode === value ? 'bg-surface-elevated text-white' : 'text-text-muted hover:text-white')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={runSuite} disabled={isRunning} className="ui-button-primary">
                {isRunning ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isRunning ? 'Đang thực thi…' : `Chạy ${definitions.length} ca`}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Kết quả" value={run ? `${run.passedCases}/${run.totalCases} PASS` : 'Chưa thực thi'} detail={passRate == null ? undefined : `${passRate}% ca đạt kỳ vọng`} />
            <Metric label="Phân bố quyết định" value={distribution} />
            <Metric label="Tổng thời gian" value={run ? `${run.totalDurationMs} ms` : '—'} />
            <Metric label="Hoàn tất" value={formatDateTime(run?.completedAt)} />
          </div>
          {error && <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">Không thể chạy bộ kiểm thử: {error}</p>}
        </header>

        <main className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <section className="ui-panel min-w-0 overflow-hidden">
            <div className="flex flex-col gap-1 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold">Ma trận kiểm thử</h2>
              <span className="font-mono text-[11px] text-text-subtle">Policy: {run?.policyVersion || 'STUDENT_CONFIRMATION_V1.0.0'}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-border bg-surface-muted text-[10px] uppercase tracking-wider text-text-subtle">
                  <tr>
                    <th className="p-3 font-medium">Mã</th>
                    <th className="p-3 font-medium">Kịch bản</th>
                    <th className="p-3 font-medium">Phân loại</th>
                    <th className="p-3 font-medium">Kỳ vọng</th>
                    <th className="p-3 font-medium">Thực tế</th>
                    <th className="p-3 font-medium">Kết luận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cases.map((testCase) => {
                    const executed = Object.prototype.hasOwnProperty.call(testCase, 'actualDecision');
                    return (
                      <tr
                        key={testCase.id}
                        className={cn('transition-colors', selected?.id === testCase.id ? 'bg-accent/10' : 'hover:bg-surface-muted/60')}
                      >
                        <td className="p-3">
                          <button type="button" onClick={() => setSelectedId(testCase.id)} className="min-h-10 rounded-lg px-2 font-mono font-semibold text-blue-300 hover:bg-accent/10" aria-label={`Xem chi tiết ca ${testCase.id}`}>
                            {testCase.id}
                          </button>
                        </td>
                        <td className="p-3 font-medium">{testCase.title}</td>
                        <td className="p-3 font-mono text-[10px] text-text-muted">{testCase.classification || testCase.category || '—'}</td>
                        <td className="p-3"><StatusBadge status={testCase.expectedDecision} /></td>
                        <td className="p-3">{executed ? <StatusBadge status={testCase.actualDecision} /> : <span className="text-text-subtle">Chưa chạy</span>}</td>
                        <td className="p-3">
                          {!executed ? <span className="text-text-subtle">Chờ chạy</span> : testCase.passed ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300"><CheckCircle2 className="h-4 w-4" /> PASS</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-medium text-red-300"><XCircle className="h-4 w-4" /> FAIL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-3">
              <div>
                <h3 className="ui-eyebrow">Đầu vào</h3>
                <p className="mt-2 text-sm leading-6">{selected?.prompt || selected?.title}</p>
              </div>
              <div>
                <h3 className="ui-eyebrow">Kết quả đã chạy</h3>
                {selected?.actualDecision ? (
                  <div className="mt-2 space-y-2"><StatusBadge status={selected.actualDecision} /><p className="text-xs leading-5 text-text-muted">{selected.actionableQuestion || selected.message || 'Không có mô tả bổ sung.'}</p></div>
                ) : <p className="mt-2 text-xs text-text-subtle">Chưa có kết quả thực thi.</p>}
              </div>
              <div>
                <h3 className="ui-eyebrow">Bằng chứng</h3>
                <div className="mt-2 space-y-1.5 font-mono text-[11px] text-text-muted">
                  <p><Clock3 className="mr-1 inline h-3.5 w-3.5" />{selected?.durationMs != null ? `${selected.durationMs} ms` : '—'}</p>
                  <p>Bắt đầu: {formatDateTime(selected?.startedAt)}</p>
                  <p>Kết thúc: {formatDateTime(selected?.completedAt)}</p>
                  <p className="break-all">SHA-256: {selected?.sha256Proof || '—'}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="ui-panel p-4">
              <h2 className="text-sm font-semibold">Ca mới của giám khảo</h2>
              <p className="mt-1 text-xs text-text-muted">Nhập tình huống tự nhiên để chạy qua policy engine hiện tại.</p>
              <label className="mt-3 block">
                <span className="sr-only">Tình huống kiểm thử</span>
                <textarea value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} rows={4} className="ui-field resize-y" placeholder="Nhập một tình huống mới…" />
              </label>
              <button type="button" onClick={runCustom} disabled={isCustomRunning || !customPrompt.trim()} className="ui-button-primary mt-2 w-full">
                {isCustomRunning ? <RotateCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isCustomRunning ? 'Đang xử lý…' : 'Chạy qua policy engine'}
              </button>
              <div className="mt-3 min-h-28 rounded-xl border border-border bg-surface-muted/50 p-3 text-xs">
                {!customResult && <p className="text-text-subtle">Kết quả chỉ xuất hiện sau khi backend thực thi.</p>}
                {customResult && !customResult.success && <p role="alert" className="text-red-300">{customResult.error}</p>}
                {customResult?.success && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={customDecision} />
                      <span className="font-mono text-[10px] text-text-subtle">{customResult.durationMs} ms</span>
                    </div>
                    <p><span className="text-text-muted">Phân loại:</span> {customResult.data?.classification || '—'}</p>
                    <p className="leading-5 text-text-muted">{customQuestion || customResult.data?.message}</p>
                    <p className="text-[10px] text-text-subtle">Hoàn tất: {formatDateTime(customResult.completedAt)}</p>
                  </div>
                )}
              </div>
            </section>

            <LiveTerminalConsole userRole={userRole} maxHeight="max-h-[28rem]" />
          </aside>
        </main>
      </div>
    </div>
  );
}
