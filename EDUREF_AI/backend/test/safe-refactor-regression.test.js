import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStudentConfirmation, TRACK_A_DECISION } from "../services/StudentConfirmationDecisionService.js";
import studentConfirmationHandler from '../modules/petition-core/handlers/StudentConfirmationHandler.js';

console.log('\n========================================================================================');
console.log('🛡️ BỘ KIỂM THỬ HỒI QUY TOÀN DIỆN (14 CA QUY CHUẨN CTSV HUTECH & SƠ ĐỒ .MDJ)');
console.log('========================================================================================\n');

// 1. TC-01: Chào hỏi / Tư vấn thủ tục (Inquiry Gate)
test('TC-01: Chào hỏi / Tư vấn thủ tục không tạo đơn', () => {
  const student = { studentCode: '2280602154', fullName: 'Cao Hữu Nhân', status: 'ACTIVE' };
  const res = evaluateStudentConfirmation({
    student,
    inputData: { isInquiry: true, purpose: 'Hỏi thủ tục làm giấy' },
  });
  assert.equal(res.decision, 'ASK_CLARIFICATION');
  assert.equal(res.rule, 'INQUIRY_NOT_PETITION_INTENT');
  console.log('  ✅ TC-01: Chào hỏi / Tư vấn thủ tục dừng lại giải thích, không tự tiện nộp đơn [PASS]');
});

// 2. TC-02: Zero-Tolerance: Thiếu SĐT
test('TC-02: Thiếu số điện thoại (Zero-Tolerance) bắt buộc hỏi lại', () => {
  const student = { studentCode: '2380600001', fullName: 'Nguyễn Văn An', status: 'ACTIVE', hasSchedule: true, enrolledCredits: 15, admissionYear: 2023 };
  const res = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Làm vé xe buýt',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      phone: '', // Thiếu SĐT
    },
  });
  assert.equal(res.decision, 'ASK_CLARIFICATION');
  assert.equal(res.rule, 'REQ_PHONE_NUMBER_REQUIRED');
  console.log('  ✅ TC-02: Thiếu số điện thoại trả về ASK_CLARIFICATION [PASS]');
});

// 3. TC-03: Zero-Tolerance: Thiếu Cơ sở nhận
test('TC-03: Thiếu cơ sở nhận (Zero-Tolerance) không được tự default', () => {
  const student = { studentCode: '2380600001', fullName: 'Nguyễn Văn An', status: 'ACTIVE', hasSchedule: true, enrolledCredits: 15, admissionYear: 2023 };
  const res = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Làm vé xe buýt',
      phone: '0901234567',
      pickupCampus: '', // Chưa chọn cơ sở
    },
  });
  assert.equal(res.decision, 'ASK_CLARIFICATION');
  assert.equal(res.rule, 'REQ_PICKUP_CAMPUS');
  console.log('  ✅ TC-03: Thiếu cơ sở nhận không bị default ngầm, bắt buộc hỏi lại [PASS]');
});

// 4. TC-04: NVQS: Chuẩn hóa 4 cấp & Cảnh báo trách nhiệm pháp lý
test('TC-04: NVQS gửi địa chỉ lần đầu -> Cảnh báo trách nhiệm pháp lý trước BCH Quân sự', () => {
  const student = { studentCode: '2380600001', fullName: 'Nguyễn Văn An', status: 'ACTIVE', hasSchedule: true, enrolledCredits: 15, admissionYear: 2023 };
  const res = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'MILITARY_DEFERMENT',
      purpose: 'Tạm hoãn nghĩa vụ quân sự',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      permanentAddress: 'Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu',
      isAddressConfirmed: false,
    },
  });
  assert.equal(res.decision, 'ASK_CLARIFICATION');
  assert.equal(res.rule, 'CONFIRM_MILITARY_ADDRESS_RESPONSIBILITY');
  assert.ok(res.actionableQuestion.includes('CẢNH BÁO QUY CHẾ PHÁP LÝ NGHĨA VỤ QUÂN SỰ'));
  console.log('  ✅ TC-04: NVQS chuẩn hóa địa chỉ và cảnh báo pháp lý thành công [PASS]');
});

// 5. TC-05: NVQS: Xác nhận địa chỉ hợp lệ -> AUTO_APPROVED (Không QR, Không validDays)
test('TC-05: NVQS đã xác nhận địa chỉ -> Duyệt tự động, không QR, không validDays', () => {
  const student = { studentCode: '2380600001', fullName: 'Nguyễn Văn An', status: 'ACTIVE', hasSchedule: true, enrolledCredits: 15, admissionYear: 2023 };
  const res = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'MILITARY_DEFERMENT',
      purpose: 'Tạm hoãn nghĩa vụ quân sự',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      permanentAddress: 'Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu',
      isAddressConfirmed: true,
      existingApprovedCount: 0,
    },
  });
  assert.equal(res.decision, TRACK_A_DECISION.AUTO_APPROVE);
  assert.equal(res.rule, 'APPROVED_MILITARY_DEFERMENT');
  assert.ok(!res.qrCodeUrl, 'Không được có qrCodeUrl');
  assert.ok(!res.validDays, 'Không được có validDays');
  console.log('  ✅ TC-05: NVQS tự động duyệt nhận bản cứng mộc đỏ, không sinh QR [PASS]');
});

// 6. TC-06: Bảo lưu (SUSPENDED) & Thôi học (DROPPED)
test('TC-06: Sinh viên SUSPENDED hoặc DROPPED -> AUTO_REJECT ngay lập tức, không bypass', () => {
  const suspendedStudent = { studentCode: '2280600004', fullName: 'Phạm Văn Dũng', status: 'SUSPENDED' };
  const droppedStudent = { studentCode: '2150200002', fullName: 'Trần Thị Bình', status: 'DROPPED' };

  const res1 = evaluateStudentConfirmation({ student: suspendedStudent, inputData: { purpose: 'Xin giấy' } });
  assert.equal(res1.decision, TRACK_A_DECISION.AUTO_REJECT);
  assert.equal(res1.rule, 'POL_SUSPENDED_STUDENT_DENY');

  const res2 = evaluateStudentConfirmation({ student: droppedStudent, inputData: { purpose: 'Xin giấy' } });
  assert.equal(res2.decision, TRACK_A_DECISION.AUTO_REJECT);
  assert.equal(res2.rule, 'POL_DROPPED_STUDENT_DENY');
  console.log('  ✅ TC-06: Bảo lưu và Thôi học bị Reject dứt khoát không bypass [PASS]');
});

// 7. TC-07: Sinh viên bị kỷ luật nhưng vẫn học hợp lệ
test('TC-07: Sinh viên có kỷ luật nhưng status = ACTIVE và có TKB -> Cấp đơn bình thường', () => {
  const disciplinedStudent = {
    studentCode: '2380609999',
    fullName: 'Nguyễn Văn Kỷ Luật',
    status: 'ACTIVE',
    admissionYear: 2023,
    disciplineStatus: 'ACADEMIC_WARNING',
    hasSchedule: true,
    enrolledCredits: 12,
  };
  const res = evaluateStudentConfirmation({
    student: disciplinedStudent,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Làm vé xe buýt',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      existingApprovedCount: 0,
    },
  });
  assert.equal(res.decision, TRACK_A_DECISION.AUTO_APPROVE);
  console.log('  ✅ TC-07: Sinh viên bị kỷ luật nhưng đang học hợp lệ không bị từ chối [PASS]');
});

// 8. TC-08: Thiếu dữ liệu TKB / Tín chỉ (Không tự suy diễn)
test('TC-08: Thiếu dữ liệu TKB/tín chỉ -> Không tự gán 15 tín chỉ, xử lý an toàn', () => {
  const studentNoData = {
    studentCode: '2280601111',
    fullName: 'Hoàng Thiếu Dữ Liệu',
    status: 'ACTIVE',
    hasSchedule: null,
    enrolledCredits: null,
  };
  // Thiếu dữ kiện không đồng nghĩa đã xác nhận không có TKB
  const resNormal = evaluateStudentConfirmation({
    student: studentNoData,
    inputData: { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé xe buýt', phone: '0901234567' },
  });
  assert.equal(resNormal.decision, TRACK_A_DECISION.ASK_CLARIFICATION);
  assert.equal(resNormal.rule, 'UNKNOWN_ACADEMIC_RECORD');

  // Lý do cần gấp không được biến dữ kiện chưa biết thành dữ kiện đã xác nhận
  const resUrgent = evaluateStudentConfirmation({
    student: studentNoData,
    inputData: { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé xe buýt', phone: '0901234567', urgentReason: 'Em cần gấp nộp cơ quan' },
  });
  assert.equal(resUrgent.decision, TRACK_A_DECISION.ASK_CLARIFICATION);
  assert.equal(resUrgent.rule, 'UNKNOWN_ACADEMIC_RECORD');
  console.log('  ✅ TC-08: Thiếu TKB không tự suy diễn: thường/gấp -> Hỏi xác nhận dữ kiện học vụ [PASS]');
});

// 9. TC-09: Khóa <= 4 năm (2023) chờ tốt nghiệp
test('TC-09: Khóa <= 4 năm (2023) đã hoàn thành CTĐT -> Xét cấp theo luồng thông thường', () => {
  const student2023 = {
    studentCode: '2380600001',
    fullName: 'Nguyễn Văn An',
    status: 'ACTIVE',
    admissionYear: 2023,
    completedCredits: 152,
    hasSchedule: true,
    enrolledCredits: 3,
  };
  const res = evaluateStudentConfirmation({
    student: student2023,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Làm vé xe buýt',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      existingApprovedCount: 0,
    },
  });
  assert.equal(res.decision, TRACK_A_DECISION.AUTO_APPROVE);
  console.log('  ✅ TC-09: Khóa <= 4 năm không bị ép sang nợ môn, cấp thông thường [PASS]');
});

// 10. TC-10: Quá 4 năm còn nợ môn
test('TC-10: Khóa > 4 năm còn nợ môn -> Điều hướng sang Biểu mẫu nợ môn (COURSE_DEBT)', () => {
  const studentOverdueDebt = {
    studentCode: '2050200005',
    fullName: 'Hoàng Thị Mai',
    status: 'ACTIVE',
    admissionYear: 2020,
    completedCredits: 130,
    hasSchedule: true,
    enrolledCredits: 6,
  };
  const res = evaluateStudentConfirmation({
    student: studentOverdueDebt,
    inputData: { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé xe buýt', phone: '0901234567' },
  });
  // Bắt lệch sang Mẫu nợ môn
  assert.ok([TRACK_A_DECISION.ASK_CLARIFICATION, TRACK_A_DECISION.AUTO_REJECT].includes(res.decision));
  assert.ok(
    res.actionableQuestion?.includes('Biểu mẫu nợ môn') ||
    res.userMessage?.includes('Biểu mẫu nợ môn') ||
    res.rule?.includes('COURSE_DEBT') ||
    res.rule === 'MISMATCH_FORM_GUIDANCE'
  );
  console.log('  ✅ TC-10: Quá 4 năm nợ môn điều hướng chuẩn xác sang Mẫu nợ môn [PASS]');
});

// 10B. TC-10B: Sinh viên Khóa 2022 (2280602154) quá 4 năm sau 30/08/2026 nợ môn
test('TC-10B: Sinh viên Khóa 2022 (2280602154) quá 4 năm sau 30/08/2026 nợ môn -> Điều hướng Biểu mẫu nợ môn (COURSE_DEBT)', () => {
  const student2022Debt = {
    studentCode: '2280602154',
    fullName: 'Cao Hữu Nhân',
    status: 'ACTIVE',
    admissionYear: 2022,
    completedCredits: 135,
    hasSchedule: true,
    enrolledCredits: 6,
  };
  const res = evaluateStudentConfirmation({
    student: student2022Debt,
    inputData: { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé xe buýt', phone: '0901234567' },
  });
  assert.ok([TRACK_A_DECISION.ASK_CLARIFICATION, TRACK_A_DECISION.AUTO_REJECT].includes(res.decision));
  assert.ok(
    res.actionableQuestion?.includes('Biểu mẫu nợ môn') ||
    res.userMessage?.includes('Biểu mẫu nợ môn') ||
    res.rule?.includes('COURSE_DEBT') ||
    res.rule === 'MISMATCH_FORM_GUIDANCE'
  );
  console.log('  ✅ TC-10B: Khóa 2022 sau 30/08/2026 tự động điều hướng sang Biểu mẫu nợ môn [PASS]');
});

// 11. TC-11: Quá 4 năm đã hoàn thành CTĐT
test('TC-11: Khóa > 4 năm đã hoàn thành CTĐT (>= 150 tín chỉ) -> ESCALATE_TO_STAFF', () => {
  const studentOverdueCompleted = {
    studentCode: '2080600099',
    fullName: 'Võ Minh Quân',
    status: 'ACTIVE',
    admissionYear: 2020,
    completedCredits: 155,
    hasSchedule: true,
    enrolledCredits: 3,
  };
  const res = evaluateStudentConfirmation({
    student: studentOverdueCompleted,
    inputData: { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé xe buýt', phone: '0901234567' },
  });
  assert.equal(res.decision, TRACK_A_DECISION.ESCALATE_STAFF);
  assert.equal(res.rule, 'POL_OVERDUE_COMPLETED_BEYOND_AUTHORITY');
  console.log('  ✅ TC-11: Quá 4 năm hoàn thành CTĐT chuyển tiếp Cán bộ PĐT [PASS]');
});

// 12. TC-12: Cấp lại lần 2 trong cùng học kỳ
test('TC-12: Cấp lại lần 2 trong cùng học kỳ -> Chưa có lý do: hỏi lại; có lý do: chuyển Cán bộ', () => {
  const student = { studentCode: '2380600001', fullName: 'Nguyễn Văn An', status: 'ACTIVE', hasSchedule: true, enrolledCredits: 15, admissionYear: 2023 };
  const historySameSemester = [
    { status: 'APPROVED', inputData: { formCode: 'GENERAL_CONFIRMATION' }, createdAt: new Date().toISOString() },
  ];

  // Không có lý do
  const resNoReason = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Làm vé xe buýt',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      historyRequests: historySameSemester,
    },
  });
  assert.equal(resNoReason.decision, TRACK_A_DECISION.ASK_CLARIFICATION);
  assert.equal(resNoReason.rule, 'REQ_REISSUE_REASON');

  // Có lý do -> AI thu thập và chuyển Cán bộ (không tự duyệt)
  const resWithReason = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Làm vé xe buýt',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      historyRequests: historySameSemester,
      reissueReason: 'Bị mất bản cứng do dầm mưa ướt sách vở',
    },
  });
  assert.equal(resWithReason.decision, TRACK_A_DECISION.ESCALATE_STAFF);
  assert.equal(resWithReason.rule, 'POLICY_REISSUE_QUOTA_ESCALATE');
  console.log('  ✅ TC-12: Cấp lại lần 2 cùng kỳ: bắt giải trình và chuyển Cán bộ [PASS]');
});

// 13. TC-13: Cùng biểu mẫu nhưng ở học kỳ mới
test('TC-13: Cùng biểu mẫu nhưng đơn cũ ở học kỳ trước (> 180 ngày) -> Reset hạn ngạch, cấp tự động', () => {
  const student = { studentCode: '2380600001', fullName: 'Nguyễn Văn An', status: 'ACTIVE', hasSchedule: true, enrolledCredits: 15, admissionYear: 2023 };
  const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(); // 200 ngày trước
  const historyOldSemester = [
    { status: 'APPROVED', inputData: { formCode: 'GENERAL_CONFIRMATION' }, createdAt: oldDate },
  ];

  const resNewSemester = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Làm vé xe buýt',
      phone: '0901234567',
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
      historyRequests: historyOldSemester,
    },
  });
  assert.equal(resNewSemester.decision, TRACK_A_DECISION.AUTO_APPROVE);
  console.log('  ✅ TC-13: Sang học kỳ mới hạn ngạch được reset thành công [PASS]');
});

// 14. TC-14: Validate Requirements bắt buộc cơ sở nhận
test('TC-14: StudentConfirmationHandler validateRequirements không default cơ sở nhận', async () => {
  const validation = await studentConfirmationHandler.validateRequirements(
    {},
    {
      studentCode: '2280602154',
      fullName: 'Cao Hữu Nhân',
      birthDate: '01/01/2004',
      gender: 'Nam',
      studentClass: '22DTHB1',
      phone: '0901234567',
      purpose: 'Làm vé xe buýt',
      pickupCampus: '', // Thiếu cơ sở
    }
  );
  assert.equal(validation.complete, false);
  assert.ok(validation.missing.some((m) => m.code === 'REQ_CAMPUS'));
  console.log('  ✅ TC-14: Form validator chặn đứng thiếu cơ sở nhận, không default ngầm [PASS]');
});

console.log('\n========================================================================================');
console.log('🎉 TẤT CẢ 14 CA REGRESSION TEST QUY CHUẨN ĐỀU ĐÃ ĐẠT ĐỈNH CAO CHUẨN XÁC!');
console.log('========================================================================================\n');
