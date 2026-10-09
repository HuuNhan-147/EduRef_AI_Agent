// backend/test/system-architecture-mdj.test.js
// Bộ kiểm thử tự động kiểm chứng 100% các luồng quyết định theo Sơ đồ StarUML SoDoHeThong_EduRef_AI.mdj

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateStudentConfirmation,
  detectCrossFormMismatch,
  checkCohortOverdueStatus,
  HUTECH_FORMS,
} from '../services/StudentConfirmationDecisionService.js';

test('1. TC-1: Sinh viên ACTIVE, có TKB, đủ thông tin, không trùng -> AUTO_APPROVE', () => {
  const student = {
    studentCode: '2280602154',
    fullName: 'Cao Hữu Nhân',
    status: 'ACTIVE',
    admissionYear: 2022,
    enrolledCredits: 15,
    hasSchedule: true,
  };
  const inputData = {
    formCode: 'MILITARY_DEFERMENT',
    purpose: 'Tạm hoãn nghĩa vụ quân sự năm 2026',
    pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)',
    permanentAddress: '180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
    phone: '0901234567',
  };

  const result = evaluateStudentConfirmation({ student, inputData });
  assert.equal(result.decision, 'AUTO_APPROVED');
  assert.equal(result.classification, 'ROUTINE');
});

test('2. TC-2: Thiếu mục đích sử dụng -> ASK_CLARIFICATION', () => {
  const student = {
    studentCode: '2280602154',
    fullName: 'Cao Hữu Nhân',
    status: 'ACTIVE',
    admissionYear: 2022,
    enrolledCredits: 15,
    hasSchedule: true,
  };
  const inputData = {
    formCode: 'GENERAL_CONFIRMATION',
    purpose: '', // Trống mục đích
    pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)',
  };

  const result = evaluateStudentConfirmation({ student, inputData });
  assert.equal(result.decision, 'ASK_CLARIFICATION');
  assert.equal(result.rule, 'REQ_PURPOSE');
  assert.ok(result.actionableQuestion);
});

test('3. TC-3: Sinh viên BẢO LƯU (SUSPENDED - 2110004) -> REJECT NGAY LẬP TỨC (không bypass, không sang Mẫu nợ môn)', () => {
  const suspendedStudent = {
    studentCode: '2110004',
    fullName: 'Phạm Văn Dũng',
    status: 'SUSPENDED', // Bảo lưu kết quả học tập
    admissionYear: 2021,
    enrolledCredits: 0,
    hasSchedule: false,
  };

  // 3a. Thử kiểm tra mismatch chéo: Không được ép sang COURSE_DEBT
  const mismatch = detectCrossFormMismatch({
    currentFormCode: 'TAX_DEDUCTION',
    text: 'Em xin cấp giấy xác nhận giảm thuế thu nhập cá nhân',
    student: suspendedStudent,
  });
  assert.equal(mismatch.isMismatch, false);

  // 3b. Evaluate policy: Bắt buộc reject ngay lập tức với rule POL_SUSPENDED_STUDENT_DENY
  const result = evaluateStudentConfirmation({
    student: suspendedStudent,
    inputData: {
      formCode: 'TAX_DEDUCTION',
      purpose: 'Giảm trừ gia cảnh thuế TNCN',
      pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)',
    },
  });

  assert.equal(result.decision, 'REJECTED_POLICY');
  assert.equal(result.rule, 'POL_SUSPENDED_STUDENT_DENY');
  assert.ok(result.userMessage.includes('bảo lưu'));
});

test('4. TC-4: Sinh viên THÔI HỌC (DROPPED - 2110002) -> REJECT NGAY LẬP TỨC', () => {
  const droppedStudent = {
    studentCode: '2110002',
    fullName: 'Trần Thị Bình',
    status: 'DROPPED', // Thôi học
    admissionYear: 2021,
    enrolledCredits: 0,
    hasSchedule: false,
  };

  const result = evaluateStudentConfirmation({
    student: droppedStudent,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Bổ sung hồ sơ học tập',
      pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)',
    },
  });

  assert.equal(result.decision, 'REJECTED_POLICY');
  assert.equal(result.rule, 'POL_DROPPED_STUDENT_DENY');
  assert.ok(result.userMessage.includes('thôi học'));
});

test('5. TC-5: Sinh viên quá 4 năm VÀ CÒN NỢ TÍN CHỈ (< 150 tín chỉ) -> Điều hướng Biểu mẫu nợ môn (COURSE_DEBT)', () => {
  const overdueStudentWithDebt = {
    studentCode: '2110005',
    fullName: 'Hoàng Thị Mai',
    status: 'ACTIVE',
    admissionYear: 2020, // Quá 4 năm
    enrolledCredits: 3,  // Chưa đủ 150 tín chỉ
    credits: 120,
    hasSchedule: true,
  };

  const overdueStatus = checkCohortOverdueStatus(overdueStudentWithDebt);
  assert.equal(overdueStatus.isOverdue, true);
  assert.equal(overdueStatus.hasDebtCourses, true);
  assert.equal(overdueStatus.isCompleted, false);

  // Nếu nộp biểu mẫu khác -> Bị phát hiện lệch form và điều hướng sang COURSE_DEBT (ASK_CLARIFICATION)
  const result = evaluateStudentConfirmation({
    student: overdueStudentWithDebt,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Xác nhận để nộp cơ quan nghĩa vụ quân sự',
      pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)',
    },
  });

  assert.equal(result.decision, 'ASK_CLARIFICATION');
  assert.equal(result.rule, 'MISMATCH_FORM_GUIDANCE');
  assert.ok(result.actionableQuestion.includes('nợ môn') || result.actionableQuestion.includes('COURSE_DEBT'));
});

test('6. TC-6: Sinh viên quá 4 năm NHƯNG ĐÃ HOÀN THÀNH ĐỦ KHỐI LƯỢNG (>= 150 tín chỉ hoặc GRADUATED) -> VƯỢT QUYỀN AI, ESCALATE_TO_STAFF', () => {
  const overdueStudentCompleted = {
    studentCode: '2010099',
    fullName: 'Võ Minh Quân',
    status: 'ACTIVE',
    admissionYear: 2020, // Quá 4 năm
    enrolledCredits: 150, // Đã hoàn thành đủ 150 tín chỉ chuẩn kỹ sư/cử nhân HUTECH
    credits: 150,
    hasSchedule: true,
  };

  const overdueStatus = checkCohortOverdueStatus(overdueStudentCompleted);
  assert.equal(overdueStatus.isOverdue, true);
  assert.equal(overdueStatus.isCompleted, true);
  assert.equal(overdueStatus.hasDebtCourses, false);

  const result = evaluateStudentConfirmation({
    student: overdueStudentCompleted,
    inputData: {
      formCode: 'GENERAL_CONFIRMATION',
      purpose: 'Xin giấy xác nhận hoàn thành chương trình đào tạo để nộp cơ quan công tác',
      pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)',
    },
  });

  assert.equal(result.decision, 'ESCALATE_TO_STAFF');
  assert.equal(result.classification, 'BEYOND_AUTHORITY');
  assert.equal(result.rule, 'POL_OVERDUE_COMPLETED_BEYOND_AUTHORITY');
  assert.ok(result.actionableQuestion.includes('Cán bộ PĐT'));
});

test('7. TC-7: Cấp trùng biểu mẫu lần 2 trong cùng học kỳ CÓ LÝ DO CHÍNH ĐÁNG -> ESCALATE_TO_STAFF', () => {
  const student = {
    studentCode: '2280602154',
    fullName: 'Cao Hữu Nhân',
    status: 'ACTIVE',
    admissionYear: 2022,
    enrolledCredits: 15,
    hasSchedule: true,
  };
  const inputData = {
    formCode: 'MILITARY_DEFERMENT',
    purpose: 'Tạm hoãn nghĩa vụ quân sự',
    pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)',
    permanentAddress: '180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
    existingApprovedCount: 1, // Đã được cấp 1 lần
    reissueReason: 'Bản cấp trước bị ướt rách do đi mưa, cần cấp lại để bổ sung Ban CHQS Phường',
  };

  const result = evaluateStudentConfirmation({ student, inputData });
  assert.equal(result.decision, 'ESCALATE_TO_STAFF');
  assert.equal(result.rule, 'POLICY_REISSUE_QUOTA_ESCALATE');
  assert.ok(result.actionableQuestion.includes('cấp lại lần 2'));
});

test('8. TC-8: Sinh viên chưa có TKB kỳ này nhưng CẦN GẤP -> Đóng gói chuyển tiếp ESCALATE_TO_STAFF', () => {
  const student = {
    studentCode: '2280602999',
    fullName: 'Lê Văn Khang',
    status: 'ACTIVE',
    admissionYear: 2022,
    enrolledCredits: 0, // Kỳ này chưa đăng ký môn
    hasSchedule: false,
  };
  const inputData = {
    formCode: 'GENERAL_CONFIRMATION',
    purpose: 'Bổ sung hồ sơ công ty gấp trước ngày 15 để không bị hủy hợp đồng thực tập',
    pickupCampus: 'Trụ sở chính: phòng Công tác sinh viên (A-01.01)',
  };

  const result = evaluateStudentConfirmation({ student, inputData });
  assert.equal(result.decision, 'ESCALATE_TO_STAFF');
  assert.equal(result.rule, 'POL_NO_SCHEDULE_BUT_URGENT_ESCALATE');
  assert.ok(result.userMessage.includes('đóng gói chuyển tiếp'));
});

test('9. TC-9: Sinh viên hỏi Visa nhưng gửi kèm Biểu mẫu Thuế TNCN -> Bắt lệch form và ASK_CLARIFICATION', () => {
  const student = {
    studentCode: '2280602154',
    fullName: 'Cao Hữu Nhân',
    status: 'ACTIVE',
    admissionYear: 2022,
    enrolledCredits: 15,
    hasSchedule: true,
  };

  const mismatch = detectCrossFormMismatch({
    currentFormCode: 'TAX_DEDUCTION',
    text: 'Em cần xin giấy xác nhận sinh viên để làm thủ tục xin visa du học hè',
    student,
  });

  assert.equal(mismatch.isMismatch, true);
  assert.equal(mismatch.targetForm.code, 'GENERAL_CONFIRMATION');
});

test('10. TC-10: Sinh viên xin Thuế TNCN nhưng nơi tiếp nhận lại ghi Ban Chỉ huy Quân sự -> Bắt xung đột ASK_CLARIFICATION', () => {
  const student = {
    studentCode: '2280602154',
    fullName: 'Cao Hữu Nhân',
    status: 'ACTIVE',
    admissionYear: 2022,
    enrolledCredits: 15,
    hasSchedule: true,
  };

  const mismatch = detectCrossFormMismatch({
    currentFormCode: 'TAX_DEDUCTION',
    text: 'Xin đơn thuế nộp Ban Chỉ huy Quân sự Phường 25',
    student,
    inputData: { recipientAgency: 'Ban Chỉ huy Quân sự Phường 25, Quận Bình Thạnh' },
  });

  assert.equal(mismatch.isMismatch, true);
  assert.ok(mismatch.guidanceMessage.includes('Ban Chỉ huy Quân sự'));
});
