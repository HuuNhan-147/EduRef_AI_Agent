import React, { useState, useEffect } from 'react';
import { ShieldCheck, Hash, User, Calendar, RefreshCw, Key } from 'lucide-react';
import api from '../api';

export default function AuditTrailView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHash, setSelectedHash] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit/trail');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (error) {
      console.error('Lỗi nạp nhật ký kiểm toán:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const eventBadgeColors = {
    LOAN_CREATED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    AUTHORITY_DECISION: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    CHECKOUT_VERIFIED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    RETURN_INSPECTED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    MANAGER_OVERRIDE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    MAINTENANCE_COMPLETED: 'bg-teal-500/15 text-teal-400 border-teal-500/30'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Sổ Cái Kiểm Toán Bất Biến (Audit Trail)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Nhật ký nghiệp vụ chống sửa đổi (Tamper-evident) mã hóa chuỗi khối bằng hàm băm SHA-256
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Audit Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Đang tải sổ cái kiểm toán...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">Chưa có bản ghi kiểm toán nào</p>
          <p className="text-xs text-slate-500 mt-1">Các thao tác tạo đơn, duyệt, xuất kho và thu hồi sẽ tự động sinh mã băm tại đây.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Thời gian & Mã log</th>
                  <th className="p-3.5">Sự kiện & Người thực hiện</th>
                  <th className="p-3.5">Quyết định</th>
                  <th className="p-3.5">Căn cứ & Chi tiết nghiệp vụ</th>
                  <th className="p-3.5 text-right">Mã băm SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => {
                  const badgeClass = eventBadgeColors[log.eventType] || 'bg-slate-800 text-slate-300 border-slate-700';

                  return (
                    <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono text-blue-400 text-[11px] font-bold">{log.logId}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5">
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass} mb-1`}>
                          {log.eventType}
                        </span>
                        <div className="flex items-center gap-1 text-slate-300 text-[11px]">
                          <User className="w-3 h-3 text-slate-500" />
                          <strong className="text-white">{log.actor}</strong>
                          <span className="text-slate-500">({log.actorId})</span>
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          log.decision === 'APPROVED' || log.decision === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : log.decision === 'REJECTED' || log.decision === 'CANCELLED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {log.decision}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-md">
                        <div className="text-slate-200 text-xs leading-relaxed">{log.reason}</div>
                        {log.policyRuleId && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Quy chế: {log.policyRuleId}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedHash(log)}
                          title="Bấm để xem đầy đủ chuỗi Hash SHA-256"
                          className="font-mono text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-800/60 transition-colors inline-flex items-center gap-1"
                        >
                          <Key className="w-3 h-3" />
                          <span>{log.tamperHash?.slice(0, 10)}...</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT MÃ BĂM MẬT MÃ */}
      {selectedHash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-400" />
                <span>Chi Tiết Mã Băm Kiểm Toán SHA-256</span>
              </span>
              <button
                onClick={() => setSelectedHash(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="text-slate-400 text-[11px] mb-1">Mã bản ghi (Log ID):</div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-blue-400 select-all">
                  {selectedHash.logId}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[11px] mb-1">Chuỗi băm trước đó (Prev Hash):</div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400 break-all select-all">
                  {selectedHash.prevHash}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[11px] mb-1">Chuỗi băm hiện tại (Tamper Hash SHA-256):</div>
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-400 break-all select-all font-bold">
                  {selectedHash.tamperHash}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 text-slate-400 text-[11px] font-sans">
                💡 <em>Bất kỳ sự thay đổi trái phép nào đối với dữ liệu sự kiện này trên cơ sở dữ liệu sẽ làm gãy chuỗi băm mật mã và bị phát hiện ngay lập tức.</em>
              </div>
            </div>

            <button
              onClick={() => setSelectedHash(null)}
              className="mt-5 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
