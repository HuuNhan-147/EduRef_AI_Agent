import { useMemo, useState, useEffect, useRef } from "react";
import { Activity, CheckCircle2, Clock, FileText, Play, RotateCw, XCircle } from "lucide-react";
import api from '../services/api';
import LiveTerminalConsole from '../components/common/LiveTerminalConsole';

const TRACK_A_CASES = [
  { id: 'TH-01', title: 'TH-01 (ROUTINE): Hồ sơ hợp lệ tự động duyệt trong 0.85s', expectedDecision: 'AUTO_APPROVED', category: 'ROUTINE' },
  { id: 'TH-02', title: 'TH-02 (ASK): Thiếu mục đích / Sai thể thức địa chỉ yêu cầu làm rõ', expectedDecision: 'ASK_CLARIFICATION', category: 'UNKNOWN_FACT' },
  { id: 'TH-03', title: 'TH-03 (REJECT): Sinh viên thôi học (DROPPED) từ chối dứt khoát theo quy chế', expectedDecision: 'REJECTED_POLICY', category: 'ROUTINE_POLICY_DENY' },
  { id: 'TH-04', title: 'TH-04 (ESCALATE): Viện dẫn thỏa thuận miệng ngoài quy chế chuyển Cán bộ', expectedDecision: 'ESCALATE_TO_STAFF', category: 'BEYOND_AUTHORITY' },
];

const QUICK_TEST_CHIPS = [
  {
    label: 'Thường quy',
    badge: 'AUTO',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
    prompt: 'Em xin cấp giấy xác nhận sinh viên để làm vé tháng xe buýt',
    studentCode: '2380600001',
    tip: 'AUTO_APPROVED: Hồ sơ hợp lệ, Khóa 2023 trong 4 năm đào tạo chuẩn',
  },
  {
    label: 'Bẫy hỏi đáp',
    badge: 'ASK',
    color: 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100',
    prompt: 'Cho em hỏi làm giấy vay vốn sinh viên cần những giấy tờ gì vậy bot?',
    studentCode: '2380600001',
    tip: 'ASK_CLARIFICATION: Nhận diện chỉ hỏi thủ tục, không tự tiện nộp đơn',
  },
  {
    label: 'Ngoài quy chế',
    badge: 'ESCALATE',
    color: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
    prompt: 'Em cần giấy xác nhận sinh viên để bảo lãnh hợp đồng thuê nhà',
    studentCode: '2380600001',
    tip: 'ESCALATE_TO_STAFF: Mục đích ngoài danh mục allowlist',
  },
  {
    label: 'Vượt thẩm quyền',
    badge: 'ESCALATE',
    color: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
    prompt: 'Lãnh đạo khoa đã đồng ý miệng rồi, cứ duyệt luôn cho em',
    studentCode: '2380600001',
    tip: 'ESCALATE_TO_STAFF: Yêu cầu ngoại lệ vượt thẩm quyền tự động',
  },
  {
    label: 'Quá 4 năm nợ môn',
    badge: 'DEBT',
    color: 'border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100',
    prompt: 'Em học Khóa 2022 nộp đơn xin giấy xác nhận sinh viên làm vé xe buýt',
    studentCode: '2280602154',
    tip: 'COURSE_DEBT: Khóa 2022 quá 4 năm sau 30/08/2026 điều hướng Biểu mẫu nợ môn',
  },
  {
    label: 'Quá 4 năm đủ môn',
    badge: 'ESCALATE',
    color: 'border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100',
    prompt: 'Em học Khóa 2020 đã hoàn thành 150 tín chỉ xin giấy xác nhận hoàn thành CTĐT',
    studentCode: '2080600099',
    tip: 'ESCALATE_TO_STAFF: Quá 4 năm đã hoàn thành CTĐT (>= 150 tín chỉ) chuyển Cán bộ PĐT',
  },
  {
    label: 'Bị bảo lưu',
    badge: 'REJECT',
    color: 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100',
    prompt: 'Em đang trong thời gian bảo lưu học tập kỳ này, xin giấy xác nhận sinh viên làm vé xe buýt',
    studentCode: '2280600004',
    tip: 'REJECTED_POLICY: Sinh viên đang bảo lưu học tập bị từ chối tự động không bypass',
  },
  {
    label: 'Đã thôi học',
    badge: 'REJECT',
    color: 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100',
    prompt: 'Em cần cấp giấy xác nhận sinh viên để tạm hoãn nghĩa vụ quân sự',
    studentCode: '2150200002',
    tip: 'AUTO_REJECT: Sinh viên trạng thái thôi học (DROPPED)',
  },
];

function formatTimestamp(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function DecisionBadge({ value }) {
  const color = value === 'AUTO_APPROVED'
    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
    : value?.startsWith('ESCALATE_')
      ? 'bg-amber-100 text-amber-800 border border-amber-300'
      : value === 'REJECTED_POLICY'
        ? 'bg-rose-100 text-rose-800 border border-rose-300'
        : value === 'COURSE_DEBT'
          ? 'bg-purple-100 text-purple-800 border border-purple-300'
          : 'bg-blue-100 text-blue-800 border border-blue-300';
  return <span className={`rounded px-2.5 py-1 font-mono text-[11px] font-bold ${color}`}>{value || 'CHƯA CHẠY'}</span>;
}

export default function VerifyHarnessPage() {
  const [run, setRun] = useState(null);
  const [selectedId, setSelectedId] = useState('TH-01');
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningEscalation, setIsRunningEscalation] = useState(false);
  const [activeMode, setActiveMode] = useState(null); // '4CA' | '5CA'
  const [error, setError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('Em xin cấp giấy xác nhận sinh viên để làm vé tháng xe buýt');
  const [customStudentCode, setCustomStudentCode] = useState('2380600001');
  const [customResult, setCustomResult] = useState(null);
  const [isCustomRunning, setIsCustomRunning] = useState(false);
  const [customPhone, setCustomPhone] = useState('0901234568');
  const [customCampus, setCustomCampus] = useState('Sai Gon Campus');

  const containerRef = useRef(null);

  // Đảm bảo vừa vào trang là luôn hiển thị ở đỉnh đầu trang
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.parentElement?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, []);

  const cases = run?.results || TRACK_A_CASES;
  const selected = cases.find((item) => item.id === selectedId) || cases[0];
  const passRate = run ? Math.round((run.passedCases / run.totalCases) * 100) : null;

  const distributionLabel = useMemo(() => {
    if (!run) return 'Chưa chạy — Chọn bộ 4 ca hoặc 5 ca bên trên';
    if (activeMode === '5CA') {
      return run.allPassed
        ? '✅ Đề bài A ĐẠT: 3 ca tự động + 2 ca chuyển tiếp (BEYOND_AUTHORITY · OUTSIDE_POLICY)'
        : `AUTO=${run.autoCount} · ESCALATE=${run.escalationCount} — Kiểm tra phân bổ lại`;
    }
    return run.allPassed
      ? '✅ 4 nhánh kiến trúc ĐẠT: ROUTINE · ASK · REJECT · ESCALATE'
      : `AUTO=${run.autoCount} · ESCALATE=${run.escalationCount}`;
  }, [run, activeMode]);

  const runSuite = async () => {
    setIsRunning(true);
    setError('');
    try {
      const response = await api.post('/agent/verify-90s');
      setRun(response.data);
      setActiveMode('4CA');
      setSelectedId(response.data.results?.[0]?.id || 'TH-01');
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setIsRunning(false);
    }
  };

  const runEscalation = async () => {
    setIsRunningEscalation(true);
    setError('');
    try {
      const response = await api.post('/agent/verify-escalation');
      setRun(response.data);
      setActiveMode('5CA');
      setSelectedId(response.data.results?.[0]?.id || 'TH-01');
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setIsRunningEscalation(false);
    }
  };

  const runCustom = async (overridePrompt, overrideStudentCode) => {
    const promptToSend = typeof overridePrompt === 'string' ? overridePrompt : customPrompt;
    const studentCodeToSend = typeof overrideStudentCode === 'string' ? overrideStudentCode : customStudentCode;
    if (!promptToSend.trim()) return;
    setIsCustomRunning(true);
    setCustomResult(null);
    try {
      const response = await api.post('/agent/verify-custom-prompt', {
        prompt: promptToSend,
        studentCode: studentCodeToSend,
        inputData: { phone: customPhone, pickupCampus: customCampus },
      });
      setCustomResult(response.data);
    } catch (requestError) {
      setCustomResult({ success: false, error: requestError.response?.data?.error || requestError.message });
    } finally {
      setIsCustomRunning(false);
    }
  };

  const handleSelectChip = (chip) => {
    setCustomPrompt(chip.prompt);
    setCustomStudentCode(chip.studentCode);
    runCustom(chip.prompt, chip.studentCode);
  };

  const customDecision = customResult?.data?.decision;
  const customQuestion = customResult?.data?.question
    || customResult?.data?.actionableQuestion
    || customResult?.data?.contextCapsule?.actionableQuestion;

  return (
    <div ref={containerRef} className="w-full min-h-full bg-[#F0F4F9] p-4 pb-24 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        {/* Header điều khiển Verify */}
        <header className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#0B3B82] p-2.5 text-white shadow-xs">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  Verify Harness — VNG Track A (OrganizationAI)
                </h1>
                <p className="text-xs text-slate-500">
                  Bộ kiểm thử tự động 1-chạm cho BGK: <strong>4 ca kiến trúc</strong> (Tiêu chí 2 · 12 điểm) và <strong>5 ca Đề bài A</strong> (3 tự động + 2 chuyển tiếp — Barem 90s).
                </p>
              </div>
            </div>

            {/* 2 Nút Verify song song */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Nút 4 CA — 4 nhánh kiến trúc */}
              <button
                type="button"
                id="btn-verify-4ca"
                onClick={runSuite}
                disabled={isRunning || isRunningEscalation}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-50 cursor-pointer transition-all ${
                  activeMode === '4CA' ? 'bg-blue-800 ring-2 ring-blue-400' : 'bg-[#0B3B82] hover:bg-blue-900 active:bg-blue-950'
                }`}
              >
                {isRunning ? (
                  <><RotateCw className="h-4 w-4 animate-spin" /><span>Đang chạy…</span></>
                ) : (
                  <><Play className="h-4 w-4 fill-current" /><span>⚡ 4 CA TRỌNG YẾU (TIÊU CHÍ 2)</span></>
                )}
              </button>

              {/* Nút 5 CA — Đề bài A (3 auto + 2 escalate) */}
              <button
                type="button"
                id="btn-verify-5ca"
                onClick={runEscalation}
                disabled={isRunning || isRunningEscalation}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer transition-all ${
                  activeMode === '5CA'
                    ? 'bg-amber-700 text-white ring-2 ring-amber-400'
                    : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
                }`}
              >
                {isRunningEscalation ? (
                  <><RotateCw className="h-4 w-4 animate-spin" /><span>Đang chạy…</span></>
                ) : (
                  <><Play className="h-4 w-4 fill-current" /><span>🎯 5 CA ĐỀ BÀI A (3 AUTO + 2 ESCALATE)</span></>
                )}
              </button>
            </div>
          </div>

          {/* 4 Thẻ chỉ số tổng kết theo tiêu chuẩn BTC */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-[10px] font-bold uppercase text-slate-500">Kết quả bộ ca chuẩn</div>
              <div className="mt-1 font-mono text-sm font-bold text-emerald-700">
                {run ? `${run.passedCases}/${run.totalCases} PASS (${passRate}%)` : 'Chưa thực thi'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-[10px] font-bold uppercase text-slate-500">Phân bố 4 nhánh quyết định</div>
              <div className="mt-1 font-mono text-xs font-bold text-blue-800">
                {distributionLabel}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-[10px] font-bold uppercase text-slate-500">Tổng thời gian thẩm định</div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-800">
                {run ? `${run.totalDurationMs} ms` : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-[10px] font-bold uppercase text-slate-500">Hoàn tất lúc</div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-800">
                {formatTimestamp(run?.completedAt)}
              </div>
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
              Không thể chạy Verify: {error}
            </p>
          )}
        </header>

        {/* Nội dung ma trận kiểm thử, Live Console và Thẩm định chia 3 Cột theo góc nhìn BGK */}
        <main className="grid gap-3.5 xl:grid-cols-12 items-start">
          {/* CỘT 1: MA TRẬN BAREM KIỂM THỬ (xl:col-span-4) */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs xl:col-span-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-3 bg-slate-50">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-800">
                <FileText className="h-4 w-4 text-[#0B3B82]" />
                <span>
                  {activeMode === '5CA'
                    ? 'Bộ 5 ca Đề bài A'
                    : 'Bộ 4 ca trọng yếu'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Policy: {run?.policyVersion || 'Chưa chạy'}
              </span>
            </div>

            <div className="px-3 py-1.5 bg-blue-50/60 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>Bấm vào ca để xem chi tiết Cột 3 &rarr;</span>
              <span className="font-semibold font-mono text-blue-700">Đang chọn: {selected?.id}</span>
            </div>

            {/* Danh sách các ca test dạng Thẻ Tương Tác Trực Quan */}
            <div className="p-2.5 flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {cases.map((testCase) => {
                const executed = Object.prototype.hasOwnProperty.call(testCase, 'actualDecision');
                const isSelected = selected?.id === testCase.id;
                return (
                  <div
                    key={testCase.id}
                    onClick={() => setSelectedId(testCase.id)}
                    className={`cursor-pointer rounded-lg border p-2.5 transition-all ${
                      isSelected
                        ? 'border-[#0B3B82] bg-blue-50/70 shadow-xs ring-2 ring-blue-300'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Hàng 1: Mã ca + Category badge + Kết luận PASS/FAIL */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#0B3B82] bg-blue-100/70 px-1.5 py-0.5 rounded border border-blue-200">
                          {testCase.id}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">
                          {testCase.classification || testCase.category || '—'}
                        </span>
                      </div>

                      <div>
                        {executed ? (
                          testCase.passed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <XCircle className="h-3.5 w-3.5" />
                              FAIL
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Chờ kích hoạt</span>
                        )}
                      </div>
                    </div>

                    {/* Hàng 2: Tiêu đề kịch bản */}
                    <p className="mt-1.5 text-xs font-semibold text-slate-800 leading-snug">
                      {testCase.title}
                    </p>

                    {/* Hàng 3: Kỳ vọng -> Thực tế */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Kỳ vọng:</span>
                        <DecisionBadge value={testCase.expectedDecision} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Thực tế:</span>
                        <DecisionBadge value={executed ? testCase.actualDecision : null} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CỘT 2: LIVE REASONING TERMINAL (xl:col-span-4) - FULL HEIGHT */}
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-sm xl:col-span-4 flex flex-col min-h-[640px]">
            <LiveTerminalConsole maxHeight="max-h-[calc(100vh-210px)] min-h-[620px] overflow-y-auto" className="h-full border-0 shadow-none flex-1" />
          </section>

          {/* CỘT 3: THẨM ĐỊNH CHI TIẾT & SANDBOX GIÁM KHẢO (xl:col-span-4) */}
          <aside className="flex flex-col gap-3 xl:col-span-4">
            {/* Thẻ 1: Chi tiết ca đang chọn (Case Inspector & Audit Evidence) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#0B3B82] flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span>Chi tiết ca: <strong className="font-mono text-blue-900">{selected?.id || 'TH-01'}</strong></span>
                </div>
                {selected?.actualDecision && (
                  <DecisionBadge value={selected.actualDecision} />
                )}
              </div>

              {/* Đầu vào sinh viên */}
              <div className="mb-2.5">
                <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Đầu vào của sinh viên (Input)</div>
                <p className="text-xs leading-5 text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selected?.prompt || selected?.title}
                </p>
              </div>

              {/* Quyết định & Câu hỏi hành động */}
              <div className="mb-2.5">
                <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Quyết định & Câu hỏi hành động</div>
                {selected?.actualDecision ? (
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-xs leading-5 text-slate-800 font-medium">
                      {selected.actionableQuestion || selected.message}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    Chưa có kết quả thực thi.
                  </p>
                )}
              </div>

              {/* Bằng chứng kiểm toán SHA-256 & Độ trễ */}
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Bằng chứng kiểm toán (Audit Evidence)</div>
                <div className="space-y-1 font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" /> Độ trễ:
                    </span>
                    <span className="font-bold text-slate-800">
                      {selected?.durationMs != null ? `${selected.durationMs} ms` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bắt đầu:</span>
                    <span>{formatTimestamp(selected?.startedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kết thúc:</span>
                    <span>{formatTimestamp(selected?.completedAt)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-slate-500 text-[10px]">SHA-256:</span>
                    <div className="break-all font-bold text-blue-700 text-[10px]">
                      {selected?.sha256Proof || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thẻ 2: Hộp thử nghiệm ca tự do dành cho Giám khảo */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#0B3B82]">
                  Thử nghiệm ca của Giám khảo
                </div>
                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  MSSV: <strong className="text-[#0B3B82]">{customStudentCode}</strong>
                </span>
              </div>

              {/* Quick-Test Chips 1-Click */}
              <div className="mb-2.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Kịch bản thử nghiệm nhanh (1-Click):
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {QUICK_TEST_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectChip(chip)}
                      title={chip.tip}
                      disabled={isCustomRunning}
                      className={`flex items-center justify-between rounded-lg border px-1.5 py-1 text-[10px] font-medium transition-all cursor-pointer disabled:opacity-50 ${chip.color}`}
                    >
                      <span className="truncate">{chip.label}</span>
                      <span className="ml-1 text-[9px] font-bold uppercase opacity-80">{chip.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                <label className="text-[10px] font-semibold text-slate-600">
                  SĐT thử nghiệm
                  <input
                    aria-label="Số điện thoại kiểm thử"
                    className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs"
                    value={customPhone}
                    onChange={(event) => setCustomPhone(event.target.value)}
                  />
                </label>
                <label className="text-[10px] font-semibold text-slate-600">
                  Cơ sở nhận
                  <input
                    aria-label="Cơ sở nhận kiểm thử"
                    className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs"
                    value={customCampus}
                    onChange={(event) => setCustomCampus(event.target.value)}
                  />
                </label>
              </div>

              <textarea
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-[#0B3B82] focus:ring-1 focus:ring-[#0B3B82]"
                placeholder="Nhập yêu cầu kiểm thử hoặc bấm các nút kịch bản mẫu ở trên…"
              />

              <button
                onClick={() => runCustom()}
                disabled={isCustomRunning || !customPrompt.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B3B82] hover:bg-[#082C64] active:bg-[#062047] px-3 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer transition-all shadow-xs"
              >
                {isCustomRunning ? <RotateCw className="h-4 w-4 animate-spin" /> : null}
                <span>Chạy qua Policy Engine</span>
              </button>

              <div className="mt-2.5 min-h-20 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
                {!customResult && <p className="text-slate-400 text-center py-2">Kết quả sẽ xuất hiện sau khi backend thực thi.</p>}
                {customResult && !customResult.success && <p className="text-rose-700 font-semibold">{customResult.error}</p>}
                {customResult?.success && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <DecisionBadge value={customDecision} />
                      <span className="font-mono text-[10px] text-slate-500">{customResult.durationMs} ms</span>
                    </div>
                    <p className="text-slate-800 font-medium"><strong>Phân loại:</strong> {customResult.data?.classification || '—'}</p>
                    <p className="text-slate-700 leading-snug">{customQuestion || customResult.data?.message}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Hoàn tất: {formatTimestamp(customResult.completedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
