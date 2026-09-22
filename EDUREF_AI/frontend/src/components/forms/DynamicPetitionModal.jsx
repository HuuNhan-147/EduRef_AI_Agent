import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Trash2,
  Plus,
  HelpCircle,
  Building,
  GraduationCap,
  Award,
  Users,
  Check,
  Loader2,
  Eye,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import api, { DEMO_ACCOUNTS } from '../../services/api';

export default function DynamicPetitionModal({
  isOpen,
  onClose,
  petitionType,
  currentAccountKey,
  onSubmitToChat,
  onPetitionCreated
}) {
  if (!isOpen || !petitionType) return null;

  const currentAccount = DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;

  // Xác định mã thủ tục
  const isConfirmForm = petitionType.code === 'STUDENT_CONFIRMATION';
  const isGraduationForm = petitionType.code === 'GRADUATION_ASSESSMENT';

  // State cho Form 1: Giấy Xác Nhận Sinh Viên
  const [confirmData, setConfirmData] = useState({
    fullName: currentAccount.name || 'Cao Hữu Nhân',
    birthDate: currentAccount.birthDate || '26/07/2003',
    gender: currentAccount.gender || 'Nam',
    idCard: '079203001234',
    idCardDate: '2021-08-10',
    idCardPlace: 'Cục Cảnh sát QLHC về TTXH',
    major: currentAccount.major || 'Công nghệ thông tin',
    studentClass: currentAccount.class || '22DTHE4',
    studentCode: currentAccount.code || '2280602154',
    faculty: currentAccount.faculty || 'Khoa Công Nghệ Thông Tin',
    phone: currentAccount.phone || '0900000000',
    purpose: 'Xác nhận sinh viên để bổ sung hồ sơ học bổng và xin visa.',
    pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01,01)'
  });

  // State cho Form 2: Đơn Đề Nghị Xét Tốt Nghiệp
  const [gradData, setGradData] = useState({
    phone: currentAccount.phone || '0900000000',
    birthPlace: 'TP. Hồ Chí Minh',
    reason: 'Em đã hoàn thành toàn bộ chương trình đào tạo và các học phần thực tập tốt nghiệp, kính xin Hội đồng xét tốt nghiệp đợt này.',
    certificates: [],
  });

  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // States lưu trữ tệp minh chứng đính kèm (Mặc định ban đầu CHƯA ĐÍNH KÈM TỆP)
  const [attachedCerts, setAttachedCerts] = useState({
    b1: {
      previewUrl: null,
      fileName: null,
      attached: false,
    },
    teamwork: {
      previewUrl: null,
      fileName: null,
      attached: false,
    },
  });
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // Nạp ảnh mẫu thực tế HUTECH của SV Cao Hữu Nhân khi bấm nút "🧪 Nạp Mẫu HUTECH"
  const handleLoadSample = (type) => {
    if (type === 'b1') {
      setAttachedCerts((prev) => ({
        ...prev,
        b1: {
          previewUrl: '/demo_certs/hutech_b1_english.png',
          fileName: 'HUTECH_Chung_Chi_Tieng_Anh_B1.png',
          attached: true,
        },
      }));
      // Tự động nạp dòng chứng chỉ B1 vào bảng
      setGradData((prev) => {
        const b1Item = {
          id: 'b1_cert',
          certType: 'Chứng chỉ Ngoại ngữ: Tiếng Anh B1 (HUTECH)',
          certNumber: '0042066',
          bookNumber: 'DKC24B102677',
          issueDate: '2024-06-24',
          birthDateOnCert: '2003-07-26',
        };
        const exists = prev.certificates.some((c) => c.id === 'b1_cert' || c.certType.includes('Ngoại ngữ') || c.certType.includes('B1'));
        return {
          ...prev,
          certificates: exists
            ? prev.certificates.map((c) => (c.id === 'b1_cert' || c.certType.includes('Ngoại ngữ') || c.certType.includes('B1') ? b1Item : c))
            : [b1Item, ...prev.certificates],
        };
      });
    } else if (type === 'teamwork') {
      setAttachedCerts((prev) => ({
        ...prev,
        teamwork: {
          previewUrl: '/demo_certs/hutech_teamwork_skills.png',
          fileName: 'HUTECH_Chung_Chi_Ky_Nang_Nhom.png',
          attached: true,
        },
      }));
      // Tự động nạp dòng chứng chỉ Kỹ năng nhóm vào bảng
      setGradData((prev) => {
        const twItem = {
          id: 'tw_cert',
          certType: 'Chứng chỉ Kỹ năng: Giao tiếp & Làm việc nhóm (HUTECH)',
          certNumber: 'CC/ 0056999',
          bookNumber: 'DKC25KR07358',
          issueDate: '2025-09-19',
          birthDateOnCert: '2003-07-26',
        };
        const exists = prev.certificates.some((c) => c.id === 'tw_cert' || c.certType.includes('Kỹ năng'));
        return {
          ...prev,
          certificates: exists
            ? prev.certificates.map((c) => (c.id === 'tw_cert' || c.certType.includes('Kỹ năng') ? twItem : c))
            : [...prev.certificates, twItem],
        };
      });
    }
  };

  // Người dùng chọn tải ảnh minh chứng từ máy tính
  const handleFileUpload = (type, e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedCerts((prev) => ({
        ...prev,
        [type]: {
          previewUrl: reader.result,
          fileName: uploadedFile.name,
          attached: true,
        },
      }));

      // Tự động tạo dòng tương ứng trên bảng nhưng để trống ô số hiệu để người dùng nhập/sửa đối soát
      const certName = type === 'b1' ? 'Chứng chỉ Ngoại ngữ: Tiếng Anh B1' : 'Chứng chỉ Kỹ năng: Giao tiếp & Làm việc nhóm';
      const certId = `${type}_cert`;
      setGradData((prev) => {
        const exists = prev.certificates.some((c) => c.id === certId || (type === 'b1' ? c.certType.includes('B1') : c.certType.includes('Kỹ năng')));
        if (exists) {
          return {
            ...prev,
            certificates: prev.certificates.map((c) =>
              c.id === certId || (type === 'b1' ? c.certType.includes('B1') : c.certType.includes('Kỹ năng'))
                ? { ...c, certNumber: '', bookNumber: '' }
                : c
            ),
          };
        } else {
          return {
            ...prev,
            certificates: [
              ...prev.certificates,
              {
                id: certId,
                certType: certName,
                certNumber: '',
                bookNumber: '',
                issueDate: '',
                birthDateOnCert: '2003-07-26',
              },
            ],
          };
        }
      });
    };
    reader.readAsDataURL(uploadedFile);
  };

  // Thêm chứng chỉ cho Form xét tốt nghiệp
  const handleAddCertificate = () => {
    setGradData((prev) => ({
      ...prev,
      certificates: [
        ...prev.certificates,
        {
          id: Date.now(),
          certType: 'Chứng chỉ Giáo dục Quốc phòng',
          certNumber: '',
          bookNumber: '',
          issueDate: '',
          birthDateOnCert: '',
        },
      ],
    }));
  };

  // Xóa chứng chỉ
  const handleRemoveCertificate = (id) => {
    if (gradData.certificates.length <= 1) return;
    setGradData((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((c) => c.id !== id),
    }));
  };

  // Cập nhật từng ô chứng chỉ
  const handleCertFieldChange = (id, field, value) => {
    setGradData((prev) => ({
      ...prev,
      certificates: prev.certificates.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  // Nộp qua AI Chat
  const handleSubmitToAgent = () => {
    let prompt = '';
    let payload = {};

    if (isConfirmForm) {
      prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}, Lớp: ${confirmData.studentClass}), xin cấp ${petitionType.name} với lý do: "${confirmData.purpose}". Nơi nhận giấy: ${confirmData.pickupCampus}. Số CCCD: ${confirmData.idCard}.`;
      payload = { ...confirmData, typeCode: 'STUDENT_CONFIRMATION' };
    } else if (isGraduationForm) {
      const certCount = gradData.certificates.length;
      const certDetails = certCount > 0 
        ? gradData.certificates.map((c) => `${c.certType}: Số hiệu ${c.certNumber || '(chưa nhập)'}, Số vào sổ ${c.bookNumber || '(chưa nhập)'}`).join('; ')
        : 'chưa khai báo chi tiết mã số trên bảng';
      prompt = `Em là ${currentAccount.name} (${currentAccount.code}), nộp đơn đề nghị xét tốt nghiệp. Nơi sinh: ${gradData.birthPlace}, SĐT: ${gradData.phone}. Em đính kèm ${certCount} chứng chỉ chuẩn đầu ra (${certDetails}) kèm ảnh scan minh chứng để Thầy/Cô và AI thẩm định.`;
      payload = {
        ...gradData,
        typeCode: 'GRADUATION_ASSESSMENT',
        attachedCerts: {
          b1: {
            attached: !!attachedCerts.b1.previewUrl,
            previewUrl: attachedCerts.b1.previewUrl,
            fileName: attachedCerts.b1.fileName || 'HUTECH_Chung_Chi_Tieng_Anh_B1.png',
          },
          teamwork: {
            attached: !!attachedCerts.teamwork.previewUrl,
            previewUrl: attachedCerts.teamwork.previewUrl,
            fileName: attachedCerts.teamwork.fileName || 'HUTECH_Chung_Chi_Ky_Nang_Nhom.png',
          },
        },
      };
    } else {
      prompt = `Em là ${currentAccount.name} (${currentAccount.code}), muốn xin nộp ${petitionType.name}`;
      payload = { typeCode: petitionType.code };
    }

    if (onSubmitToChat) {
      onSubmitToChat(prompt, { file, inputData: payload, typeCode: petitionType.code, attachedCerts: payload.attachedCerts });
    }
    onClose();
  };

  // Nộp trực tiếp vào hệ thống Workflow
  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const postData = new FormData();
      postData.append('typeCode', petitionType.code);
      postData.append('studentCode', currentAccount.code);

      if (isConfirmForm) {
        postData.append('formData', JSON.stringify(confirmData));
        postData.append('reason', confirmData.purpose);
      } else if (isGraduationForm) {
        const gradPayload = {
          ...gradData,
          certificates: gradData.certificates,
          attachedCerts: {
            b1: {
              attached: !!attachedCerts.b1.previewUrl,
              previewUrl: attachedCerts.b1.previewUrl,
              fileName: attachedCerts.b1.fileName || 'HUTECH_Chung_Chi_Tieng_Anh_B1.png',
            },
            teamwork: {
              attached: !!attachedCerts.teamwork.previewUrl,
              previewUrl: attachedCerts.teamwork.previewUrl,
              fileName: attachedCerts.teamwork.fileName || 'HUTECH_Chung_Chi_Ky_Nang_Nhom.png',
            },
          },
        };
        postData.append('formData', JSON.stringify(gradPayload));
        postData.append('reason', gradData.reason);
      } else {
        postData.append('formData', JSON.stringify({}));
        postData.append('reason', petitionType.name);
      }

      if (file) {
        postData.append('document', file);
      }

      const res = await api.post('/petitions', postData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const petitionRes = res.data.data;
        // Nếu AI phát hiện hồ sơ thiếu dữ kiện, ảnh mờ, hoặc đối soát số hiệu/số vào sổ bị lệch:
        if (petitionRes?.status === 'WAITING_STUDENT' || petitionRes?.decision === 'ASK_CLARIFICATION') {
          setErrorMsg(petitionRes.actionableQuestion || petitionRes.escalationReason || petitionRes.message || 'Hồ sơ cần chỉnh sửa thông tin hoặc đính kèm ảnh rõ nét.');
          return;
        }

        if (onPetitionCreated) {
          onPetitionCreated(petitionRes);
        }
        onClose();
      } else {
        setErrorMsg(res.data?.message || 'Có lỗi xảy ra khi nộp đơn.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className={`bg-white rounded-xl shadow-2xl border border-slate-200 w-full ${isGraduationForm ? 'max-w-5xl' : 'max-w-3xl'} overflow-hidden flex flex-col max-h-[92vh]`}>
        
        {/* Modal Top Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isConfirmForm ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              {isConfirmForm ? <FileText className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {isConfirmForm ? 'GIẤY XÁC NHẬN' : 'NHẬP THÔNG TIN ĐƠN/PHIẾU — ĐƠN ĐỀ NGHỊ XÉT TỐT NGHIỆP'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">Mã thủ tục: {petitionType.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MẪU 1: GIẤY XÁC NHẬN (Ảnh 1) */}
          {/* ========================================================================= */}
          {isConfirmForm && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 tracking-wider">GIẤY XÁC NHẬN</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Dành cho sinh viên bổ sung hồ sơ, xin visa, học bổng, vay vốn, tạm hoãn NVQS</p>
              </div>

              {/* Grid 3 cột thông tin */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Họ tên :</label>
                  <input
                    type="text"
                    disabled
                    value={confirmData.fullName}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ngày sinh :</label>
                  <input
                    type="text"
                    value={confirmData.birthDate}
                    onChange={(e) => setConfirmData({ ...confirmData, birthDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Giới tính :</label>
                  <select
                    value={confirmData.gender}
                    onChange={(e) => setConfirmData({ ...confirmData, gender: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              {/* Grid CMND/CCCD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Số CMND/CCCD :</label>
                  <input
                    type="text"
                    value={confirmData.idCard}
                    onChange={(e) => setConfirmData({ ...confirmData, idCard: e.target.value })}
                    placeholder="Nhập số CCCD 12 số..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ngày cấp CMND/CCCD :</label>
                  <input
                    type="date"
                    value={confirmData.idCardDate}
                    onChange={(e) => setConfirmData({ ...confirmData, idCardDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nơi cấp CMND/CCCD :</label>
                  <input
                    type="text"
                    value={confirmData.idCardPlace}
                    onChange={(e) => setConfirmData({ ...confirmData, idCardPlace: e.target.value })}
                    placeholder="VD: Cục Cảnh sát QLHC về TTXH"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Ngành học */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ngành học :</label>
                <input
                  type="text"
                  disabled
                  value={confirmData.major}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700"
                />
              </div>

              {/* Lớp & MSSV */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Lớp học :</label>
                  <input
                    type="text"
                    disabled
                    value={confirmData.studentClass}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Mã số SV :</label>
                  <input
                    type="text"
                    disabled
                    value={confirmData.studentCode}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 font-bold text-blue-700 font-mono"
                  />
                </div>
              </div>

              {/* Khoa/viện */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Khoa/viện :</label>
                <input
                  type="text"
                  disabled
                  value={confirmData.faculty}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700"
                />
              </div>

              {/* Điện thoại */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Điện thoại :</label>
                <input
                  type="text"
                  value={confirmData.phone}
                  onChange={(e) => setConfirmData({ ...confirmData, phone: e.target.value })}
                  placeholder="Nhập số điện thoại..."
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              {/* Lý do xác nhận */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Lý do xác nhận :</label>
                <textarea
                  rows={3}
                  value={confirmData.purpose}
                  onChange={(e) => setConfirmData({ ...confirmData, purpose: e.target.value })}
                  placeholder="Vui lòng ghi rõ lý do xác nhận (bổ sung hồ sơ, xin visa, học bổng, vay vốn ngân hàng...)..."
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden resize-none"
                />
              </div>

              {/* Chọn cơ sở nhận giấy */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  Chọn cơ sở nhận giấy :
                </label>
                <select
                  value={confirmData.pickupCampus}
                  onChange={(e) => setConfirmData({ ...confirmData, pickupCampus: e.target.value })}
                  className="w-full px-2.5 py-2 rounded border border-blue-300 bg-blue-50/40 text-blue-900 font-medium focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="Trụ sở chính: phòng Công tác sinh viên (A-01,01)">
                    Trụ sở chính: phòng Công tác sinh viên (A-01,01)
                  </option>
                  <option value="Cơ sở E: Phòng Công tác Sinh viên (E1-01.08)">
                    Cơ sở E: Phòng Công tác Sinh viên (E1-01.08)
                  </option>
                </select>
              </div>

              {/* Banner lưu ý chân trang */}
              <div className="p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 border border-slate-200">
                Mọi thắc mắc vui lòng liên hệ Phòng Công tác Sinh viên. Số điện thoại: 028.38647256 - 028.38647257.
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MẪU 2: ĐƠN ĐỀ NGHỊ XÉT TỐT NGHIỆP (Ảnh 2) */}
          {/* ========================================================================= */}
          {isGraduationForm && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  THÔNG TIN ĐƠN/PHIẾU
                </h4>
              </div>

              {/* Số điện thoại liên hệ * */}
              <div>
                <label className="text-xs font-semibold text-rose-600 block mb-1">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="text"
                  value={gradData.phone}
                  onChange={(e) => setGradData({ ...gradData, phone: e.target.value })}
                  placeholder="Sinh viên vui lòng nhập số điện thoại liên hệ"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-rose-50/20 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              {/* Nơi sinh * */}
              <div>
                <label className="text-xs font-semibold text-rose-600 block mb-1">
                  Nơi sinh *
                </label>
                <input
                  type="text"
                  value={gradData.birthPlace}
                  onChange={(e) => setGradData({ ...gradData, birthPlace: e.target.value })}
                  placeholder="Sinh viên vui lòng nhập nơi sinh"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-rose-50/20 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              {/* Lý do xin đề nghị xét tốt nghiệp * */}
              <div>
                <label className="text-xs font-semibold text-rose-600 block mb-1">
                  Lý do xin đề nghị xét tốt nghiệp *
                </label>
                <textarea
                  rows={2}
                  value={gradData.reason}
                  onChange={(e) => setGradData({ ...gradData, reason: e.target.value })}
                  placeholder="Sinh viên vui lòng nhập lý do xin đề nghị xét tốt nghiệp"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-rose-50/20 focus:border-blue-600 focus:outline-hidden resize-none"
                />
              </div>

              {/* KHỐI BẢNG CHỨNG CHỈ */}
              <div className="pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    DANH SÁCH CHỨNG CHỈ NỘP ĐƠN XÉT TỐT NGHIỆP
                  </h4>
                </div>

                {/* Hộp hướng dẫn màu đỏ theo ảnh */}
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div className="text-rose-600 font-medium">
                    <p className="font-semibold">Số vào sổ và số hiệu phải nhập đầy đủ cả phần chữ và phần số, Ví dụ:</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Số hiệu <span className="font-mono font-bold text-slate-800">A2532654</span> &nbsp;|&nbsp; 
                      Số vào sổ <span className="font-mono font-bold text-slate-800">TA-B-16/2356</span> hoặc Số vào sổ <span className="font-mono font-bold text-slate-800">DKC17NN00001</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('Hướng dẫn: Sinh viên cần kiểm tra kỹ số hiệu và số vào sổ in trên góc phải hoặc mặt sau của Chứng chỉ.')}
                    className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-semibold text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Hướng dẫn
                  </button>
                </div>

                {/* BẢNG CHỨNG CHỈ */}
                <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-xs">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-[#2c408b] text-white">
                        <th className="py-2.5 px-2 text-center w-10 border-r border-blue-800 font-bold">STT</th>
                        <th className="py-2.5 px-3 border-r border-blue-800 font-bold min-w-[180px]">LOẠI CHỨNG CHỈ</th>
                        <th className="py-2.5 px-3 border-r border-blue-800 font-bold min-w-[110px]">SỐ HIỆU</th>
                        <th className="py-2.5 px-3 border-r border-blue-800 font-bold min-w-[120px]">SỐ VÀO SỔ</th>
                        <th className="py-2.5 px-3 border-r border-blue-800 font-bold min-w-[110px]">NGÀY CẤP</th>
                        <th className="py-2.5 px-3 border-r border-blue-800 font-bold min-w-[120px]">NGÀY SINH TRÊN CHỨNG CHỈ</th>
                        <th className="py-2.5 px-2 text-center w-10 font-bold">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {gradData.certificates.map((cert, index) => (
                        <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-2 text-center font-bold text-slate-500">{index + 1}</td>
                          <td className="py-2 px-2">
                            <select
                              value={cert.certType}
                              onChange={(e) => handleCertFieldChange(cert.id, 'certType', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] bg-white"
                            >
                              <option value="Chứng chỉ Ngoại ngữ (TOEIC/IELTS)">Chứng chỉ Ngoại ngữ (TOEIC/IELTS)</option>
                              <option value="Chứng chỉ Tin học (MOS/IC3)">Chứng chỉ Tin học (MOS/IC3)</option>
                              <option value="Chứng chỉ Giáo dục Quốc phòng">Chứng chỉ Giáo dục Quốc phòng</option>
                              <option value="Chứng chỉ Giáo dục Thể chất">Chứng chỉ Giáo dục Thể chất</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={cert.certNumber}
                              onChange={(e) => handleCertFieldChange(cert.id, 'certNumber', e.target.value)}
                              placeholder="VD: A2532654"
                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={cert.bookNumber}
                              onChange={(e) => handleCertFieldChange(cert.id, 'bookNumber', e.target.value)}
                              placeholder="VD: TA-B-16/2356"
                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="date"
                              value={cert.issueDate}
                              onChange={(e) => handleCertFieldChange(cert.id, 'issueDate', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="date"
                              value={cert.birthDateOnCert}
                              onChange={(e) => handleCertFieldChange(cert.id, 'birthDateOnCert', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveCertificate(cert.id)}
                              disabled={gradData.certificates.length <= 1}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Nút thêm thông tin chứng chỉ (xanh lá nhạt theo ảnh) */}
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleAddCertificate}
                    className="px-4 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-md font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm thông tin chứng chỉ
                  </button>
                </div>

                {/* KHU VỰC ĐÍNH KÈM MINH CHỨNG CHỨNG CHỈ */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-blue-100 text-blue-700">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          Minh Chứng Chuẩn Đầu Ra (Bản Scan / Ảnh Chụp Đối Soát)
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Đính kèm ảnh chứng chỉ thực tế có mộc đỏ để Hội đồng đối soát. EduRef AI sẽ tự động thẩm định format hồ sơ ngay khi bạn nộp đơn.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 2 Thẻ Minh Chứng: B1 và Làm việc nhóm */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    
                    {/* THẺ 1: TIẾNG ANH B1 */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      attachedCerts.b1.attached 
                        ? 'bg-blue-50/40 border-blue-300 shadow-xs' 
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-2.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                          <Award className="w-4 h-4 text-blue-600" />
                          <span>1. Chuẩn Ngoại ngữ: Tiếng Anh B1</span>
                        </div>
                        {attachedCerts.b1.attached ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Đã đính kèm tệp
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                            Chưa đính kèm
                          </span>
                        )}
                      </div>

                      {/* Các nút bấm tải ảnh / nạp mẫu nhanh */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <input
                          type="file"
                          id="upload-b1-file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('b1', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="upload-b1-file"
                          className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <Upload className="w-3 h-3 text-slate-500" />
                          Chọn từ máy
                        </label>

                        <button
                          type="button"
                          onClick={() => handleLoadSample('b1')}
                          className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold text-blue-800 flex items-center gap-1 transition-colors"
                        >
                          🧪 Nạp Mẫu HUTECH
                        </button>
                      </div>

                      {/* Khung hiển thị Thumbnail & Thông tin minh chứng */}
                      {attachedCerts.b1.previewUrl ? (
                        <div className="flex gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                          <div className="relative group shrink-0">
                            <img
                              src={attachedCerts.b1.previewUrl}
                              alt="Chứng chỉ B1"
                              className="w-16 h-22 object-cover rounded border border-slate-300 shadow-2xs cursor-pointer"
                              onClick={() => setPreviewModalImg(attachedCerts.b1.previewUrl)}
                            />
                            <div
                              onClick={() => setPreviewModalImg(attachedCerts.b1.previewUrl)}
                              className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center text-white cursor-pointer transition-opacity"
                            >
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="font-semibold text-slate-800 text-xs truncate">
                              {attachedCerts.b1.fileName || 'HUTECH_Chung_Chi_Tieng_Anh_B1.png'}
                            </div>
                            <div className="text-slate-600 flex items-center justify-between">
                              <span>Số hiệu trong đơn:</span>
                              <span className="font-mono font-bold text-rose-600">
                                {gradData.certificates[0]?.certNumber || 'Chưa nhập'}
                              </span>
                            </div>
                            <div className="text-slate-600 flex items-center justify-between">
                              <span>Số vào sổ:</span>
                              <span className="font-mono font-bold text-blue-700">
                                {gradData.certificates[0]?.bookNumber || 'Chưa nhập'}
                              </span>
                            </div>
                            <div className="text-slate-500 flex items-center justify-between text-[10px] pt-0.5">
                              <span>Ngày cấp: {gradData.certificates[0]?.issueDate || 'Chưa chọn'}</span>
                              <button
                                type="button"
                                onClick={() => setPreviewModalImg(attachedCerts.b1.previewUrl)}
                                className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                              >
                                <Eye className="w-3 h-3" /> Xem ảnh
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-[11px] bg-white">
                          Chưa có ảnh chứng chỉ B1. Bấm nút chọn từ máy hoặc nạp mẫu nhanh.
                        </div>
                      )}
                    </div>

                    {/* THẺ 2: KỸ NĂNG LÀM VIỆC NHÓM */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      attachedCerts.teamwork.attached 
                        ? 'bg-indigo-50/40 border-indigo-300 shadow-xs' 
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-2.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>2. Chuẩn Kỹ năng: Làm việc nhóm</span>
                        </div>
                        {attachedCerts.teamwork.attached ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Đã đính kèm tệp
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                            Chưa đính kèm
                          </span>
                        )}
                      </div>

                      {/* Các nút bấm tải ảnh / nạp mẫu nhanh */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <input
                          type="file"
                          id="upload-teamwork-file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('teamwork', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="upload-teamwork-file"
                          className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <Upload className="w-3 h-3 text-slate-500" />
                          Chọn từ máy
                        </label>

                        <button
                          type="button"
                          onClick={() => handleLoadSample('teamwork')}
                          className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-bold text-indigo-800 flex items-center gap-1 transition-colors"
                        >
                          🧪 Nạp Mẫu HUTECH
                        </button>
                      </div>

                      {/* Khung hiển thị Thumbnail & Thông tin minh chứng */}
                      {attachedCerts.teamwork.previewUrl ? (
                        <div className="flex gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                          <div className="relative group shrink-0">
                            <img
                              src={attachedCerts.teamwork.previewUrl}
                              alt="Chứng chỉ Làm việc nhóm"
                              className="w-16 h-22 object-cover rounded border border-slate-300 shadow-2xs cursor-pointer"
                              onClick={() => setPreviewModalImg(attachedCerts.teamwork.previewUrl)}
                            />
                            <div
                              onClick={() => setPreviewModalImg(attachedCerts.teamwork.previewUrl)}
                              className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center text-white cursor-pointer transition-opacity"
                            >
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="font-semibold text-slate-800 text-xs truncate">
                              {attachedCerts.teamwork.fileName || 'HUTECH_Chung_Chi_Ky_Nang_Nhom.png'}
                            </div>
                            <div className="text-slate-600 flex items-center justify-between">
                              <span>Số hiệu trong đơn:</span>
                              <span className="font-mono font-bold text-rose-600">
                                {gradData.certificates[1]?.certNumber || 'Chưa nhập'}
                              </span>
                            </div>
                            <div className="text-slate-600 flex items-center justify-between">
                              <span>Số vào sổ:</span>
                              <span className="font-mono font-bold text-indigo-700">
                                {gradData.certificates[1]?.bookNumber || 'Chưa nhập'}
                              </span>
                            </div>
                            <div className="text-slate-500 flex items-center justify-between text-[10px] pt-0.5">
                              <span>Ngày cấp: {gradData.certificates[1]?.issueDate || 'Chưa chọn'}</span>
                              <button
                                type="button"
                                onClick={() => setPreviewModalImg(attachedCerts.teamwork.previewUrl)}
                                className="text-indigo-600 hover:underline font-semibold flex items-center gap-0.5"
                              >
                                <Eye className="w-3 h-3" /> Xem ảnh
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-[11px] bg-white">
                          Chưa có ảnh chứng chỉ Kỹ năng nhóm. Bấm chọn từ máy hoặc nạp mẫu nhanh.
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSubmitToAgent}
              className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Gửi qua Trợ lý AI
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDirectSubmit}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 ${isConfirmForm ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-700 hover:bg-blue-800'}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Đang gửi...' : isConfirmForm ? 'Nộp giấy xác nhận' : 'Nộp đơn đề nghị xét tốt nghiệp'}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal xem ảnh chứng chỉ phóng to */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-900/70 text-white rounded-full hover:bg-slate-900 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewModalImg}
              alt="Phóng to chứng chỉ"
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
