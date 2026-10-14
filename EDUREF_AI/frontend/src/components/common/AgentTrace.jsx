import { useEffect, useState } from 'react';
import { Activity, ChevronDown, CircleCheck, CircleDashed, CircleAlert } from 'lucide-react';

const STATUS_LABELS = {
  completed: 'Đã xử lý',
  failed: 'Xử lý chưa hoàn tất',
  stopping: 'Đang yêu cầu dừng',
  stopped: 'Đã dừng tạo phản hồi',
  stopRequested: 'Đã yêu cầu dừng',
  interrupted: 'Lượt xử lý bị gián đoạn',
  disconnected: 'Kết nối bị gián đoạn',
  limited: 'Thông tin tiến trình bị giới hạn',
};

export default function AgentTrace({ trace }) {
  const running = trace.status === 'running';
  const [expanded, setExpanded] = useState(running);
  useEffect(() => setExpanded(running), [running]);
  const label = running ? trace.steps.at(-1)?.label || 'Đang xử lý yêu cầu' : STATUS_LABELS[trace.status] || 'Thông tin tiến trình';
  const Icon = running ? Activity : trace.status === 'completed' ? CircleCheck : CircleAlert;

  return (
    <details className="agent-trace" data-trace-status={trace.status} open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>
        <Icon size={16} aria-hidden="true" />
        <span className="trace-summary-label" role="status" aria-live="polite">{label}</span>
        {trace.durationMs != null && <span className="trace-duration">{(trace.durationMs / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} giây</span>}
        <span className="trace-disclosure-label">{expanded ? 'Thu gọn' : 'Xem tiến trình'}</span>
        <ChevronDown size={15} className="trace-chevron" aria-hidden="true" />
      </summary>
      <div className="trace-body">
        {trace.steps.length ? (
          <ol>{trace.steps.map((step) => <li key={step.id}><CircleDashed size={13} aria-hidden="true" /><span>{step.label}</span></li>)}</ol>
        ) : <p>{running ? 'Chờ thông tin tiến trình từ hệ thống…' : 'Không có bước xử lý chi tiết được xác nhận cho lượt này.'}</p>}
        {trace.limited && <p className="trace-note">Không gắn thêm log khi chưa phân biệt chắc chắn được lượt xử lý.</p>}
        <p className="trace-note">Các bước từ hệ thống, không phải nội dung suy nghĩ nội bộ của mô hình.</p>
      </div>
    </details>
  );
}
