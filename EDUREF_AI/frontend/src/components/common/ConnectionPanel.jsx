import { AlertCircle, RotateCw } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';

export default function ConnectionPanel({ status, error, onRetry }) {
  return (
    <div className="connection-panel">
      <div className="connection-panel-heading">
        <span className="connection-symbol" aria-hidden="true">AI</span>
        <div><h2>Trợ lý học vụ EduRef</h2><p>Kết nối một phiên làm việc trước khi trò chuyện.</p></div>
      </div>
      {status === 'loading' ? (
        <LoadingSkeleton label="Đang kết nối dịch vụ học vụ…" />
      ) : (
        <div className="connection-error" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <h3>Chưa thể kết nối dịch vụ</h3>
          <p>Bạn vẫn có thể xem giao diện. Trò chuyện và Verify cần backend hoạt động.</p>
          <details><summary>Chi tiết kết nối</summary><p>{error}</p></details>
          <button type="button" className="ui-button ui-button-primary" onClick={onRetry}><RotateCw size={16} aria-hidden="true" /> Thử kết nối lại</button>
        </div>
      )}
    </div>
  );
}
