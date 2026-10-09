// backend/test/cross-form-mismatch.test.js
// Bộ kiểm thử tính năng Phát hiện chéo biểu mẫu (Cross-Form Mismatch) & Hướng dẫn 2 lựa chọn (Dual Guidance)

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HUTECH_FORMS,
  getFormFieldsGuide,
  detectCrossFormMismatch,
  evaluateStudentConfirmation,
  inferStudentConfirmationInput,
} from '../services/StudentConfirmationDecisionService.js';

test('1. getFormFieldsGuide cung cấp đầy đủ danh sách trường cho 5 biểu mẫu HUTECH', () => {
  const nvqsGuide = getFormFieldsGuide('MILITARY_DEFERMENT');
  assert.ok(nvqsGuide.includes('Địa chỉ hộ khẩu thường trú'));
  assert.ok(nvqsGuide.includes('4 cấp hành chính'));

  const bankGuide = getFormFieldsGuide('BANK_LOAN');
  assert.ok(bankGuide.includes('Số tiền vay'));
  assert.ok(bankGuide.includes('mồ côi'));

  const debtGuide = getFormFieldsGuide('COURSE_DEBT');
  assert.ok(debtGuide.includes('Danh sách các môn học còn nợ'));

  const taxGuide = getFormFieldsGuide('TAX_DEDUCTION');
  assert.ok(taxGuide.includes('Địa chỉ hộ khẩu thường trú'));

  const generalGuide = getFormFieldsGuide('GENERAL_CONFIRMATION');
  assert.ok(generalGuide.includes('Lý do xác nhận'));
});

test('2. detectCrossFormMismatch phát hiện khi sinh viên mở form A nhưng nội dung yêu cầu form B', () => {
  // Đang ở form GENERAL_CONFIRMATION nhưng nội dung xin NVQS
  const mismatchNvqs = detectCrossFormMismatch({
    currentFormCode: 'GENERAL_CONFIRMATION',
    text: 'Em cần giấy để nộp tạm hoãn nghĩa vụ quân sự ở địa phương',
    student: { studentCode: '2280602154', status: 'ACTIVE' },
  });
  assert.equal(mismatchNvqs.isMismatch, true);
  assert.equal(mismatchNvqs.targetForm.code, 'MILITARY_DEFERMENT');
  assert.ok(mismatchNvqs.guidanceMessage.includes('Điền đơn bên tay trái'));
  assert.ok(mismatchNvqs.guidanceMessage.includes('Gửi trực tiếp thông tin cho mình ngay tại đây'));

  // Đang ở form MILITARY_DEFERMENT nhưng nội dung xin Vay vốn NHCSXH
  const mismatchBank = detectCrossFormMismatch({
    currentFormCode: 'MILITARY_DEFERMENT',
    text: 'Em muốn xin giấy vay vốn ngân hàng chính sách xã hội học kỳ này',
    student: { studentCode: '2280602154', status: 'ACTIVE' },
  });
  assert.equal(mismatchBank.isMismatch, true);
  assert.equal(mismatchBank.targetForm.code, 'BANK_LOAN');
});

test('3. Sinh viên quá 4 năm đào tạo chuẩn bị bắt buộc chuyển sang Biểu mẫu nợ môn (COURSE_DEBT)', () => {
  // Sinh viên khóa 20 (mã 2010001 - năm 2026 là quá 4 năm) xin giấy thường quy
  const overdueMismatch = detectCrossFormMismatch({
    currentFormCode: 'GENERAL_CONFIRMATION',
    text: 'Em xin giấy xác nhận sinh viên để bổ sung hồ sơ xin việc',
    student: { studentCode: '2010001', admissionYear: 2020, status: 'ACTIVE' },
  });
  assert.equal(overdueMismatch.isMismatch, true);
  assert.equal(overdueMismatch.targetForm.code, 'COURSE_DEBT');
  assert.ok(overdueMismatch.guidanceMessage.includes('Biểu mẫu nợ môn'));
  assert.ok(overdueMismatch.guidanceMessage.includes('Danh sách các môn học còn nợ'));
});

test('4. evaluateStudentConfirmation trả về ASK_CLARIFICATION kèm hướng dẫn 2 cách khi phát hiện lệch biểu mẫu', () => {
  const student = { studentCode: '2280602154', status: 'ACTIVE', tuitionDebt: 0, hasSchedule: true };
  const evalResult = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Em xin xác nhận để tạm hoãn nghĩa vụ quân sự đợt tuyển quân này ạ',
    },
  });

  assert.equal(evalResult.decision, 'ASK_CLARIFICATION');
  assert.equal(evalResult.rule, 'MISMATCH_FORM_GUIDANCE');
  assert.ok(evalResult.actionableQuestion.includes('👉 **Cách 1: Điền đơn bên tay trái**'));
  assert.ok(evalResult.actionableQuestion.includes('👉 **Cách 2: Gửi trực tiếp thông tin cho mình ngay tại đây**'));
});

test('5. inferStudentConfirmationInput bóc tách chính xác địa chỉ, SĐT, CCCD, môn nợ từ chat', () => {
  const parsed = inferStudentConfirmationInput(
    'Em xin tạm hoãn nghĩa vụ quân sự. Địa chỉ: 180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh; SĐT: 0901234567; CCCD: 079202001234; nhận ở Trụ sở chính A-01.01'
  );
  assert.equal(parsed.formCode, 'MILITARY_DEFERMENT');
  assert.equal(parsed.permanentAddress, '180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh');
  assert.equal(parsed.phone, '0901234567');
  assert.equal(parsed.idCard, '079202001234');
  assert.equal(parsed.pickupCampus, 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)');
});
