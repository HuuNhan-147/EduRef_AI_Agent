import { AlertTriangle, CheckCircle2, ClipboardCheck, Copy, FileKey2, QrCode, UserRound } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import DocumentUploadPanel from './DocumentUploadPanel';

const GATES = [
  ['Điều kiện đầu vào', 'requirementsCheck'],
  ['Quy chế áp dụng', 'policiesCheck'],
  ['Thẩm quyền quyết định', 'authorityCheck'],
];

export default function ActivityInspector({ account, decision, onUploaded }) {
  const hasDecision = decision.status !== 'IDLE';

  return (
    <aside className="h-full overflow-y-auto border-l border-ui-border bg-surface/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="ui-kicker">Trạng thái yêu cầu</p><h2 className="mt-1 text-sm font-semibold text-foreground">Hồ sơ hiện tại</h2></div>
        <StatusBadge status={decision.status} />
      </div>

      <section className="mt-5 rounded-2xl border border-ui-border bg-canvas/35 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><UserRound className="h-4 w-4 text-slate-500" />Phiên hiện tại</div>
        <p className="mt-3 text-sm font-medium text-foreground">{account.name}</p>
        <p className="mt-1 font-mono text-xs text-slate-500">{account.code}</p>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">Thông tin hiển thị theo tài khoản demo đã xác thực.</p>
      </section>

      <section className="mt-4 rounded-2xl border border-ui-border bg-canvas/35 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><ClipboardCheck className="h-4 w-4 text-blue-300" />Các chốt kiểm tra</div>
        <div className="mt-3 space-y-2.5">
          {GATES.map(([label, key]) => (
            <div key={key} className="flex items-center justify-between gap-3 text-xs"><span className="text-slate-400">{label}</span><StatusBadge status={decision[key]} showIcon={false} /></div>
          ))}
        </div>
      </section>

      {hasDecision && (
        <section className="mt-4 rounded-2xl border border-ui-border bg-canvas/35 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Kết quả hiện tại</div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={decision.finalDecision || decision.status} />{decision.requestCode && <span className="font-mono text-xs text-blue-200">{decision.requestCode}</span>}</div>
          {decision.reason && <p className="mt-3 text-xs leading-5 text-slate-400">{decision.reason}</p>}
          {decision.sha256Proof && (
            <div className="mt-3 rounded-xl border border-ui-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"><FileKey2 className="h-3.5 w-3.5" />Audit SHA-256</span><button type="button" onClick={() => navigator.clipboard?.writeText(decision.sha256Proof)} className="ui-icon-button h-8 w-8" aria-label="Sao chép mã băm"><Copy className="h-3.5 w-3.5" /></button></div>
              <p className="mt-2 break-all font-mono text-[10px] leading-4 text-slate-500">{decision.sha256Proof}</p>
            </div>
          )}
          {decision.qrCodeUrl && (
            <div className="mt-3 rounded-xl border border-ui-border bg-white p-3 text-slate-900">
              <div className="flex items-center gap-2 text-xs font-semibold"><QrCode className="h-4 w-4" />Mã QR do hệ thống cấp</div>
              <img src={decision.qrCodeUrl} alt={`Mã QR của hồ sơ ${decision.requestCode || ''}`} className="mx-auto mt-3 h-32 w-32" />
              <p className="mt-2 text-[10px] leading-4 text-slate-500">Chưa khẳng định chữ ký hoặc hạn dùng nếu chưa có endpoint xác minh tương ứng.</p>
            </div>
          )}
        </section>
      )}

      {decision.status === 'WAITING_STUDENT' && decision.requestId && <div className="mt-4"><DocumentUploadPanel requestId={decision.requestId} onUploaded={onUploaded} /></div>}
      {decision.status === 'WAITING_STUDENT' && !decision.requestId && (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Chưa thể tải tài liệu vì phản hồi hiện tại không có mã hồ sơ nội bộ. Backend cần trả về <code>requestId</code> trước khi bật bước này.</span>
        </div>
      )}
    </aside>
  );
}
