import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePermanentAddress,
  formatVietnameseAddress,
  evaluateStudentConfirmation,
  TRACK_A_DECISION,
} from '../services/StudentConfirmationDecisionService.js';

test('Địa chỉ sau sáp nhập: Chấp nhận địa chỉ 2-3 cấp, không tự ý chèn tỉnh thành', () => {
  // 1. TP. Thủ Đức (2 cấp: Phường -> TP. Thủ Đức, không còn Quận)
  const thuDuc = validatePermanentAddress('Phường An Phú, TP. Thủ Đức');
  assert.equal(thuDuc.isValid, true, 'Địa chỉ TP. Thủ Đức 2 cấp phải hợp lệ');
  assert.equal(thuDuc.autoFormatted, 'Phường An Phú, TP. Thủ Đức');

  // 2. Phường mới sáp nhập tại TP.HCM (Phường Thạnh Mỹ Tây, TP. Hồ Chí Minh - 2 cấp)
  const thanhMyTay = validatePermanentAddress('Phường Thạnh Mỹ Tây, TP. Hồ Chí Minh');
  assert.equal(thanhMyTay.isValid, true, 'Phường sáp nhập không còn cấp Quận phải hợp lệ');

  // 3. Nông thôn 3 cấp (Ấp -> Xã -> Tỉnh, không có số nhà và không có huyện)
  const nongThon = validatePermanentAddress('Ấp Châu Phú, Xã Hòa Bình, Tỉnh Bạc Liêu');
  assert.equal(nongThon.isValid, true, 'Nông thôn 3 cấp không có số nhà phải hợp lệ');

  // 4. Sinh viên gõ chữ thường: AI chỉ chuẩn hóa Title Case, KHÔNG tự ý chèn thêm tỉnh/thành
  const rawThuDucLower = 'phường hiệp bình chánh, tp thủ đức';
  const formatted = formatVietnameseAddress(rawThuDucLower);
  assert.equal(formatted, 'Phường Hiệp Bình Chánh, TP Thủ Đức', 'Chỉ viết hoa đúng chữ cái đầu, không chèn tỉnh thành');

  // 5. Thẩm định đơn NVQS với địa chỉ sáp nhập TP. Thủ Đức:
  const student = {
    studentCode: '2380600001',
    fullName: 'Nguyễn Văn An',
    status: 'ACTIVE',
    hasSchedule: true,
    enrolledCredits: 15,
    admissionYear: 2023,
  };

  // Bước 1: Gửi địa chỉ lần đầu -> Cảnh báo pháp lý trước BCH Quân sự quê quán
  const step1 = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'MILITARY_DEFERMENT',
      purpose: 'Tạm hoãn nghĩa vụ quân sự',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      permanentAddress: 'Phường An Phú, TP. Thủ Đức',
      isAddressConfirmed: false,
    },
  });
  assert.equal(step1.decision, TRACK_A_DECISION.ASK_CLARIFICATION);
  assert.equal(step1.rule, 'CONFIRM_MILITARY_ADDRESS_RESPONSIBILITY');
  assert.ok(step1.actionableQuestion.includes('Phường An Phú, TP. Thủ Đức'));

  // Bước 2: Sinh viên nhắn xác nhận đúng -> Tự động duyệt ngay lập tức
  const step2 = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'MILITARY_DEFERMENT',
      purpose: 'Tạm hoãn nghĩa vụ quân sự',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      permanentAddress: 'Phường An Phú, TP. Thủ Đức',
      isAddressConfirmed: true,
      existingApprovedCount: 0,
    },
  });
  assert.equal(step2.decision, TRACK_A_DECISION.AUTO_APPROVE);
  assert.equal(step2.rule, 'APPROVED_MILITARY_DEFERMENT');
  console.log('  ✅ Kiểm thử địa chỉ sáp nhập (TP. Thủ Đức, Phường sáp nhập, Nông thôn 3 cấp) thành công 100%!');
});
