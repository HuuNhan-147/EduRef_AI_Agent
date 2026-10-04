import { useEffect, useId, useState } from 'react';
import { ArrowRight, FileCheck2, Info, ShieldCheck } from 'lucide-react';
import Dialog from '../ui/Dialog';
import { DEMO_ACCOUNTS } from '../../services/api';

const PURPOSES = [
  ['BUS_PASS', 'Làm vé xe buýt'],
  ['BANK_LOAN', 'Vay vốn sinh viên'],
  ['SCHOLARSHIP', 'Hồ sơ học bổng'],
  ['VISA', 'Hồ sơ visa'],
  ['MILITARY', 'Nghĩa vụ quân sự'],
  ['ACADEMIC_RECORD', 'Bổ sung hồ sơ học vụ'],
];

export default function DynamicPetitionModal({ isOpen, onClose, petitionType, currentAccountKey, onSubmitToChat }) {
  const currentAccount = DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  const formId = useId();
  const [purposeCode, setPurposeCode] = useState('BUS_PASS');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPurposeCode('BUS_PASS');
    setRecipient('');
    setNote('');
    setError('');
  }, [isOpen, petitionType?.code]);

  const submit = (event) => {
    event.preventDefault();
    const purpose = PURPOSES.find(([code]) => code === purposeCode)?.[1];
    if (!purpose) {
      setError('Vui lòng chọn mục đích sử dụng.');
      return;
    }

    const prompt = [
      `Tôi cần giấy xác nhận sinh viên để ${purpose.toLowerCase()}.`,
      recipient.trim() ? `Nơi tiếp nhận: ${recipient.trim()}.` : '',
      note.trim() ? `Ghi chú: ${note.trim()}.` : '',
    ].filter(Boolean).join(' ');

    onSubmitToChat?.(prompt, {
      typeCode: 'STUDENT_CONFIRMATION',
      inputData: {
        purpose,
        purposeCode,
        recipient: recipient.trim() || null,
        note: note.trim() || null,
      },
    });
    onClose?.();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Bắt đầu yêu cầu xác nhận sinh viên"
      description="Thông tin được chuyển vào cuộc trò chuyện để agent kiểm tra theo policy hiện hành."
      className="sm:max-w-2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="ui-button-secondary">Để sau</button>
          <button type="submit" form={formId} className="ui-button-primary">Gửi cho EduRef AI <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5">
        <section className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4">
          <div className="flex items-start gap-3">
            <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-200" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">{petitionType?.name || 'Giấy xác nhận sinh viên'}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Sprint 2 chỉ hiển thị quy trình STUDENT_CONFIRMATION. Các quy trình cũ vẫn được bảo toàn trong hệ thống.</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="student-name" className="text-xs font-medium text-slate-300">Sinh viên</label>
            <input id="student-name" value={currentAccount.name} readOnly className="ui-field mt-2 read-only:cursor-default read-only:text-slate-400" />
          </div>
          <div>
            <label htmlFor="student-code" className="text-xs font-medium text-slate-300">Mã số sinh viên</label>
            <input id="student-code" value={currentAccount.code} readOnly className="ui-field mt-2 font-mono read-only:cursor-default read-only:text-slate-400" />
          </div>
        </div>

        <div>
          <label htmlFor="confirmation-purpose" className="text-xs font-medium text-slate-300">Mục đích sử dụng <span className="text-rose-300">*</span></label>
          <select id="confirmation-purpose" value={purposeCode} onChange={(event) => setPurposeCode(event.target.value)} className="ui-field mt-2">
            {PURPOSES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="confirmation-recipient" className="text-xs font-medium text-slate-300">Nơi tiếp nhận <span className="font-normal text-slate-500">(không bắt buộc)</span></label>
          <input id="confirmation-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} className="ui-field mt-2" placeholder="Ví dụ: Trung tâm xe buýt, ngân hàng, cơ quan lãnh sự…" />
        </div>

        <div>
          <label htmlFor="confirmation-note" className="text-xs font-medium text-slate-300">Thông tin bổ sung</label>
          <textarea id="confirmation-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="ui-field mt-2 resize-y" placeholder="Chỉ ghi thông tin cần thiết để xử lý yêu cầu." />
        </div>

        {error && <p className="text-sm text-rose-200" role="alert">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2.5 rounded-xl border border-ui-border bg-canvas/45 p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /><span>Agent không tự vượt quyền; trường hợp cần xem xét sẽ chuyển cán bộ.</span></div>
          <div className="flex gap-2.5 rounded-xl border border-ui-border bg-canvas/45 p-3 text-xs leading-5 text-slate-400"><Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" /><span>Tài liệu thật chỉ được tải sau khi hồ sơ có mã và backend lưu trữ đã sẵn sàng.</span></div>
        </div>
      </form>
    </Dialog>
  );
}
