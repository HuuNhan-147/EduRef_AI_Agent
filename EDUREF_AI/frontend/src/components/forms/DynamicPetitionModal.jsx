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
  customProfile = null,
  onSubmitToChat,
  onPetitionCreated
}) {
  // Lấy hồ sơ ưu tiên: nếu chọn CUSTOM_STUDENT thì lấy customProfile hoặc đọc từ localStorage
  const getEffectiveAccount = () => {
    if (currentAccountKey === 'CUSTOM_STUDENT') {
      if (customProfile) return customProfile;
      try {
        const raw = localStorage.getItem('eduref_custom_student') || localStorage.getItem('customProfile');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
    }
    return DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  };

  const currentAccount = getEffectiveAccount();

  // Xác định mã thủ tục
  const isConfirmForm = petitionType?.code === 'STUDENT_CONFIRMATION';
  const isGraduationForm = false;

  const initialFaculty = currentAccount.department || currentAccount.faculty || currentAccount.departmentName || 'Khoa Công nghệ thông tin';
  const initialMajor = currentAccount.major || (initialFaculty.startsWith('Khoa ') ? initialFaculty.replace('Khoa ', '') : initialFaculty);

  // State cho Form 1: Giấy Xác Nhận Sinh Viên
  const [confirmData, setConfirmData] = useState({
    fullName: currentAccount.name || currentAccount.fullName || 'Cao Hữu Nhân',
    birthDate: currentAccount.birthDate || '26/07/2003',
    gender: currentAccount.gender || 'Nam',
    idCard: currentAccount.idCard || '079203001234',
    idCardDate: currentAccount.idCardDate || '2021-08-10',
    idCardPlace: currentAccount.idCardPlace || 'Cục Cảnh sát QLHC về TTXH',
    major: initialMajor,
    studentClass: currentAccount.studentClass || currentAccount.class || '22DTHE4',
    studentCode: currentAccount.code || currentAccount.studentCode || '2280602154',
    faculty: initialFaculty,
    phone: currentAccount.phone || '0901234567',
    purpose: 'Xác nhận sinh viên để bổ sung hồ sơ học bổng và xin visa.',
    pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01,01)'
  });

  // Tự động đồng bộ thông tin của sinh viên đang chọn khi mở form
  useEffect(() => {
    if (isOpen) {
      const acc = getEffectiveAccount();
      const activeFaculty = acc?.department || acc?.faculty || acc?.departmentName || 'Khoa Công nghệ thông tin';
      const activeMajor = acc?.major || (activeFaculty.startsWith('Khoa ') ? activeFaculty.replace('Khoa ', '') : activeFaculty);

      setConfirmData((prev) => ({
        ...prev,
        fullName: acc?.name || acc?.fullName || prev.fullName,
        studentCode: acc?.code || acc?.studentCode || prev.studentCode,
        faculty: activeFaculty,
        major: activeMajor,
        studentClass: acc?.studentClass || acc?.class || prev.studentClass || '22DTHA1',
        phone: acc?.phone || prev.phone || '0901234567',
        birthDate: acc?.birthDate || prev.birthDate || '26/07/2003',
        gender: acc?.gender || prev.gender || 'Nam',
        idCard: acc?.idCard || prev.idCard || '079203001234',
        idCardDate: acc?.idCardDate || prev.idCardDate || '2021-08-10',
        idCardPlace: acc?.idCardPlace || prev.idCardPlace || 'Cục Cảnh sát QLHC về TTXH',
      }));
    }
  }, [isOpen, currentAccountKey, customProfile]);

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

  if (!isOpen || !petitionType) return null;

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
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isConfirmForm ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                'GIẤY XÁC NHẬN SINH VIÊN'
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
              <div className="space-y-1.5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Số CMND/CCCD :
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-normal border border-amber-200 ml-1.5">
                        Giả định
                      </span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.idCard}
                      onChange={(e) => setConfirmData({ ...confirmData, idCard: e.target.value })}
                      placeholder="Nhập số CCCD 12 số..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Ngày cấp CMND/CCCD :
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-normal border border-amber-200 ml-1.5">
                        Giả định
                      </span>
                    </label>
                    <input
                      type="date"
                      value={confirmData.idCardDate}
                      onChange={(e) => setConfirmData({ ...confirmData, idCardDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Nơi cấp CMND/CCCD :
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-normal border border-amber-200 ml-1.5">
                        Giả định
                      </span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.idCardPlace}
                      onChange={(e) => setConfirmData({ ...confirmData, idCardPlace: e.target.value })}
                      placeholder="VD: Cục Cảnh sát QLHC về TTXH"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
                <p className="text-[10.5px] text-amber-700 bg-amber-50/80 border border-amber-200/70 rounded px-2.5 py-1 flex items-center gap-1.5">
                  <span>💡</span>
                  <span><strong>Lưu ý:</strong> Thông tin CMND/CCCD trên được điền sẵn theo dữ liệu giả định, bạn có thể chỉnh sửa tự do theo thực tế.</span>
                </p>
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
                    value={confirmData.studentClass}
                    onChange={(e) => setConfirmData({ ...confirmData, studentClass: e.target.value })}
                    placeholder="VD: 22DTHA1"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden text-slate-800 font-mono uppercase"
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
              {isSubmitting ? 'Đang gửi...' : 'Nộp giấy xác nhận'}
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
