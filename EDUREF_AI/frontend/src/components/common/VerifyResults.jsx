import { CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';

export function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
}

export function DecisionBadge({ value }) {
  const label = value === 'AUTO_APPROVED' ? 'AUTO' : value?.startsWith('ESCALATE_') ? 'ESCALATE' : value === 'REJECTED_POLICY' ? 'REJECT' : value === 'ASK_CLARIFICATION' ? 'ASK' : value || 'Chưa chạy';
  const tone = label === 'AUTO' ? 'auto' : label === 'ESCALATE' ? 'escalate' : label === 'REJECT' ? 'reject' : 'neutral';
  return <span className={'decision-badge decision-' + tone} title={value || 'Chưa có kết quả'}>{label}</span>;
}

function TestBadge({ passed }) {
  if (typeof passed !== 'boolean') return <span className="verify-unexecuted">Chưa có kết luận</span>;
  return <span className={'test-badge ' + (passed ? 'test-pass' : 'test-fail')}>{passed ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}{passed ? 'PASS' : 'FAIL'}</span>;
}

export function VerifySummary({ run, loading }) {
  const current = loading ? null : run;
  return (
    <div className="verify-metrics" aria-live="polite" aria-busy={loading}>
      <div><span>Ca khớp kỳ vọng</span><strong>{loading ? 'Đang kiểm thử…' : current ? current.passedCases + '/' + current.totalCases : 'Chưa thực thi'}</strong>{current && <TestBadge passed={current.allPassed} />}</div>
      <div><span>Phân bố · yêu cầu 3 AUTO : 2 ESCALATE</span><strong>{current ? current.autoCount + ' AUTO : ' + current.escalationCount + ' ESCALATE' : '3 AUTO : 2 ESCALATE'}</strong><small>{current ? current.distributionPassed === true ? 'Đúng phân bố yêu cầu' : current.distributionPassed === false ? 'Chưa đạt phân bố yêu cầu' : 'Chưa có kết luận phân bố' : 'Kỳ vọng của bộ ca mẫu, chưa phải kết quả'}</small></div>
      <div><span>Thời gian toàn bộ lượt chạy</span><strong>{current?.totalDurationMs != null ? current.totalDurationMs + ' ms' : '—'}</strong><small>Thời gian đo từ backend</small></div>
      <div><span>Hoàn tất lúc</span><strong className="verify-timestamp">{formatTimestamp(current?.completedAt)}</strong><small>{current?.policyVersion || 'Policy được trả về khi chạy'}</small></div>
    </div>
  );
}

export default function VerifyResults({ cases, selectedId, onSelect, run, loading }) {
  const selected = cases.find((item) => item.id === selectedId) || cases[0];
  const selectedExecuted = !loading && selected && Object.prototype.hasOwnProperty.call(selected, 'actualDecision');
  return (
    <section className="verify-results" aria-labelledby="verify-results-heading" aria-busy={loading}>
      <div className="verify-section-heading"><div><FileText size={18} aria-hidden="true" /><h2 id="verify-results-heading">5 ca kiểm thử Track A</h2></div><span>3 thường quy · 2 chuyển tiếp</span></div>
      {loading && <div className="verify-running-status" role="status">Đang chạy bộ ca mẫu. Kết quả xuất hiện khi backend hoàn tất.</div>}
      <div className="verify-table-scroll" role="region" aria-label="Bảng kết quả kiểm thử, có thể cuộn ngang trên màn hình nhỏ" tabIndex={0}>
        <table className="verify-table">
          <caption className="sr-only">Kết quả từng ca, quyết định kỳ vọng và thực tế, thời gian thực thi, câu hỏi hành động. Chọn mã ca để xem đầu vào và dấu vết.</caption>
          <thead><tr><th scope="col">Ca kiểm thử</th><th scope="col">Phân loại</th><th scope="col">Kỳ vọng</th><th scope="col">Thực tế</th><th scope="col">Kết quả</th><th scope="col">Thời gian<small>ms · hoàn tất lúc</small></th><th scope="col">Câu hỏi hành động<small>actionableQuestion</small></th></tr></thead>
          <tbody>
            {cases.map((testCase) => {
              const executed = !loading && Object.prototype.hasOwnProperty.call(testCase, 'actualDecision');
              return (
                <tr key={testCase.id} className={selected?.id === testCase.id ? 'is-selected' : ''}>
                  <th scope="row"><button type="button" onClick={() => onSelect(testCase.id)} aria-pressed={selected?.id === testCase.id} aria-label={'Xem chi tiết ca ' + testCase.id} className="verify-case-button">{testCase.id}</button><p>{testCase.title}</p></th>
                  <td><code className="verify-classification">{testCase.classification || testCase.category || '—'}</code></td>
                  <td><DecisionBadge value={testCase.expectedDecision} /></td>
                  <td>{loading ? <span className="table-skeleton" aria-hidden="true" /> : <DecisionBadge value={executed ? testCase.actualDecision : null} />}</td>
                  <td>{executed ? <TestBadge passed={testCase.passed} /> : <span className="verify-unexecuted">{loading ? 'Đang chạy' : 'Chưa chạy'}</span>}</td>
                  <td className="verify-duration">{executed && testCase.durationMs != null ? testCase.durationMs + ' ms' : '—'}{executed && testCase.completedAt && <time className="verify-row-time" dateTime={testCase.completedAt}>{formatTimestamp(testCase.completedAt)}</time>}</td>
                  <td className="verify-question">{executed ? testCase.actionableQuestion || (testCase.actualDecision === 'AUTO_APPROVED' ? 'Không cần chuyển tiếp.' : 'Backend chưa trả câu hỏi hành động.') : loading ? <span className="table-skeleton" aria-hidden="true" /> : 'Chờ kết quả thực thi.'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="verify-case-detail">
        <div><span>Đầu vào · {selected?.id}</span><p>{selected?.prompt || selected?.title || 'Chưa chọn ca'}</p></div>
        <div><span>Giải thích từ backend</span><p>{selectedExecuted ? selected.message || selected.actionableQuestion || 'Không có giải thích bổ sung.' : 'Chạy bộ ca để xem kết quả thực tế.'}</p></div>
        <details><summary><Clock3 size={14} aria-hidden="true" /> Timestamp và dấu vết</summary><dl><dt>Bắt đầu</dt><dd>{formatTimestamp(selectedExecuted ? selected.startedAt : null)}</dd><dt>Kết thúc</dt><dd>{formatTimestamp(selectedExecuted ? selected.completedAt : null)}</dd><dt>SHA-256</dt><dd className="verify-proof">{selectedExecuted ? selected.sha256Proof || 'Backend không trả mã băm cho ca này.' : 'Chưa có dữ liệu'}</dd></dl></details>
      </div>
      {!loading && run && <p className="verify-disclaimer">PASS nghĩa là ca mẫu khớp kỳ vọng. Đây không phải chỉ số độ chính xác trên dữ liệu kiểm thử độc lập.</p>}
    </section>
  );
}
