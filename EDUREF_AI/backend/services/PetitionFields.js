import { HUTECH_FORMS } from './StudentConfirmationDecisionService.js';

const field = (key, label, type = 'text', options = null) => ({ key, label, type, ...(options ? { options } : {}) });
export const PETITION_FIELDS = [
  field('fullName', 'Họ và tên'), field('birthDate', 'Ngày sinh (DD/MM/YYYY)'),
  field('gender', 'Giới tính', 'select', ['Nam', 'Nữ']), field('studentClass', 'Lớp sinh hoạt'),
  field('faculty', 'Khoa / Viện'), field('major', 'Ngành học'), field('phone', 'Số điện thoại', 'tel'),
  field('idCard', 'CCCD/CMND'), field('idCardDate', 'Ngày cấp CCCD/CMND'), field('idCardPlace', 'Nơi cấp CCCD/CMND'),
  field('permanentAddress', 'Địa chỉ thường trú'), field('recipientAgency', 'Nơi tiếp nhận giấy'),
  field('purpose', 'Mục đích sử dụng', 'choice', ['Làm vé tháng xe buýt', 'Xin visa', 'Xin học bổng', 'Bổ sung hồ sơ việc làm', 'Bổ sung hồ sơ học tập']),
  field('pickupCampus', 'Cơ sở nhận giấy', 'select', ['Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)', 'Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.05)']),
  field('debtCourses', 'Các học phần còn nợ'), field('completionDeadline', 'Thời hạn hoàn thành'),
  field('orphanStatus', 'Tình trạng mồ côi', 'select', ['Không', 'Mồ côi cha', 'Mồ côi mẹ', 'Mồ côi cả cha và mẹ']),
  field('loanFormCount', 'Số lần trường đã cấp giấy vay vốn', 'number'),
  field('loanGrantedCount', 'Số lần đã được giải ngân', 'number'), field('lastLoanAmount', 'Số tiền vay lần gần nhất (đồng)', 'number'),
  field('reissueReason', 'Lý do xin cấp lại'), field('urgentReason', 'Lý do cần gấp'),
];
export const FIELD_KEYS = new Set(PETITION_FIELDS.map(item => item.key));
export const DEFAULT_PURPOSES = { TAX_DEDUCTION: 'Giảm trừ gia cảnh thuế TNCN', BANK_LOAN: 'Vay vốn Ngân hàng Chính sách Xã hội',
  MILITARY_DEFERMENT: 'Tạm hoãn nghĩa vụ quân sự', COURSE_DEBT: 'Xác nhận sinh viên còn nợ môn và tiếp tục hoàn thành học phần' };
export function missingFieldMetadata(missing = []) {
  const aliases = { REQ_ADDRESS: 'permanentAddress', REQ_ADDRESS_STANDARD: 'permanentAddress', REQ_CAMPUS: 'pickupCampus',
    REQ_FULLNAME: 'fullName', REQ_CLASS: 'studentClass', REQ_ID_CARD: 'idCard', REQ_DEBT_COURSES: 'debtCourses' };
  return missing.map(item => {
    const match = PETITION_FIELDS.find(f => f.key === aliases[item.code] || `REQ_${f.key.toUpperCase()}` === item.code);
    return match ? { ...match, description: item.description } : null;
  }).filter(Boolean);
}
export function cleanDraftInput(input = {}) {
  return Object.fromEntries(Object.entries(input || {}).filter(([key, value]) => FIELD_KEYS.has(key)
    && ['string', 'number'].includes(typeof value)).map(([key, value]) => [key, String(value).trim().slice(0, 2000)]));
}
export function formFields(formCode) {
  const keys = new Set(['fullName', 'gender', 'purpose', ...(HUTECH_FORMS[formCode]?.requiredFields || [])]);
  return PETITION_FIELDS.filter(item => keys.has(item.key));
}
