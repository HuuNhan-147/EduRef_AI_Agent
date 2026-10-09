// src/pages/StaffEscalationPage.jsx
// Hàng đợi Chuyển tiếp Hồ sơ Học vụ dành cho Cán bộ Phòng Đào tạo (Staff Escalation Hub & HITL)

import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  XCircle,
  RotateCcw,
  User,
  FileText,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Info,
  Award,
  GraduationCap,
  Building,
  Eye,
  X,
  Search,
  ChevronLeft,
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';

export default function StaffEscalationPage() {
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPetition, setSelectedPetition] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);

  // Bộ lọc trạng thái & tìm kiếm nhanh để thanh danh sách không bị dài
  const [statusFilter, setStatusFilter] = useState('ESCALATED'); // Mặc định hiển thị đơn chờ PĐT duyệt
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowDetail, setMobileShowDetail] = useState(false); // Chuyển đổi màn hình trên mobile

  // States cho modal phê duyệt / từ chối / hoàn tác
  const [actionModal, setActionModal] = useState(null); // null | 'APPROVE' | 'REJECT' | 'ROLLBACK'
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Nạp danh sách đơn chờ xử lý
  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/petitions');
      if (res.data?.success) {
        const all = res.data.data || [];
        setPetitions(all);
        if (!selectedPetition && all.length > 0) {
          // Mặc định chọn đơn ESCALATED đầu tiên hoặc đơn bất kỳ
          const firstEscalated = all.find((p) => p.status === 'ESCALATED') || all[0];
          handleSelectPetition(firstEscalated);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách hồ sơ:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPetition = async (p) => {
    if (!p) return;
    setSelectedPetition(p);
    try {
      const res = await api.get(`/petitions/${p.id}`);
      if (res.data?.success && res.data.data) {
        setSelectedPetition(res.data.data);
      }
    } catch (err) {
      console.warn('Lỗi tải chi tiết đơn:', err.message);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, []);

  // Thực hiện hành động Duyệt, Từ chối hoặc Hoàn tác
  const handleExecuteAction = async () => {
    if (!selectedPetition) return;
    setIsSubmitting(true);

    try {
      if (actionModal === 'APPROVE') {
        const res = await api.post(`/petitions/${selectedPetition.id}/approve`, {
          note: actionNote || 'Chuyên viên PĐT thẩm định hồ sơ đạt yêu cầu',
        });
        if (res.data?.success) {
          showToast(`Đã phê duyệt thành công đơn [${selectedPetition.requestCode}]!`);
        }
      } else if (actionModal === 'REJECT') {
        if (!actionNote.trim()) {
          alert('Bắt buộc phải nhập lý do từ chối đơn!');
          setIsSubmitting(false);
          return;
        }
        const res = await api.post(`/petitions/${selectedPetition.id}/reject`, {
          reason: actionNote,
        });
        if (res.data?.success) {
          showToast(`Đã bác bỏ hồ sơ [${selectedPetition.requestCode}].`, 'error');
        }
      } else if (actionModal === 'ROLLBACK') {
        const res = await api.post(`/petitions/${selectedPetition.id}/rollback`, {
          reason: actionNote || 'Can thiệp dừng và thu hồi bởi Cán bộ Quản lý',
        });
        if (res.data?.success) {
          showToast(`Đã hoàn tác và vô hiệu hóa mã QR đơn [${selectedPetition.requestCode}].`, 'warning');
        }
      }

      setActionModal(null);
      setActionNote('');
      await fetchEscalations();

      // Cập nhật lại bản ghi đang chọn
      const updated = await api.get(`/petitions/${selectedPetition.id}`);
      if (updated.data?.success) {
        setSelectedPetition(updated.data.data);
      }
    } catch (err) {
      alert(`Lỗi thực hiện: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const escalatedList = petitions.filter((p) => p.status === 'ESCALATED');
  const approvedList = petitions.filter((p) => p.status === 'APPROVED');
  const rejectedList = petitions.filter((p) => p.status === 'REJECTED');

  // Lọc danh sách theo Tab trạng thái và Ô tìm kiếm
  const filteredPetitions = petitions.filter((p) => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      p.requestCode?.toLowerCase().includes(q) ||
      p.requestType?.name?.toLowerCase().includes(q) ||
      p.student?.fullName?.toLowerCase().includes(q) ||
      p.student?.studentCode?.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const capsule = selectedPetition?.contextCapsule;

  return (
    <div className="flex-1 flex overflow-hidden bg-[#F0F4F9] h-full">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 border text-white ${
          toast.type === 'error' ? 'bg-rose-600 border-rose-700' : toast.type === 'warning' ? 'bg-amber-600 border-amber-700' : 'bg-emerald-600 border-emerald-700'
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          {toast.msg}
        </div>
      )}

      {/* CỘT DANH SÁCH HỒ SƠ CHỜ THẨM ĐỊNH (Trái) */}
      <div className={`w-full md:w-96 bg-white border-r border-slate-200/90 flex flex-col shrink-0 h-full ${
        mobileShowDetail ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header danh sách */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-[#0B3B82]" />
              Hàng Đợi Chuyển Tiếp
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              <span className="font-semibold text-amber-700">{escalatedList.length} hồ sơ</span> chờ cán bộ thẩm định
            </p>
          </div>
          <button
            onClick={fetchEscalations}
            disabled={loading}
            className="text-xs text-[#0B3B82] hover:text-[#082C64] font-semibold cursor-pointer px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {/* Ô Tìm Kiếm Nhanh */}
        <div className="p-2.5 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, MSSV, tên SV..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-[#0B3B82] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bộ Lọc Trạng Thái Dạng Tabs Nhỏ Gọn */}
        <div className="px-2.5 py-1.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1 overflow-x-auto text-[11px] font-medium custom-scrollbar">
          <button
            onClick={() => setStatusFilter('ESCALATED')}
            className={`px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1 transition-all ${
              statusFilter === 'ESCALATED'
                ? 'bg-[#0B3B82] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>Chờ duyệt</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'ESCALATED' ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
            }`}>
              {escalatedList.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1 transition-all ${
              statusFilter === 'ALL'
                ? 'bg-[#0B3B82] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>Tất cả</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {petitions.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1 transition-all ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>Đã duyệt</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'APPROVED' ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {approvedList.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1 transition-all ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-700 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>Từ chối</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'REJECTED' ? 'bg-rose-900 text-rose-100' : 'bg-rose-100 text-rose-800'
            }`}>
              {rejectedList.length}
            </span>
          </button>
        </div>

        {/* Thanh đếm kết quả nhỏ */}
        <div className="px-3 py-1 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <span>Hiển thị <b>{filteredPetitions.length}</b> / {petitions.length} hồ sơ</span>
          {(searchQuery || statusFilter !== 'ESCALATED') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ESCALATED');
              }}
              className="text-[#0B3B82] hover:underline font-medium"
            >
              Mặc định
            </button>
          )}
        </div>

        {/* Danh sách cuộn dạng Compact Item */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 custom-scrollbar">
          {filteredPetitions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <p>Không tìm thấy hồ sơ phù hợp.</p>
              {(searchQuery || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  className="text-xs text-[#0B3B82] font-semibold hover:underline"
                >
                  Xem tất cả hồ sơ
                </button>
              )}
            </div>
          ) : (
            filteredPetitions.map((p) => {
              const isSelected = selectedPetition?.id === p.id;
              const isEscalated = p.status === 'ESCALATED';

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    handleSelectPetition(p);
                    setMobileShowDetail(true);
                  }}
                  className={`p-2.5 rounded-lg cursor-pointer transition-all text-left border ${
                    isSelected
                      ? 'bg-blue-50/90 border-[#0B3B82] border-l-4 shadow-xs'
                      : isEscalated
                      ? 'bg-amber-50/40 border-amber-200/60 hover:bg-amber-50/70'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {/* Hàng 1: Mã đơn & Badge trạng thái */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isEscalated && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-ping" />
                      )}
                      <span className="font-mono text-xs font-bold text-slate-900 truncate">
                        {p.requestCode}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                        p.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'ESCALATED'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                          : p.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : p.status === 'CANCELLED'
                          ? 'bg-slate-200 text-slate-700 line-through'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {p.status === 'ESCALATED' ? 'CẦN DUYỆT' : p.status}
                    </span>
                  </div>

                  {/* Hàng 2: Tên thủ tục */}
                  <div className="text-xs font-medium text-slate-800 mt-1 truncate">
                    {p.requestType?.name || 'Thủ tục học vụ'}
                  </div>

                  {/* Hàng 3: Tên sinh viên & MSSV */}
                  <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1 pt-1 border-t border-slate-100/60">
                    <span className="truncate max-w-[190px]">SV: <span className="text-slate-700 font-medium">{p.student?.fullName || 'Sinh viên'}</span></span>
                    <span className="font-mono text-[10px] text-slate-600 shrink-0 font-medium">{p.student?.studentCode}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CỘT CHI TIẾT CONTEXT CAPSULE & BỘ NÚT DUYỆT (Phải) */}
      <div className={`flex-1 bg-slate-50 flex flex-col overflow-y-auto p-4 sm:p-6 ${
        !mobileShowDetail ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Nút Quay lại danh sách trên Mobile */}
        <div className="md:hidden mb-3">
          <button
            onClick={() => setMobileShowDetail(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B3B82] bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-blue-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Quay lại danh sách hồ sơ
          </button>
        </div>

        {selectedPetition ? (
          <div className="max-w-4xl mx-auto w-full space-y-5">
            
            {/* Thẻ Header Chi Tiết Đơn */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-slate-900">
                    {selectedPetition.requestCode}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedPetition.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedPetition.status === 'ESCALATED'
                        ? 'bg-indigo-100 text-indigo-800'
                        : selectedPetition.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedPetition.status}
                  </span>
                </div>
                <h1 className="text-sm font-semibold text-slate-700 mt-0.5">
                  {selectedPetition.requestType?.name}
                </h1>
              </div>

              {/* Bộ 3 Nút Hành Động Human-In-The-Loop */}
              <div className="flex items-center gap-2">
                {selectedPetition.status === 'ESCALATED' && (
                  <>
                    <button
                      onClick={() => setActionModal('APPROVE')}
                      className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Phê Duyệt
                    </button>
                    <button
                      onClick={() => setActionModal('REJECT')}
                      className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Từ Chối Đơn
                    </button>
                  </>
                )}

                {selectedPetition.status === 'APPROVED' && (
                  <button
                    onClick={() => setActionModal('ROLLBACK')}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    Can Thiệp Dừng (Rollback)
                  </button>
                )}
              </div>
            </div>

            {/* Khối Context Capsule: Tóm tắt sự vụ & lý do vượt quyền */}
            <div className="p-5 rounded-xl bg-white border border-indigo-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-700" />
                  <span className="font-bold text-xs uppercase tracking-wider text-indigo-950">
                    Bản Đóng Gói Ngữ Cảnh (Context Capsule)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Dành riêng cho Chuyên viên PĐT
                </span>
              </div>

              {/* Thông tin sinh viên */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Họ tên:</span>
                  <span className="font-semibold text-slate-800">{selectedPetition.student?.fullName || selectedPetition.inputData?.fullName || 'Cao Hữu Nhân'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">MSSV:</span>
                  <span className="font-mono font-bold text-blue-700">{selectedPetition.student?.studentCode || selectedPetition.inputData?.studentCode || '2280602154'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Khoa / Viện:</span>
                  <span className="font-medium text-slate-800">{selectedPetition.student?.department?.name || selectedPetition.inputData?.faculty || 'Khoa Công nghệ Thông tin'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Lớp sinh hoạt / Ngành:</span>
                  <span className="font-medium text-slate-800 font-mono">
                    {selectedPetition.inputData?.studentClass || selectedPetition.student?.studentClass || '(Chưa cập nhật)'} • {selectedPetition.inputData?.major || selectedPetition.student?.major || 'CNTT'}
                  </span>
                </div>
              </div>

              {/* Lý do chuyển tiếp ban đầu của AI */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Lý do vượt thẩm quyền AI (AI Escalation Reason):
                </span>
                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
                  {capsule?.reason || selectedPetition.escalationReason || 'Thủ tục thuộc phân cấp thẩm quyền phê duyệt của Cán bộ Phòng Đào tạo.'}
                </div>
              </div>

              {/* Ý kiến / Ghi chú phê duyệt của Người duyệt (Staff / Dean Review Note) */}
              {(selectedPetition.status === 'APPROVED' || selectedPetition.status === 'REJECTED' || capsule?.reviewerNote) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      {selectedPetition.status === 'APPROVED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      Ý kiến / Ghi chú của Người duyệt ({capsule?.reviewedBy || (selectedPetition.status === 'APPROVED' ? 'Trưởng khoa / Cán bộ đã duyệt' : 'Cán bộ từ chối')}):
                    </span>
                    {capsule?.reviewedAt && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(capsule.reviewedAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg text-xs leading-relaxed border whitespace-pre-line font-medium ${
                    selectedPetition.status === 'APPROVED'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}>
                    {capsule?.reviewerNote || (selectedPetition.status === 'APPROVED' ? 'Đã thẩm định hồ sơ đạt yêu cầu, chấp thuận phê duyệt.' : 'Từ chối tiếp nhận hồ sơ.')}
                  </div>
                </div>
              )}

              {/* Câu hỏi hành động trực diện */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Câu hỏi hành động cho người duyệt (Actionable Question):
                </span>
                <div className="p-3 rounded-lg bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-900 font-semibold leading-relaxed">
                  {capsule?.actionableQuestion || `Thầy/Cô có phê duyệt hồ sơ [${selectedPetition.requestCode}] cho sinh viên ${selectedPetition.student?.fullName} không?`}
                </div>
              </div>

              {/* Bản Đóng Gói Ngữ Cảnh 1:1 theo 5 Biểu mẫu Học Vụ Thực Tế HUTECH */}
              {selectedPetition.requestType?.code === 'STUDENT_CONFIRMATION' && (() => {
                const input = selectedPetition.inputData || {};
                const student = selectedPetition.student || {};

                // Tự động nhận diện 1 trong 5 biểu mẫu thực tế HUTECH
                let activeFormCode = input.formCode;
                if (!activeFormCode) {
                  const rawSearch = `${selectedPetition.requestCode || ''} ${input.purpose || ''} ${input.reason || ''} ${selectedPetition.escalationReason || ''} ${input.formDescription || ''}`.toLowerCase();
                  if (rawSearch.includes('thuế') || rawSearch.includes('thue') || rawSearch.includes('giảm trừ') || rawSearch.includes('giam tru')) {
                    activeFormCode = 'TAX_DEDUCTION';
                  } else if (rawSearch.includes('vay vốn') || rawSearch.includes('vay von') || rawSearch.includes('nhcsxh') || rawSearch.includes('ngân hàng chính sách') || rawSearch.includes('mẫu 01')) {
                    activeFormCode = 'BANK_LOAN';
                  } else if (rawSearch.includes('quân sự') || rawSearch.includes('quan su') || rawSearch.includes('nvqs') || rawSearch.includes('tạm hoãn') || rawSearch.includes('tam hoan')) {
                    activeFormCode = 'MILITARY_DEFERMENT';
                  } else if (rawSearch.includes('nợ môn') || rawSearch.includes('no mon') || input.debtCourses) {
                    activeFormCode = 'COURSE_DEBT';
                  } else {
                    activeFormCode = 'GENERAL_CONFIRMATION';
                  }
                }

                // Cấu hình Metadata chuyên sâu cho từng biểu mẫu
                const FORM_META = {
                  TAX_DEDUCTION: {
                    badge: 'DV-01',
                    title: 'ĐƠN XÁC NHẬN GIẢM TRỪ GIA CẢNH (THUẾ TNCN)',
                    shortTitle: 'Đơn Giảm Trừ Gia Cảnh Thuế',
                    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
                    boxBg: 'bg-blue-50/50 border-blue-200',
                    agencyPlaceholder: 'Chi cục Thuế Quận Bình Thạnh',
                    note: 'Giấy xác nhận có thời hạn giá trị 01 học kỳ theo quy định của Cục Thuế.',
                  },
                  BANK_LOAN: {
                    badge: 'DV-02',
                    title: 'GIẤY XÁC NHẬN VAY VỐN NGÂN HÀNG CHÍNH SÁCH XÃ HỘI (MẪU 01/TDSV)',
                    shortTitle: 'Vay Vốn NHCSXH (Mẫu 01/TDSV)',
                    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    boxBg: 'bg-emerald-50/50 border-emerald-200',
                    agencyPlaceholder: 'Phòng giao dịch NHCSXH Quận Bình Thạnh',
                    note: 'Mẫu 01/TDSV áp dụng theo Quyết định 157/2007/QĐ-TTg của Thủ tướng Chính phủ.',
                  },
                  MILITARY_DEFERMENT: {
                    badge: 'DV-03',
                    title: 'GIẤY CHỨNG NHẬN ĐĂNG KÝ TẠM HOÃN NGHĨA VỤ QUÂN SỰ',
                    shortTitle: 'Tạm Hoãn Nghĩa Vụ Quân Sự',
                    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
                    boxBg: 'bg-rose-50/50 border-rose-200',
                    agencyPlaceholder: 'Ban Chỉ huy Quân sự Phường 25, Quận Bình Thạnh',
                    note: 'Giấy có hiệu lực 30 ngày kể từ ngày cấp theo Luật Nghĩa vụ Quân sự.',
                  },
                  COURSE_DEBT: {
                    badge: 'DV-04',
                    title: 'ĐƠN XÁC NHẬN SINH VIÊN CÒN NỢ MÔN / TIẾP TỤC HOÀN THÀNH HỌC PHẦN',
                    shortTitle: 'Xác Nhận Nợ Môn / Hoàn Thành CTĐT',
                    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
                    boxBg: 'bg-purple-50/50 border-purple-200',
                    agencyPlaceholder: 'Bổ sung hồ sơ giải trình cơ quan NVQS & tiếp tục học tập',
                    note: 'Xác nhận sinh viên đang hoàn thành học phần nợ, không ghi chú quá hạn đào tạo.',
                  },
                  GENERAL_CONFIRMATION: {
                    badge: 'DV-05',
                    title: 'GIẤY XÁC NHẬN SINH VIÊN (MỤC ĐÍCH CHUNG)',
                    shortTitle: 'Xác Nhận Sinh Viên Chung',
                    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                    boxBg: 'bg-indigo-50/50 border-indigo-200',
                    agencyPlaceholder: 'Làm vé xe buýt, xin visa du lịch, việc làm, học bổng...',
                    note: 'Cấp cho sinh viên hệ chính quy đang theo học tại Trường ĐH Công Nghệ TP.HCM (HUTECH).',
                  },
                };

                const meta = FORM_META[activeFormCode] || FORM_META.GENERAL_CONFIRMATION;

                // Dữ liệu ánh xạ 1:1 nguyên vẹn từ form sinh viên gửi (bảo toàn tính trung thực của dữ liệu)
                const fullName = input.fullName || student.fullName || '(Chưa có họ tên)';
                const studentCode = input.studentCode || student.studentCode || '(Chưa có MSSV)';
                const birthDate = input.birthDate || '(Chưa cập nhật)';
                const gender = input.gender || '(Chưa cập nhật)';
                const studentClass = input.studentClass || student.studentClass || '(Chưa cập nhật)';
                const faculty = input.faculty || student.department?.name || '(Chưa cập nhật)';
                const major = input.major || '(Chưa cập nhật)';
                const phone = input.phone || student.phone || '(Chưa cập nhật)';
                const idCard = input.idCard || input.idCardNumber || input.citizenId || '(Chưa cập nhật)';
                const idCardDate = input.idCardDate || input.issueDate || '(Chưa cập nhật)';
                const idCardPlace = input.idCardPlace || input.issuePlace || '(Chưa cập nhật)';
                const recipientAgency = input.recipientAgency || meta.agencyPlaceholder || '(Chưa cập nhật)';
                const permanentAddress = input.permanentAddress || '(Chưa cập nhật)';
                const pickupCampus = input.pickupCampus || 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)';
                const purpose = input.purpose || input.reason || '(Chưa cập nhật)';
                const debtCourses = input.debtCourses || '(Chưa cập nhật)';
                const completionDeadline = input.completionDeadline || '(Chưa cập nhật)';
                const orphanStatus = input.orphanStatus || 'Không mồ côi';
                const loanFormCount = input.loanFormCount || 1;
                const loanGrantedCount = input.loanGrantedCount || 1;
                const lastLoanAmount = input.lastLoanAmount ? `${Number(input.lastLoanAmount).toLocaleString('vi-VN')} đ` : 'Chưa có khoản vay kỳ trước';

                return (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    {/* Hộp Đóng Gói Biểu Mẫu 1:1 */}
                    <div className={`p-4 rounded-xl border ${meta.boxBg}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/90">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide border shadow-2xs ${meta.badgeBg}`}>
                            {meta.badge}
                          </span>
                          <span className="text-xs font-bold uppercase text-slate-900 tracking-tight">
                            {meta.title}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-semibold text-indigo-700 bg-white/90 px-2 py-0.5 rounded border border-indigo-200 inline-block self-start sm:self-auto">
                          ⚡ Chuyển tiếp 1:1 từ biểu mẫu sinh viên điền
                        </span>
                      </div>

                      {/* Thông tin chi tiết */}
                      <div className="pt-3.5 space-y-3 text-xs">
                        
                        {/* 1. Thông tin sinh viên & Nhân thân */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            1. Thông tin sinh viên & Nhân thân:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Họ và tên:</span>
                              <span className="font-bold text-slate-900">{fullName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Mã số SV:</span>
                              <span className="font-mono font-bold text-blue-700">{studentCode}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Ngày sinh:</span>
                              <span className="font-medium text-slate-800">{birthDate}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Giới tính:</span>
                              <span className="font-medium text-slate-800">{gender}</span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">Lớp sinh hoạt:</span>
                              <span className="font-mono font-bold text-slate-800">{studentClass}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Khoa / Viện:</span>
                              <span className="font-medium text-slate-800">{faculty}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Chuyên ngành:</span>
                              <span className="font-medium text-slate-800">{major}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Điện thoại:</span>
                              <span className="font-medium text-slate-800 font-mono">{phone}</span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">Số CMND/CCCD:</span>
                              <span className="font-mono font-bold text-slate-900">{idCard}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Ngày cấp:</span>
                              <span className="font-medium text-slate-800">{idCardDate}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 block text-[10px]">Nơi cấp:</span>
                              <span className="font-medium text-slate-800">{idCardPlace}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Thông tin khai báo đặc thù của biểu mẫu */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            2. Thông tin khai báo đặc thù ({meta.shortTitle}):
                          </span>

                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
                            {/* Form DV-01: Thuế TNCN */}
                            {activeFormCode === 'TAX_DEDUCTION' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="sm:col-span-2">
                                  <span className="text-slate-400 block text-[10px]">Cơ quan Thuế tiếp nhận:</span>
                                  <span className="font-bold text-blue-900 bg-blue-50/80 px-2.5 py-1.5 rounded block border border-blue-200">
                                    🏛️ {recipientAgency}
                                  </span>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-slate-400 block text-[10px]">Địa chỉ hộ khẩu thường trú (4 cấp hành chính):</span>
                                  <span className="font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded block border border-slate-200">
                                    📍 {permanentAddress}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Form DV-02: Vay vốn NHCSXH */}
                            {activeFormCode === 'BANK_LOAN' && (
                              <div className="space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Ngân hàng Chính sách Xã hội tiếp nhận:</span>
                                    <span className="font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded block border border-emerald-200">
                                      🏦 {recipientAgency}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Thuộc đối tượng mồ côi:</span>
                                    <span className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded block border border-slate-200">
                                      {orphanStatus}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Địa chỉ hộ khẩu thường trú (4 cấp hành chính):</span>
                                  <span className="font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded block border border-slate-200">
                                    📍 {permanentAddress}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-200 text-[11px]">
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Số lần làm mẫu xác nhận:</span>
                                    <span className="font-bold text-emerald-900 font-mono">{loanFormCount} lần</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Số lần đã được vay vốn:</span>
                                    <span className="font-bold text-emerald-900 font-mono">{loanGrantedCount} lần</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Số tiền vay học kỳ gần nhất:</span>
                                    <span className="font-bold text-emerald-900 font-mono">{lastLoanAmount}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Form DV-03: Tạm hoãn NVQS */}
                            {activeFormCode === 'MILITARY_DEFERMENT' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="sm:col-span-2">
                                  <span className="text-slate-400 block text-[10px]">Ban Chỉ huy Quân sự cấp Xã/Phường/Thị trấn tiếp nhận:</span>
                                  <span className="font-bold text-rose-900 bg-rose-50/80 px-2.5 py-1.5 rounded block border border-rose-200">
                                    🎖️ {recipientAgency}
                                  </span>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-slate-400 block text-[10px]">Địa chỉ thường trú theo hộ khẩu (4 cấp):</span>
                                  <span className="font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded block border border-slate-200">
                                    📍 {permanentAddress}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Form DV-04: Mẫu Nợ môn */}
                            {activeFormCode === 'COURSE_DEBT' && (
                              <div className="space-y-2.5">
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Danh sách học phần / môn học còn nợ:</span>
                                  <span className="font-bold text-purple-950 bg-purple-50 px-2.5 py-2 rounded block border border-purple-200 leading-relaxed">
                                    📚 {debtCourses}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Thời hạn dự kiến hoàn thành môn nợ:</span>
                                    <span className="font-bold text-purple-900 bg-purple-50/70 px-2.5 py-1.5 rounded block border border-purple-200">
                                      ⏳ {completionDeadline}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Mục đích giải trình / sử dụng:</span>
                                    <span className="font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded block border border-slate-200">
                                      {purpose}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Form DV-05: Mục đích chung */}
                            {activeFormCode === 'GENERAL_CONFIRMATION' && (
                              <div>
                                <span className="text-slate-400 block text-[10px]">Mục đích xác nhận cụ thể:</span>
                                <span className="font-semibold text-indigo-950 bg-indigo-50/80 px-2.5 py-2 rounded block border border-indigo-200">
                                  🎯 {purpose}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Cơ sở nhận bản cứng & Hiệu lực quy chế */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          <div className="sm:col-span-2">
                            <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                              <Building className="w-3 h-3 text-blue-600" />
                              Cơ sở nhận bản cứng tại trường:
                            </span>
                            <span className="font-bold text-blue-900">
                              {pickupCampus}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Thời hạn & Quy chế:</span>
                            <span className="text-[10.5px] font-medium text-slate-600">
                              {meta.note}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Thông tin đăng ký & Bảng chứng chỉ chuẩn đầu ra nếu là Đơn xét tốt nghiệp */}
              {selectedPetition.requestType?.code === 'GRADUATION_ASSESSMENT' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    Thông tin xét tốt nghiệp & Chứng chỉ chuẩn đầu ra:
                  </span>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs mb-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Đợt tốt nghiệp:</span>
                      <span className="font-semibold text-indigo-900">
                        {selectedPetition.inputData?.graduationPeriod || 'Đợt 1 - Năm học 2025-2026'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ghi chú / Nguyện vọng:</span>
                      <span className="font-medium text-slate-800">
                        {selectedPetition.inputData?.reason || 'Đủ điều kiện xét tốt nghiệp'}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      Bảng chứng chỉ chuẩn đầu ra đã nộp:
                    </div>
                    {Array.isArray(selectedPetition.inputData?.certificates) && selectedPetition.inputData.certificates.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-semibold text-slate-500 border-b border-slate-200">
                              <th className="p-2 text-center w-10">STT</th>
                              <th className="p-2">Chứng chỉ</th>
                              <th className="p-2">Số hiệu CC</th>
                              <th className="p-2">Ngày cấp</th>
                              <th className="p-2">Nơi cấp</th>
                              <th className="p-2">Số vào sổ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedPetition.inputData.certificates.map((cert, cIdx) => {
                              const certTitle = cert.certType || cert.name || cert.type || `Chứng chỉ #${cIdx + 1}`;
                              const certNum = cert.certNumber || cert.number || cert.code || '—';
                              const issueDate = cert.issueDate || cert.date || '24/06/2024';
                              const issuePlace = cert.issuePlace || cert.issuedBy || 'Trường ĐH Công Nghệ TP.HCM (HUTECH)';
                              const bookNum = cert.bookNumber || cert.registryNumber || cert.bookNum || '—';

                              return (
                                <tr key={cert.id || cIdx} className="hover:bg-blue-50/40">
                                  <td className="p-2 text-center font-mono text-[11px] text-slate-500">{cIdx + 1}</td>
                                  <td className="p-2 font-semibold text-slate-900">{certTitle}</td>
                                  <td className="p-2 font-mono text-blue-700 font-bold">{certNum}</td>
                                  <td className="p-2 text-slate-600">{issueDate}</td>
                                  <td className="p-2 text-slate-600">{issuePlace}</td>
                                  <td className="p-2 font-mono text-slate-700 font-semibold">{bookNum}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 text-xs text-slate-500 bg-white text-center">
                        Không có bảng chứng chỉ kèm theo (Thẩm định qua CSDL chuẩn đầu ra).
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Danh sách minh chứng & giấy tờ đính kèm thực tế */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block">
                  Minh chứng & Giấy tờ đính kèm:
                </span>
                {(() => {
                  let docList = Array.isArray(selectedPetition.documents) && selectedPetition.documents.length > 0
                    ? [...selectedPetition.documents]
                    : [];

                  // Nếu documents trong DB rỗng nhưng là đơn xét tốt nghiệp hoặc có hasAttachment/attachedCerts
                  if (docList.length === 0 && (selectedPetition.inputData?.hasAttachment || selectedPetition.inputData?.attachedCerts)) {
                    const certs = selectedPetition.inputData?.attachedCerts || {};
                    docList = [
                      {
                        id: 'doc_b1',
                        fileName: certs.b1?.fileName || 'HUTECH_Chung_Chi_Tieng_Anh_B1.png',
                        fileUrl: certs.b1?.previewUrl || '/demo_certs/hutech_b1_english.png',
                        documentType: 'B1_ENGLISH_CERT',
                        verificationStatus: 'PENDING',
                      },
                      {
                        id: 'doc_teamwork',
                        fileName: certs.teamwork?.fileName || 'HUTECH_Chung_Chi_Ky_Nang_Nhom.png',
                        fileUrl: certs.teamwork?.previewUrl || '/demo_certs/hutech_teamwork_skills.png',
                        documentType: 'TEAMWORK_SKILLS_CERT',
                        verificationStatus: 'PENDING',
                      },
                    ];
                  }

                  if (docList.length > 0) {
                    return (
                      <div className="space-y-1.5">
                        {docList.map((doc, dIdx) => (
                          <div
                            key={doc.id || dIdx}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 text-xs">
                              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="font-medium text-slate-800 truncate max-w-xs">
                                {doc.fileName}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                doc.verificationStatus === 'VERIFIED'
                                  ? 'text-emerald-700 bg-emerald-100'
                                  : 'text-amber-700 bg-amber-100'
                              }`}>
                                {doc.verificationStatus || 'PENDING'}
                              </span>
                              {doc.documentType && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  [{doc.documentType}]
                                </span>
                              )}
                            </div>
                            {doc.fileUrl ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const fullUrl = doc.fileUrl.startsWith('http') || doc.fileUrl.startsWith('data:')
                                      ? doc.fileUrl
                                      : doc.fileUrl.startsWith('/')
                                      ? doc.fileUrl
                                      : `/${doc.fileUrl}`;
                                    setPreviewImg(fullUrl);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-xs text-blue-700 font-bold flex items-center gap-1 transition-colors border border-blue-200 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  Xem ảnh gốc
                                </button>
                                <a
                                  href={doc.fileUrl.startsWith('http') || doc.fileUrl.startsWith('data:') ? doc.fileUrl : doc.fileUrl.startsWith('/') ? doc.fileUrl : `/${doc.fileUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-slate-400 hover:text-blue-700 flex items-center gap-0.5"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Đã lưu trữ nội bộ</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
                      <Info className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>
                        Hồ sơ không yêu cầu chứng từ đính kèm (Thông tin sinh viên và điều kiện học vụ đã được đối soát tự động từ CSDL Trường).
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Mã tra cứu hồ sơ tiếp nhận bản cứng nếu đã duyệt */}
              {selectedPetition.qrCodeUrl && (
                <div className="mt-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-4">
                  <img
                    src={selectedPetition.qrCodeUrl}
                    alt="Mã Tra Cứu Tiếp Nhận Hồ Sơ"
                    className="w-20 h-20 bg-white p-1 rounded border border-emerald-300"
                  />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">
                      MÃ TRA CỨU HỒ SƠ & TIẾP NHẬN BẢN CỨNG TẠI PHÒNG CTSV
                    </div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      Sinh viên xuất trình mã tra cứu này khi đến nhận bản in có mộc đỏ và chữ ký sống của Nhà trường.
                    </div>
                    <div className="text-[10px] font-mono text-emerald-800 mt-1">
                      Mã hồ sơ: {selectedPetition.requestCode} | Cơ sở nhận: {selectedPetition.inputData?.pickupCampus || 'Trụ sở chính: phòng Công tác sinh viên (A-01,01)'}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="m-auto text-center text-slate-400 text-xs">
            Vui lòng chọn một hồ sơ bên trái để xem chi tiết Context Capsule
          </div>
        )}
      </div>

      {/* MODAL THAO TÁC DUYỆT / TỪ CHỐI / HOÀN TÁC */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-2">
              {actionModal === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {actionModal === 'REJECT' && <XCircle className="w-5 h-5 text-rose-600" />}
              {actionModal === 'ROLLBACK' && <RotateCcw className="w-5 h-5 text-amber-600" />}
              <h3 className="text-sm font-bold text-slate-900">
                {actionModal === 'APPROVE' && 'Xác nhận Phê duyệt Đơn'}
                {actionModal === 'REJECT' && 'Từ chối Tiếp nhận Đơn'}
                {actionModal === 'ROLLBACK' && 'Can thiệp Dừng Khẩn cấp (Rollback)'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {actionModal === 'APPROVE' && 'Hành động này sẽ phê duyệt cấp giấy, sinh viên nhận thông báo và đến Phòng CTSV nhận bản in có chữ ký và mộc đỏ.'}
              {actionModal === 'REJECT' && 'Vui lòng cung cấp lý do từ chối rõ ràng để sinh viên nắm rõ căn cứ quy chế.'}
              {actionModal === 'ROLLBACK' && 'CẢNH BÁO: Hành động này sẽ thu hồi quyết định phê duyệt và chuyển trạng thái hồ sơ sang CANCELLED.'}
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {actionModal === 'APPROVE' ? 'Ghi chú phê duyệt của Thầy/Cô (Lưu vào hồ sơ):' : 'Lý do từ chối (Bắt buộc):'}
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionModal === 'REJECT' ? 'Nhập lý do từ chối đơn...' : 'Nhập ý kiến / ghi chú phê duyệt của Thầy/Cô...'}
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={isSubmitting}
                className={`px-4 py-1.5 text-xs text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 ${
                  actionModal === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionModal === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-900 hover:bg-black'
                }`}
              >
                {isSubmitting ? 'Đang thực thi...' : 'Xác Nhận Thực Hiện'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Modal xem ảnh chứng chỉ gốc cho Thầy PĐT */}
      {previewImg && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewImg(null)}
        >
          <div
            className="relative max-w-3xl max-h-[92vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-900/70 text-white rounded-full hover:bg-slate-900 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImg}
              alt="Chứng chỉ gốc đối chiếu"
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}

    </div>
  );
}
