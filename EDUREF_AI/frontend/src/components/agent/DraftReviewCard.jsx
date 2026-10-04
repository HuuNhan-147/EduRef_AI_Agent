import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, FilePenLine, ShieldCheck, Trash2 } from 'lucide-react';
import Dialog from '../ui/Dialog';

const MAX_LENGTH = { purpose: 500, recipient: 160, note: 1000 };

export default function DraftReviewCard({ draft, submitting, error, onChange, onSubmit, onDiscard }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(draft?.fields || {});
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setFields(draft?.fields || {});
    setValidationError('');
  }, [draft?.id]);

  if (!draft?.ready) return null;

  const closeEditor = () => {
    setFields(draft.fields || {});
    setValidationError('');
    setEditing(false);
  };

  const save = (event) => {
    event.preventDefault();
    if (String(fields.purpose || '').trim().length < 4) {
      setValidationError('Hãy mô tả mục đích sử dụng rõ hơn trước khi lưu.');
      return;
    }
    onChange?.({ ...fields, purpose: fields.purpose.trim() });
    setEditing(false);
  };

  return (
    <>
      <section className="mx-auto mb-6 w-full max-w-3xl rounded-2xl border border-primary/25 bg-surface-raised p-4 shadow-panel sm:p-5" aria-label="Bản nháp hồ sơ cần kiểm tra">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ui-border pb-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FilePenLine className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="ui-eyebrow">Bước 2 / 3 · Sinh viên kiểm tra</p>
              <h2 className="mt-1 text-base font-semibold text-foreground">Bản nháp yêu cầu xác nhận sinh viên</h2>
              <p className="mt-1 text-sm text-muted">Thông tin này chưa được gửi tới Phòng Đào tạo.</p>
            </div>
          </div>
          <span className="rounded-full border border-attention/30 bg-attention/10 px-2.5 py-1 text-xs font-medium text-attention">Chờ bạn xác nhận</span>
        </div>

        <dl className="grid gap-x-6 gap-y-4 py-4 sm:grid-cols-2">
          <div><dt className="text-xs text-muted">Sinh viên</dt><dd className="mt-1 text-sm font-medium text-foreground">{draft.student?.fullName || 'Theo phiên đăng nhập'}</dd></div>
          <div><dt className="text-xs text-muted">Mã số sinh viên</dt><dd className="mt-1 font-mono text-sm text-foreground">{draft.student?.studentCode || 'Theo phiên đăng nhập'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted">Mục đích sử dụng</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{draft.fields?.purpose}</dd></div>
          {draft.fields?.recipient && <div><dt className="text-xs text-muted">Nơi tiếp nhận</dt><dd className="mt-1 text-sm text-foreground">{draft.fields.recipient}</dd></div>}
          {draft.fields?.note && <div><dt className="text-xs text-muted">Ghi chú</dt><dd className="mt-1 text-sm text-foreground">{draft.fields.note}</dd></div>}
          <div><dt className="text-xs text-muted">Bộ phận tiếp nhận</dt><dd className="mt-1 text-sm text-foreground">{draft.destination || 'Phòng Đào tạo'}</dd></div>
        </dl>

        <p className="flex gap-2 rounded-xl bg-surface-soft/60 p-3 text-xs leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />Sau khi gửi, AI sẽ chuyển hồ sơ tới cán bộ có thẩm quyền. Cán bộ là người phê duyệt hoặc từ chối; bạn có thể theo dõi trong “Hồ sơ của tôi”.</p>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onSubmit} disabled={submitting} className="ui-button-primary">
            {submitting ? 'Đang gửi hồ sơ…' : 'Kiểm tra xong, gửi hồ sơ'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setEditing(true)} disabled={submitting} className="ui-button-secondary"><FilePenLine className="h-4 w-4" aria-hidden="true" />Chỉnh sửa</button>
          <button type="button" onClick={onDiscard} disabled={submitting} className="ui-button-ghost text-muted"><Trash2 className="h-4 w-4" aria-hidden="true" />Bỏ bản nháp</button>
        </div>
      </section>

      <Dialog open={editing} onClose={closeEditor} title="Chỉnh sửa bản nháp" description="Bạn vẫn có thể thay đổi nội dung trước khi gửi tới Phòng Đào tạo." footer={
        <div className="flex justify-end gap-2"><button type="button" onClick={closeEditor} className="ui-button-secondary">Quay lại</button><button type="submit" form="draft-review-form" className="ui-button-primary"><CheckCircle2 className="h-4 w-4" />Lưu bản nháp</button></div>
      }>
        <form id="draft-review-form" onSubmit={save} className="space-y-4">
          <label className="block text-sm font-medium text-foreground">Mục đích sử dụng <span className="text-danger">*</span><textarea value={fields.purpose || ''} maxLength={MAX_LENGTH.purpose} onChange={(event) => setFields((value) => ({ ...value, purpose: event.target.value }))} rows={3} className="ui-field mt-2 resize-y" required /></label>
          <label className="block text-sm font-medium text-foreground">Nơi tiếp nhận <span className="font-normal text-muted">(không bắt buộc)</span><input value={fields.recipient || ''} maxLength={MAX_LENGTH.recipient} onChange={(event) => setFields((value) => ({ ...value, recipient: event.target.value }))} className="ui-field mt-2" /></label>
          <label className="block text-sm font-medium text-foreground">Ghi chú <span className="font-normal text-muted">(không bắt buộc)</span><textarea value={fields.note || ''} maxLength={MAX_LENGTH.note} onChange={(event) => setFields((value) => ({ ...value, note: event.target.value }))} rows={3} className="ui-field mt-2 resize-y" /></label>
          {validationError && <p role="alert" className="text-sm text-danger">{validationError}</p>}
        </form>
      </Dialog>
    </>
  );
}
