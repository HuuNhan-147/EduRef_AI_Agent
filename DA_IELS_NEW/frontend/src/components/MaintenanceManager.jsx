import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle2, AlertTriangle, Calendar, DollarSign, FileText, Check, X } from 'lucide-react';
import api from '../api';

export default function MaintenanceManager({ activeRole, onRefreshStats }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actualCost, setActualCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans/maintenance/list');
      if (res.data.success) {
        setRecords(res.data.data);
      }
    } catch (error) {
      console.error('Lỗi nạp danh sách bảo trì:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const handleOpenCompleteModal = (record) => {
    setSelectedRecord(record);
    setResolutionNotes('Đã thay thế linh kiện, vệ sinh tra keo và kiểm tra ngoại quan đạt chuẩn xuất kho.');
    setActualCost(record.cost || 0);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setIsSubmitting(true);
    try {
      const res = await api.put(`/loans/maintenance/${selectedRecord._id}/complete`, {
        resolutionNotes,
        actualCost: Number(actualCost)
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        setSelectedRecord(null);
        fetchMaintenance();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Lỗi khi nghiệm thu thiết bị' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {message && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border ${
            message.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}>
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <span>Quản Lý Thiết Bị Bảo Trì & Sửa Chữa</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi thiết bị hư hỏng sau thu hồi và nghiệm thu hoàn tất đưa máy trở lại kho sẵn sàng
          </p>
        </div>

        <button
          onClick={fetchMaintenance}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 text-slate-300 transition-colors"
        >
          Làm mới
        </button>
      </div>

      {/* List / Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Đang tải danh sách bảo trì...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-80" />
          <p className="text-sm font-semibold text-slate-300">Kho đang trong tình trạng hoàn hảo!</p>
          <p className="text-xs text-slate-500 mt-1">Hiện không có thiết bị nào bị hư hại hoặc đang trong chế độ bảo dưỡng.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map((rec) => {
            const eq = rec.equipment;
            const model = eq?.model;
            const isCompleted = rec.status === 'COMPLETED';

            return (
              <div
                key={rec._id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                    : 'bg-slate-900/90 border-amber-500/30 shadow-lg shadow-amber-500/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {eq?.assetCode || 'TB-XXX'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isCompleted
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      {isCompleted ? 'ĐÃ NGHIỆM THU' : 'ĐANG BẢO TRÌ'}
                    </span>
                  </div>

                  <h4 className="text-white font-bold text-base mb-1 truncate">
                    {model?.name || 'Thiết bị'}
                  </h4>
                  <div className="text-xs text-slate-400 font-mono mb-3">
                    Serial: <strong className="text-slate-200">{eq?.serialNumber}</strong> • {model?.brand}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5 text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400 font-medium">Lý do bảo dưỡng: </span>
                        <span>{rec.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <span>Gửi ngày: {new Date(rec.sentDate).toLocaleDateString('vi-VN')}</span>
                      <span>Chi phí: <strong className="text-white">{formatCurrency(rec.cost)}</strong></span>
                    </div>
                    {rec.resolutionNotes && (
                      <div className="text-emerald-400 text-[11px] pt-1">
                        ✓ Kết luận: {rec.resolutionNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isCompleted && (activeRole === 'STOREKEEPER' || activeRole === 'ADMIN') && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => handleOpenCompleteModal(rec)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Nghiệm thu hoàn tất & Nhập lại kho</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NGHIỆM THU HOÀN KHO */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Nghiệm Thu Thiết Bị Bảo Trì</h3>
                <p className="text-xs text-slate-400">Khôi phục máy về trạng thái Khả dụng (AVAILABLE)</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="text-slate-400">Thiết bị: <strong className="text-white">{selectedRecord.equipment?.model?.name}</strong></div>
                <div className="text-slate-400">Mã tài sản: <strong className="text-blue-400 font-mono">{selectedRecord.equipment?.assetCode}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Kết quả nghiệm thu / Ghi chú sửa chữa:
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tổng chi phí sửa chữa thực tế (VNĐ):
                </label>
                <input
                  type="number"
                  min="0"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {isSubmitting ? 'Đang cập nhật...' : 'Xác nhận đưa máy về kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
