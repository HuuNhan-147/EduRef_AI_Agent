export default function LoadingSkeleton({ label = 'Đang xử lý yêu cầu', rows = 3 }) {
  return (
    <div className="loading-skeleton" role="status" aria-live="polite">
      <span className="loading-skeleton-label">{label}</span>
      <div className="skeleton-lines" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => <span key={index} />)}
      </div>
    </div>
  );
}
