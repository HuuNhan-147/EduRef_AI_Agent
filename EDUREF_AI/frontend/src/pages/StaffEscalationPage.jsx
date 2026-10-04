import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, ExternalLink, Inbox, RefreshCw, ShieldCheck, UserCheck, X } from 'lucide-react';
import Dialog from '../components/ui/Dialog';
import StatusBadge from '../components/ui/StatusBadge';
import { cn, formatDateTime } from '../lib/ui';
import api from '../services/api';
import { DEMO_ACCOUNTS } from '../services/api';
import { getSocket } from '../services/socket';

const ACTION_COPY = {
  APPROVE: {
    title: 'Phê duyệt hồ sơ?',
    description: 'Quyết định sẽ được ghi vào nhật ký kiểm toán và cập nhật trạng thái hồ sơ.',
    button: 'Xác nhận phê duyệt',
  },
  REJECT: {
    title: 'Từ chối hồ sơ?',
    description: 'Sinh viên cần một lý do rõ ràng để hiểu và có thể xử lý bước tiếp theo.',
    button: 'Xác nhận từ chối',
  },
  ESCALATE: {
    title: 'Chuyển lên Trưởng Phòng?',
    description: 'Hồ sơ sẽ rời hàng đợi chuyên viên và được chuyển tới cấp thẩm quyền cao hơn.',
    button: 'Xác nhận chuyển cấp',
  },
};

function requiredRoleOf(petition) {
  return petition?.contextCapsule?.requiredRole || (petition?.decision === 'ESCALATE_TO_DEAN' ? 'DEAN' : 'STAFF');
}

function DataPoint({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/45 p-3">
      <dt className="text-[11px] text-text-subtle">{label}</dt>
      <dd className={cn('mt-1 break-words text-sm font-medium text-text-primary', mono && 'font-mono text-xs')}>{value || '—'}</dd>
    </div>
  );
}

function displayValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function StaffEscalationPage({ currentAccountKey = 'STAFF_DAOTAO' }) {
  const currentAccount = DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STAFF_DAOTAO;
  const isDean = currentAccount.type === 'DEAN';
  const authenticatedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('eduref_user') || 'null');
    } catch {
      return null;
    }
  }, [currentAccountKey]);
  const [petitions, setPetitions] = useState([]);
  const [selectedPetition, setSelectedPetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [claimTarget, setClaimTarget] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [queueFilter, setQueueFilter] = useState('ALL');

  const loadQueue = useCallback(async (preferredId) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/petitions?status=ESCALATED');
      const queue = response.data?.success ? response.data.data || [] : [];
      setPetitions(queue);
      setSelectedPetition((current) => {
        const targetId = preferredId || current?.id;
        return queue.find((item) => item.id === targetId) || queue[0] || null;
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.error || 'Không thể tải hàng đợi thẩm định.');
    } finally {
      setLoading(false);
    }
  }, [currentAccountKey]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setQueueFilter('ALL');
  }, [currentAccountKey]);

  useEffect(() => {
    const socket = getSocket();
    const refreshQueue = () => loadQueue();
    socket.on('petition_escalated', refreshQueue);
    socket.on('petition_status_updated', refreshQueue);
    return () => {
      socket.off('petition_escalated', refreshQueue);
      socket.off('petition_status_updated', refreshQueue);
    };
  }, [loadQueue]);

  const selectPetition = async (petition) => {
    setSelectedPetition(petition);
    setDetailLoading(true);
    try {
      const response = await api.get(`/petitions/${petition.id}`);
      if (response.data?.success) setSelectedPetition(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.error || 'Không thể tải chi tiết hồ sơ.');
    } finally {
      setDetailLoading(false);
    }
  };

  const capsule = selectedPetition?.contextCapsule || {};
  const requiredRole = requiredRoleOf(selectedPetition);
  const isAssignedToCurrentUser = useCallback((petition) => Boolean(petition?.assignedStaff) && (
    petition.assignedStaff.id === authenticatedUser?.id
    || petition.assignedStaff.fullName === currentAccount.name
    || petition.assignedStaff.fullName === 'Tài khoản đang dùng'
  ), [authenticatedUser?.id, currentAccount.name]);
  const assignedToMe = isAssignedToCurrentUser(selectedPetition);
  const canDecide = selectedPetition?.status === 'ESCALATED' && assignedToMe && (isDean || requiredRole === 'STAFF');
  const studentSummary = capsule.studentSummary || {};
  const inputEntries = useMemo(
    () => Object.entries(selectedPetition?.inputData || {}).filter(([, value]) => value != null && value !== ''),
    [selectedPetition],
  );

  const visiblePetitions = useMemo(() => petitions.filter((petition) => {
    if (queueFilter === 'UNASSIGNED') return !petition.assignedStaff;
    if (queueFilter === 'MINE') return isAssignedToCurrentUser(petition);
    if (queueFilter === 'STAFF') return requiredRoleOf(petition) === 'STAFF';
    if (queueFilter === 'DEAN') return requiredRoleOf(petition) === 'DEAN';
    return true;
  }), [isAssignedToCurrentUser, petitions, queueFilter]);

  const openAction = (nextAction) => {
    if (!selectedPetition || !canDecide) return;
    setAction(nextAction);
    setActionTarget({ id: selectedPetition.id, requestCode: selectedPetition.requestCode });
    setActionNote('');
    setActionError('');
    setReviewConfirmed(false);
  };

  const executeAction = async () => {
    if (!selectedPetition || !action || !actionTarget) return;
    if (selectedPetition.id !== actionTarget.id || !canDecide) {
      setActionError('Hồ sơ hoặc quyền xử lý đã thay đổi. Hãy đóng hộp thoại và kiểm tra lại.');
      return;
    }
    if (actionNote.trim().length < 10) {
      setActionError('Vui lòng ghi căn cứ xử lý ít nhất 10 ký tự để có thể đối chiếu về sau.');
      return;
    }
    if (!reviewConfirmed) {
      setActionError('Hãy xác nhận đã đối chiếu hồ sơ và thẩm quyền trước khi tiếp tục.');
      return;
    }

    setSubmitting(true);
    setActionError('');
    try {
      const endpoint = action === 'APPROVE' ? 'approve' : action === 'REJECT' ? 'reject' : 'escalate-to-dean';
      const body = action === 'APPROVE' ? { note: actionNote.trim() } : { reason: actionNote.trim() };
      const response = await api.post(`/petitions/${actionTarget.id}/${endpoint}`, body);
      if (!response.data?.success) throw new Error(response.data?.message || response.data?.error || 'Tác vụ không thành công.');

      setNotice(action === 'APPROVE' ? 'Hồ sơ đã được phê duyệt.' : action === 'REJECT' ? 'Hồ sơ đã được từ chối.' : 'Hồ sơ đã được chuyển lên Trưởng Phòng.');
      setAction(null);
      setActionNote('');
      await loadQueue();
      window.setTimeout(() => setNotice(''), 4000);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || requestError.response?.data?.error || requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const claimPetition = async () => {
    if (!claimTarget || selectedPetition?.id !== claimTarget.id) {
      setClaimError('Hồ sơ đã thay đổi. Hãy đóng hộp thoại và kiểm tra lại.');
      return;
    }
    setSubmitting(true);
    setClaimError('');
    try {
      const response = await api.post(`/petitions/${claimTarget.id}/claim`);
      if (!response.data?.success) throw new Error(response.data?.message || 'Không thể nhận xử lý hồ sơ.');
      setNotice('Bạn đã nhận xử lý hồ sơ này.');
      setClaimTarget(null);
      await loadQueue(claimTarget.id);
    } catch (requestError) {
      setClaimError(requestError.response?.data?.message || requestError.response?.data?.error || requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-canvas p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ui-eyebrow">{isDean ? 'Điều phối & giám sát' : 'Không gian Phòng Đào tạo'}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{isDean ? 'Trung tâm điều phối hồ sơ' : 'Hàng đợi xử lý'}</h1>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              AI chuẩn bị thông tin và đề xuất tuyến xử lý. Cán bộ có thẩm quyền kiểm tra bằng chứng và chịu trách nhiệm cho quyết định cuối cùng.
            </p>
          </div>
          <button type="button" onClick={() => loadQueue()} disabled={loading} className="ui-button-secondary self-start sm:self-auto">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Làm mới
          </button>
        </header>

        {notice && <div role="status" className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-emerald-200">{notice}</div>}
        {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}

        <div className="grid min-h-[calc(100dvh-12rem)] gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="ui-panel overflow-hidden" aria-label="Danh sách hồ sơ chờ thẩm định">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="text-sm font-semibold">Chờ xử lý</h2>
                <p className="mt-0.5 text-xs text-text-muted">{visiblePetitions.length} hồ sơ phù hợp</p>
              </div>
              <span className="grid h-8 min-w-8 place-items-center rounded-full bg-warning/15 px-2 text-xs font-semibold text-amber-200">{visiblePetitions.length}</span>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-border p-2" aria-label="Lọc hàng đợi">
              {(isDean
                ? [['ALL', 'Tất cả'], ['STAFF', 'Cấp chuyên viên'], ['DEAN', 'Cấp Trưởng phòng']]
                : [['ALL', 'Tất cả'], ['UNASSIGNED', 'Chưa nhận'], ['MINE', 'Của tôi']]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQueueFilter(value)}
                  aria-pressed={queueFilter === value}
                  className={cn('min-h-9 shrink-0 rounded-lg px-2.5 text-[11px] font-medium', queueFilter === value ? 'bg-accent/15 text-blue-200' : 'text-text-muted hover:bg-surface-muted')}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-[40vh] space-y-1 overflow-y-auto p-2 lg:max-h-[calc(100dvh-17rem)]">
              {loading && petitions.length === 0 ? (
                [1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-surface-muted" />)
              ) : visiblePetitions.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Inbox className="mx-auto h-6 w-6 text-text-subtle" />
                  <p className="mt-3 text-sm font-medium">Không có hồ sơ phù hợp</p>
                  <p className="mt-1 text-xs text-text-muted">Hãy đổi bộ lọc hoặc làm mới hàng đợi.</p>
                </div>
              ) : visiblePetitions.map((petition) => (
                <button
                  key={petition.id}
                  type="button"
                  onClick={() => selectPetition(petition)}
                  aria-pressed={selectedPetition?.id === petition.id}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors',
                    selectedPetition?.id === petition.id
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-transparent hover:border-border hover:bg-surface-muted',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-blue-300">{petition.requestCode}</span>
                    <StatusBadge status={petition.status} />
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">{petition.requestType?.name || 'Thủ tục học vụ'}</p>
                  <p className="mt-1 truncate text-xs text-text-muted">
                    {petition.student?.fullName || '—'} · {petition.student?.studentCode || '—'}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-text-subtle">
                    <span>{requiredRoleOf(petition) === 'DEAN' ? 'Trưởng Phòng' : 'Chuyên viên'}</span>
                    <span className="truncate">{petition.assignedStaff?.fullName || 'Chưa có người nhận'}</span>
                  </div>
                  <time className="mt-2 block text-[11px] text-text-subtle">{formatDateTime(petition.createdAt)}</time>
                </button>
              ))}
            </div>
          </aside>

          <section className="ui-panel min-w-0 overflow-hidden">
            {!selectedPetition ? (
              <div className="grid min-h-96 place-items-center p-8 text-center">
                <div>
                  <ShieldCheck className="mx-auto h-8 w-8 text-text-subtle" />
                  <h2 className="mt-4 text-sm font-semibold">Chưa chọn hồ sơ</h2>
                  <p className="mt-1 text-xs text-text-muted">Chọn một hồ sơ trong hàng đợi để xem bằng chứng.</p>
                </div>
              </div>
            ) : (
              <div className={cn('h-full', detailLoading && 'opacity-70')} aria-busy={detailLoading}>
                <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-blue-300">{selectedPetition.requestCode}</span>
                      <StatusBadge status={selectedPetition.status} />
                    </div>
                    <h2 className="mt-2 text-lg font-semibold">{selectedPetition.requestType?.name || capsule.requestTypeName || 'Thủ tục học vụ'}</h2>
                    <p className="mt-1 text-xs text-text-muted">
                      Cấp xử lý: {requiredRole === 'DEAN' ? 'Trưởng Phòng Đào tạo' : 'Chuyên viên Phòng Đào tạo'} · {selectedPetition.assignedStaff?.fullName || 'Chưa có người nhận'}
                    </p>
                  </div>
                  {selectedPetition.status === 'ESCALATED' && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {!selectedPetition.assignedStaff && (
                        <button type="button" onClick={() => { setClaimTarget({ id: selectedPetition.id, requestCode: selectedPetition.requestCode }); setClaimError(''); }} disabled={submitting || (!isDean && requiredRole === 'DEAN')} className="ui-button-primary">
                          <UserCheck className="h-4 w-4" /> Nhận xử lý
                        </button>
                      )}
                      {canDecide && !isDean && requiredRole === 'STAFF' && (
                        <button type="button" onClick={() => openAction('ESCALATE')} className="ui-button-secondary">
                          <ArrowUpRight className="h-4 w-4" /> Chuyển Trưởng phòng
                        </button>
                      )}
                      {canDecide && (
                        <>
                          <button type="button" onClick={() => openAction('REJECT')} className="ui-button-secondary text-red-200">
                            <X className="h-4 w-4" /> Từ chối
                          </button>
                          <button type="button" onClick={() => openAction('APPROVE')} className="ui-button-primary">
                            <Check className="h-4 w-4" /> Phê duyệt
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-6 p-5">
                  {selectedPetition.status === 'ESCALATED' && selectedPetition.assignedStaff && !assignedToMe && (
                    <div className="rounded-xl border border-border bg-surface-muted p-3 text-xs leading-5 text-text-muted" role="status">
                      Hồ sơ đang được <strong className="text-text-primary">{selectedPetition.assignedStaff.fullName}</strong> xử lý. Bạn vẫn có thể theo dõi nhưng không thể đưa ra quyết định để tránh thao tác chồng chéo.
                    </div>
                  )}
                  <section>
                    <h3 className="ui-eyebrow">Câu hỏi cần quyết định</h3>
                    <div className="mt-2 rounded-xl border border-warning/25 bg-warning/10 p-4 text-sm leading-6 text-amber-50">
                      {capsule.actionableQuestion || selectedPetition.escalationReason || 'Hồ sơ cần cán bộ thẩm định theo thẩm quyền.'}
                    </div>
                  </section>

                  <section>
                    <h3 className="ui-eyebrow">Lý do chuyển tiếp</h3>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {capsule.reason || selectedPetition.escalationReason || 'Backend chưa cung cấp lý do chi tiết.'}
                    </p>
                  </section>

                  <section>
                    <h3 className="ui-eyebrow">Thông tin đã đối chiếu</h3>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <DataPoint label="Sinh viên" value={selectedPetition.student?.fullName || capsule.studentName} />
                      <DataPoint label="MSSV" value={selectedPetition.student?.studentCode || capsule.studentCode} mono />
                      <DataPoint label="Trạng thái học tập" value={studentSummary.status || selectedPetition.student?.status} />
                      <DataPoint label="Nợ học phí" value={studentSummary.tuitionDebt != null ? `${Number(studentSummary.tuitionDebt).toLocaleString('vi-VN')} ₫` : '—'} />
                    </dl>
                  </section>

                  {inputEntries.length > 0 && (
                    <section>
                      <h3 className="ui-eyebrow">Dữ liệu người dùng cung cấp</h3>
                      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        {inputEntries.map(([key, value]) => <DataPoint key={key} label={key} value={displayValue(value)} />)}
                      </dl>
                    </section>
                  )}

                  <section>
                    <h3 className="ui-eyebrow">Tài liệu đính kèm</h3>
                    {selectedPetition.documents?.length ? (
                      <ul className="mt-2 space-y-2">
                        {selectedPetition.documents.map((document) => (
                          <li key={document.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{document.fileName}</p>
                              <p className="mt-0.5 text-xs text-text-muted">{document.documentType} · {document.verificationStatus}</p>
                            </div>
                            {document.fileUrl && (
                              <a href={document.fileUrl} target="_blank" rel="noreferrer" className="ui-button-ghost self-start sm:self-auto">
                                Mở tài liệu <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-sm text-text-muted">Hồ sơ không có tài liệu đính kèm.</p>}
                  </section>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={Boolean(claimTarget)} onClose={() => !submitting && setClaimTarget(null)} title="Nhận xử lý hồ sơ" description="Hồ sơ sẽ được gán cho tài khoản của bạn và người khác không thể xử lý trùng.">
        <div className="space-y-4 text-sm">
          <p className="rounded-xl border border-ui-border bg-surface-soft/50 p-3">Bạn sắp nhận hồ sơ <span className="font-mono font-semibold text-primary">{claimTarget?.requestCode}</span>. Sau khi nhận, hãy kiểm tra thông tin rồi mới đưa ra quyết định.</p>
          {claimError && <p role="alert" className="text-danger">{claimError}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setClaimTarget(null)} disabled={submitting} className="ui-button-secondary">Quay lại</button><button type="button" onClick={claimPetition} disabled={submitting} className="ui-button-primary">{submitting ? 'Đang nhận…' : 'Xác nhận nhận xử lý'}</button></div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(action)}
        onClose={() => !submitting && setAction(null)}
        title={ACTION_COPY[action]?.title || ''}
        description={ACTION_COPY[action]?.description}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-surface-muted p-3 text-sm">
            <span className="text-text-muted">Hồ sơ: </span>
            <span className="font-mono font-semibold text-blue-300">{actionTarget?.requestCode}</span>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Căn cứ xử lý <span className="text-danger">(bắt buộc)</span>
            </span>
            <textarea
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              rows={4}
              className="ui-field resize-y"
              placeholder={action === 'REJECT' ? 'Nêu điều kiện chưa đạt và bước sinh viên cần làm…' : action === 'ESCALATE' ? 'Nêu rõ lý do vượt thẩm quyền chuyên viên…' : 'Ghi lại căn cứ phê duyệt…'}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ui-border bg-surface-soft/50 p-3 text-sm leading-6">
            <input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary-strong" />
            <span>Tôi đã đối chiếu thông tin hồ sơ, căn cứ xử lý và thẩm quyền của mình. Thao tác được ghi vào nhật ký. Nếu cần sửa sai sau khi gửi, Trưởng phòng có thể xem xét hủy hồ sơ và yêu cầu xử lý lại; quyết định này không tự đảo ngược.</span>
          </label>
          {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setAction(null)} disabled={submitting} className="ui-button-secondary">Quay lại</button>
            <button
              type="button"
              onClick={executeAction}
              disabled={submitting || !reviewConfirmed || actionNote.trim().length < 10}
              className={action === 'REJECT' ? 'inline-flex min-h-11 items-center justify-center rounded-xl bg-danger px-4 text-sm font-semibold text-slate-950 disabled:opacity-50' : 'ui-button-primary'}
            >
              {submitting ? 'Đang ghi nhận…' : ACTION_COPY[action]?.button}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
