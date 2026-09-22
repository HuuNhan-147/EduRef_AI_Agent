// src/pages/MyPetitionsPage.jsx
// Danh sách Hồ sơ & Đơn Học Vụ Cá Nhân / Toàn Trường

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';

export default function MyPetitionsPage({ userRole = 'STUDENT' }) {
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQrModal, setSelectedQrModal] = useState(null);

  const fetchPetitions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/petitions');
      if (res.data?.success) {
        setPetitions(res.data.data || []);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách hồ sơ:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetitions();
  }, []);

  const filteredPetitions = petitions.filter((p) => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchQuery =
      searchQuery === '' ||
      p.requestCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.requestType?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-6 space-y-6">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* Header */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                {userRole === 'STAFF' || userRole === 'DEAN' ? 'Quản Lý Hồ Sơ Đơn Toàn Trường' : 'Hồ Sơ & Đơn Học Vụ Của Tôi'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi tình trạng phê duyệt, tra cứu mã chứng thực số và mã QR điện tử hợp lệ.
            </p>
          </div>

          <button
            onClick={fetchPetitions}
            disabled={loading}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            Làm mới danh sách
          </button>
        </div>

        {/* Thanh Lọc & Tìm Kiếm */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'APPROVED', 'ESCALATED', 'WAITING_STUDENT', 'REJECTED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL'
                  ? 'Tất cả'
                  : st === 'APPROVED'
                  ? 'Đã duyệt'
                  : st === 'ESCALATED'
                  ? 'Chờ cán bộ'
                  : st === 'WAITING_STUDENT'
                  ? 'Chờ bổ sung'
                  : st === 'REJECTED'
                  ? 'Từ chối'
                  : 'Đã hoàn tác'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, tên SV..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Bảng Danh Sách Đơn */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Mã Đơn</th>
                  <th className="py-3 px-4">Thủ Tục</th>
                  <th className="py-3 px-4">Sinh Viên</th>
                  <th className="py-3 px-4">Ngày Nộp</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4">Chứng Thực Số</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPetitions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Không tìm thấy hồ sơ nào phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredPetitions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {p.requestCode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.requestType?.name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{p.student?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.student?.studentCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'ESCALATED'
                              ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : p.status === 'CANCELLED'
                              ? 'bg-slate-200 text-slate-700 line-through'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.qrCodeUrl ? (
                          <button
                            onClick={() => setSelectedQrModal(p)}
                            className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-semibold"
                          >
                            <QrCode className="w-4 h-4 text-emerald-600" />
                            Xem Mã QR
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Chưa cấp</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL PHÓNG TO MÃ QR CHỨNG THỰC */}
      {selectedQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Mã QR Chứng Thực Số Hợp Lệ
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {selectedQrModal.requestCode} — {selectedQrModal.student?.fullName}
            </h3>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 inline-block mx-auto">
              <img
                src={selectedQrModal.qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48 bg-white p-2 rounded-lg border border-emerald-300"
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Mã QR này chứa chữ ký điện tử đã được xác thực qua chuỗi băm SHA-256 của EduRef AI. Có thể dùng xuất trình làm vé xe buýt, nộp ngân hàng hoặc cơ quan nhà nước.
            </p>

            <button
              onClick={() => setSelectedQrModal(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-black"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
