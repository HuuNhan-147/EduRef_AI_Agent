import React, { useState } from 'react';
import {
  FileText, Check, X, Box, Clock, User, Calendar, Tag, AlertCircle,
  MapPin, Layers, QrCode, RotateCcw, AlertTriangle, ShieldCheck, Key
} from 'lucide-react';

export default function LoanListView({
  loans,
  activeRole,
  onApprove,
  onReject,
  onCheckout,
  onCheckin,
  onRollback,
  isLoading
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedQrLoan, setSelectedQrLoan] = useState(null);
  const [checkoutModalLoan, setCheckoutModalLoan] = useState(null);
  const [pinInput, setPinInput] = useState('');

  const statusBadges = {
    PENDING: { label: 'Chờ duyệt', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    AUTO_APPROVED: { label: '⚡ Tự duyệt (AI)', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    APPROVED: { label: 'Đã duyệt (Chờ lấy)', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    DISPATCHED: { label: 'Đang mượn', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    RETURNED: { label: 'Đã hoàn tất', color: 'bg-slate-700/40 text-slate-300 border-slate-700' },
    REJECTED: { label: 'Từ chối', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
    CANCELLED: { label: 'Đã hoàn tác/Hủy', color: 'bg-slate-800 text-slate-400 border-slate-700' }
  };

  const purposeLabels = {
    PROJECT_TASK: 'Công vụ / Dự án',
    TEACHING_STUDY: 'Giảng dạy / Lab',
    EVENT_CONFERENCE: 'Sự kiện / Hội thảo',
    PERSONAL_OTHER: 'Cá nhân / Khác'
  };

  const filteredLoans = loans.filter((loan) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'APPROVED') {
      return loan.status === 'APPROVED' || loan.status === 'AUTO_APPROVED';
    }
    return loan.status === filterStatus;
  });

  const handleOpenCheckoutModal = (loan) => {
    setCheckoutModalLoan(loan);
    setPinInput('');
  };

  const handleConfirmCheckout = (e) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      alert('Vui lòng nhập mã PIN nhận đồ của nhân viên!');
      return;
    }
    onCheckout(checkoutModalLoan._id, pinInput.trim());
    setCheckoutModalLoan(null);
  };

  return (
    <div className="space-y-6">
      {/* View Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Quản Lý Phiếu Mượn Thiết Bị</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quy trình thủ công: Nhân viên gửi đơn $\rightarrow$ Quản lý duyệt $\rightarrow$ Thủ kho đối soát mã PIN & Xuất kho $\rightarrow$ Nhận trả kiểm định ngoại quan
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-900 p-1 rounded-xl border border-slate-800">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ duyệt' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'DISPATCHED', label: 'Đang mượn' },
            { key: 'RETURNED', label: 'Đã trả' },
            { key: 'CANCELLED', label: 'Đã hủy' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Role Reminder Alert */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          <span className="text-slate-300">
            Bạn đang xem với vai trò: <strong className="text-white uppercase">{activeRole}</strong>
          </span>
        </div>
        <span className="text-slate-400 text-[11px] hidden sm:inline">
          {activeRole === 'MANAGER' && '💡 Quản lý có quyền Duyệt, Từ chối kèm lý do hoặc Can thiệp dừng (Rollback) khi máy chưa xuất.'}
          {activeRole === 'STOREKEEPER' && '💡 Thủ kho bắt buộc đối soát mã PIN của người nhận trước khi xuất kho.'}
          {activeRole === 'EMPLOYEE' && '💡 Nhân viên xuất trình mã PIN cho Thủ kho khi đến lấy đồ.'}
        </span>
      </div>

      {/* Table List of Loans */}
      {filteredLoans.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Chưa có phiếu mượn nào trong mục này</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLoans.map((loan) => {
            const badge = statusBadges[loan.status] || { label: loan.status, color: 'bg-slate-800 text-slate-400' };
            const model = loan.item?.equipmentModel;
            const equipment = loan.item?.equipment;

            return (
              <div
                key={loan._id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm"
              >
                {/* Left Side: Loan Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0">
                    <img
                      src={model?.imageUrl || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80'}
                      alt={model?.name || 'Thiết bị'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-blue-400">{loan.requestCode}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {loan.purposeCategory && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {purposeLabels[loan.purposeCategory] || loan.purposeCategory}
                        </span>
                      )}
                      {loan.pickupCode && loan.status !== 'CANCELLED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          MÃ PIN: {loan.pickupCode}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-white text-base truncate">
                      {model?.name || 'Thiết bị công vụ'}
                      <span className="text-blue-400 text-xs font-normal ml-2">
                        (SL: <strong>{loan.quantity || 1}</strong> chiếc)
                      </span>
                    </h4>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>Người mượn: <strong className="text-slate-200">{loan.borrower?.fullName || 'Nhân viên'}</strong> ({loan.borrower?.staffCode || ''})</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>
                          Khung giờ: <strong>{loan.pickupTime || '08:30'}</strong> ({new Date(loan.startDate).toLocaleDateString('vi-VN')}) $\rightarrow$ <strong>{loan.returnTime || '17:30'}</strong> ({new Date(loan.expectedReturnDate).toLocaleDateString('vi-VN')})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span>Nơi sử dụng: <strong className="text-slate-200">{loan.locationOfUse || 'Phòng họp'}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Điểm nhận đồ: <strong className="text-emerald-400">{loan.pickupLockerSlot || 'Tủ Smart Locker Tầng 1'}</strong></span>
                      </div>
                    </div>

                    {/* Notes & Purpose */}
                    <div className="text-xs text-slate-400 mt-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-300 font-medium">Lý do:</span> "{loan.purpose}"
                      {loan.project && <span className="ml-2 text-slate-500">• Dự án: {loan.project}</span>}
                      {loan.notes && <div className="text-rose-400 mt-1 font-mono text-[11px]">{loan.notes}</div>}
                    </div>
                  </div>
                </div>

                {/* Right Side: Actions & QR */}
                <div className="flex flex-wrap lg:flex-col items-end gap-2 flex-shrink-0">
                  {/* Nút Xem QR Code nhận đồ */}
                  {loan.pickupCode && loan.status !== 'CANCELLED' && (
                    <button
                      onClick={() => setSelectedQrLoan(loan)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Xem QR Nhận Đồ</span>
                    </button>
                  )}

                  {/* QUẢN LÝ DUYỆT / TỪ CHỐI */}
                  {(activeRole === 'MANAGER' || activeRole === 'ADMIN') && loan.status === 'PENDING' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApprove(loan._id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt</span>
                      </button>
                      <button
                        onClick={() => onReject(loan._id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  )}

                  {/* THỦ KHO BÀN GIAO XUẤT KHO (ĐỐI SOÁT MÃ PIN) */}
                  {(activeRole === 'STOREKEEPER' || activeRole === 'ADMIN') &&
                    (loan.status === 'APPROVED' || loan.status === 'AUTO_APPROVED') && (
                      <button
                        onClick={() => handleOpenCheckoutModal(loan)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Đối soát PIN & Bàn giao</span>
                      </button>
                    )}

                  {/* THỦ KHO THU HỒI HOÀN KHO */}
                  {(activeRole === 'STOREKEEPER' || activeRole === 'ADMIN') && loan.status === 'DISPATCHED' && (
                    <button
                      onClick={() => onCheckin(loan._id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Thu hồi hoàn kho</span>
                    </button>
                  )}

                  {/* NÚT HOÀN TÁC (CHỈ KHI CHƯA XUẤT KHO) */}
                  {(activeRole === 'MANAGER' || activeRole === 'ADMIN') &&
                    loan.status !== 'CANCELLED' && loan.status !== 'RETURNED' && loan.status !== 'DISPATCHED' && (
                      <button
                        onClick={() => onRollback(loan._id)}
                        title="Can thiệp dừng cấp phát & hủy phiếu"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-900/50 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Hoàn tác (Hủy phiếu)</span>
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL THỦ KHO ĐỐI SOÁT MÃ PIN NHẬN ĐỒ */}
      {checkoutModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Đối Soát Bàn Giao Thiết Bị</h3>
                <p className="text-xs text-slate-400">Yêu cầu người nhận cung cấp mã PIN</p>
              </div>
              <button
                onClick={() => setCheckoutModalLoan(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckout} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div>Người nhận: <strong className="text-white">{checkoutModalLoan.borrower?.fullName}</strong></div>
                <div>Thiết bị: <strong className="text-blue-400">{checkoutModalLoan.item?.equipmentModel?.name}</strong></div>
                <div>Số lượng: <strong className="text-white">{checkoutModalLoan.quantity || 1} chiếc</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>Nhập Mã PIN Nhận Đồ (ví dụ: EQ-8752):</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="EQ-XXXX"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-blue-500/50 text-white font-mono text-center font-bold tracking-widest text-lg focus:outline-none focus:border-blue-400 uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * Hệ thống sẽ đối soát trực tiếp với mã PIN do người nhận cung cấp trước khi bàn giao.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckoutModalLoan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                  Xác nhận xuất kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM MÃ QR NHẬN ĐỒ */}
      {selectedQrLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-white text-sm">Mã Nhận Thiết Bị Tại Kho</span>
              <button
                onClick={() => setSelectedQrLoan(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mb-4">
              <img
                src={selectedQrLoan.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${selectedQrLoan.pickupCode}&color=1d4ed8`}
                alt="QR Code"
                className="w-44 h-44 object-contain"
              />
            </div>

            <div className="text-xl font-mono font-black text-blue-400 tracking-wider mb-2">
              {selectedQrLoan.pickupCode}
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 text-left space-y-1">
              <div>📍 <strong>Vị trí lấy:</strong> {selectedQrLoan.pickupLockerSlot}</div>
              <div>📦 <strong>Thiết bị:</strong> {selectedQrLoan.item?.equipmentModel?.name}</div>
              <div>⏰ <strong>Hạn chót lấy:</strong> Trong vòng 48h kể từ khi Quản lý duyệt</div>
            </div>

            <button
              onClick={() => setSelectedQrLoan(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
