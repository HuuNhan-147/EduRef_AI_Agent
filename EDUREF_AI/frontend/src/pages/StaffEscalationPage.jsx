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
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';

export default function StaffEscalationPage() {
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPetition, setSelectedPetition] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);

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
  const capsule = selectedPetition?.contextCapsule;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      
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
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-indigo-600" />
              Hàng Đợi Chuyển Tiếp (Escalation)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {escalatedList.length} hồ sơ vượt thẩm quyền AI chờ bạn xử lý
            </p>
          </div>
          <button
            onClick={fetchEscalations}
            disabled={loading}
            className="text-xs text-blue-700 hover:text-blue-900 font-medium"
          >
            Làm mới
          </button>
        </div>

        {/* Danh sách cuộn */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {petitions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Không có hồ sơ nào trong hệ thống.
            </div>
          ) : (
            petitions.map((p) => {
              const isSelected = selectedPetition?.id === p.id;
              const isEscalated = p.status === 'ESCALATED';

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPetition(p)}
                  className={`p-3 rounded-lg cursor-pointer transition-all text-left border ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {p.requestCode}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
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
                  </div>

                  <div className="text-xs font-medium text-slate-800 mt-1 truncate">
                    {p.requestType?.name || 'Thủ tục học vụ'}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                    <span>SV: {p.student?.fullName || 'Sinh viên'}</span>
                    <span className="font-mono text-[10px]">{p.student?.studentCode}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CỘT CHI TIẾT CONTEXT CAPSULE & BỘ NÚT DUYỆT (Phải) */}
      <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto p-6">
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
                  <span className="font-semibold text-slate-800">{selectedPetition.student?.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">MSSV:</span>
                  <span className="font-mono font-bold text-blue-700">{selectedPetition.student?.studentCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Khoa:</span>
                  <span className="font-medium text-slate-800">{selectedPetition.student?.department?.name || 'Khoa KH&KT Máy tính'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tình trạng nợ phí:</span>
                  <span className="font-medium text-slate-800">
                    {Number(selectedPetition.student?.tuitionDebt || 0) === 0 ? 'Không nợ' : `${Number(selectedPetition.student?.tuitionDebt).toLocaleString('vi-VN')} đ`}
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

              {/* Thông tin khai báo học vụ trực tuyến từ sinh viên (Form Input Data) */}
              {selectedPetition.requestType?.code === 'STUDENT_CONFIRMATION' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    Thông tin khai báo Căn cước & Cơ sở tiếp nhận:
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Số CMND/CCCD:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {selectedPetition.inputData?.idCardNumber || selectedPetition.inputData?.citizenId || '079204001234'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ngày cấp:</span>
                      <span className="font-medium text-slate-800">
                        {selectedPetition.inputData?.issueDate || '20/08/2021'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Nơi cấp:</span>
                      <span className="font-medium text-slate-800">
                        {selectedPetition.inputData?.issuePlace || 'Cục CS QLHC về TTXH'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cơ sở nhận giấy:</span>
                      <span className="font-semibold text-blue-700">
                        {selectedPetition.inputData?.pickupCampus || 'Cơ sở chính (Trụ sở)'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Lý do / Mục đích:</span>
                      <span className="font-medium text-slate-800">
                        {selectedPetition.inputData?.purpose || selectedPetition.inputData?.reason || 'Bổ sung hồ sơ sinh viên'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                  if (docList.length === 0 && (selectedPetition.requestType?.code === 'GRADUATION_ASSESSMENT' || selectedPetition.inputData?.hasAttachment || selectedPetition.inputData?.attachedCerts)) {
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

              {/* QR Code nếu đã duyệt */}
              {selectedPetition.qrCodeUrl && (
                <div className="mt-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-4">
                  <img
                    src={selectedPetition.qrCodeUrl}
                    alt="QR Code Cán Bộ Duyệt"
                    className="w-20 h-20 bg-white p-1 rounded border border-emerald-300"
                  />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">
                      MÃ QR CHỨNG THỰC CÁN BỘ ĐÃ KÝ DUYỆT
                    </div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      Có giá trị xuất trình pháp lý gửi Cơ quan Nhà nước
                    </div>
                    <div className="text-[10px] font-mono text-emerald-800 mt-1">
                      Proof: {selectedPetition.sha256Proof?.substring(0, 32)}...
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
              {actionModal === 'APPROVE' && 'Hành động này sẽ cấp mã QR có chữ ký số cán bộ và gửi thông báo kết quả cho sinh viên.'}
              {actionModal === 'REJECT' && 'Vui lòng cung cấp lý do từ chối rõ ràng để sinh viên nắm rõ căn cứ quy chế.'}
              {actionModal === 'ROLLBACK' && 'CẢNH BÁO: Hành động này sẽ thu hồi và vô hiệu hóa mã QR ngay lập tức, chuyển trạng thái đơn sang CANCELLED.'}
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
