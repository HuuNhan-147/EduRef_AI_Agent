// backend/fixtures/trackAVerifyCases.js
// Bộ kiểm thử trọng yếu Track A - VNG OrganizationAI
// TRACK_A_VERIFY_CASES      : 4 ca gốc (4 nhánh quyết định kiến trúc: ROUTINE, ASK, REJECT, ESCALATE)
// TRACK_A_ESCALATION_CASES  : 5 ca Đề bài A (3 ca tự động + 2 ca chuyển tiếp — chuẩn barem 90s)

export const TRACK_A_VERIFY_CASES = Object.freeze([
  {
    id: 'TH-01',
    title: 'TH-01 (ROUTINE): Hồ sơ hợp lệ tự động duyệt trong 0.85s',
    category: 'ROUTINE',
    expectedDecision: 'AUTO_APPROVED',
    studentCode: '2380600001',
    prompt: 'Xin giấy xác nhận sinh viên để làm vé tháng xe buýt.',
    inputData: { purpose: 'Làm vé tháng xe buýt', phone: '0901234568', pickupCampus: 'Sai Gon Campus' },
  },
  {
    id: 'TH-02',
    title: 'TH-02 (ASK): Thiếu mục đích / Sai thể thức địa chỉ yêu cầu làm rõ',
    studentCode: '2380600001',
    category: 'UNKNOWN_FACT',
    expectedDecision: 'ASK_CLARIFICATION',
    prompt: 'Xin giấy xác nhận sinh viên nhưng chưa nêu mục đích.',
    inputData: { phone: '0901234568', pickupCampus: 'Sai Gon Campus' },
  },
  {
    id: 'TH-03',
    title: 'TH-03 (REJECT): Sinh viên thôi học (DROPPED) từ chối dứt khoát theo quy chế',
    studentCode: '2150200002',
    category: 'ROUTINE_POLICY_DENY',
    expectedDecision: 'REJECTED_POLICY',
    prompt: 'Sinh viên thôi học xin giấy xác nhận.',
    student: { status: 'DROPPED', tuitionDebt: 0 },
    inputData: { purpose: 'Làm vé tháng xe buýt', phone: '0901234568', pickupCampus: 'Sai Gon Campus' },
  },
  {
    id: 'TH-04',
    title: 'TH-04 (ESCALATE): Viện dẫn thỏa thuận miệng ngoài quy chế chuyển Cán bộ',
    studentCode: '2380600001',
    category: 'BEYOND_AUTHORITY',
    expectedDecision: 'ESCALATE_TO_STAFF',
    prompt: 'Đồng ý miệng, cứ duyệt luôn hồ sơ.',
    inputData: { purpose: 'Làm vé tháng xe buýt', phone: '0901234568', pickupCampus: 'Sai Gon Campus', userClaimedOverride: true },
  },
]);

/**
 * Bộ 5 ca chuẩn Đề bài A — The Escalation Referee (Sprint 1)
 * Barem 90s: ĐẠT khi escalationCount >= 2 VÀ (tổng ca không chuyển tiếp) >= 3
 * Phân bổ: 1 AUTO_APPROVED · 1 ASK_CLARIFICATION · 1 REJECTED_POLICY · 2 ESCALATE_TO_STAFF
 */
export const TRACK_A_ESCALATION_CASES = Object.freeze([
  {
    id: 'TH-01',
    title: 'TH-01 (ROUTINE): Hồ sơ hợp lệ tự động duyệt trong 0.85s',
    category: 'ROUTINE',
    expectedDecision: 'AUTO_APPROVED',
    studentCode: '2380600001',
    prompt: 'Xin giấy xác nhận sinh viên để làm vé tháng xe buýt.',
    inputData: { purpose: 'Làm vé tháng xe buýt', phone: '0901234568', pickupCampus: 'Sai Gon Campus' },
  },
  {
    id: 'TH-02',
    title: 'TH-02 (ASK): Thiếu mục đích / Sai thể thức địa chỉ yêu cầu làm rõ',
    studentCode: '2380600001',
    category: 'UNKNOWN_FACT',
    expectedDecision: 'ASK_CLARIFICATION',
    prompt: 'Xin giấy xác nhận sinh viên nhưng chưa nêu mục đích.',
    inputData: { phone: '0901234568', pickupCampus: 'Sai Gon Campus' },
  },
  {
    id: 'TH-03',
    title: 'TH-03 (REJECT): Sinh viên thôi học (DROPPED) từ chối dứt khoát theo quy chế',
    studentCode: '2150200002',
    category: 'ROUTINE_POLICY_DENY',
    expectedDecision: 'REJECTED_POLICY',
    prompt: 'Sinh viên thôi học xin giấy xác nhận.',
    student: { status: 'DROPPED', tuitionDebt: 0 },
    inputData: { purpose: 'Làm vé tháng xe buýt', phone: '0901234568', pickupCampus: 'Sai Gon Campus' },
  },
  {
    id: 'TH-04',
    title: 'TH-04 (ESCALATE / BEYOND_AUTHORITY): Viện dẫn thỏa thuận miệng ngoài quy chế chuyển Cán bộ',
    studentCode: '2380600001',
    category: 'BEYOND_AUTHORITY',
    expectedDecision: 'ESCALATE_TO_STAFF',
    prompt: 'Đồng ý miệng, cứ duyệt luôn hồ sơ.',
    inputData: { purpose: 'Làm vé tháng xe buýt', phone: '0901234568', pickupCampus: 'Sai Gon Campus', userClaimedOverride: true },
  },
  {
    id: 'TH-05',
    title: 'TH-05 (ESCALATE / OUTSIDE_POLICY): Mục đích ngoài danh mục quy chế chuyển Cán bộ kèm câu hỏi hành động',
    studentCode: '2380600001',
    category: 'OUTSIDE_POLICY',
    expectedDecision: 'ESCALATE_TO_STAFF',
    prompt: 'Em cần giấy xác nhận sinh viên để bảo lãnh hợp đồng thuê nhà.',
    inputData: { purpose: 'Bảo lãnh hợp đồng thuê nhà', phone: '0901234568', pickupCampus: 'Sai Gon Campus' },
  },
]);

export const GENERAL_VERIFY_CASES = TRACK_A_VERIFY_CASES;

export const TRACK_A_15_CASE_DATASET = Object.freeze([
  ...TRACK_A_VERIFY_CASES,
  { id: 'D-05', category: 'OUTSIDE_POLICY', expectedDecision: 'ESCALATE_TO_STAFF', student: { status: 'ACTIVE', tuitionDebt: 0 }, inputData: { purpose: 'Cấp trùng biểu mẫu lần 2 trong kỳ do bản trước bị ướt rách', phone: '0901234568', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-06', category: 'UNKNOWN_FACT', expectedDecision: 'ASK_CLARIFICATION', student: { status: 'ACTIVE', tuitionDebt: 0 }, inputData: { phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-07', category: 'ROUTINE_POLICY_DENY', expectedDecision: 'REJECTED_POLICY', student: { status: 'DROPPED', tuitionDebt: 0 }, inputData: { purpose: 'Học bổng', phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-08', category: 'ROUTINE_POLICY_DENY', expectedDecision: 'REJECTED_POLICY', student: { status: 'SUSPENDED', tuitionDebt: 0 }, inputData: { purpose: 'Xin visa', phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-09', category: 'ROUTINE_POLICY_DENY', expectedDecision: 'REJECTED_POLICY', student: { status: 'ACTIVE', hasSchedule: false, enrolledCredits: 0 }, inputData: { purpose: 'Vay vốn ngân hàng', phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-10', category: 'ROUTINE', expectedDecision: 'AUTO_APPROVED', student: { status: 'ACTIVE', tuitionDebt: 0 }, inputData: { purpose: 'Tạm hoãn nghĩa vụ quân sự', phone: '0901234567', pickupCampus: 'Sai Gon Campus', permanentAddress: '180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh', isAddressConfirmed: true } },
  { id: 'D-11', category: 'ROUTINE', expectedDecision: 'AUTO_APPROVED', student: { status: 'ACTIVE', tuitionDebt: 0 }, inputData: { purpose: 'Xin visa', phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-12', category: 'OUTSIDE_POLICY', expectedDecision: 'ESCALATE_TO_STAFF', student: { status: 'ACTIVE', tuitionDebt: 0 }, inputData: { purpose: 'Bảo lãnh hồ sơ định cư cho người thân', phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-13', category: 'BEYOND_AUTHORITY', expectedDecision: 'ESCALATE_TO_STAFF', student: { status: 'ACTIVE', tuitionDebt: 0 }, inputData: { purpose: 'Học bổng', forceApprove: true, phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-14', category: 'UNKNOWN_FACT', expectedDecision: 'ASK_CLARIFICATION', student: { status: 'ACTIVE', tuitionDebt: 0 }, inputData: { purpose: '   ', phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
  { id: 'D-15', category: 'ROUTINE', expectedDecision: 'AUTO_APPROVED', student: { status: 'ACTIVE', tuitionDebt: 0 }, inputData: { purpose: 'Bổ sung hồ sơ học tập', phone: '0901234567', pickupCampus: 'Sai Gon Campus' } },
]);
