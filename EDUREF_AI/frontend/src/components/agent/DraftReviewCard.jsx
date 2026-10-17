import MarkdownRenderer from '../common/MarkdownRenderer';

import { FilePenLine, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function DraftReviewCard({
  draft = null,
  onConfirm = null,
  onEdit = null,
  submitting = false,
}) {
  if (!draft) return null;

  return (
    <div className="my-3 rounded-xl border border-blue-200 bg-white shadow-xs overflow-hidden text-xs max-w-xl">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-blue-50/80 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <FilePenLine className="w-4 h-4 text-[#0B3B82]" />
          <span className="font-bold text-[#0B3B82] text-xs">
            Bản nháp hồ sơ đề nghị cấp giấy
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Chờ bạn xác nhận
        </span>
      </div>

      <div className="p-3.5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Sinh viên đề nghị:</span>
            <span className="font-semibold text-slate-800 text-[11px] block truncate">
              {draft.studentName || draft.fullName || 'Theo phiên đăng nhập'}
            </span>
            <span className="font-mono text-[10px] text-blue-700">
              MSSV: {draft.studentCode || 'N/A'}
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Nơi tiếp nhận / Trả kết quả:</span>
            <span className="font-semibold text-slate-800 text-[11px] block truncate">
              {draft.pickupCampus || draft.recipient || 'Trụ sở chính Khu A (A-01.01)'}
            </span>
            <span className="text-[10px] text-slate-500">
              Phòng Công tác Sinh viên (CTSV)
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-500 block">Mục đích cấp giấy:</span>
          <p className="font-medium text-slate-800 text-xs mt-0.5">
            <MarkdownRenderer content={draft.purpose || 'Cấp giấy xác nhận sinh viên phục vụ thủ tục'} inline />
          </p>
        </div>

        {draft.phone && (
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-600">
            <span>Số điện thoại liên hệ:</span>
            <span className="font-mono font-semibold text-slate-900">{draft.phone}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0B3B82] shrink-0" />
          <span>Hệ thống sẽ thẩm định tự động qua 3 Chốt chặn và cấp mã QR cùng SHA-256 chống làm giả.</span>
        </div>

        <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
          {onConfirm && (
            <button
              type="button"
              disabled={submitting}
              onClick={onConfirm}
              className="flex-1 py-2 px-3 bg-[#0B3B82] hover:bg-[#082C64] active:bg-[#062047] disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang gửi...' : 'Xác nhận nộp đơn ngay'}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              disabled={submitting}
              onClick={onEdit}
              className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-all cursor-pointer"
            >
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
