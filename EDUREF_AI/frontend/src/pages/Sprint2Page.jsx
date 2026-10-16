import { useEffect, useState } from 'react';
import api from '../services/api';

const emptyDataset = { name: 'Independent evaluation', version: 'v1', origin: 'INDEPENDENT',
  sourceRef: '', sourceSha256: '', referenceDate: '', policyAuthorIds: [], independenceDeclaration: '', cases: [] };
const percent = (value) => value === null || value === undefined ? 'Chưa đo' : `${value}%`;
const field = 'w-full rounded border border-slate-300 bg-white p-2 text-xs';
const button = 'rounded bg-blue-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50';

export default function Sprint2Page({ currentAccountKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState([]);
  const [reason, setReason] = useState('');
  const [datasetText, setDatasetText] = useState(JSON.stringify(emptyDataset, null, 2));
  const [datasetId, setDatasetId] = useState('');
  const [policyId, setPolicyId] = useState('BASELINE');
  const [reportId, setReportId] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const isDean = ['DEAN_DAOTAO', 'ADMIN'].includes(currentAccountKey);

  useEffect(() => {
    let cancelled = false;
    api.get('/sprint2/overview').then((res) => { if (!cancelled) setData(res.data.data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || err.message); });
    return () => { cancelled = true; };
  }, []);
  const execute = async (operation, message) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await operation();
      if (!res.data?.success) throw new Error(res.data?.message || 'Thao tác chưa thành công.');
      const refreshed = await api.get('/sprint2/overview');
      setData(refreshed.data.data); setNotice(message);
      return res.data.data;
    } catch (err) { setError(err.response?.data?.message || err.message); return null; }
    finally { setBusy(false); }
  };
  const dataset = data?.datasets?.find((d) => d.id === datasetId);
  const report = data?.reports?.find((r) => r.id === reportId);
  const policyOptions = [{ id: 'BASELINE', version: 'THRESHOLD_BASELINE_V1', minEvidenceScore: 0, status: 'BASELINE' }, ...(data?.policies || [])];
  const saveDataset = (revise) => execute(() => {
    const body = JSON.parse(datasetText);
    return revise ? api.patch(`/sprint2/datasets/${datasetId}`, { ...body, reason }) : api.post('/sprint2/datasets', body);
  }, revise ? 'Đã lưu nháp, dữ liệu chưa được khóa.' : 'Đã nhập dataset nháp; kiểm tra nguồn, snapshot và nhãn trước khi khóa.');

  return <div className="w-full overflow-y-auto bg-slate-50 p-4 sm:p-6 text-slate-900">
    <div className="mx-auto max-w-6xl space-y-5">
      <header><h1 className="text-xl font-bold">Sprint 2 · Feedback và đo lường</h1>
        <p className="mt-1 text-sm text-slate-600">Threshold thêm bước cán bộ rà soát sau hard guard. Điểm bằng chứng là heuristic, không phải xác suất LLM.</p></header>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {!data ? <p>Đang tải. Backend cần migration Sprint 2 trước khi sử dụng.</p> : <>
        {data.previewMode && <p className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">{data.previewMode}</p>}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4"><p className="text-xs text-slate-500">Version đang hoạt động</p>
            <p className="mt-2 break-all text-sm font-semibold">{data.activePolicy.version}</p>
            <p className="text-xs">Chuyển cán bộ nếu điểm thấp hơn {data.activePolicy.minEvidenceScore}/100</p></div>
          <div className="rounded-lg border bg-white p-4"><p className="text-xs text-slate-500">Missed escalation</p><p className="mt-2 text-xl font-bold">{percent(data.measurement.missedEscalationRate)}</p></div>
          <div className="rounded-lg border bg-white p-4"><p className="text-xs text-slate-500">False escalation</p><p className="mt-2 text-xl font-bold">{percent(data.measurement.falseEscalationRate)}</p></div>
        </section>
        <p className="text-xs text-slate-600">{data.measurement.measurementStatus} · {data.measurement.note || 'Replay policy trên holdout đã khóa; chưa đo chất lượng LLM end-to-end.'}</p>
        <section className="rounded-lg border bg-white p-4 space-y-3">
          <h2 className="font-bold">1. Đề xuất threshold từ feedback hồ sơ</h2>
          <p className="text-xs text-slate-600">Ghi feedback trong trang Duyệt đơn. Chọn ít nhất 5 snapshot khác nhau đủ điều kiện auto, gồm cả thường quy và cần chuyển cán bộ. Tập holdout không được dùng hiệu chỉnh.</p>
          <div className="max-h-48 overflow-auto space-y-2">{data.feedback.length === 0 && <p className="text-xs">Chưa có feedback được lưu. Không tạo dữ liệu người dùng giả.</p>}
            {data.feedback.map((f) => <label key={f.id} className="flex gap-2 text-xs"><input type="checkbox" checked={selectedFeedback.includes(f.id)}
              onChange={(e) => setSelectedFeedback((previous) => e.target.checked ? [...previous, f.id] : previous.filter((id) => id !== f.id))} />
              <span>{f.reviewerName} · {f.expectedDecision} · {f.reason} · Nguồn: {f.evidenceRef}</span></label>)}</div>
          <label className="block text-xs">Lý do đề xuất / chỉnh sửa dữ liệu<textarea className={field} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <button className={button} disabled={busy || selectedFeedback.length < 5 || !reason.trim()} onClick={() => execute(() => api.post('/sprint2/policies/propose', { feedbackIds: selectedFeedback, reason }), 'Đã tạo version nháp; chưa thay đổi runtime.')}>Tạo đề xuất từ feedback</button>
        </section>
        <section className="rounded-lg border bg-white p-4 space-y-3">
          <h2 className="font-bold">2. Nhập và khóa tập có nhãn</h2>
          <p className="text-xs text-slate-600">Cần tối thiểu 30 ca holdout, người gán nhãn độc lập, nguồn/hash, snapshot học vụ và một nhãn rõ cho mỗi ca. Tập Verify không đủ điều kiện.</p>
          <label className="block text-xs">Dataset đã nhập<select className={field} value={datasetId} onChange={(e) => setDatasetId(e.target.value)}><option value="">Chọn dataset</option>
            {data.datasets.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.version} · {d.status}</option>)}</select></label>
          {dataset && <p className="text-xs text-slate-600">Nguồn: {dataset.sourceRef} · {dataset.cases.length} ca · {dataset.issues.length ? `${dataset.issues.length} vấn đề cần xử lý` : 'Đủ thông tin để lãnh đạo kiểm tra'}{dataset.issues.length > 0 && ` · ${dataset.issues.slice(0, 6).join(', ')}`}</p>}
          <button className={button} disabled={busy || !dataset} onClick={() => setDatasetText(JSON.stringify(dataset, null, 2))}>Nạp dataset vào ô sửa</button>
          <label className="block text-xs">Dữ liệu JSON<textarea className={`${field} h-56 font-mono`} value={datasetText} onChange={(e) => setDatasetText(e.target.value)} spellCheck={false} /></label>
          <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => saveDataset(false)}>Nhập version mới</button>
            <button className={button} disabled={busy || dataset?.status !== 'DRAFT' || !reason.trim()} onClick={() => saveDataset(true)}>Lưu nháp đang chọn</button></div>
        </section>
        <section className="rounded-lg border bg-white p-4 space-y-3">
          <h2 className="font-bold">3. So sánh trước/sau và phê duyệt</h2>
          <label className="block text-xs">Version threshold cần đánh giá<select className={field} value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
            {policyOptions.map((p) => <option key={p.id} value={p.id}>{p.version} · Ngưỡng {p.minEvidenceScore} · {p.status}</option>)}</select></label>
          {policyOptions.find((p) => p.id === policyId)?.calibrationReport && <details className="text-xs text-slate-600">
            <summary className="cursor-pointer">Căn cứ đề xuất: trọng số kỹ thuật 10/1 và tập feedback — cần nghiệp vụ xác nhận</summary>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(policyOptions.find((p) => p.id === policyId).calibrationReport, null, 2)}</pre>
          </details>}
          <button className={button} disabled={busy || !datasetId} onClick={async () => { const r = await execute(() => api.post(`/sprint2/datasets/${datasetId}/compare`, { candidatePolicyId: policyId }), 'Đã lưu báo cáo trước/sau.'); if (r) setReportId(r.id); }}>Chạy replay trước/sau</button>
          <label className="block text-xs">Báo cáo đã lưu<select className={field} value={reportId} onChange={(e) => setReportId(e.target.value)}><option value="">Chọn báo cáo</option>
            {data.reports.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.eligible ? 'MEASURED' : 'PARTIAL'}</option>)}</select></label>
          {report && <><p className="text-xs">Hash: <code className="break-all">{report.reportHash}</code> · Mode: {report.comparison.mode}</p>
            <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th>Chỉ số</th><th>Trước</th><th>Sau</th></tr></thead><tbody>
              <tr><td>Missed escalation</td><td>{percent(report.comparison.before.missedEscalationRate)}</td><td>{percent(report.comparison.after.missedEscalationRate)}</td></tr>
              <tr><td>False escalation</td><td>{percent(report.comparison.before.falseEscalationRate)}</td><td>{percent(report.comparison.after.falseEscalationRate)}</td></tr>
              <tr><td>Routine automation</td><td>{percent(report.comparison.before.routineAutomationRate)}</td><td>{percent(report.comparison.after.routineAutomationRate)}</td></tr>
              <tr><td>Ca cần chuyển / routine / lỗi</td><td>{report.comparison.before.counts.escalationRequired} / {report.comparison.before.counts.routine} / {report.comparison.before.counts.errors}</td><td>{report.comparison.after.counts.escalationRequired} / {report.comparison.after.counts.routine} / {report.comparison.after.counts.errors}</td></tr>
            </tbody></table></div>
            {report.comparison.issues.length > 0 && <details className="text-xs text-amber-800">
              <summary className="cursor-pointer">{report.comparison.issues.length} điều kiện dữ liệu/đánh giá chưa đạt — xem chi tiết</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-amber-50 p-2">{report.comparison.issues.join('\n')}</pre>
            </details>}
            <details className="text-xs"><summary>Chi tiết từng ca và phân loại</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(report.comparison.rows, null, 2)}</pre></details></>}
          <label className="block text-xs">Xác nhận nguồn độc lập / lý do chấp thuận trade-off<textarea className={field} value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} /></label>
          <p className="text-xs text-slate-600">Lãnh đạo khác người nhập/đề xuất mới được khóa hoặc kích hoạt. Kích hoạt cần báo cáo khớp code/version hiện hành, không lỗi và không tăng missed escalation. Chọn version cũ để đo lại và hoàn tác có audit.</p>
          <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || !isDean || dataset?.status !== 'DRAFT' || !approvalNote.trim()}
            onClick={() => execute(() => api.post(`/sprint2/datasets/${datasetId}/freeze`, { note: approvalNote }), 'Dataset đã khóa; muốn sửa phải tạo version mới.')}>Lãnh đạo khóa dataset</button>
            <button className={button} disabled={busy || !isDean || !report?.eligible || !approvalNote.trim() || report.candidatePolicyId !== policyId}
              onClick={() => execute(() => api.post(`/sprint2/policies/${policyId}/activate`, { reportId, note: approvalNote }), 'Đã kích hoạt threshold có version và audit.')}>Lãnh đạo kích hoạt version</button></div>
        </section>
      </>}
    </div>
  </div>;
}
