// src/pages/AuditExplorerPage.jsx
// Trình Khám Phá Chuỗi Kiểm Toán Bất Biến SHA-256 & Live Terminal Console

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Terminal,
  Clock,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import getSocket from '../services/socket';
import LiveTerminalConsole from '../components/common/LiveTerminalConsole';

export default function AuditExplorerPage() {
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'TIMELINE' | 'TERMINAL'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // State kiểm tra chuỗi băm
  const [chainVerification, setChainVerification] = useState(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);

  // Nạp danh sách Audit Logs
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit/logs?limit=50');
      if (res.data?.success) {
        setLogs(res.data.data || []);
      }
    } catch (err) {
      console.warn('Lỗi tải audit logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Kiểm tra toàn bộ chuỗi khối SHA-256 từ Genesis Block đến hiện tại
  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    try {
      const res = await api.get('/audit/verify-chain');
      setChainVerification(res.data);
    } catch (err) {
      setChainVerification({ chainValid: false, error: err.message });
    } finally {
      setIsVerifyingChain(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-6 space-y-6">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* Header Kiểm Toán */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Chuỗi Kiểm Toán Mật Mã Học Bất Biến (SHA-256 Hash Chain)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Bảo đảm trách nhiệm giải trình tuyệt đối (Accountability). Mọi quyết định AI và can thiệp con người đều được nối tiếp chuỗi băm Canonical JSON.
            </p>
          </div>

          {/* Nút bấm kiểm tra tính toàn vẹn */}
          <button
            onClick={handleVerifyChain}
            disabled={isVerifyingChain}
            className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            {isVerifyingChain ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
                Đang duyệt chuỗi khối...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Kiểm Tra Toàn Vẹn Chuỗi Khối
              </>
            )}
          </button>
        </div>

        {/* Banner Kết Quả Kiểm Tra Chuỗi Khối */}
        {chainVerification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in duration-200 ${
              chainVerification.chainValid
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-3">
              {chainVerification.chainValid ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold">
                  {chainVerification.message}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Tổng số khối: <span className="font-mono font-bold">{chainVerification.totalBlocks} Blocks</span> | Hash mới nhất: <span className="font-mono">{chainVerification.latestHash?.substring(0, 24)}...</span>
                </div>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                chainVerification.chainValid
                  ? 'bg-emerald-200/80 text-emerald-900'
                  : 'bg-rose-200/80 text-rose-900'
              }`}
            >
              {chainVerification.chainValid ? '100% TOÀN VẸN (SECURE)' : 'ĐỨT GÃY CHUỖI KHỐI'}
            </span>
          </div>
        )}

        {/* Thanh Chuyển Đổi Chế Độ Xem (Tabs) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bảng Kiểm Toán
            </button>
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'TIMELINE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dòng Thời Gian (Timeline)
            </button>
            <button
              onClick={() => setViewMode('TERMINAL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'TERMINAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-blue-600" />
              Live Terminal Console
            </button>
          </div>

          <button
            onClick={fetchAuditLogs}
            disabled={loading}
            className="text-xs text-blue-700 hover:text-blue-900 font-medium"
          >
            Làm mới danh sách
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CHẾ ĐỘ 1: BẢNG DỮ LIỆU KIỂM TOÁN (TABLE VIEW) */}
        {/* ========================================================================= */}
        {viewMode === 'TABLE' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Tác Tử (Actor)</th>
                    <th className="py-3 px-4">Hành Động</th>
                    <th className="py-3 px-4">Quyết Định</th>
                    <th className="py-3 px-4">Mã Hồ Sơ</th>
                    <th className="py-3 px-4">SHA-256 Hash</th>
                    <th className="py-3 px-4 text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.actorType === 'AI_AGENT'
                              ? 'bg-blue-100 text-blue-800'
                              : log.actorType === 'STAFF'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.actorType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.decision === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.decision === 'ESCALATED' || log.decision === 'ESCALATED_PENDING'
                              ? 'bg-indigo-100 text-indigo-800'
                              : log.decision === 'CANCELLED'
                              ? 'bg-slate-200 text-slate-700'
                              : log.decision === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.decision || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {log.request?.requestCode || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500 truncate max-w-xs">
                        {log.sha256Hash?.substring(0, 20)}...
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-700 hover:text-blue-900 font-semibold"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHẾ ĐỘ 2: DÒNG THỜI GIAN (TIMELINE VIEW) */}
        {/* ========================================================================= */}
        {viewMode === 'TIMELINE' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-left">
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {logs.map((log, index) => (
                <div key={log.id} className="relative group">
                  <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-blue-600 shadow-xs"></span>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {log.action}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      {log.reason || 'Sự kiện hệ thống được ghi nhận vào chuỗi kiểm toán.'}
                    </p>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Actor: {log.actorType}</span>
                      <span>Hash: {log.sha256Hash?.substring(0, 24)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHẾ ĐỘ 3: LIVE TERMINAL CONSOLE (REALTIME SOCKET LOGS) */}
        {/* ========================================================================= */}
        {viewMode === 'TERMINAL' && (
          <LiveTerminalConsole maxHeight="max-h-[500px]" className="h-[550px]" />
        )}

      </div>

      {/* MODAL XEM CHI TIẾT 1 BẢN GHI AUDIT LOG */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 text-left animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Chi Tiết Bằng Chứng Kiểm Toán
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedLog.action}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Tác tử (Who):</span>
                  <span className="font-semibold text-slate-800">{selectedLog.actorType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Quyết định:</span>
                  <span className="font-bold text-blue-700">{selectedLog.decision}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Thời gian:</span>
                  <span>{new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Hồ sơ đơn:</span>
                  <span className="font-mono font-bold">{selectedLog.request?.requestCode || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Lý do giải trình (Why):</span>
                <p className="p-2.5 rounded bg-slate-50 border border-slate-100 text-slate-800 leading-relaxed">
                  {selectedLog.reason || 'Ghi nhận sự vụ bình thường theo quy trình đào tạo.'}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Mã Băm Khối Trước (Previous Hash):</span>
                <div className="p-2 rounded bg-slate-100 font-mono text-[10px] text-slate-600 break-all select-all">
                  {selectedLog.previousHash || 'GENESIS_HASH_EDUREF_2026'}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Mã Băm Bất Biến Khối Này (SHA-256):</span>
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 font-mono text-[10px] text-emerald-900 break-all select-all font-bold">
                  {selectedLog.sha256Hash}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
