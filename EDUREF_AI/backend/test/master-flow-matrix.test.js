import test from 'node:test';
import assert from 'node:assert/strict';
import AcademicWorkflowService from '../services/AcademicWorkflowService.js';
import { evaluateStudentConfirmation } from '../services/StudentConfirmationDecisionService.js';

test('MASTER E2E: Kiểm chứng tất cả 8 luồng từ Điểm Bắt Đầu đến đúng Điểm Đích (ActivityFinalNode1) của Sơ Đồ .mdj', async () => {
  console.log('\n========================================================================================');
  console.log('📊 MA TRẬN KIỂM CHỨNG TOÀN DIỆN TẤT CẢ CÁC LUỒNG THEO SƠ ĐỒ HỆ THỐNG SODOHETHONG_EDUREF_AI.MDJ');
  console.log('========================================================================================\n');

  // --------------------------------------------------------------------------
  // LUỒNG 1: Chào hỏi / Hỏi thông tin chung -> Trả lời bình thường -> ĐÍCH
  // --------------------------------------------------------------------------
  console.log('▶ [LUỒNG 1] Chào hỏi / Tìm hiểu thông tin:');
  const inquiryRes = evaluateStudentConfirmation({
    student: { studentCode: '2280602154', status: 'ACTIVE' },
    inputData: { isInquiry: true },
  });
  assert.equal(inquiryRes.decision, 'ASK_CLARIFICATION');
  assert.equal(inquiryRes.rule, 'INQUIRY_NOT_PETITION_INTENT');
  console.log('  ✅ Điểm đích: Tư vấn thông tin học vụ, không tự tiện nộp đơn [OK]\n');

  // --------------------------------------------------------------------------
  // LUỒNG 2: Thiếu thông tin bắt buộc (SĐT / Cơ sở / Địa chỉ sai) -> Hỏi lại -> ĐÍCH
  // --------------------------------------------------------------------------
  console.log('▶ [LUỒNG 2] Check thiếu thông tin bắt buộc (Thiếu SĐT / Cơ sở / Địa chỉ viết thường):');
  const missingPhoneRes = await AcademicWorkflowService.processStudentConfirmation({
    studentCode: '2280602154',
    purpose: 'Làm vé tháng xe buýt',
    pickupCampus: 'Sai Gon Campus (A-01.01)',
    phone: '', // Thiếu SĐT
  });
  assert.equal(missingPhoneRes.decision, 'ASK_CLARIFICATION');

  const badAddressRes = await AcademicWorkflowService.processStudentConfirmation({
    studentCode: '2280602154',
    formCode: 'MILITARY_DEFERMENT',
    purpose: 'Tạm hoãn nghĩa vụ quân sự',
    phone: '0901234567',
    pickupCampus: 'Sai Gon Campus (A-01.01)',
    permanentAddress: 'phạm thị tư , ấp châu phú , Hòa bình , bạc liêu', // Viết thường
  });
  assert.equal(badAddressRes.decision, 'ASK_CLARIFICATION');
  console.log('  ✅ Điểm đích: [Hỏi lại] (ASK_CLARIFICATION) chỉ rõ trường thiếu/sai [OK]\n');

  // --------------------------------------------------------------------------
  // LUỒNG 3: Quá 4 năm & Còn nợ môn -> Điều hướng Biểu mẫu nợ môn -> ĐÍCH
  // --------------------------------------------------------------------------
  console.log('▶ [LUỒNG 3] Quá 4 năm VÀ Còn nợ môn (hasDebtCourses = true):');
  const debtStudent = {
    studentCode: '1910001',
    admissionYear: 2019, // Quá 4 năm
    completedCredits: 130, // Chưa đủ 150 tín chỉ
    status: 'ACTIVE',
    hasSchedule: true,
  };
  const debtRes = evaluateStudentConfirmation({
    student: debtStudent,
    inputData: { formCode: 'GENERAL_CONFIRMATION', purpose: 'Xin cấp giấy xác nhận', phone: '0901234567' },
  });
  assert.equal(debtRes.decision, 'ASK_CLARIFICATION');
  assert.ok(debtRes.actionableQuestion.includes('COURSE_DEBT') || debtRes.actionableQuestion.includes('nợ môn'));
  console.log('  ✅ Điểm đích: [hướng dẫn về biểu mẫu nợ môn] (Hỏi lại & Hướng dẫn chuyển sang COURSE_DEBT) [OK]\n');

  // --------------------------------------------------------------------------
  // LUỒNG 4: Quá 4 năm & ĐÃ HOÀN THÀNH ĐỦ CTĐT (>= 150 tín chỉ) -> Vượt quyền AI -> ĐÍCH
  // --------------------------------------------------------------------------
  console.log('▶ [LUỒNG 4] Quá 4 năm NHƯNG ĐÃ HOÀN THÀNH ĐỦ CTĐT (>= 150 tín chỉ):');
  const finishedStudent = {
    studentCode: '1910002',
    admissionYear: 2019,
    completedCredits: 152, // Đã đủ tín chỉ
    status: 'ACTIVE',
    hasSchedule: true,
  };
  const finishedRes = evaluateStudentConfirmation({
    student: finishedStudent,
    inputData: { purpose: 'Xác nhận hoàn thành khóa học', phone: '0901234567' },
  });
  assert.equal(finishedRes.decision, 'ESCALATE_TO_STAFF');
  assert.equal(finishedRes.rule, 'POL_OVERDUE_COMPLETED_BEYOND_AUTHORITY');
  console.log('  ✅ Điểm đích: [vượt quá quyền hướng dẫn sinh viên liên hệ phòng CTSV để được hỗ trợ đóng gói chuyển tiếp] [OK]\n');

  // --------------------------------------------------------------------------
  // LUỒNG 5: Không có TKB & BẢO LƯU / THÔI HỌC -> Reject ngay lập tức -> Không bypass -> ĐÍCH
  // --------------------------------------------------------------------------
  console.log('▶ [LUỒNG 5] Không có TKB & BẢO LƯU / THÔI HỌC:');
  const suspendedRes = evaluateStudentConfirmation({
    student: { studentCode: '2110004', status: 'SUSPENDED', hasSchedule: false },
    inputData: { purpose: 'Tạm hoãn NVQS', phone: '0901234567' },
  });
  assert.equal(suspendedRes.decision, 'REJECTED_POLICY');
  assert.equal(suspendedRes.rule, 'POL_SUSPENDED_STUDENT_DENY');
  assert.ok(suspendedRes.userMessage.includes('không được bypass vì bất kỳ lý do nào'));

  const droppedRes = evaluateStudentConfirmation({
    student: { studentCode: '2110002', status: 'DROPPED', hasSchedule: false },
    inputData: { purpose: 'Tạm hoãn NVQS', phone: '0901234567' },
  });
  assert.equal(droppedRes.decision, 'REJECTED_POLICY');
  assert.equal(droppedRes.rule, 'POL_DROPPED_STUDENT_DENY');
  console.log('  ✅ Điểm đích: [Reject ngay lập tức] -> [không được bypass bất cứ lý do nào] -> [vui lòng gặp trực tiếp phòng CTSV] [OK]\n');

  // --------------------------------------------------------------------------
  // LUỒNG 6: Chưa có TKB nhưng CẦN GẤP -> Đóng gói chuyển Cán bộ -> ĐÍCH
  // --------------------------------------------------------------------------
  console.log('▶ [LUỒNG 6] Chưa có TKB học kỳ này nhưng CẦN GẤP:');
  const urgentRes = evaluateStudentConfirmation({
    student: { studentCode: '2280602154', status: 'ACTIVE', hasSchedule: false, enrolledCredits: 0, fullName: 'Cao Hữu Nhân' },
    inputData: { purpose: 'Làm visa du học', urgentReason: 'Cần nộp gấp cho Đại sứ quán trong tuần này', phone: '0901234567' },
  });
  assert.equal(urgentRes.decision, 'ESCALATE_TO_STAFF');
  assert.equal(urgentRes.rule, 'POL_NO_SCHEDULE_BUT_URGENT_ESCALATE');
  console.log('  ✅ Điểm đích: [nếu sinh viên cần gấp thì đóng gói chuyển] (ESCALATE_TO_STAFF) [OK]\n');

  // --------------------------------------------------------------------------
  // LUỒNG 7: Có TKB & Trùng biểu mẫu:
  // - Chưa có lý do -> Báo trùng cần trình bày lý do -> ĐÍCH
  // - Có lý do giải trình -> Đóng gói chuyển tiếp Cán bộ -> ĐÍCH
  // --------------------------------------------------------------------------
  console.log('▶ [LUỒNG 7] Có TKB & Check có trùng biểu mẫu không (Reissue Guard):');
  const dupNoReason = evaluateStudentConfirmation({
    student: { studentCode: '2280602154', status: 'ACTIVE', hasSchedule: true, fullName: 'Cao Hữu Nhân' },
    inputData: { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé xe buýt', existingApprovedCount: 1, reissueReason: '' },
  });
  assert.equal(dupNoReason.decision, 'ASK_CLARIFICATION');
  assert.equal(dupNoReason.rule, 'REQ_REISSUE_REASON');
  console.log('  ✅ Nhánh 7a: [báo yêu cầu bị trùng cần trình bày lý do hoặc chọn biểu mẫu khác] [OK]');

  const dupWithReason = evaluateStudentConfirmation({
    student: { studentCode: '2280602154', status: 'ACTIVE', hasSchedule: true, fullName: 'Cao Hữu Nhân' },
    inputData: { formCode: 'GENERAL_CONFIRMATION', purpose: 'Làm vé xe buýt', existingApprovedCount: 1, reissueReason: 'Bị mất bản cứng do dầm mưa ướt sách vở' },
  });
  assert.equal(dupWithReason.decision, 'ESCALATE_TO_STAFF');
  assert.equal(dupWithReason.rule, 'POLICY_REISSUE_QUOTA_ESCALATE');
  console.log('  ✅ Nhánh 7b: [Có lý do đóng gói chuyển tiếp cho cán bộ] (ESCALATE_TO_STAFF) -> Điểm đích cuối [OK]\n');

  // --------------------------------------------------------------------------
  // LUỒNG 8: Có TKB, Đủ thông tin, Không trùng -> AUTO CẤP -> ĐÍCH CUỐI CÙNG
  // --------------------------------------------------------------------------
  console.log('▶ [LUỒNG 8] Sinh viên bình thường, có TKB, đủ thông tin, không trùng:');
  const autoApproveRes = await AcademicWorkflowService.processStudentConfirmation({
    studentCode: '2280602154',
    formCode: 'MILITARY_DEFERMENT',
    purpose: 'Tạm hoãn nghĩa vụ quân sự',
    phone: '0901234567',
    permanentAddress: 'Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    existingApprovedCount: 0,
  });
  assert.equal(autoApproveRes.decision, 'AUTO_APPROVED');
  assert.equal(autoApproveRes.status, 'APPROVED');
  assert.ok(autoApproveRes.sha256Proof, 'Mã băm SHA-256 xác thực');
  console.log('  ✅ Điểm đích: [Auto cấp] -> Cấp mã xác thực SHA-256 -> [ActivityFinalNode1] [OK]\n');

  console.log('========================================================================================');
  console.log('🎉 KẾT QUẢ: 100% TẤT CẢ CÁC LUỒNG VÀ NHÁNH RẼ TRONG SƠ ĐỒ ĐỀU VỀ ĐÍCH CHUẨN XÁC TUYỆT ĐỐI!');
  console.log('========================================================================================\n');
});
