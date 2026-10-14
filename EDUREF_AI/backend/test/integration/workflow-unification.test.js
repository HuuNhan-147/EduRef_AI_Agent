import '../../testSupport/integrationTestEnv.js';
import test from 'node:test';
import assert from 'node:assert/strict';


import AcademicWorkflowService from '../../services/AcademicWorkflowService.js';
import {
  validatePermanentAddress,
  formatVietnameseAddress,
  calculatePickupAppointment,
  evaluateStudentConfirmation,
} from '../../services/StudentConfirmationDecisionService.js';

test('1. Zero-Tolerance Guard: Thiếu số điện thoại (phone) BẮT BUỘC trả về ASK_CLARIFICATION', async () => {
  const studentCode = '2380600001';
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    purpose: 'Đăng ký vé tháng xe buýt',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    phone: null, // Không gửi SĐT -> Hệ thống KHÔNG ĐƯỢC tự động lấy SĐT cũ trong profile
  });

  assert.equal(agentResult.decision, 'ASK_CLARIFICATION');
  assert.ok(agentResult.actionableQuestion.includes('số điện thoại'));
});

test('2. Zero-Tolerance Guard: Thiếu cơ sở nhận (pickupCampus) BẮT BUỘC trả về ASK_CLARIFICATION', async () => {
  const studentCode = '2380600001';
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    purpose: 'Đăng ký vé tháng xe buýt',
    phone: '0901234567',
    pickupCampus: '', // Thiếu cơ sở -> CẤM tự động gán Sai Gon Campus
  });

  assert.equal(agentResult.decision, 'ASK_CLARIFICATION');
  assert.ok(agentResult.actionableQuestion.includes('cơ sở'));
});

test('3. Trọng tâm Thầy CTSV: Địa chỉ viết thường cẩu thả không đủ 4 cấp BẮT BUỘC bị chặn và yêu cầu sửa', async () => {
  const badAddress = 'phạm thị tư , ấp châu phú , Hòa bình , bạc liêu';
  const check = validatePermanentAddress(badAddress);

  assert.equal(check.isValid, false, 'Địa chỉ viết thường cẩu thả không được hợp lệ');
  assert.ok(check.reason.includes('viết hoa') || check.reason.includes('cấp hành chính'));

  const studentCode = '2380600001';
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    formCode: 'MILITARY_DEFERMENT',
    purpose: 'Tạm hoãn nghĩa vụ quân sự',
    phone: '0901234567',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    permanentAddress: badAddress,
  });

  assert.equal(agentResult.decision, 'ASK_CLARIFICATION');
  assert.ok(agentResult.actionableQuestion.includes('địa chỉ') || agentResult.actionableQuestion.includes('viết hoa'));
});

test('4. Trọng tâm Thầy CTSV: Phát hiện nhầm địa chỉ tạm trú/KTX sang địa chỉ thường trú giấy NVQS', async () => {
  const ktxAddress = 'Phòng 102, Ký túc xá khu B, TP. Dĩ An, Tỉnh Bình Dương';
  const check = validatePermanentAddress(ktxAddress);

  assert.equal(check.isValid, false);
  assert.equal(check.isTemporaryAddress, true);
  assert.ok(check.reason.includes('tạm trú') || check.reason.includes('KTX'));
});

test('5. Đầy đủ dữ liệu chuẩn xác 100%: Tự động phê duyệt (AUTO_APPROVED)', async () => {
  const studentCode = '2380600001';
  const inputData = {
    formCode: 'MILITARY_DEFERMENT',
    purpose: 'Tạm hoãn nghĩa vụ quân sự',
    phone: '0901234567',
    permanentAddress: 'Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    existingApprovedCount: 0,
    isAddressConfirmed: true, // Sinh viên đã xác nhận đúng địa chỉ NVQS
  };

  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    ...inputData,
  });

  assert.equal(agentResult.decision, 'AUTO_APPROVED');
  assert.equal(agentResult.status, 'APPROVED');
  assert.ok(agentResult.sha256Proof, 'Phải có mã băm xác thực SHA-256');
});

test('6. Sơ đồ .mdj: Sinh viên thôi học (DROPPED) BẮT BUỘC Reject ngay lập tức không bypass', async () => {
  const studentCode = '2150200002'; // Sinh viên đã thôi học (10 số chuẩn)
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    purpose: 'Tạm hoãn nghĩa vụ quân sự',
    phone: '0901234567',
    pickupCampus: 'Sai Gon Campus (A-01.01)',
    permanentAddress: 'Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu',
  });

  assert.equal(agentResult.decision, 'REJECTED_POLICY');
  assert.equal(agentResult.status, 'REJECTED');
});

test('7. Thống nhất logic xin lại lần 2 (Reissue Guard): Không có lý do -> Bắt buộc hỏi lại', async () => {
  const studentCode = '2380600001';
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    formCode: 'GENERAL_CONFIRMATION',
    purpose: 'Làm vé tháng xe buýt',
    phone: '0901234567',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    existingApprovedCount: 1, // Đã có 1 đơn duyệt trong kỳ
    reissueReason: '', // Không cung cấp lý do
  });

  assert.equal(agentResult.decision, 'ASK_CLARIFICATION');
  assert.ok(agentResult.actionableQuestion.includes('cấp lại lần 2') || agentResult.actionableQuestion.includes('lý do'));
});

test('8. Thống nhất logic xin lại lần 2 (Reissue Guard): CÓ lý do chính đáng -> Chuyển tiếp Cán bộ (ESCALATE_TO_STAFF)', async () => {
  const studentCode = '2380600001';
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    formCode: 'GENERAL_CONFIRMATION',
    purpose: 'Làm vé tháng xe buýt',
    phone: '0901234567',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    existingApprovedCount: 1, // Đã có 1 đơn duyệt trong kỳ
    reissueReason: 'Bị mất bản cứng do dầm mưa ướt sách vở', // Đã có lý do giải trình
  });

  assert.equal(agentResult.decision, 'ESCALATE_TO_STAFF');
  assert.ok(agentResult.actionableQuestion.includes('phê duyệt cấp lại'));
});

test('9. Context Guard: Lệch biểu mẫu giữa các lượt hội thoại (Multi-turn mismatch) -> Hỏi lại làm rõ', async () => {
  const studentCode = '2380600001';
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    formCode: 'TAX_DEDUCTION', // Nộp đơn Thuế
    purpose: 'Xin cấp giấy giảm trừ gia cảnh thuế TNCN',
    phone: '0901234567',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    permanentAddress: '180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
    conversationHistory: [
      { role: 'user', parts: [{ text: 'Em muốn xin giấy tạm hoãn nghĩa vụ quân sự thì cần những gì?' }] },
      { role: 'model', parts: [{ text: 'Để xin giấy tạm hoãn NVQS bạn cần cung cấp địa chỉ thường trú 4 cấp và số điện thoại nhé.' }] },
    ],
  });

  assert.equal(agentResult.decision, 'ASK_CLARIFICATION');
  assert.ok(agentResult.actionableQuestion.includes('nghĩa vụ quân sự') || agentResult.actionableQuestion.includes('nhầm'));
});

test('10. Address Engine: Tự động format Title Case cho địa chỉ nông thôn không cần số nhà', async () => {
  const rawAddr = 'ấp bình an , xã vĩnh hưng , huyện vĩnh lợi , tỉnh bạc liêu';
  const formatted = formatVietnameseAddress(rawAddr);
  assert.equal(formatted, 'Ấp Bình An, Xã Vĩnh Hưng, Huyện Vĩnh Lợi, Tỉnh Bạc Liêu');

  const check = validatePermanentAddress(formatted);
  assert.equal(check.isValid, true);
  assert.equal(check.autoFormatted, formatted);
});

test('11. Anti-Ask Loop Guard: Escalate Cán bộ CTSV khi sinh viên tái xác nhận địa chỉ sáp nhập', async () => {
  const student = { studentCode: '2380600001', status: 'ACTIVE', hasSchedule: true, fullName: 'Nguyễn Văn An' };
  
  // Trường hợp địa chỉ sáp nhập rút gọn 2 cấp mà sinh viên tái xác nhận (isAddressReconfirmed = true)
  const result = evaluateStudentConfirmation({
    student,
    inputData: {
      formCode: 'MILITARY_DEFERMENT',
      purpose: 'Tạm hoãn NVQS',
      phone: '0901234567',
      permanentAddress: 'Phường An Phú, TP. Thủ Đức', // Sau sáp nhập không còn cấp Quận
      isAddressReconfirmed: true,
      pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    },
  });

  assert.equal(result.decision, 'ESCALATE_TO_STAFF');
  assert.equal(result.rule, 'ESCALATE_ADDRESS_MERGER_VERIFICATION');
  assert.ok(result.reason.includes('sáp nhập') || result.reason.includes('nông thôn'));
});

test('12. Smart Scheduler: Tính lịch hẹn nhận bản cứng chuẩn xác Khu AB (1 ngày) và Khu E (2 ngày)', async () => {
  // 1. Khu AB - Nộp sáng thứ Hai -> Chiều thứ Ba (1 ngày làm việc)
  const mondayMorning = new Date('2026-10-19T09:00:00'); // Thứ Hai 09h00
  const apptAB = calculatePickupAppointment({
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
    submissionDate: mondayMorning,
  });
  assert.equal(apptAB.processingDays, 1);
  assert.equal(apptAB.room, 'Phòng Công tác Sinh viên (A-01.01)');
  assert.equal(apptAB.earlyPickupTip, null);

  // 2. Khu E - Nộp sáng thứ Hai -> 2 ngày làm việc (chờ luân chuyển mộc)
  const apptE = calculatePickupAppointment({
    pickupCampus: 'Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.05)',
    submissionDate: mondayMorning,
  });
  assert.equal(apptE.processingDays, 2);
  assert.equal(apptE.room, 'Phòng Công tác Sinh viên (E1-01.05)');
  assert.ok(apptE.earlyPickupTip.includes('Khu AB'));
});

test('13. Sinh viên Khóa 2022 (2280602154) quá 4 năm sau 30/08/2026 nợ môn -> Tự động điều hướng Biểu mẫu nợ môn (COURSE_DEBT)', async () => {
  const studentCode = '2280602154';
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    formCode: 'GENERAL_CONFIRMATION',
    purpose: 'Làm vé tháng xe buýt',
    phone: '0901234567',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
  });

  assert.equal(agentResult.decision, 'ASK_CLARIFICATION');
  assert.ok(agentResult.actionableQuestion.includes('nợ môn') || agentResult.actionableQuestion.includes('COURSE_DEBT'));
});
