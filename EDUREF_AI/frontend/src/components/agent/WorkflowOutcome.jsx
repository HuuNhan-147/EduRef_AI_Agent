import MarkdownRenderer from '../common/MarkdownRenderer';
import { displayLabel } from '../../config/displayText';

// A result belongs to its place in the conversation, never to a fixed composer panel.
export default function WorkflowOutcome({ outcome, onViewPetitions }) {
  const denied = outcome.state === 'REJECTED' || outcome.result?.status === 'REJECTED';
  const status = outcome.result?.status || outcome.state;
  return <section className={`mt-3 rounded-xl border p-3 text-xs ${denied ? 'border-red-200 bg-red-50 text-red-900' : 'border-blue-100 bg-blue-50/60 text-slate-800'}`} aria-label="Kết quả công việc trong lịch sử">
    {outcome.result?.requestCode && <p className="mb-2 font-semibold">Mã hồ sơ: {outcome.result.requestCode} · {displayLabel(status)}</p>}
    <MarkdownRenderer content={outcome.resolution?.reason || outcome.result?.message || outcome.notice ||
      (outcome.state === 'CANCELLED' ? 'Đã hủy bản nháp.' : 'Chi tiết kết quả hiện chưa tải được. Bạn có thể kiểm tra trong Đơn của tôi.')} compact inheritColor />
    {denied && <p className="mt-2 font-semibold">Quy trình này đã kết thúc.</p>}
    {outcome.resolution?.nextStep && <div className="mt-2"><MarkdownRenderer content={outcome.resolution.nextStep.replace(/ bằng nút bên dưới/g, ' từ danh mục thủ tục hoặc gợi ý trong chat')} compact inheritColor /></div>}
    {outcome.result?.requestId && <button type="button" onClick={onViewPetitions} className="mt-2 font-semibold text-blue-800 underline">Xem trong Đơn của tôi</button>}
  </section>;
}
