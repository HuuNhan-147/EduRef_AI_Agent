import { useState } from 'react';
import api from '../../services/api';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { buildSupplementInput } from '../../config/petitionSupplement';

const FIELDS = [
  ['purpose', 'Mục đích sử dụng'], ['phone', 'Số điện thoại'],
  ['permanentAddress', 'Địa chỉ thường trú'], ['idCard', 'CCCD/CMND'],
  ['recipientAgency', 'Nơi tiếp nhận giấy'], ['debtCourses', 'Các học phần còn nợ'],
  ['reissueReason', 'Lý do xin cấp lại'],
  ['urgentReason', 'Lý do cần gấp'],
];
const PROFILE_FIELDS = [
  ['fullName', 'Họ và tên'], ['birthDate', 'Ngày sinh (DD/MM/YYYY)'],
  ['gender', 'Giới tính'], ['studentClass', 'Lớp sinh hoạt'],
];

export default function PetitionSupplementForm({ requestId, question, onSubmitted }) {
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setValues((previous) => ({ ...previous, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const additionalData = buildSupplementInput(values);
    if (!Object.keys(additionalData).length) {
      setError('Hãy nhập thông tin cần bổ sung theo yêu cầu của hồ sơ.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/petitions/${requestId}/resume`, { additionalData });
      if (!data?.success) throw new Error(data?.error || data?.message || 'Chưa thể tiếp tục xử lý hồ sơ.');
      onSubmitted(data);
      setValues({});
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Không gửi được thông tin bổ sung.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto my-2 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
      <h4 className="text-sm font-bold text-amber-900">Bổ sung thông tin hồ sơ</h4>
      <div className="text-amber-900"><MarkdownRenderer content={question} compact inheritColor /></div>
      <p className="text-xs text-slate-600">Chỉ điền thông tin được yêu cầu hoặc cần sửa. Các ô để trống giữ nguyên dữ liệu đã nộp.</p>
      <fieldset disabled={submitting} className="grid grid-cols-1 sm:grid-cols-2 gap-3 disabled:opacity-60">
        {FIELDS.map(([key, label]) => (
          <label key={key} className="text-xs font-medium text-slate-700 space-y-1">
            <span>{label}</span>
            <input value={values[key] || ''} onChange={(event) => update(key, event.target.value)}
              type={key === 'phone' ? 'tel' : 'text'}
              className="w-full rounded-lg border border-slate-300 p-2 bg-white" />
          </label>
        ))}
        <label className="text-xs font-medium text-slate-700 space-y-1">
          <span>Cơ sở nhận giấy</span>
          <select value={values.pickupCampus || ''} onChange={(event) => update('pickupCampus', event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 bg-white">
            <option value="">Giữ nguyên / chưa chọn</option>
            <option>Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)</option>
            <option>Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.05)</option>
          </select>
        </label>
        <label className="sm:col-span-2 flex items-start gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={values.isAddressConfirmed === true}
            onChange={(event) => update('isAddressConfirmed', event.target.checked)} />
          Tôi xác nhận địa chỉ thường trú đã cung cấp là chính xác và chịu trách nhiệm về thông tin này.
        </label>
        <details className="sm:col-span-2 text-xs text-slate-700">
          <summary className="cursor-pointer">Bổ sung nhân thân khi hồ sơ yêu cầu</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {PROFILE_FIELDS.map(([key, label]) => (
              <label key={key} className="space-y-1">
                <span>{label}</span>
                <input value={values[key] || ''} onChange={(event) => update(key, event.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white" />
              </label>
            ))}
          </div>
        </details>
      </fieldset>
      {error && <div role="alert" className="text-red-700"><MarkdownRenderer content={error} compact inheritColor /></div>}
      <button disabled={submitting} className="w-full py-2 rounded-lg bg-amber-700 text-white text-xs font-semibold disabled:opacity-50">
        {submitting ? 'Đang xử lý...' : 'Gửi thông tin bổ sung'}
      </button>
    </form>
  );
}
