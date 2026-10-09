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

  // Danh mục 5 Biểu mẫu Học vụ Thực tế HUTECH
  const HUTECH_FORMS = [
    { code: 'TAX_DEDUCTION', badge: 'DV-01', name: 'Giảm trừ gia cảnh (Thuế)', shortName: 'Thuế TNCN' },
    { code: 'BANK_LOAN', badge: 'DV-02', name: 'Vay vốn NHCSXH (Mẫu 01)', shortName: 'Vay vốn NHCS' },
    { code: 'MILITARY_DEFERMENT', badge: 'DV-03', name: 'Tạm hoãn Nghĩa vụ Quân sự', shortName: 'Tạm hoãn NVQS' },
    { code: 'COURSE_DEBT', badge: 'DV-04', name: 'Xác nhận nợ môn / hoàn thành chương trình', shortName: 'Mẫu nợ môn' },
    { code: 'GENERAL_CONFIRMATION', badge: 'DV-05', name: 'Mục đích chung (Xe buýt, Visa...)', shortName: 'Mục đích chung' },
  ];

  const [activeFormCode, setActiveFormCode] = useState(petitionType?.formCode || 'GENERAL_CONFIRMATION');

  useEffect(() => {
    if (petitionType?.formCode) {
      setActiveFormCode(petitionType.formCode);
    }
  }, [petitionType]);

  const initialFaculty = currentAccount.department || currentAccount.faculty || currentAccount.departmentName || 'Khoa Công nghệ thông tin';
  const initialMajor = currentAccount.major || (initialFaculty.startsWith('Khoa ') ? initialFaculty.replace('Khoa ', '') : initialFaculty);

  // State cho Form: Giấy Xác Nhận Sinh Viên (5 Biểu mẫu HUTECH)
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
    purpose: 'Làm vé tháng xe buýt và bổ sung hồ sơ học tập',
    recipientAgency: 'Ban Chỉ huy Quân sự Phường 25, Quận Bình Thạnh',
    permanentAddress: '180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
    debtCourses: 'Lập trình Web, Cơ sở dữ liệu',
    completionDeadline: 'Tháng 12/2026',
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
      let formDesc = 'Giấy xác nhận sinh viên';
      if (activeFormCode === 'TAX_DEDUCTION') {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}), xin cấp Giấy xác nhận giảm trừ gia cảnh thuế TNCN nộp ${confirmData.recipientAgency || 'Chi cục Thuế'}. Nơi nhận giấy: ${confirmData.pickupCampus}.`;
        formDesc = 'Đơn giảm trừ gia cảnh thuế TNCN';
      } else if (activeFormCode === 'BANK_LOAN') {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}), xin cấp Giấy xác nhận vay vốn Ngân hàng CSXH theo Mẫu 01 nộp ${confirmData.recipientAgency || 'NHCSXH'}. Địa chỉ thường trú: ${confirmData.permanentAddress}. Nơi nhận giấy: ${confirmData.pickupCampus}.`;
        formDesc = 'Giấy xác nhận vay vốn NHCSXH';
      } else if (activeFormCode === 'MILITARY_DEFERMENT') {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}), xin cấp Giấy chứng nhận tạm hoãn nghĩa vụ quân sự nộp ${confirmData.recipientAgency || 'Ban Chỉ huy Quân sự'}. Địa chỉ thường trú: ${confirmData.permanentAddress}. Nơi nhận giấy: ${confirmData.pickupCampus}.`;
        formDesc = 'Đơn tạm hoãn nghĩa vụ quân sự';
      } else if (activeFormCode === 'COURSE_DEBT') {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}), xin cấp Đơn xác nhận sinh viên còn nợ môn để bổ sung hồ sơ và hoàn thành học phần. Danh sách môn nợ: ${confirmData.debtCourses}. Thời hạn hoàn thành: ${confirmData.completionDeadline}. Nơi nhận giấy: ${confirmData.pickupCampus}.`;
        formDesc = 'Đơn xác nhận nợ môn / hoàn thành chương trình';
      } else {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}, Lớp: ${confirmData.studentClass}), xin cấp Giấy xác nhận sinh viên với lý do: "${confirmData.purpose}". Nơi nhận giấy: ${confirmData.pickupCampus}.`;
        formDesc = 'Giấy xác nhận sinh viên (mục đích chung)';
      }

      payload = {
        ...confirmData,
        formCode: activeFormCode,
        typeCode: 'STUDENT_CONFIRMATION',
        formDescription: formDesc,
      };
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
        const fullConfirmPayload = {
          ...confirmData,
          formCode: activeFormCode,
        };
        postData.append('formData', JSON.stringify(fullConfirmPayload));
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
          {/* MẪU HỌC VỤ: 5 BIỂU MẪU CHUẨN PHÒNG CTSV HUTECH */}
          {/* ========================================================================= */}
          {isConfirmForm && (
            <div className="space-y-4">
              {/* Tab Switcher 5 Biểu Mẫu Học Vụ Thực Tế */}
              <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 px-1">
                  Chọn biểu mẫu học vụ (5 Mẫu Thực Tế HUTECH):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                  {HUTECH_FORMS.map((hf) => {
                    const isActive = activeFormCode === hf.code;
                    return (
                      <button
                        key={hf.code}
                        type="button"
                        onClick={() => {
                          setActiveFormCode(hf.code);
                          if (hf.code === 'TAX_DEDUCTION') {
                            setConfirmData((prev) => ({ ...prev, recipientAgency: prev.recipientAgency || 'Chi cục Thuế Quận Bình Thạnh', purpose: 'Giảm trừ gia cảnh thuế TNCN' }));
                          } else if (hf.code === 'BANK_LOAN') {
                            setConfirmData((prev) => ({ ...prev, recipientAgency: prev.recipientAgency || 'Phòng giao dịch NHCSXH Quận Bình Thạnh', purpose: 'Vay vốn Ngân hàng Chính sách Xã hội' }));
                          } else if (hf.code === 'MILITARY_DEFERMENT') {
                            setConfirmData((prev) => ({ ...prev, recipientAgency: prev.recipientAgency || 'Ban Chỉ huy Quân sự Phường 25, Quận Bình Thạnh', purpose: 'Tạm hoãn nghĩa vụ quân sự' }));
                          } else if (hf.code === 'COURSE_DEBT') {
                            setConfirmData((prev) => ({ ...prev, purpose: 'Xác nhận còn nợ môn để kéo dài tiến độ đào tạo' }));
                          }
                        }}
                        className={`py-2 px-2 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                          isActive
                            ? 'bg-[#0B3B82] text-white border-[#082C64] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {hf.badge}
                        </span>
                        <span className="truncate max-w-full text-center leading-tight">{hf.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-center pb-2 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 tracking-wider uppercase">
                  {HUTECH_FORMS.find((f) => f.code === activeFormCode)?.name || 'GIẤY XÁC NHẬN SINH VIÊN'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quy chuẩn Phòng Công tác Sinh viên (CTSV) — Trường Đại học Công nghệ TP.HCM (HUTECH)
                </p>
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

              {/* CÁC TRƯỜNG ĐẶC THÙ THEO BIỂU MẪU ĐƯỢC CHỌN */}
              {activeFormCode === 'TAX_DEDUCTION' && (
                <div className="space-y-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200/80">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Cơ quan Thuế tiếp nhận :
                      <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-normal ml-1.5">Bắt buộc</span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.recipientAgency}
                      onChange={(e) => setConfirmData({ ...confirmData, recipientAgency: e.target.value })}
                      placeholder="VD: Chi cục Thuế Quận Bình Thạnh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-blue-600 focus:outline-hidden bg-white text-slate-800"
                    />
                  </div>
                  <p className="text-[10.5px] text-blue-700">
                    ℹ️ Giấy xác nhận giảm trừ gia cảnh thuế TNCN có thời hạn giá trị <strong>1 học kỳ</strong>.
                  </p>
                </div>
              )}

              {activeFormCode === 'BANK_LOAN' && (
                <div className="space-y-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Ngân hàng Chính sách Xã hội tiếp nhận :
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-normal ml-1.5">Mẫu 01/TDSV</span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.recipientAgency}
                      onChange={(e) => setConfirmData({ ...confirmData, recipientAgency: e.target.value })}
                      placeholder="VD: Phòng giao dịch NHCSXH Quận Bình Thạnh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-emerald-600 focus:outline-hidden bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Địa chỉ thường trú (4 cấp: Số nhà/Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP) :
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-normal ml-1.5">Quy chuẩn Title Case</span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.permanentAddress}
                      onChange={(e) => setConfirmData({ ...confirmData, permanentAddress: e.target.value })}
                      placeholder="VD: 180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-emerald-600 focus:outline-hidden bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}

              {activeFormCode === 'MILITARY_DEFERMENT' && (
                <div className="space-y-3 p-3 bg-rose-50/50 rounded-xl border border-rose-200/80">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Ban Chỉ huy Quân sự cấp Xã/Phường/Thị trấn tiếp nhận :
                      <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-normal ml-1.5">Hiệu lực 30 ngày</span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.recipientAgency}
                      onChange={(e) => setConfirmData({ ...confirmData, recipientAgency: e.target.value })}
                      placeholder="VD: Ban Chỉ huy Quân sự Phường 25, Quận Bình Thạnh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-rose-600 focus:outline-hidden bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Địa chỉ thường trú theo hộ khẩu :
                    </label>
                    <input
                      type="text"
                      value={confirmData.permanentAddress}
                      onChange={(e) => setConfirmData({ ...confirmData, permanentAddress: e.target.value })}
                      placeholder="VD: 180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-rose-600 focus:outline-hidden bg-white text-slate-800"
                    />
                  </div>
                  <p className="text-[10.5px] text-emerald-700">
                    💡 Sinh viên đang trong thời gian hoàn thành các học phần nợ có thể sử dụng Biểu mẫu Nợ môn để bổ sung hồ sơ học tập / nghĩa vụ.
                  </p>
                </div>
              )}

              {activeFormCode === 'COURSE_DEBT' && (
                <div className="space-y-3 p-3 bg-purple-50/50 rounded-xl border border-purple-200/80">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Danh sách học phần / môn học còn nợ :
                      <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-normal ml-1.5">Kèm thời hạn hoàn thành</span>
                    </label>
                    <textarea
                      rows={2}
                      value={confirmData.debtCourses}
                      onChange={(e) => setConfirmData({ ...confirmData, debtCourses: e.target.value })}
                      placeholder="VD: Lập trình Web, Cơ sở dữ liệu, Kiến trúc máy tính..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-purple-600 focus:outline-hidden resize-none bg-white font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Thời hạn dự kiến hoàn thành môn nợ :
                    </label>
                    <input
                      type="text"
                      value={confirmData.completionDeadline}
                      onChange={(e) => setConfirmData({ ...confirmData, completionDeadline: e.target.value })}
                      placeholder="VD: Tháng 12/2026 hoặc Học kỳ 1 năm học 2026-2027"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-purple-600 focus:outline-hidden bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}

              {activeFormCode === 'GENERAL_CONFIRMATION' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Mục đích xác nhận :</label>
                  <textarea
                    rows={2}
                    value={confirmData.purpose}
                    onChange={(e) => setConfirmData({ ...confirmData, purpose: e.target.value })}
                    placeholder="Vui lòng ghi rõ mục đích xác nhận (làm vé tháng xe buýt, xin visa du lịch, việc làm, bổ sung hồ sơ...)..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-hidden resize-none"
                  />
                </div>
              )}

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
