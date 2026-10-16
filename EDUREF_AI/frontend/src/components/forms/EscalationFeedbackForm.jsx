import { useState } from 'react';
import api from '../../services/api';

const classes = { AUTO_APPROVED: ['ROUTINE'], ASK_CLARIFICATION: ['UNKNOWN_FACT'],
  REJECTED_POLICY: ['ROUTINE_POLICY_DENY'], ESCALATE_TO_STAFF: ['OUTSIDE_POLICY', 'BEYOND_AUTHORITY', 'UNKNOWN_FACT'] };
export default function EscalationFeedbackForm({ requestId }) {
  const [decision, setDecision] = useState('ESCALATE_TO_STAFF');
  const [classification, setClassification] = useState('OUTSIDE_POLICY');
  const [reason, setReason] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const input = 'w-full rounded border border-slate-300 bg-white p-2 text-xs';
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const res = await api.post('/sprint2/feedback', { requestId, expectedDecision: decision,
        expectedClassification: classification, reason, evidenceRef });
      if (!res.data?.success) throw new Error(res.data?.message || 'Chưa lưu được feedback.');
      setSaved(true);
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setBusy(false); }
  };
  return <details className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs">
    <summary className="cursor-pointer font-semibold text-blue-900">Feedback nghiệp vụ · hiệu chỉnh threshold</summary>
    <p className="my-2 text-slate-600">Ghi nhãn kỳ vọng và nguồn phản hồi gốc. Feedback lưu riêng, không đổi quyết định hồ sơ hoặc tự kích hoạt policy.</p>
    {saved ? <p role="status" className="text-emerald-800">Đã lưu feedback gắn hồ sơ; xem trong tab Sprint 2.</p> : <form onSubmit={submit} className="space-y-2">
      <fieldset disabled={busy} className="space-y-2">
        <label className="block">Quyết định đúng theo nghiệp vụ<select className={input} value={decision}
          onChange={(e) => { setDecision(e.target.value); setClassification(classes[e.target.value][0]); }}>
          {Object.keys(classes).map((d) => <option key={d}>{d}</option>)}</select></label>
        <label className="block">Phân loại đúng<select className={input} value={classification} onChange={(e) => setClassification(e.target.value)}>
          {classes[decision].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="block">Lý do và quy định áp dụng<textarea className={input} required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <label className="block">Đường dẫn / mã tài liệu phản hồi gốc<input className={input} required minLength={3} value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} /></label>
        <button className="rounded bg-blue-800 px-3 py-2 text-white" type="submit">{busy ? 'Đang lưu…' : 'Lưu feedback hồ sơ'}</button>
      </fieldset>
      {error && <p role="alert" className="text-red-800">{error}</p>}
    </form>}
  </details>;
}
