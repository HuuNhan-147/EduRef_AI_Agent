import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock, FileText, Play, RotateCw, Send, ShieldCheck, XCircle } from 'lucide-react';
import api from '../services/api';
import LiveTerminalConsole from '../components/common/LiveTerminalConsole';

const GENERAL_CASES = [
  { id: 'G-01', title: 'Thường quy: làm vé xe buýt', expectedDecision: 'AUTO_APPROVED', category: 'ROUTINE' },
  { id: 'G-02', title: 'Thiếu mục đích sử dụng', expectedDecision: 'ASK_CLARIFICATION', category: 'UNKNOWN_FACT' },
  { id: 'G-03', title: 'Sinh viên đã thôi học', expectedDecision: 'REJECTED_POLICY', category: 'ROUTINE_POLICY_DENY' },
  { id: 'G-04', title: 'Yêu cầu duyệt ngoại lệ', expectedDecision: 'ESCALATE_TO_STAFF', category: 'BEYOND_AUTHORITY' },
];

const TRACK_A_CASES = [
  { id: 'A-01', title: 'Thường quy: làm vé xe buýt', expectedDecision: 'AUTO_APPROVED', category: 'ROUTINE' },
  { id: 'A-02', title: 'Thường quy: hồ sơ học bổng', expectedDecision: 'AUTO_APPROVED', category: 'ROUTINE' },
  { id: 'A-03', title: 'Thường quy: vay vốn sinh viên', expectedDecision: 'AUTO_APPROVED', category: 'ROUTINE' },
  { id: 'A-04', title: 'Mục đích chưa có trong policy', expectedDecision: 'ESCALATE_TO_STAFF', category: 'OUTSIDE_POLICY' },
  { id: 'A-05', title: 'Yêu cầu vượt thẩm quyền', expectedDecision: 'ESCALATE_TO_STAFF', category: 'BEYOND_AUTHORITY' },
];

function formatTimestamp(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function DecisionBadge({ value }) {
  const color = value === 'AUTO_APPROVED'
    ? 'bg-emerald-100 text-emerald-800'
    : value?.startsWith('ESCALATE_')
      ? 'bg-amber-100 text-amber-800'
      : value === 'REJECTED_POLICY'
        ? 'bg-rose-100 text-rose-800'
        : 'bg-blue-100 text-blue-800';
  return <span className={`rounded px-2 py-1 font-mono text-[11px] font-bold ${color}`}>{value || 'CHƯA CHẠY'}</span>;
}

export default function VerifyHarnessPage() {
  const [mode, setMode] = useState('track');
  const [runs, setRuns] = useState({ general: null, track: null });
  const [selectedId, setSelectedId] = useState('A-01');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('Em cần giấy xác nhận sinh viên để nộp hồ sơ xin việc');
  const [customResult, setCustomResult] = useState(null);
  const [isCustomRunning, setIsCustomRunning] = useState(false);

  const definitionCases = mode === 'track' ? TRACK_A_CASES : GENERAL_CASES;
  const run = runs[mode];
  const cases = run?.results || definitionCases;
  const selected = cases.find((item) => item.id === selectedId) || cases[0];
  const passRate = run ? Math.round((run.passedCases / run.totalCases) * 100) : null;

  const distributionLabel = useMemo(() => {
    if (!run) return mode === 'track' ? 'Yêu cầu: 3 AUTO + 2 ESCALATE' : 'Bộ Verify tổng quát 4 ca';
    return `AUTO=${run.autoCount} · ESCALATE=${run.escalationCount}`;
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
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setIsRunning(false);
    }
  };

  const runCustom = async () => {
    if (!customPrompt.trim()) return;
    setIsCustomRunning(true);
    setCustomResult(null);
    try {
      const response = await api.post('/agent/verify-custom-prompt', { prompt: customPrompt });
      setCustomResult(response.data);
    } catch (requestError) {
      setCustomResult({ success: false, error: requestError.response?.data?.error || requestError.message });
    } finally {
      setIsCustomRunning(false);
    }
  };

  const customDecision = customResult?.data?.decision;
  const customQuestion = customResult?.data?.question
    || customResult?.data?.actionableQuestion
    || customResult?.data?.contextCapsule?.actionableQuestion;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 p-3 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-700 p-2 text-white"><Activity className="h-5 w-5" /></div>
              <div><h1 className="font-bold">Verify Harness — VNG Track A</h1><p className="text-xs text-slate-500">Một policy, kết quả thật, timestamp thật; không điền sẵn kết quả thực thi.</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                <button onClick={() => switchMode('general')} className={`rounded-md px-3 py-2 ${mode === 'general' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>General · 4 ca</button>
                <button onClick={() => switchMode('track')} className={`rounded-md px-3 py-2 ${mode === 'track' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Track A · 5 ca</button>
              </div>
              <button onClick={runSuite} disabled={isRunning} className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {isRunning ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{isRunning ? 'Đang chạy…' : `Chạy ${definitionCases.length} ca`}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Kết quả</div><div className="mt-1 font-mono text-sm font-bold">{run ? `${run.passedCases}/${run.totalCases} PASS (${passRate}%)` : 'Chưa thực thi'}</div></div>
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Phân bố</div><div className="mt-1 font-mono text-sm font-bold">{distributionLabel}</div></div>
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Thời gian</div><div className="mt-1 font-mono text-sm font-bold">{run ? `${run.totalDurationMs} ms` : '—'}</div></div>
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Hoàn tất lúc</div><div className="mt-1 font-mono text-sm font-bold">{formatTimestamp(run?.completedAt)}</div></div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">Không thể chạy Verify: {error}</p>}
        </header>

        <main className="grid gap-3 xl:grid-cols-12">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-200 p-3"><div className="flex items-center gap-2 text-xs font-bold uppercase"><FileText className="h-4 w-4 text-blue-700" />Ma trận kiểm thử</div><span className="text-xs text-slate-500">Policy: {run?.policyVersion || 'STUDENT_CONFIRMATION_V1.0.0'}</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Mã</th><th className="p-3">Kịch bản</th><th className="p-3">Phân loại</th><th className="p-3">Kỳ vọng</th><th className="p-3">Thực tế</th><th className="p-3">Kết luận</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map((testCase) => {
                    const executed = Object.prototype.hasOwnProperty.call(testCase, 'actualDecision');
                    return <tr key={testCase.id} onClick={() => setSelectedId(testCase.id)} className={`cursor-pointer ${selected?.id === testCase.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <td className="p-3 font-mono font-bold">{testCase.id}</td><td className="p-3 font-semibold">{testCase.title}</td><td className="p-3 font-mono text-[11px]">{testCase.classification || testCase.category || '—'}</td><td className="p-3"><DecisionBadge value={testCase.expectedDecision} /></td><td className="p-3"><DecisionBadge value={executed ? testCase.actualDecision : null} /></td>
                      <td className="p-3">{executed ? (testCase.passed ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />PASS</span> : <span className="inline-flex items-center gap-1 font-bold text-rose-700"><XCircle className="h-4 w-4" />FAIL</span>) : <span className="text-slate-400">Chờ chạy</span>}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-3">
              <div><div className="text-[10px] font-bold uppercase text-slate-500">Input</div><p className="mt-1 text-xs leading-5">{selected?.prompt || selected?.title}</p></div>
              <div><div className="text-[10px] font-bold uppercase text-slate-500">Kết quả đã chạy</div>{selected?.actualDecision ? <div className="mt-2 space-y-2"><DecisionBadge value={selected.actualDecision} /><p className="text-xs leading-5">{selected.actionableQuestion || selected.message}</p></div> : <p className="mt-1 text-xs text-slate-400">Chưa có kết quả thực thi.</p>}</div>
              <div><div className="text-[10px] font-bold uppercase text-slate-500">Bằng chứng</div><div className="mt-1 space-y-1 font-mono text-[11px]"><p><Clock className="mr-1 inline h-3 w-3" />{selected?.durationMs != null ? `${selected.durationMs} ms` : '—'}</p><p>Bắt đầu: {formatTimestamp(selected?.startedAt)}</p><p>Kết thúc: {formatTimestamp(selected?.completedAt)}</p><p className="break-all">SHA-256: {selected?.sha256Proof || '—'}</p></div></div>
            </div>
          </section>

          <aside className="flex flex-col gap-3 xl:col-span-4">
            <div className="min-h-[300px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950"><LiveTerminalConsole maxHeight="max-h-[360px] overflow-y-auto" className="h-full border-0 shadow-none" /></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase"><ShieldCheck className="h-4 w-4 text-purple-700" />Ca mới của giám khảo</div>
              <textarea value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-slate-300 p-3 text-xs outline-none focus:border-purple-600" placeholder="Nhập một ca mơ hồ mới…" />
              <button onClick={runCustom} disabled={isCustomRunning || !customPrompt.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{isCustomRunning ? <RotateCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Chạy qua policy engine</button>
              <div className="mt-3 min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                {!customResult && <p className="text-slate-400">Kết quả sẽ chỉ xuất hiện sau khi backend thực thi.</p>}
                {customResult && !customResult.success && <p className="text-rose-700">{customResult.error}</p>}
                {customResult?.success && <div className="space-y-2"><div className="flex items-center justify-between"><DecisionBadge value={customDecision} /><span className="font-mono text-[10px] text-slate-500">{customResult.durationMs} ms</span></div><p><strong>Phân loại:</strong> {customResult.data?.classification || '—'}</p><p>{customQuestion || customResult.data?.message}</p><p className="text-[10px] text-slate-500">Hoàn tất: {formatTimestamp(customResult.completedAt)}</p></div>}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
