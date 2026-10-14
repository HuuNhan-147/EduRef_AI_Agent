import { useState } from "react";
import { Sparkles, Clock, Loader2, CheckCircle2, Square, ChevronDown, ChevronUp } from 'lucide-react';

export default function AgentProgress({
  isActive = false,
  durationMs = null,
  activeStep = 1,
  onStop = null,
}) {
  const [expanded, setExpanded] = useState(true);

  const steps = [
    { id: 1, name: 'Chốt 1: Điều kiện đầu vào (Requirements)', desc: 'Xác thực MSSV, thông tin sinh viên, giấy tờ đính kèm' },
    { id: 2, name: 'Chốt 2: Quy chế Đào tạo (Policies)', desc: 'Kiểm tra niên khóa, thời hạn 4 năm, tín chỉ tích lũy, số lần cấp' },
    { id: 3, name: 'Chốt 3: Thẩm quyền Quyết định (Authority)', desc: 'Phân định: Tự động phê duyệt / Chuyển tiếp Cán bộ CTSV' },
  ];

  const formatMs = (ms) => {
    if (!ms && ms !== 0) return '';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="my-2 max-w-xl mx-auto rounded-xl border border-blue-200/90 bg-blue-50/40 shadow-2xs overflow-hidden transition-all text-xs">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border-b border-blue-100">
        <div className="flex items-center gap-2 font-medium text-slate-800">
          {isActive ? (
            <Loader2 className="w-4 h-4 text-[#0B3B82] animate-spin shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span className="font-semibold text-slate-900">
            {isActive ? 'EduRef AI đang suy luận & thẩm định' : 'Quy trình thẩm định tác tử'}
          </span>
          {durationMs !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-white text-[#0B3B82] border border-blue-200 shadow-2xs">
              <Clock className="w-3 h-3 text-[#0B3B82]" />
              {formatMs(durationMs)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isActive && onStop && (
            <button
              type="button"
              onClick={onStop}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <Square className="w-3 h-3 fill-rose-600" />
              <span>Dừng</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
            title={expanded ? 'Thu gọn' : 'Xem chi tiết'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 bg-white space-y-2">
          {steps.map((st) => {
            const isDone = !isActive || activeStep > st.id;
            const isCurrent = isActive && activeStep === st.id;
            return (
              <div
                key={st.id}
                className={`flex items-start gap-2.5 p-2 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-blue-50/80 border border-blue-200 text-blue-950 font-medium'
                    : isDone
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#0B3B82] animate-spin" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold truncate">{st.name}</span>
                    {isDone && <span className="text-[10px] text-emerald-600 font-bold">✓ Đạt</span>}
                    {isCurrent && <span className="text-[10px] text-blue-700 font-bold animate-pulse">Đang kiểm tra...</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
