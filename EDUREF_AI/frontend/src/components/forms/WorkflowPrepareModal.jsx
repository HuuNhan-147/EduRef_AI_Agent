import MarkdownRenderer from '../common/MarkdownRenderer';
import { toDisplayText } from '../../config/displayText';
import { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';
import api from '../../services/api';

export default function WorkflowPrepareModal({ isOpen, onClose, petitionType, currentAccountKey, onSubmitToChat }) {
  const [config, setConfig] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const formCode = petitionType?.formCode || 'GENERAL_CONFIRMATION';
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setConfig(null); setError('');
    Promise.all([api.get('/drafts/config'), api.get('/drafts/active')]).then(([settings, current]) => {
      if (!active) return;
      const data = settings.data.data;
      setConfig(data);
      setValues({ ...data.profile, purpose: formCode === 'GENERAL_CONFIRMATION' ? '' : data.forms[formCode]?.shortName,
        ...(current.data.data?.formCode === formCode && current.data.data.state !== 'SUBMITTED' ? current.data.data.data : {}) });
    }).catch(err => { if (active) setError(err.response?.data?.message || 'Chưa lấy được hồ sơ từ hệ thống.'); });
    return () => { active = false; };
  }, [isOpen, formCode, currentAccountKey]);
  if (!isOpen) return null;
  const required = new Set(['fullName', 'gender', 'purpose', ...(config?.forms[formCode]?.requiredFields || [])]);
  const locked = ['fullName', 'studentClass', 'faculty', 'major'];
  const fields = config?.fields.filter(field => required.has(field.key)) || [];
  const submit = async event => {
    event.preventDefault(); if (busy || !config) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/drafts', { formCode, inputData: values });
      if (!data.success) throw new Error(data.message);
      onSubmitToChat('Đã chuẩn bị hồ sơ để kiểm tra và xác nhận.', { workflowDraft: data.data });
      onClose();
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Thông tin hồ sơ" className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-[#0B3B82]"><FileText className="h-5 w-5" />{petitionType?.title || 'Chuẩn bị hồ sơ'}</h2><button type="button" aria-label="Đóng" onClick={onClose}><X className="h-5 w-5" /></button></div>
      <div className="overflow-y-auto p-5 space-y-4"><p className="text-xs text-slate-500">Thông tin đã lưu được điền từ hồ sơ của bạn. Chỉ bổ sung hoặc sửa phần cần thiết; bước tiếp theo sẽ hiển thị bản xem trước để xác nhận nộp.</p>
        {!config && !error && <p role="status" className="text-sm">Đang tải hồ sơ…</p>}
        <fieldset disabled={busy} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(field => <label key={field.key} className="space-y-1 text-xs text-slate-700"><span>{field.label}</span>
            {field.type === 'select' ? <select value={values[field.key] ?? ''} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} className="w-full rounded-lg border p-2.5"><option value="">Chọn…</option>{field.options.map(option => <option key={option} value={option}>{toDisplayText(option)}</option>)}</select>
              : <><input disabled={locked.includes(field.key) && Boolean(config.profile[field.key])} type={field.type === 'number' ? 'number' : field.type === 'tel' ? 'tel' : 'text'} min={field.type === 'number' ? 0 : undefined} value={values[field.key] ?? ''} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} list={field.options ? `modal-${field.key}` : undefined} className="w-full rounded-lg border bg-white p-2.5 disabled:bg-slate-100" />
                {field.options && <datalist id={`modal-${field.key}`}>{field.options.map(option => <option key={option} value={option} />)}</datalist>}</>}
          </label>)}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700"><MarkdownRenderer content={error} inline /></p>}
      </div>
      <div className="flex justify-end gap-3 border-t p-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 text-xs">Đóng</button><button disabled={busy || !config} className="rounded-lg bg-[#0B3B82] px-4 py-2 text-xs font-semibold text-white">{busy ? 'Đang chuẩn bị…' : 'Chuẩn bị bản xem trước'}</button></div>
    </form>
  </div>;
}
