// Presentation metadata shared by the catalog and submission modal.
// Eligibility and policy decisions remain on the backend.

export const SAMPLE_CONFIRMATION_DATA = {
  phone: '0901234567',
  idCard: '079204001234',
  idCardDate: '2021-05-15',
  idCardPlace: 'Cục Cảnh sát QLHC về TTXH',
  permanentAddress: '475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh',
  pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
  debtCourses: 'Thực tập doanh nghiệp, Đồ án tốt nghiệp',
  completionDeadline: 'Tháng 12/2026',
  defaultsByForm: {
    TAX_DEDUCTION: {
      recipientAgency: 'Chi cục Thuế Quận Bình Thạnh',
      purpose: 'Giảm trừ gia cảnh thuế TNCN cho người phụ thuộc',
      permanentAddress: '475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh',
    },
    BANK_LOAN: {
      recipientAgency: 'Phòng giao dịch NHCSXH Quận Bình Thạnh',
      purpose: 'Vay vốn học tập theo Quyết định 157/2007/QĐ-TTg',
      permanentAddress: '475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh',
    },
    MILITARY_DEFERMENT: {
      recipientAgency: 'Ban Chỉ huy Quân sự Phường Thạnh Mỹ Tây',
      purpose: 'Tạm hoãn nghĩa vụ quân sự năm học 2026-2027',
      permanentAddress: '475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh',
    },
    COURSE_DEBT: {
      recipientAgency: 'Giải trình Ban Chỉ huy Quân sự & Tiếp tục hoàn thành học phần',
      purpose: 'Xác nhận sinh viên còn nợ môn và tiếp tục hoàn thành học phần',
      debtCourses: 'Thực tập doanh nghiệp, Đồ án tốt nghiệp',
      completionDeadline: 'Tháng 12/2026',
      permanentAddress: '475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh',
    },
    GENERAL_CONFIRMATION: {
      recipientAgency: 'Trung tâm Quản lý Giao thông công cộng TP.HCM',
      purpose: 'Làm vé tháng xe buýt và bổ sung hồ sơ học tập',
      permanentAddress: '475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh',
    },
  },
};

export const CONFIRMATION_FORMS = [
  {
    id: 'form_tax', formCode: 'TAX_DEDUCTION', badge: 'DV-01 · THUẾ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    title: 'Đơn Xác Nhận Giảm Trừ Gia Cảnh',
    name: 'Đơn xác nhận giảm trừ gia cảnh (Thuế TNCN)', shortName: 'Thuế TNCN',
    description: 'Xác nhận phục vụ hồ sơ giảm trừ gia cảnh thuế TNCN.',
    quickPrompt: 'Em muốn xin cấp giấy xác nhận giảm trừ gia cảnh thuế TNCN nộp Chi cục Thuế cho ba mẹ em',
    purpose: 'Giảm trừ gia cảnh thuế TNCN',
    recipientAgency: 'Chi cục Thuế Quận Bình Thạnh',
  },
  {
    id: 'form_bank', formCode: 'BANK_LOAN', badge: 'DV-02 · VAY VỐN',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    title: 'Giấy Xác Nhận Vay Vốn NHCSXH',
    name: 'Giấy xác nhận vay vốn Ngân hàng Chính sách Xã hội', shortName: 'Vay vốn NHCS',
    description: 'Xác nhận tình trạng sinh viên để làm hồ sơ vay vốn tại NHCSXH.',
    quickPrompt: 'Em muốn xin giấy xác nhận vay vốn ngân hàng chính sách xã hội theo mẫu 01',
    purpose: 'Vay vốn Ngân hàng Chính sách Xã hội',
    recipientAgency: 'Phòng giao dịch NHCSXH Quận Bình Thạnh',
  },
  {
    id: 'form_military', formCode: 'MILITARY_DEFERMENT', badge: 'DV-03 · NVQS',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    title: 'Đơn Xin Tạm Hoãn Nghĩa Vụ Quân Sự',
    name: 'Đơn xin tạm hoãn nghĩa vụ quân sự', shortName: 'Tạm hoãn NVQS',
    description: 'Xác nhận phục vụ hồ sơ tạm hoãn nghĩa vụ quân sự tại địa phương.',
    quickPrompt: 'Em xin cấp Giấy chứng nhận tạm hoãn nghĩa vụ quân sự nộp Ban chỉ huy quân sự',
    purpose: 'Tạm hoãn nghĩa vụ quân sự',
    recipientAgency: 'Ban Chỉ huy Quân sự Phường Thạnh Mỹ Tây',
  },
  {
    id: 'form_debt', formCode: 'COURSE_DEBT', badge: 'DV-04 · NỢ MÔN',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    title: 'Đơn Xác Nhận Sinh Viên Nợ Môn',
    name: 'Đơn xác nhận sinh viên nợ môn / hoàn thành chương trình', shortName: 'Mẫu nợ môn',
    description: 'Xác nhận sinh viên đang tiếp tục hoàn thành các học phần còn nợ.',
    quickPrompt: 'Em muốn xin đơn xác nhận sinh viên còn nợ môn để bổ sung hồ sơ và trả nợ học phần',
    purpose: 'Xác nhận sinh viên còn nợ môn và tiếp tục hoàn thành học phần',
    recipientAgency: 'Giải trình Ban Chỉ huy Quân sự & Tiếp tục hoàn thành học phần',
  },
  {
    id: 'form_general', formCode: 'GENERAL_CONFIRMATION', badge: 'DV-05 · CHUNG',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    title: 'Giấy Xác Nhận Sinh Viên (Mục Đích Chung)',
    name: 'Giấy xác nhận sinh viên (mục đích chung)', shortName: 'Mục đích chung',
    description: 'Xác nhận làm vé xe buýt, xin visa, việc làm hoặc bổ sung hồ sơ.',
    quickPrompt: 'Em xin cấp giấy xác nhận sinh viên mục đích thông thường để làm vé xe buýt hoặc xin visa',
    purpose: 'Làm vé tháng xe buýt và bổ sung hồ sơ học tập',
    recipientAgency: 'Trung tâm Quản lý Giao thông công cộng TP.HCM',
  },
];

export const FORM_AGENCY_DEFAULTS = Object.fromEntries(
  CONFIRMATION_FORMS.map((form) => [form.formCode, form.recipientAgency])
);

export function buildConfirmationInput(formCode, values = {}) {
  const form = CONFIRMATION_FORMS.find(item => item.formCode === formCode);
  return { ...values, formCode,
    purpose: values.purpose || (formCode !== 'GENERAL_CONFIRMATION' ? form?.purpose : '') || '',
  };
}
