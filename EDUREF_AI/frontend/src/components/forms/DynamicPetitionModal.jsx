import { useState, useEffect } from "react";
import { X, FileText, Sparkles, AlertCircle, CheckCircle2, Building, RotateCcw } from "lucide-react";
import api, { DEMO_ACCOUNTS } from '../../services/api';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { CONFIRMATION_FORMS, FORM_AGENCY_DEFAULTS, SAMPLE_CONFIRMATION_DATA, buildConfirmationInput } from '../../config/confirmationForms';

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
  const [activeFormCode, setActiveFormCode] = useState(petitionType?.formCode || 'GENERAL_CONFIRMATION');

  const getFacultyString = (val) => {
    if (typeof val === 'string') return val;
    return val?.name || 'Khoa Công nghệ thông tin';
  };

  // Helper sinh dữ liệu mẫu đầy đủ cho biểu mẫu được chọn
  const getPrefilledConfirmData = (formCode, account) => {
    const acc = account || getEffectiveAccount();
    const activeFaculty = getFacultyString(acc?.department || acc?.faculty || acc?.departmentName);
    const activeMajor = acc?.major || (activeFaculty && typeof activeFaculty === 'string' && activeFaculty.startsWith('Khoa ') ? activeFaculty.replace('Khoa ', '') : activeFaculty);
    const sampleByForm = SAMPLE_CONFIRMATION_DATA.defaultsByForm[formCode] || {};

    return {
      fullName: acc?.name || acc?.fullName || 'Nguyễn Văn An',
      studentCode: acc?.code || acc?.studentCode || '2380600001',
      birthDate: acc?.birthDate || '15/03/2004',
      gender: acc?.gender || 'Nam',
      idCard: acc?.idCard || SAMPLE_CONFIRMATION_DATA.idCard,
      idCardDate: acc?.idCardDate || SAMPLE_CONFIRMATION_DATA.idCardDate,
      idCardPlace: acc?.idCardPlace || SAMPLE_CONFIRMATION_DATA.idCardPlace,
      faculty: activeFaculty || 'Khoa Công nghệ thông tin',
      major: activeMajor || 'Công nghệ thông tin',
      studentClass: acc?.studentClass || acc?.class || '23DTHE1',
      phone: acc?.phone || SAMPLE_CONFIRMATION_DATA.phone,
      permanentAddress: acc?.permanentAddress || sampleByForm.permanentAddress || SAMPLE_CONFIRMATION_DATA.permanentAddress,
      purpose: sampleByForm.purpose || 'Làm vé tháng xe buýt và bổ sung hồ sơ học tập',
      recipientAgency: sampleByForm.recipientAgency || FORM_AGENCY_DEFAULTS[formCode] || '',
      debtCourses: acc?.debtCourses || sampleByForm.debtCourses || (formCode === 'COURSE_DEBT' ? SAMPLE_CONFIRMATION_DATA.debtCourses : ''),
      completionDeadline: sampleByForm.completionDeadline || SAMPLE_CONFIRMATION_DATA.completionDeadline,
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    };
  };

  // State cho Form: Giấy Xác Nhận Sinh Viên (5 Biểu mẫu HUTECH)
  const [confirmData, setConfirmData] = useState(() =>
    getPrefilledConfirmData(petitionType?.formCode || 'GENERAL_CONFIRMATION', currentAccount)
  );

  useEffect(() => {
    if (petitionType?.formCode) {
      const code = petitionType.formCode;
      setActiveFormCode(code);
      setConfirmData(getPrefilledConfirmData(code, getEffectiveAccount()));
    }
  }, [petitionType]);

  // Tự động đồng bộ và điền đầy đủ dữ liệu mẫu của sinh viên khi mở form
  useEffect(() => {
    if (isOpen) {
      setConfirmData(getPrefilledConfirmData(activeFormCode, getEffectiveAccount()));
    }
  }, [isOpen, currentAccountKey, customProfile]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !petitionType) return null;

  // Nộp qua AI Chat với đầy đủ 100% dữ kiện chuẩn hóa
  const handleSubmitToAgent = () => {
    let prompt = '';
    let payload = {};

    if (isConfirmForm) {
      let formDesc = 'Giấy xác nhận sinh viên';
      if (activeFormCode === 'TAX_DEDUCTION') {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}, Lớp: ${confirmData.studentClass}), xin cấp Giấy xác nhận giảm trừ gia cảnh thuế TNCN nộp ${confirmData.recipientAgency || 'Chi cục Thuế'}. Địa chỉ thường trú: ${confirmData.permanentAddress}; SĐT: ${confirmData.phone}; Cơ sở nhận bản cứng: ${confirmData.pickupCampus}.`;
        formDesc = 'Đơn giảm trừ gia cảnh thuế TNCN';
      } else if (activeFormCode === 'BANK_LOAN') {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}, Lớp: ${confirmData.studentClass}), xin cấp Giấy xác nhận vay vốn Ngân hàng CSXH theo Mẫu 01 nộp ${confirmData.recipientAgency || 'NHCSXH'}. Địa chỉ thường trú: ${confirmData.permanentAddress}; CCCD: ${confirmData.idCard}; SĐT: ${confirmData.phone}; Cơ sở nhận bản cứng: ${confirmData.pickupCampus}.`;
        formDesc = 'Giấy xác nhận vay vốn NHCSXH';
      } else if (activeFormCode === 'MILITARY_DEFERMENT') {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}, Lớp: ${confirmData.studentClass}), xin cấp Giấy chứng nhận tạm hoãn nghĩa vụ quân sự nộp ${confirmData.recipientAgency || 'Ban Chỉ huy Quân sự'}. Địa chỉ thường trú: ${confirmData.permanentAddress}; SĐT: ${confirmData.phone}; CCCD: ${confirmData.idCard}; Cơ sở nhận bản cứng: ${confirmData.pickupCampus}.`;
        formDesc = 'Đơn tạm hoãn nghĩa vụ quân sự';
      } else if (activeFormCode === 'COURSE_DEBT') {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}, Lớp: ${confirmData.studentClass}), xin cấp Đơn xác nhận sinh viên còn nợ môn để bổ sung hồ sơ và hoàn thành học phần. Danh sách môn nợ: ${confirmData.debtCourses}; Thời hạn hoàn thành: ${confirmData.completionDeadline}; Địa chỉ thường trú: ${confirmData.permanentAddress}; SĐT: ${confirmData.phone}; Cơ sở nhận bản cứng: ${confirmData.pickupCampus}.`;
        formDesc = 'Đơn xác nhận nợ môn / hoàn thành chương trình';
      } else {
        prompt = `Em là ${confirmData.fullName} (MSSV: ${confirmData.studentCode}, Lớp: ${confirmData.studentClass}), xin cấp Giấy xác nhận sinh viên với mục đích: "${confirmData.purpose}". Nơi nộp: ${confirmData.recipientAgency || 'Cơ quan liên quan'}; SĐT: ${confirmData.phone}; Cơ sở nhận bản cứng: ${confirmData.pickupCampus}.`;
        formDesc = 'Giấy xác nhận sinh viên (mục đích chung)';
      }

      payload = {
        ...buildConfirmationInput(activeFormCode, confirmData),
        typeCode: 'STUDENT_CONFIRMATION',
        formDescription: formDesc,
      };
    } else {
      prompt = `Em là ${currentAccount.name} (${currentAccount.code}), muốn xin nộp ${petitionType.name}`;
      payload = { typeCode: petitionType.code };
    }

    if (onSubmitToChat) {
      onSubmitToChat(prompt, { inputData: payload, typeCode: petitionType.code });
    }
    onClose();
  };

  // Nộp trực tiếp vào hệ thống Workflow
  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await api.post('/petitions', {
        requestTypeCode: petitionType.code,
        studentCode: currentAccount.code || currentAccount.studentCode,
        inputData: buildConfirmationInput(activeFormCode, confirmData),
      });

      if (res.data?.success) {
        const petitionRes = res.data.data;
        // Nếu backend yêu cầu bổ sung dữ kiện:
        if (petitionRes?.status === 'WAITING_STUDENT' || petitionRes?.decision === 'ASK_CLARIFICATION') {
          setErrorMsg(petitionRes.actionableQuestion || petitionRes.escalationReason || petitionRes.message || 'Hồ sơ cần bổ sung thông tin.');
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmData(getPrefilledConfirmData(activeFormCode, getEffectiveAccount()))}
              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Nạp lại dữ liệu mẫu đầy đủ hợp lệ cho biểu mẫu này"
            >
              <RotateCcw className="w-3 h-3 text-emerald-600" />
              Điền mẫu chuẩn
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          
          {errorMsg && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <MarkdownRenderer content={errorMsg} compact inheritColor />
              </div>
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
                  {CONFIRMATION_FORMS.map((hf) => {
                    const isActive = activeFormCode === hf.formCode;
                    return (
                      <button
                        key={hf.formCode}
                        type="button"
                        onClick={() => {
                          setActiveFormCode(hf.formCode);
                          setConfirmData(getPrefilledConfirmData(hf.formCode, getEffectiveAccount()));
                        }}
                        className={`py-2 px-2 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                          isActive
                            ? 'bg-[#0B3B82] text-white border-[#082C64] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
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
                  {CONFIRMATION_FORMS.find((f) => f.formCode === activeFormCode)?.name || 'GIẤY XÁC NHẬN SINH VIÊN'}
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
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Giới tính :</label>
                  <select
                    value={confirmData.gender}
                    onChange={(e) => setConfirmData({ ...confirmData, gender: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
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
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-normal border border-amber-200 ml-1.5">
                        Giả định
                      </span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.idCard}
                      onChange={(e) => setConfirmData({ ...confirmData, idCard: e.target.value })}
                      placeholder="Nhập số CCCD 12 số..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Ngày cấp CMND/CCCD :
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-normal border border-amber-200 ml-1.5">
                        Giả định
                      </span>
                    </label>
                    <input
                      type="date"
                      value={confirmData.idCardDate}
                      onChange={(e) => setConfirmData({ ...confirmData, idCardDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Nơi cấp CMND/CCCD :
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-normal border border-amber-200 ml-1.5">
                        Giả định
                      </span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.idCardPlace}
                      onChange={(e) => setConfirmData({ ...confirmData, idCardPlace: e.target.value })}
                      placeholder="VD: Cục Cảnh sát QLHC về TTXH"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-none"
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
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-none text-slate-800 font-mono uppercase"
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
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* CÁC TRƯỜNG ĐẶC THÙ THEO BIỂU MẪU ĐƯỢC CHỌN */}
              {activeFormCode === 'TAX_DEDUCTION' && (
                <div className="space-y-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200/80">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Cơ quan Thuế tiếp nhận :
                      <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-normal ml-1.5">Bắt buộc</span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.recipientAgency}
                      onChange={(e) => setConfirmData({ ...confirmData, recipientAgency: e.target.value })}
                      placeholder="VD: Chi cục Thuế Quận Bình Thạnh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-blue-600 focus:outline-none bg-white text-slate-800"
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
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-normal ml-1.5">Mẫu 01/TDSV</span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.recipientAgency}
                      onChange={(e) => setConfirmData({ ...confirmData, recipientAgency: e.target.value })}
                      placeholder="VD: Phòng giao dịch NHCSXH Quận Bình Thạnh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-emerald-600 focus:outline-none bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Địa chỉ thường trú theo hộ khẩu :
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-normal ml-1.5">Quy chuẩn Title Case</span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.permanentAddress}
                      onChange={(e) => setConfirmData({ ...confirmData, permanentAddress: e.target.value })}
                      placeholder="VD: 475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-emerald-600 focus:outline-none bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}

              {activeFormCode === 'MILITARY_DEFERMENT' && (
                <div className="space-y-3 p-3 bg-rose-50/50 rounded-xl border border-rose-200/80">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Ban Chỉ huy Quân sự cấp Xã/Phường/Thị trấn tiếp nhận :
                      <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-normal ml-1.5">Hiệu lực 30 ngày</span>
                    </label>
                    <input
                      type="text"
                      value={confirmData.recipientAgency}
                      onChange={(e) => setConfirmData({ ...confirmData, recipientAgency: e.target.value })}
                      placeholder="VD: Ban Chỉ huy Quân sự Phường Thạnh Mỹ Tây"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-rose-600 focus:outline-none bg-white text-slate-800"
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
                      placeholder="VD: 475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-rose-600 focus:outline-none bg-white text-slate-800"
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
                      <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-normal ml-1.5">Kèm thời hạn hoàn thành</span>
                    </label>
                    <textarea
                      rows={2}
                      value={confirmData.debtCourses}
                      onChange={(e) => setConfirmData({ ...confirmData, debtCourses: e.target.value })}
                      placeholder="VD: Lập trình Web, Cơ sở dữ liệu, Kiến trúc máy tính..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-purple-600 focus:outline-none resize-none bg-white font-medium text-slate-800"
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
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:border-purple-600 focus:outline-none bg-white text-slate-800"
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
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:border-blue-600 focus:outline-none resize-none"
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
                  className="w-full px-2.5 py-2 rounded border border-blue-300 bg-blue-50/40 text-blue-900 font-medium focus:border-blue-600 focus:outline-none"
                >
                  <option value="Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)">
                    Trụ sở chính: Phòng Công tác Sinh viên (A-01.01) [Nhận sau 1 ngày làm việc]
                  </option>
                  <option value="Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.05)">
                    Cơ sở E (Thủ Đức): Phòng Công tác Sinh viên (E1-01.05) [Nhận sau 2 ngày làm việc]
                  </option>
                </select>
              </div>

              {/* Banner lưu ý chân trang */}
              <div className="p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 border border-slate-200">
                Mọi thắc mắc vui lòng liên hệ Phòng Công tác Sinh viên: Trụ sở A-01.01: (028) 3512 0785 | Cơ sở E1-01.05: (028) 6686 8876.
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

    </div>
  );
}
