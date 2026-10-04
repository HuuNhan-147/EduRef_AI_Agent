import { ArrowRight, FileCheck2, MessageSquareText, ShieldCheck } from 'lucide-react';

const QUICK_PROMPTS = [
  ['Vé xe buýt', 'Em cần giấy xác nhận sinh viên để làm vé xe buýt.'],
  ['Vay vốn', 'Em cần giấy xác nhận sinh viên để làm hồ sơ vay vốn.'],
  ['Học bổng', 'Em cần giấy xác nhận sinh viên để hoàn thiện hồ sơ học bổng.'],
  ['Visa', 'Em cần giấy xác nhận sinh viên để bổ sung hồ sơ xin visa.'],
];

export default function ProcedurePanel({ requestType, loading, error, onOpenForm, onQuickPrompt }) {
  return (
    <aside className="flex h-full flex-col border-r border-ui-border bg-surface/75">
      <div className="border-b border-ui-border px-4 py-5">
        <p className="ui-kicker">Dịch vụ Sprint 2</p>
        <h2 className="mt-1.5 text-sm font-semibold text-foreground">Xác nhận sinh viên</h2>
        <p className="mt-2 text-xs leading-5 text-muted">Một quy trình rõ ràng, có kiểm soát và lưu dấu quyết định.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <section className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-200">
              <FileCheck2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{requestType?.name || 'Giấy xác nhận sinh viên'}</h3>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">DV-01</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{error ? 'Không tải được mô tả từ hệ thống.' : requestType?.description || 'Gửi yêu cầu, cung cấp thông tin và theo dõi quá trình Phòng Đào tạo xử lý.'}</p>
            </div>
          </div>
          <button type="button" onClick={() => onOpenForm?.(requestType || { code: 'STUDENT_CONFIRMATION', name: 'Giấy xác nhận sinh viên' })} disabled={loading} className="ui-button-primary mt-4 w-full">
            Bắt đầu yêu cầu <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-2 px-1">
            <MessageSquareText className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <h3 className="ui-kicker">Hỏi nhanh</h3>
          </div>
          <div className="mt-3 grid gap-2">
            {QUICK_PROMPTS.map(([label, prompt]) => (
              <button key={label} type="button" onClick={() => onQuickPrompt(prompt)} className="flex min-h-11 items-center justify-between rounded-xl border border-transparent px-3 text-left text-sm text-slate-300 transition hover:border-ui-border hover:bg-surface-raised hover:text-foreground">
                {label}<ArrowRight className="h-4 w-4 text-slate-600" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-ui-border p-4">
        <div className="flex items-start gap-2.5 text-xs leading-5 text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <span>AI chuẩn bị và chuyển đúng bộ phận; cán bộ có thẩm quyền đưa ra quyết định cuối cùng.</span>
        </div>
      </div>
    </aside>
  );
}
