import React, { useState } from 'react';
import { UserCheck, X, Sparkles, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import api from '../../services/api';
import { updateSocketAuth } from '../../services/socket';

const SCENARIOS = [
  {
    id: 'ACTIVE_ZERO_DEBT',
    label: '🟢 Đang học bình thường — Học phí 0đ',
    desc: 'Hồ sơ đủ điều kiện theo quy chế, AI sẽ tự động phê duyệt nếu mục đích hợp lệ.',
    status: 'ACTIVE',
    debt: 0,
  },
  {
    id: 'ACTIVE_DEBT',
    label: '💳 Đang học — Còn nợ học phí (15.000.000 đ)',
    desc: 'Thử nghiệm quy tắc Zero-tolerance: AI sẽ từ chối tự động vì chưa hoàn tất nghĩa vụ học phí.',
    status: 'ACTIVE',
    debt: 15000000,
  },
  {
    id: 'DROPPED',
    label: '🚨 Đã có quyết định thôi học (DROPPED)',
    desc: 'Thử nghiệm bảo vệ quy chế: AI chặn và từ chối vì không còn là sinh viên đang theo học.',
    status: 'DROPPED',
    debt: 0,
  },
  {
    id: 'SUSPENDED',
    label: '⏸️ Đang trong thời gian bảo lưu (SUSPENDED)',
    desc: 'Thử nghiệm hướng dẫn: AI từ chối cấp trực tuyến và hướng dẫn liên hệ trực tiếp phòng CTSV.',
    status: 'SUSPENDED',
    debt: 0,
  },
];

export const HUTECH_FACULTIES = [
  'Khoa Công nghệ thông tin',
  'Viện Kỹ thuật HUTECH',
  'Trường Y và Khoa học sức khỏe',
  'Khoa Dược',
  'Khoa Thú y',
  'Khoa Thẩm mỹ và Khoa học sự sống',
  'Khoa Hệ thống thông tin quản lý',
  'Khoa Kiến trúc - Xây dựng',
  'Viện Khoa học Ứng dụng HUTECH',
  'Khoa Quản trị kinh doanh',
  'Khoa Marketing - Kinh doanh quốc tế',
  'Khoa Tài chính - Thương mại',
  'Khoa Quản trị Du lịch - Nhà hàng - Khách sạn',
  'Khoa Tiếng Anh',
  'Khoa Nhật Bản học',
  'Khoa Hàn Quốc học',
  'Khoa Trung Quốc học',
  'Khoa Luật',
  'Khoa Khoa học Xã hội và Quan hệ Công chúng',
  'Khoa Truyền thông và Thiết kế',
  'Viện Văn hóa - Nghệ thuật - Thể thao',
  'Viện Đào tạo Quốc tế HUTECH',
  'Viện Đào tạo Sau Đại học',
  'Viện Công nghệ cao HUTECH & CIRTECH',
];

export default function CustomProfileModal({
  isOpen,
  onClose,
  onProfileSaved,
  currentProfile = null,
  initialData = null,
}) {
  const source = currentProfile || initialData;
  const [fullName, setFullName] = useState(source?.name || source?.fullName || '');
  const [studentCode, setStudentCode] = useState(source?.code || source?.studentCode || '');
  const [studentClass, setStudentClass] = useState(source?.studentClass || source?.class || '22DTHA1');
  const [phone, setPhone] = useState(source?.phone || '0901234567');
  const [departmentName, setDepartmentName] = useState(source?.department || source?.faculty || source?.departmentName || 'Khoa Công nghệ thông tin');
  const [birthDate, setBirthDate] = useState(source?.birthDate || '26/07/2003');
  const [gender, setGender] = useState(source?.gender || 'Nam');
  const [selectedScenario, setSelectedScenario] = useState('ACTIVE_ZERO_DEBT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tự động đồng bộ dữ liệu hồ sơ hiện tại mỗi khi mở modal
  React.useEffect(() => {
    if (isOpen) {
      const src = currentProfile || initialData;
      if (src) {
        if (src.name || src.fullName) setFullName(src.name || src.fullName);
        if (src.code || src.studentCode) setStudentCode(src.code || src.studentCode);
        if (src.studentClass || src.class) setStudentClass(src.studentClass || src.class);
        if (src.phone) setPhone(src.phone);
        if (src.department || src.faculty || src.departmentName) setDepartmentName(src.department || src.faculty || src.departmentName);
        if (src.birthDate) setBirthDate(src.birthDate);
        if (src.gender) setGender(src.gender);
      }
    }
  }, [isOpen, currentProfile, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !studentCode.trim()) {
      setError('Vui lòng nhập đầy đủ Họ tên và Mã số sinh viên.');
      return;
    }

    setLoading(true);
    setError('');

    const scenario = SCENARIOS.find((s) => s.id === selectedScenario) || SCENARIOS[0];

    try {
      const response = await api.post('/auth/custom-student', {
        fullName: fullName.trim(),
        studentCode: studentCode.trim(),
        departmentName: departmentName.trim(),
        status: scenario.status,
        tuitionDebt: scenario.debt,
        phone: phone.trim() || '0901234567',
        studentClass: studentClass.trim() || '22DTHA1',
      });

      if (response.data?.success && response.data?.user) {
        const user = response.data.user;
        const customObj = {
          key: 'CUSTOM_STUDENT',
          name: user.fullName || fullName.trim(),
          code: user.studentCode || studentCode.trim(),
          type: 'STUDENT',
          role: 'Sinh viên (Hồ sơ của bạn)',
          tag: scenario.label.split('—')[0].trim(),
          status: user.status,
          tuitionDebt: user.tuitionDebt,
          department: departmentName.trim(),
          faculty: departmentName.trim(),
          departmentName: departmentName.trim(),
          class: studentClass.trim() || '22DTHA1',
          studentClass: studentClass.trim() || '22DTHA1',
          phone: phone.trim() || '0901234567',
          birthDate: birthDate.trim() || '26/07/2003',
          gender: gender || 'Nam',
          token: response.data.token,
        };

        // Lưu vào cả hai key localStorage để tương thích tối đa
        localStorage.setItem('eduref_custom_student', JSON.stringify(customObj));
        localStorage.setItem('customProfile', JSON.stringify(customObj));
        if (response.data.token) {
          localStorage.setItem('eduref_token', response.data.token);
          localStorage.setItem('eduref_user', JSON.stringify(user));
          localStorage.setItem('eduref_role_key', 'CUSTOM_STUDENT');
          updateSocketAuth(response.data.token);
          window.dispatchEvent(new Event('eduref-auth-changed'));
        }

        if (onProfileSaved) {
          onProfileSaved(customObj);
        }
        onClose();
      } else {
        setError(response.data?.message || 'Không thể tạo hồ sơ.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-slate-900 p-5 text-white text-left border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tạo Hồ Sơ Sinh Viên Của Bạn</h3>
              <p className="text-xs text-slate-400">Thử nghiệm hệ thống dưới đúng thông tin và trạng thái của bạn</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-left flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Họ và tên của bạn <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Trần Minh Hoàng"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mã số sinh viên (MSSV) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="Ví dụ: 2280601234"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Lớp sinh hoạt / Lớp học
              </label>
              <input
                type="text"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder="Ví dụ: 22DTHA1"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Khoa đào tạo
              </label>
              <select
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
              >
                {HUTECH_FACULTIES.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0901234567"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Ngày sinh
              </label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="Ví dụ: 26/07/2003 hoặc 2003-07-26"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Giới tính
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
          </div>

          {/* Chọn Tình trạng để Test */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
              <span>Tình trạng học vụ muốn thử nghiệm:</span>
              <span className="text-[10px] text-blue-600 font-normal">Chọn kịch bản</span>
            </label>
            <div className="space-y-2">
              {SCENARIOS.map((sc) => (
                <label
                  key={sc.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedScenario === sc.id
                      ? 'border-blue-600 bg-blue-50/60 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scenario"
                    value={sc.id}
                    checked={selectedScenario === sc.id}
                    onChange={() => setSelectedScenario(sc.id)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900">{sc.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sc.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            ℹ️ Hồ sơ này chỉ được lưu trên trình duyệt của riêng bạn để bảo mật, không làm ảnh hưởng đến người khác.
          </div>

          {/* Footer nút bấm */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang khởi tạo…</span>
                </>
              ) : (
                <span>Lưu & Bắt đầu Chat</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
