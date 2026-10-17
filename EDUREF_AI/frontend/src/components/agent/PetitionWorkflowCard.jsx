import { useEffect, useRef, useState } from 'react';
import { FileCheck2, Loader2, Pencil, CheckCircle2, XCircle } from 'lucide-react';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { FORM_LABELS, toDisplayText } from '../../config/displayText';

export default function PetitionWorkflowCard({ workflow }) {
  const { draft, busy, error, action } = workflow;
  const [values, setValues] = useState({});
  const [editing, setEditing] = useState(false);
  const dirty = useRef(false);
  useEffect(() => { dirty.current = false; setValues(draft?.data || {}); setEditing(false); }, [draft?.id, draft?.revision]);
  useEffect(() => {
    if (!dirty.current || busy) return;
    const timer = setTimeout(() => { dirty.current = false; action('UPDATE', values); }, 700);
    return () => clearTimeout(timer);
  }, [values, busy]);
  if (!draft && !error && !busy) return null;
  if (!draft) return <div className="my-3 rounded-xl border bg-white p-4 text-sm" role="status"><MarkdownRenderer content={error || 'Đang lấy thông tin hồ sơ…'} compact /></div>;
  if (draft.state === 'CANCELLED') return <p className="my-3 text-sm text-slate-500">Đã hủy bản nháp. Bạn có thể chọn thủ tục khác.</p>;
  if (draft.state === 'REJECTED') return <section className="my-4 rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden" aria-label="Quy trình đã kết thúc">
    <div className="flex items-start gap-2 bg-red-50 p-4 text-red-900"><XCircle className="h-5 w-5 shrink-0" /><div>
      <h3 className="text-sm font-bold">Không đủ điều kiện cấp {FORM_LABELS[draft.formCode] || toDisplayText(draft.formName)}</h3>
      <p className="text-xs mt-1 font-semibold">Đã từ chối · Quy trình này đã kết thúc</p>
    </div></div>
    <div className="p-4 space-y-3 text-sm">
      <p className="text-xs text-slate-500">{draft.data.fullName} · MSSV {draft.data.studentCode}</p>
      <div role="status" className="rounded-lg bg-red-50 p-3 text-red-900"><p className="font-semibold mb-1">Lý do từ chối</p><MarkdownRenderer content={draft.resolution?.reason || draft.notice} compact inheritColor /></div>
      <p className="text-slate-600">Hệ thống đã dừng xử lý yêu cầu này. Bạn không cần bổ sung thông tin hoặc xác nhận nộp cho yêu cầu đã từ chối.</p>
      <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold mb-1">Hướng xử lý tiếp theo</p><MarkdownRenderer content={draft.resolution?.nextStep || 'Vui lòng liên hệ Phòng Công tác Sinh viên để kiểm tra hồ sơ học vụ và được hướng dẫn.'} compact /></div>
      {draft.targetForm && <button disabled={busy} onClick={() => action('START_RECOMMENDED')} className="w-full rounded-lg bg-[#0B3B82] px-4 py-3 text-white font-semibold">Bắt đầu hồ sơ {draft.targetForm === 'COURSE_DEBT' ? 'xác nhận nợ môn' : 'theo thủ tục phù hợp'}</button>}
      <p className="text-xs text-slate-500">Chọn một thủ tục ở thanh bên hoặc gửi yêu cầu mới để bắt đầu công việc khác.</p>
      {busy && <p role="status" className="text-xs text-blue-800">Đang bắt đầu công việc mới…</p>}
      {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700"><MarkdownRenderer content={error} compact inheritColor /></div>}
    </div>
  </section>;
  const submitted = draft.state === 'SUBMITTED';
  const fields = editing ? draft.fields : draft.missingFields;
  const needsInput = fields.length > 0;
  const update = (key, value) => { dirty.current = true; setValues(previous => ({ ...previous, [key]: value })); };
  return <section className="my-4 rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden" aria-label="Công việc đang xử lý">
    <div className="flex items-center gap-2 bg-blue-50 p-4 text-[#0B3B82]">
      <FileCheck2 className="h-5 w-5" /><div><h3 className="text-sm font-bold">{FORM_LABELS[draft.formCode] || toDisplayText(draft.formName)}</h3>
        <p className="text-xs mt-1">{submitted ? 'Kết quả hồ sơ' : draft.state === 'BLOCKED' ? 'Chưa thể tiếp tục · Xem điều kiện bên dưới' : draft.state === 'READY' && !editing ? 'Hồ sơ đã sẵn sàng · Kiểm tra và xác nhận một lần' : needsInput ? 'Đã điền thông tin có sẵn · Chỉ bổ sung phần còn thiếu' : 'Cần chọn thủ tục phù hợp để tiếp tục'}</p></div>
    </div>
    <div className="p-4 space-y-3 text-sm">
      {submitted ? <><p className="font-semibold">{({ APPROVED: 'Đã được phê duyệt', ESCALATED: 'Đang chờ cán bộ thẩm định', WAITING_STUDENT: 'Cần bổ sung', REJECTED: 'Không đủ điều kiện', CANCELLED: 'Đã thu hồi' })[draft.result?.status] || draft.result?.status} · {draft.result?.requestCode}</p>
        <MarkdownRenderer content={draft.result?.message || ''} compact />
        {draft.result?.status === 'REJECTED' && <div role="status" className="rounded-lg bg-red-50 p-3 text-red-900"><p className="font-semibold">Quy trình này đã kết thúc.</p><p className="mt-1">Bạn không cần tiếp tục bổ sung hay xác nhận nộp. Nếu cần kiểm tra lại dữ liệu học vụ hoặc quyết định, hãy liên hệ đơn vị tiếp nhận hồ sơ.</p></div>}</>
        : <>
          <p className="text-xs text-slate-500">{draft.data.fullName} · MSSV {draft.data.studentCode}. Thông tin sửa tại đây áp dụng cho hồ sơ này.</p>
          {draft.notice && <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><MarkdownRenderer content={draft.notice} compact inheritColor /></div>}
          {draft.targetForm && <button disabled={busy} onClick={() => action('SWITCH_FORM', { formCode: draft.targetForm })} className="rounded-lg bg-blue-100 px-3 py-2 text-blue-900 font-medium">Chuyển sang biểu mẫu phù hợp</button>}
          {needsInput ? <form onSubmit={event => { event.preventDefault(); dirty.current = false; action('UPDATE', values); }} className="space-y-3">
            <fieldset disabled={busy} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map(field => <label key={field.key} className="space-y-1 text-xs font-medium text-slate-700">
                <span>{field.label}{field.readOnly && ' · Hồ sơ trường'}</span>
                {field.type === 'select' ? <div className="flex flex-wrap gap-2">{field.options.map(option => <button type="button" key={option} disabled={field.readOnly} aria-pressed={values[field.key] === option} onClick={() => update(field.key, option)} className={`rounded-lg border p-2 text-left ${values[field.key] === option ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-300 bg-white'}`}>{toDisplayText(option)}</button>)}</div>
                  : <><input disabled={field.readOnly} type={field.type === 'number' ? 'number' : field.type === 'tel' ? 'tel' : 'text'} min={field.type === 'number' ? 0 : undefined} value={values[field.key] ?? ''} onChange={e => update(field.key, e.target.value)} list={field.options ? `choices-${draft.id}-${field.key}` : undefined} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 disabled:bg-slate-100" />
                    {field.options && <><div className="flex flex-wrap gap-1.5">{field.options.map(option => <button key={option} type="button" onClick={() => update(field.key, option)} className="rounded-lg border bg-white px-2 py-1 text-xs text-blue-800">{option}</button>)}</div><datalist id={`choices-${draft.id}-${field.key}`}>{field.options.map(option => <option key={option} value={option} />)}</datalist></>}</>}
                {field.description && <span className="block text-[11px] text-slate-500"><MarkdownRenderer content={field.description} inline /></span>}
              </label>)}
            </fieldset>
            <div className="flex items-center gap-3"><button disabled={busy} className="rounded-lg bg-[#0B3B82] text-white px-4 py-2 text-xs font-semibold">Lưu và tiếp tục</button><span className="text-[11px] text-slate-500">Thay đổi được lưu tự động sau khi bạn ngừng nhập.</span></div>
          </form> : <>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
              {draft.fields.filter(field => String(draft.data[field.key] ?? '').trim()).map(field => <div key={field.key}><dt className="text-slate-500">{field.label}</dt><dd className="font-medium text-slate-900 break-words"><MarkdownRenderer content={String(draft.data[field.key])} inline /></dd></div>)}
            </dl>
            {draft.addressConsentRequired && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Khi bấm xác nhận, bạn cam kết địa chỉ thường trú hiển thị trên đây là chính xác, đã đối chiếu giấy tờ và chịu trách nhiệm về thông tin cung cấp cho hồ sơ NVQS. Cần sửa địa chỉ, hãy chọn Chỉnh sửa trước khi nộp.</p>}
            {draft.state === 'READY' && <button disabled={busy} onClick={() => action('SUBMIT')} className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#0B3B82] px-4 py-3 text-white font-semibold"><CheckCircle2 className="h-4 w-4" />{draft.addressConsentRequired ? 'Xác nhận địa chỉ và nộp hồ sơ' : 'Xác nhận và nộp hồ sơ'}</button>}
          </>}
          <div className="flex items-center justify-between text-xs"><button disabled={busy} onClick={() => setEditing(!editing)} className="flex items-center gap-1 text-blue-800"><Pencil className="h-3 w-3" />{editing ? 'Đóng chỉnh sửa' : 'Xem / chỉnh sửa thông tin'}</button>
            {!draft.result?.requestId && <button disabled={busy} onClick={() => action('CANCEL')} className="text-slate-500">Hủy bản nháp</button>}</div>
        </>}
      {busy && <p role="status" className="flex items-center gap-2 text-xs text-blue-800"><Loader2 className="h-4 w-4 animate-spin" />Đang tự động xử lý…</p>}
      {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700"><MarkdownRenderer content={error} compact inheritColor /></div>}
    </div>
  </section>;
}
