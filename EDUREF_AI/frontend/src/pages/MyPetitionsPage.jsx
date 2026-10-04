import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, QrCode, RefreshCw, Search } from 'lucide-react';
import Dialog from '../components/ui/Dialog';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDateTime, getStatusMeta } from '../lib/ui';
import api from '../services/api';
import { getSocket } from '../services/socket';

const FILTERS = [
  ['ALL', 'Tất cả'],
  ['APPROVED', 'Đã duyệt'],
  ['ESCALATED', 'Chờ cán bộ'],
  ['WAITING_STUDENT', 'Cần bổ sung'],
  ['REJECTED', 'Từ chối'],
  ['CANCELLED', 'Đã hủy'],
];

function EmptyState({ hasFilters, onStart }) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-surface-muted text-text-muted">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-sm font-semibold">{hasFilters ? 'Không có kết quả phù hợp' : 'Chưa có hồ sơ'}</h2>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-text-muted">
          {hasFilters ? 'Thử thay đổi từ khóa hoặc trạng thái lọc.' : 'Trao đổi với trợ lý để bắt đầu thủ tục xác nhận sinh viên.'}
        </p>
        {!hasFilters && onStart && (
          <button type="button" onClick={onStart} className="ui-button-primary mt-4">Mở trợ lý AI</button>
        )}
      </div>
    </div>
  );
}

export default function MyPetitionsPage({ userRole = 'STUDENT', onSwitchTab }) {
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQr, setSelectedQr] = useState(null);
  const [selectedPetition, setSelectedPetition] = useState(null);
  const [cancellingPetition, setCancellingPetition] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCode, setCancelCode] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const isStaff = ['STAFF', 'DEAN'].includes(userRole);

  const fetchPetitions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/petitions');
      setPetitions(response.data?.success ? response.data.data || [] : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.error || 'Không thể tải danh sách hồ sơ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPetitions();
  }, [fetchPetitions]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('petition_escalated', fetchPetitions);
    socket.on('petition_status_updated', fetchPetitions);
    return () => {
      socket.off('petition_escalated', fetchPetitions);
      socket.off('petition_status_updated', fetchPetitions);
    };
  }, [fetchPetitions]);

  const filteredPetitions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('vi');
    return petitions.filter((petition) => {
      const matchesStatus = statusFilter === 'ALL' || petition.status === statusFilter;
      const haystack = [petition.requestCode, petition.requestType?.name, petition.student?.fullName, petition.student?.studentCode]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi');
      return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [petitions, searchQuery, statusFilter]);

  const cancelPetition = async () => {
    if (!cancellingPetition || cancelBusy) return;
    if (cancelCode.trim() !== cancellingPetition.requestCode || cancelReason.trim().length < 10) {
      setCancelError('Nhập đúng mã hồ sơ và lý do ít nhất 10 ký tự.');
      return;
    }
    setCancelBusy(true);
    setCancelError('');
    try {
      const response = await api.post(`/petitions/${cancellingPetition.id}/rollback`, { reason: cancelReason.trim() });
      if (!response.data?.success) throw new Error(response.data?.message || response.data?.error || 'Chưa thể hủy hồ sơ.');
      setCancellingPetition(null);
      setSelectedPetition(null);
      setCancelReason('');
      setCancelCode('');
      await fetchPetitions();
    } catch (requestError) {
      setCancelError(requestError.response?.data?.message || requestError.response?.data?.error || requestError.message);
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-canvas px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ui-eyebrow">Theo dõi quy trình</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {userRole === 'DEAN' ? 'Hồ sơ toàn trường' : isStaff ? 'Hồ sơ phụ trách' : 'Hồ sơ của tôi'}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              Trạng thái, thời điểm cập nhật và bằng chứng hệ thống được trình bày tại một nơi.
            </p>
          </div>
          <button type="button" onClick={fetchPetitions} disabled={loading} className="ui-button-secondary self-start sm:self-auto">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Làm mới
          </button>
        </header>

        <section className="ui-panel p-3" aria-label="Bộ lọc hồ sơ">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  aria-pressed={statusFilter === value}
                  className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors ${
                    statusFilter === value ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface-muted hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:w-72">
              <span className="sr-only">Tìm hồ sơ</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Mã hồ sơ, thủ tục, sinh viên…"
                className="ui-field pl-9"
              />
            </label>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">
            <p>{error}</p>
            <button type="button" onClick={fetchPetitions} className="mt-2 font-medium text-white underline underline-offset-4">Thử lại</button>
          </div>
        )}

        <section className="ui-panel overflow-hidden" aria-busy={loading}>
          {loading ? (
            <div className="space-y-3 p-4" role="status">
              <span className="sr-only">Đang tải hồ sơ</span>
              {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-surface-muted" />)}
            </div>
          ) : filteredPetitions.length === 0 ? (
            <EmptyState
              hasFilters={statusFilter !== 'ALL' || Boolean(searchQuery)}
              onStart={!isStaff ? () => onSwitchTab?.('STUDENT_ASSISTANT') : undefined}
            />
          ) : (
            <>
              <div className="divide-y divide-border md:hidden">
                {filteredPetitions.map((petition) => (
                  <article key={petition.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold text-blue-300">{petition.requestCode}</p>
                        <h2 className="mt-1 text-sm font-medium">{petition.requestType?.name || 'Thủ tục học vụ'}</h2>
                      </div>
                      <StatusBadge status={petition.status} />
                    </div>
                    {isStaff && (
                      <p className="text-xs text-text-muted">{petition.student?.fullName || 'Chưa có tên'} · {petition.student?.studentCode || 'Chưa có MSSV'}</p>
                    )}
                    <div className="flex items-center justify-between gap-3 text-xs text-text-subtle">
                      <time>{formatDateTime(petition.createdAt)}</time>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setSelectedPetition(petition)} className="inline-flex min-h-10 items-center gap-1.5 px-2 text-blue-300">
                          <Eye className="h-4 w-4" /> Chi tiết
                        </button>
                      {petition.qrCodeUrl && (
                        <button type="button" onClick={() => setSelectedQr(petition)} className="inline-flex min-h-10 items-center gap-1.5 text-blue-300">
                          <QrCode className="h-4 w-4" /> Xem QR
                        </button>
                      )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-wider text-text-subtle">
                    <tr>
                      <th className="px-4 py-3 font-medium">Hồ sơ</th>
                      <th className="px-4 py-3 font-medium">Thủ tục</th>
                      {isStaff && <th className="px-4 py-3 font-medium">Sinh viên</th>}
                      <th className="px-4 py-3 font-medium">Ngày tạo</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPetitions.map((petition) => (
                      <tr key={petition.id} className="transition-colors hover:bg-surface-muted/60">
                        <td className="px-4 py-4 font-mono text-xs font-semibold text-blue-300">{petition.requestCode}</td>
                        <td className="px-4 py-4 font-medium">{petition.requestType?.name || 'Thủ tục học vụ'}</td>
                        {isStaff && (
                          <td className="px-4 py-4">
                            <span className="block text-sm">{petition.student?.fullName || '—'}</span>
                            <span className="font-mono text-[11px] text-text-subtle">{petition.student?.studentCode || '—'}</span>
                          </td>
                        )}
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-text-muted">{formatDateTime(petition.createdAt)}</td>
                        <td className="px-4 py-4"><StatusBadge status={petition.status} /></td>
                        <td className="flex items-center justify-end gap-1 px-4 py-4 text-right">
                          <button type="button" onClick={() => setSelectedPetition(petition)} className="ui-button-ghost ml-auto">
                            <Eye className="h-4 w-4" /> Chi tiết
                          </button>
                          {petition.qrCodeUrl ? (
                            <button type="button" onClick={() => setSelectedQr(petition)} className="ui-button-ghost ml-auto">
                              <QrCode className="h-4 w-4" /> Xem
                            </button>
                          ) : <span className="text-xs text-text-subtle">Chưa cấp</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(selectedQr)}
        onClose={() => setSelectedQr(null)}
        title="Mã QR của hồ sơ"
        description={selectedQr ? `${selectedQr.requestCode} · ${getStatusMeta(selectedQr.status).label}` : ''}
        className="max-w-md"
      >
        {selectedQr && (
          <div className="text-center">
            <div className="mx-auto w-fit rounded-2xl bg-white p-3">
              <img src={selectedQr.qrCodeUrl} alt={`Mã QR hồ sơ ${selectedQr.requestCode}`} className="h-52 w-52" />
            </div>
            <p className="mt-4 text-sm leading-6 text-text-muted">
              Đây là mã QR do hệ thống gắn với hồ sơ. Hãy đối chiếu trạng thái trên hệ thống trước khi sử dụng; mã QR không tự thay thế bước xác minh nghiệp vụ.
            </p>
            {selectedQr.sha256Proof && (
              <p className="mt-3 break-all rounded-lg bg-surface-muted p-3 text-left font-mono text-[10px] text-text-subtle">SHA-256: {selectedQr.sha256Proof}</p>
            )}
            <button type="button" onClick={() => setSelectedQr(null)} className="ui-button-primary mt-5 w-full">Đóng</button>
          </div>
        )}
      </Dialog>

      <Dialog
        open={Boolean(selectedPetition) && !cancellingPetition}
        onClose={() => setSelectedPetition(null)}
        title="Tiến trình hồ sơ"
        description={selectedPetition?.requestCode || ''}
        className="max-w-lg"
      >
        {selectedPetition && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted p-3">
              <div>
                <p className="text-xs text-text-muted">Trạng thái hiện tại</p>
                <p className="mt-1 text-sm font-medium">{selectedPetition.requestType?.name || 'Giấy xác nhận sinh viên'}</p>
              </div>
              <StatusBadge status={selectedPetition.status} />
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs text-text-muted">Gửi lúc</dt><dd className="mt-1 text-sm">{formatDateTime(selectedPetition.createdAt)}</dd></div>
              <div><dt className="text-xs text-text-muted">Cập nhật gần nhất</dt><dd className="mt-1 text-sm">{formatDateTime(selectedPetition.updatedAt)}</dd></div>
              <div><dt className="text-xs text-text-muted">Bộ phận xử lý</dt><dd className="mt-1 text-sm">Phòng Đào tạo</dd></div>
              <div><dt className="text-xs text-text-muted">Người phụ trách</dt><dd className="mt-1 text-sm">{selectedPetition.assignedStaff?.fullName || 'Đang chờ tiếp nhận'}</dd></div>
            </dl>
            {(selectedPetition.escalationReason || selectedPetition.contextCapsule?.reason) && (
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-3">
                <p className="text-xs font-medium text-amber-100">Thông tin cần lưu ý</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">{selectedPetition.contextCapsule?.reason || selectedPetition.escalationReason}</p>
              </div>
            )}
            <p className="text-xs leading-5 text-text-muted">AI chỉ hỗ trợ chuẩn bị và chuyển hồ sơ. Trạng thái phê duyệt hoặc từ chối chỉ xuất hiện sau khi cán bộ có thẩm quyền xác nhận.</p>
            {userRole === 'DEAN' && selectedPetition.status !== 'CANCELLED' && (
              <button type="button" onClick={() => { setCancellingPetition(selectedPetition); setCancelReason(''); setCancelCode(''); setCancelError(''); }} className="ui-button-secondary border-danger/30 text-danger">Xem xét hủy hồ sơ</button>
            )}
          </div>
        )}
      </Dialog>

      <Dialog open={Boolean(cancellingPetition)} onClose={() => !cancelBusy && setCancellingPetition(null)} title="Xác nhận hủy hồ sơ" description="Chỉ Trưởng phòng thực hiện khi cần dừng hồ sơ đã xử lý sai.">
        <div className="space-y-4 text-sm">
          <p className="rounded-xl border border-danger/25 bg-danger/5 p-3 leading-6">Thao tác này chuyển hồ sơ sang trạng thái Đã hủy, vô hiệu hóa QR nếu có và ghi nhật ký. Đây không phải nút hoàn tác để khôi phục quyết định cũ.</p>
          <label className="block">Lý do hủy <span className="text-danger">*</span><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} className="ui-field mt-2 resize-y" placeholder="Ghi rõ sai sót và bước xử lý tiếp theo" /></label>
          <label className="block">Nhập mã hồ sơ để xác nhận: <span className="font-mono font-semibold">{cancellingPetition?.requestCode}</span><input value={cancelCode} onChange={(event) => setCancelCode(event.target.value)} className="ui-field mt-2 font-mono" autoComplete="off" /></label>
          {cancelError && <p role="alert" className="text-danger">{cancelError}</p>}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setCancellingPetition(null)} disabled={cancelBusy} className="ui-button-secondary">Giữ hồ sơ</button><button type="button" onClick={cancelPetition} disabled={cancelBusy || cancelCode.trim() !== cancellingPetition?.requestCode || cancelReason.trim().length < 10} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-danger px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">{cancelBusy ? 'Đang ghi nhận…' : 'Xác nhận hủy'}</button></div>
        </div>
      </Dialog>
    </div>
  );
}
