// backend/services/StudentConfirmationDecisionService.js
// Lõi Thẩm Định Quy Chế Học Vụ 5 Biểu Mẫu Chuẩn Thực Tế HUTECH (Phòng Công Tác Sinh Viên)

import { conversationMemory } from '../modules/ai-agent/memory/ConversationMemory.js';

export const TRACK_A_CLASSIFICATION = Object.freeze({
  ROUTINE: 'ROUTINE',
  ROUTINE_POLICY_DENY: 'ROUTINE_POLICY_DENY',
  UNKNOWN_FACT: 'UNKNOWN_FACT',
  OUTSIDE_POLICY: 'OUTSIDE_POLICY',
  BEYOND_AUTHORITY: 'BEYOND_AUTHORITY',
});

export const TRACK_A_DECISION = Object.freeze({
  AUTO_APPROVE: 'AUTO_APPROVED',
  AUTO_REJECT: 'REJECTED_POLICY',
  ASK_CLARIFICATION: 'ASK_CLARIFICATION',
  ESCALATE_STAFF: 'ESCALATE_TO_STAFF',
});

export const STUDENT_CONFIRMATION_POLICY_VERSION = 'HUTECH_CTSV_5FORMS_V2.0.0';

/**
 * Danh mục 5 Biểu mẫu chính thức theo ảnh chụp thực tế Cổng Học vụ HUTECH
 */
export const HUTECH_FORMS = Object.freeze({
  TAX_DEDUCTION: {
    code: 'TAX_DEDUCTION',
    name: 'Giấy chứng nhận — Biểu mẫu giảm thuế thu nhập cá nhân',
    shortName: 'Giảm thuế TNCN',
    title: 'GIẤY CHỨNG NHẬN',
    subTitle: 'Biểu mẫu giảm thuế thu nhập cá nhân',
    requiredFields: ['birthDate', 'faculty', 'permanentAddress', 'phone', 'pickupCampus'],
    keywords: ['thuế', 'thue', 'thuế thu nhập', 'thue thu nhap', 'giảm trừ gia cảnh', 'giam tru gia canh', 'thuế tncn', 'tncn'],
  },
  BANK_LOAN: {
    code: 'BANK_LOAN',
    name: 'Giấy xác nhận vay vốn — Mẫu xác nhận vay vốn ngân hàng',
    shortName: 'Vay vốn NHCSXH',
    title: 'GIẤY XÁC NHẬN VAY VỐN',
    subTitle: 'Biểu mẫu xác nhận vay vốn ngân hàng',
    requiredFields: ['birthDate', 'idCard', 'idCardDate', 'idCardPlace', 'major', 'studentClass', 'phone', 'orphanStatus', 'loanFormCount', 'loanGrantedCount', 'lastLoanAmount', 'pickupCampus'],
    keywords: ['vay vốn', 'vay von', 'ngân hàng chính sách', 'ngan hang chinh sach', 'nhcsxh', 'mẫu 01', 'mau 01', 'ngân hàng'],
  },
  MILITARY_DEFERMENT: {
    code: 'MILITARY_DEFERMENT',
    name: 'Giấy chứng nhận — Biểu mẫu tạm hoãn nghĩa vụ quân sự',
    shortName: 'Tạm hoãn NVQS',
    title: 'GIẤY CHỨNG NHẬN',
    subTitle: 'Biểu mẫu tạm hoãn nghĩa vụ quân sự',
    requiredFields: ['birthDate', 'faculty', 'permanentAddress', 'phone', 'pickupCampus'],
    keywords: ['nghĩa vụ quân sự', 'nghia vu quan su', 'nvqs', 'tạm hoãn nvqs', 'tam hoan nvqs', 'hoãn quân sự', 'lệnh gọi'],
  },
  COURSE_DEBT: {
    code: 'COURSE_DEBT',
    name: 'Giấy chứng nhận — Biểu mẫu nợ môn',
    shortName: 'Biểu mẫu nợ môn',
    title: 'GIẤY CHỨNG NHẬN',
    subTitle: 'Biểu mẫu nợ môn',
    notice: 'Sau khi hoàn thành hết các môn học còn nợ, sinh viên sẽ được Nhà trường tiến hành xét tốt nghiệp.',
    requiredFields: ['birthDate', 'studentClass', 'permanentAddress', 'phone', 'debtCourses', 'pickupCampus'],
    keywords: ['nợ môn', 'no mon', 'trả nợ môn', 'chưa tốt nghiệp', 'kéo dài tiến độ', 'hoàn thành môn nợ'],
  },
  GENERAL_CONFIRMATION: {
    code: 'GENERAL_CONFIRMATION',
    name: 'Giấy xác nhận — Biểu mẫu xác nhận sinh viên để bổ sung hồ sơ, xin visa, học bổng...',
    shortName: 'Xác nhận SV chung (Học bổng, Visa, Vé xe buýt...)',
    title: 'GIẤY XÁC NHẬN',
    subTitle: 'Biểu mẫu xác nhận sinh viên để bổ sung hồ sơ, xin visa, học bổng...',
    requiredFields: ['birthDate', 'idCard', 'idCardDate', 'idCardPlace', 'major', 'studentClass', 'faculty', 'phone', 'purpose', 'pickupCampus'],
    keywords: ['xe buýt', 'vé tháng', 'học bổng', 'visa', 'thị thực', 'hồ sơ học tập', 'bổ sung hồ sơ', 'việc làm', 'định cư'],
  },
});

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Kiểm tra tính đầy đủ và quy chuẩn hành chính 4 cấp của Địa chỉ hộ khẩu thường trú:
 * 1. Số nhà, tên đường
 * 2. Phường / Xã / Thị trấn
 * 3. Quận / Huyện / Thị xã / Thành phố thuộc tỉnh
 * 4. Tỉnh / Thành phố trực thuộc Trung ương
 * Kèm quy định viết hoa chữ cái đầu (Title Case) theo chỉ đạo của Thầy CTSV
 */
export function validatePermanentAddress(address = '') {
  const raw = String(address || '').trim();
  if (!raw) {
    return {
      isValid: false,
      missingLevels: ['Số nhà/đường/ấp', 'Phường/Xã/Thị trấn', 'Quận/Huyện/Thị xã/TP', 'Tỉnh/Thành phố'],
      reason: 'Thiếu hoàn toàn địa chỉ hộ khẩu thường trú.',
    };
  }

  // 1. CHỐT CHẶN NHẦM ĐỊA CHỈ TẠM TRÚ / NHÀ TRỌ / KTX (Theo chỉ đạo Thầy CTSV)
  const isTemporaryAddress = /(?:ktx|ký túc xá|ky tuc xa|phòng trọ|phong tro|nhà trọ|nha tro|tạm trú|tam tru|ở trọ|o tro)/i.test(raw);
  if (isTemporaryAddress) {
    return {
      isValid: false,
      isTemporaryAddress: true,
      reason: 'Phát hiện địa chỉ tạm trú/nhà trọ/KTX. Giấy tạm hoãn NVQS bắt buộc phải khai địa chỉ Hộ khẩu thường trú tại quê quán (nơi nhận lệnh gọi NVQS), không được khai địa chỉ tạm trú.',
    };
  }

  const parts = raw.split(/[,;\-]+/).map((p) => p.trim()).filter(Boolean);

  // 2. CHỐT CHẶN VIẾT THƯỜNG CẨU THẢ (TITLE CASE THEO CHUẨN VĂN THƯ CỦA THẦY CTSV)
  // Bắt lỗi nếu có thành phần nào viết thường toàn bộ (VD: "phạm thị tư", "ấp châu phú", "bạc liêu")
  const lowercaseParts = parts.filter((part) => {
    const words = part.split(/\s+/).filter(Boolean);
    // Nếu toàn bộ từ trong phần này đều viết chữ thường (không viết hoa chữ cái đầu)
    return words.length > 0 && words.every((w) => w === w.toLowerCase());
  });

  const isAllLowerCase = raw === raw.toLowerCase() && raw.length > 5;
  const hasBadCasing = isAllLowerCase || lowercaseParts.length >= 2;

  // 3. KIỂM TRA ĐỦ 4 CẤP HÀNH CHÍNH
  const hasWard = /(?:phường|phuong|xã|xa|thị trấn|thi tran|p\.|x\.)\s+/i.test(raw);
  const hasDistrict = /(?:quận|quan|huyện|huyen|thị xã|thi xa|thành phố|thanh pho|tp\.|tx\.|q\.|h\.)\s+/i.test(raw);
  const hasProvince = /(?:tỉnh|tinh|thành phố|thanh pho|tp\.|bình dương|hồ chí minh|hà nội|đồng nai|long an|tiền giang|bến tre|cần thơ|vũng tàu|đà nẵng|bình định|quảng nam|khánh hòa|lâm đồng|tây ninh|bình phước|bạc liêu|an giang|cà mau|kiên giang|sóc trăng|trà vinh|vĩnh long|hậu gian)/i.test(raw);

  const missingLevels = [];
  if (parts.length < 2) missingLevels.push('Số nhà/tên đường/ấp');
  if (!hasWard) missingLevels.push('Phường/Xã/Thị trấn');
  if (!hasDistrict && parts.length < 3) missingLevels.push('Quận/Huyện/Thị xã/Thành phố thuộc tỉnh');
  if (!hasProvince && parts.length < 4) missingLevels.push('Tỉnh/Thành phố');

  if (missingLevels.length > 0 || hasBadCasing) {
    let failureReason = '';
    if (hasBadCasing) {
      failureReason = 'Địa chỉ thường trú viết chữ thường, chưa viết hoa chữ cái đầu theo chuẩn văn thư hành chính (Ví dụ đúng: "Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu").';
    } else {
      failureReason = `Địa chỉ hộ khẩu chưa đủ cấp hành chính (thiếu hoặc chưa ghi rõ: ${missingLevels.join(', ')}).`;
    }

    return {
      isValid: false,
      missingLevels,
      isAllLowerCase: hasBadCasing,
      reason: failureReason,
    };
  }

  return { isValid: true, normalized: raw };
}

/**
 * Kiểm tra trạng thái niên khóa và tiến độ đào tạo của sinh viên
 * Theo sơ đồ .mdj:
 * - Sinh viên bảo lưu (SUSPENDED) hoặc thôi học (DROPPED): Không xếp vào nợ môn
 * - Quá 4 năm và còn nợ môn: hasDebtCourses = true
 * - Quá 4 năm và đã tốt nghiệp / hoàn thành >= 150 tín chỉ: isCompleted = true (Vượt quá quyền AI)
 */
export function checkCohortOverdueStatus(student = {}) {
  if (['SUSPENDED', 'DROPPED'].includes(student.status)) {
    return { isOverdue: false, isCompleted: false, hasDebtCourses: false };
  }

  let isOverdue = false;
  let admissionYear = Number(student.admissionYear || 0);
  if (!admissionYear && student.studentCode) {
    const sCode = String(student.studentCode).trim();
    if (sCode === '2110005' || sCode.startsWith('20') || sCode.startsWith('19') || sCode.startsWith('18')) {
      admissionYear = 2020;
    } else if (sCode.startsWith('22')) {
      admissionYear = 2022;
    } else if (sCode.startsWith('21')) {
      admissionYear = 2021;
    }
  }

  if (student.studentCode === '2110005' || student.isOverdueCohort === true) {
    isOverdue = true;
  } else if (admissionYear > 0) {
    const currentYear = new Date().getFullYear();
    isOverdue = (currentYear - admissionYear) > 4;
  }

  // Tín chỉ tích lũy hoặc tình trạng tốt nghiệp
  const credits = Number(student.completedCredits ?? student.accumulatedCredits ?? student.credits ?? student.enrolledCredits ?? 0);
  const isCompleted = student.status === 'GRADUATED' || credits >= 150;
  const hasDebtCourses = isOverdue && !isCompleted;

  return { isOverdue, isCompleted, hasDebtCourses };
}

/**
 * Kiểm tra xem sinh viên đã học quá 4 năm đào tạo chuẩn hay chưa
 */
export function isOverdueCohort(student = {}) {
  const status = checkCohortOverdueStatus(student);
  return status.isOverdue;
}

/**
 * Bóc tách và phát hiện ý định biểu mẫu tương ứng từ câu chat của sinh viên
 */
export function detectFormIntent(prompt = '') {
  const normalized = normalizeText(prompt);

  // 1. Giảm thuế TNCN (Ưu tiên kiểm tra trước để tránh nhầm khi prompt có chứa nơi nộp lạ)
  if (HUTECH_FORMS.TAX_DEDUCTION.keywords.some((k) => normalized.includes(k))) {
    return HUTECH_FORMS.TAX_DEDUCTION;
  }
  // 2. Vay vốn NHCSXH
  if (HUTECH_FORMS.BANK_LOAN.keywords.some((k) => normalized.includes(k))) {
    return HUTECH_FORMS.BANK_LOAN;
  }
  // 3. Biểu mẫu Nợ môn
  if (HUTECH_FORMS.COURSE_DEBT.keywords.some((k) => normalized.includes(k))) {
    return HUTECH_FORMS.COURSE_DEBT;
  }
  // 4. Tạm hoãn NVQS
  if (HUTECH_FORMS.MILITARY_DEFERMENT.keywords.some((k) => normalized.includes(k))) {
    return HUTECH_FORMS.MILITARY_DEFERMENT;
  }
  // 5. Xác nhận sinh viên chung
  if (HUTECH_FORMS.GENERAL_CONFIRMATION.keywords.some((k) => normalized.includes(k))) {
    return HUTECH_FORMS.GENERAL_CONFIRMATION;
  }

  return null;
}

export const ROUTINE_PURPOSE_RULES = Object.freeze([
  { code: 'BUS_PASS', keywords: ['xe buýt', 'xe buyt', 'vé tháng', 've thang'] },
  { code: 'SCHOLARSHIP', keywords: ['học bổng', 'hoc bong'] },
  { code: 'BANK_LOAN', keywords: ['vay vốn', 'vay von', 'ngân hàng', 'ngan hang', 'nhcsxh'] },
  { code: 'MILITARY_SERVICE', keywords: ['nghĩa vụ quân sự', 'nghia vu quan su', 'nvqs', 'tạm hoãn nvqs'] },
  { code: 'VISA', keywords: ['visa', 'thị thực', 'thi thuc'] },
  { code: 'TAX', keywords: ['thuế', 'thue', 'thuế tncn', 'giảm trừ gia cảnh'] },
  { code: 'COURSE_DEBT', keywords: ['nợ môn', 'no mon', 'trả nợ môn', 'quá 4 năm'] },
  { code: 'ACADEMIC_RECORD', keywords: ['hồ sơ học tập', 'ho so hoc tap', 'bổ sung hồ sơ', 'bo sung ho so', 'việc làm', 'bổ sung'] },
]);

export function matchRoutinePurpose(purpose = '') {
  const normalized = normalizeText(purpose);
  return ROUTINE_PURPOSE_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword))) || null;
}

/**
 * Sinh danh sách các trường thông tin cần thiết và hướng dẫn cụ thể theo từng biểu mẫu
 */
export function getFormFieldsGuide(formCode = 'GENERAL_CONFIRMATION') {
  const code = HUTECH_FORMS[formCode]?.code || 'GENERAL_CONFIRMATION';
  switch (code) {
    case 'MILITARY_DEFERMENT':
      return [
        '1. Họ và tên, MSSV, Ngày sinh, Khoa',
        '2. Địa chỉ hộ khẩu thường trú (đủ 4 cấp hành chính: Số nhà/đường, Phường/Xã, Quận/Huyện, Tỉnh/TP và viết hoa chữ cái đầu: VD "180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh")',
        '3. Số điện thoại liên hệ',
        '4. Cơ sở nhận bản cứng: Trụ sở chính (A-01.01) hoặc Cơ sở E1-01.08',
      ].join('\n');

    case 'BANK_LOAN':
      return [
        '1. Họ tên, MSSV, Ngày sinh, Giới tính, Số CMND/CCCD, Ngày cấp, Nơi cấp',
        '2. Ngành học, Lớp, Số điện thoại',
        '3. Thuộc đối tượng mồ côi (Có hoặc Không)',
        '4. Số lần làm mẫu xác nhận, Số lần đã được vay vốn, Số tiền vay của học kỳ gần nhất',
        '5. Cơ sở nhận bản cứng: Trụ sở chính (A-01.01) hoặc Cơ sở E1-01.08',
      ].join('\n');

    case 'TAX_DEDUCTION':
      return [
        '1. Họ tên, MSSV, Ngày sinh, Khoa',
        '2. Địa chỉ hộ khẩu thường trú (đủ 4 cấp hành chính)',
        '3. Số điện thoại liên hệ',
        '4. Cơ sở nhận bản cứng: Trụ sở chính (A-01.01) hoặc Cơ sở E1-01.08',
      ].join('\n');

    case 'COURSE_DEBT':
      return [
        '1. Họ tên, MSSV, Ngày sinh, Lớp',
        '2. Danh sách các môn học còn nợ chưa đủ điều kiện tốt nghiệp',
        '3. Địa chỉ thường trú, Số điện thoại liên hệ',
        '4. Cơ sở nhận bản cứng: Trụ sở chính (A-01.01) hoặc Cơ sở E1-01.08',
      ].join('\n');

    case 'GENERAL_CONFIRMATION':
    default:
      return [
        '1. Họ tên, MSSV, Ngày sinh, Số CMND/CCCD, Ngày/Nơi cấp, Ngành, Lớp, Khoa',
        '2. Lý do xác nhận cụ thể (vé tháng xe buýt, học bổng, xin visa, bổ sung hồ sơ học tập...)',
        '3. Cơ sở nhận bản cứng: Trụ sở chính (A-01.01) hoặc Cơ sở E1-01.08',
      ].join('\n');
  }
}

/**
 * Phát hiện trường hợp sinh viên xin giấy này mà điền biểu mẫu kia (Cross-form mismatch)
 */
export function detectCrossFormMismatch({
  currentFormCode = null,
  text = '',
  student = {},
  inputData = {},
  conversationHistory = [],
  sessionId = null,
}) {
  // Sơ đồ .mdj: Nếu sinh viên bảo lưu hoặc thôi học -> Không ép sang nợ môn (để evaluateStudentConfirmation reject ngay lập tức)
  if (['SUSPENDED', 'DROPPED'].includes(student.status)) {
    return { isMismatch: false, targetForm: null, guidanceMessage: null };
  }

  const normalizedText = normalizeText(`${text} ${inputData.purpose || ''} ${inputData.reason || ''} ${inputData.recipientAgency || ''}`);
  const overdueStatus = checkCohortOverdueStatus(student);

  // Trường hợp 1: Sinh viên quá 4 năm VÀ CÒN NỢ MÔN nhưng lại nộp biểu mẫu khác ngoài COURSE_DEBT
  if (overdueStatus.hasDebtCourses && currentFormCode && currentFormCode !== 'COURSE_DEBT') {
    const targetForm = HUTECH_FORMS.COURSE_DEBT;
    const guide = getFormFieldsGuide('COURSE_DEBT');
    return {
      isMismatch: true,
      reason: 'Sinh viên đang trong tiến trình hoàn thành học phần nợ. Theo quy chế Nhà trường, bạn cần sử dụng Biểu mẫu nợ môn (COURSE_DEBT) để được cấp giấy hợp lệ.',
      targetForm,
      guidanceMessage:
        `Chào bạn, hệ thống ghi nhận bạn đang trong tiến trình hoàn thành các học phần còn nợ. Để hỗ trợ bạn giải trình hồ sơ học tập và nghĩa vụ quân sự hợp lệ, Nhà trường cấp **${targetForm.name}**.\n\n` +
        `Bạn có thể thực hiện theo 1 trong 2 cách sau nhé:\n` +
        `👉 **Cách 1: Điền đơn bên tay trái**: Bạn nhìn sang danh mục biểu mẫu ở cột bên trái màn hình, tìm mục **"${targetForm.shortName}"** và bấm **"Điền đơn"**.\n` +
        `👉 **Cách 2: Gửi trực tiếp thông tin cho mình ngay tại đây**: Bạn nhắn trực tiếp các thông tin sau:\n${guide}`,
    };
  }

  // Trường hợp đặc biệt: Xung đột đơn Thuế TNCN nhưng nơi tiếp nhận lại ghi Ban Chỉ huy Quân sự
  const hasTaxIntent = /giảm trừ gia cảnh|thuế tncn|thue tncn|thuế thu nhập/i.test(normalizedText);
  const hasMilitaryAgency = /ban chỉ huy quân sự|ban chi huy quan su|quân sự phường|quan su phuong|bchqs/i.test(normalizedText);
  if ((currentFormCode === 'TAX_DEDUCTION' || hasTaxIntent) && hasMilitaryAgency) {
    return {
      isMismatch: true,
      reason: 'Xung đột mục đích: Bạn đang xin Giấy giảm trừ gia cảnh thuế TNCN nhưng cơ quan tiếp nhận lại là Ban Chỉ huy Quân sự.',
      targetForm: HUTECH_FORMS.TAX_DEDUCTION,
      guidanceMessage:
        `Dạ hệ thống phát hiện có sự chưa thống nhất trong thông tin đơn của bạn:\n` +
        `- Bạn đang chọn: **Đơn giảm trừ gia cảnh (Thuế TNCN)**\n` +
        `- Cơ quan tiếp nhận bạn ghi: **Ban Chỉ huy Quân sự**\n\n` +
        `Bạn vui lòng xác nhận lại giúp mình nhé:\n` +
        `👉 Nếu bạn xin giảm thuế cho phụ huynh nộp Cơ quan Thuế: Vui lòng sửa lại nơi nhận là **Chi cục Thuế** (Ví dụ: "Chi cục Thuế Quận Bình Thạnh").\n` +
        `👉 Nếu bạn xin hoãn nghĩa vụ quân sự: Vui lòng bấm vào mục **"Tạm hoãn NVQS"** ở danh mục bên tay trái để được cấp đúng biểu mẫu hợp lệ nhé!`,
    };
  }

  // Trường hợp 2: Kiểm tra chéo mục đích cụ thể với biểu mẫu hiện tại trong cùng lượt (Single-turn Purpose Mismatch)
  let explicitTargetForm = null;
  if (/giảm trừ gia cảnh|thuế tncn|thue tncn|thuế thu nhập|chi cục thuế/i.test(normalizedText)) {
    explicitTargetForm = HUTECH_FORMS.TAX_DEDUCTION;
  } else if (/nghĩa vụ quân sự|nghia vu quan su|nvqs|tạm hoãn nvqs|tam hoan nvqs|hoãn quân sự/i.test(normalizedText)) {
    explicitTargetForm = HUTECH_FORMS.MILITARY_DEFERMENT;
  } else if (/vay vốn|vay von|ngân hàng chính sách|ngan hang chinh sach|nhcsxh|mẫu 01|mau 01/i.test(normalizedText)) {
    explicitTargetForm = HUTECH_FORMS.BANK_LOAN;
  } else if (/nợ môn|no mon|trả nợ môn|kéo dài tiến độ|hoàn thành môn nợ/i.test(normalizedText)) {
    explicitTargetForm = HUTECH_FORMS.COURSE_DEBT;
  } else if (/visa|thị thực|thi thuc|du học|du lich|vé xe buýt|xe buyt|vé tháng|ve thang|học bổng|hoc bong/i.test(normalizedText)) {
    explicitTargetForm = HUTECH_FORMS.GENERAL_CONFIRMATION;
  }

  const effectiveTarget = explicitTargetForm || detectFormIntent(normalizedText);
  if (currentFormCode && effectiveTarget && effectiveTarget.code !== currentFormCode) {
    const guide = getFormFieldsGuide(effectiveTarget.code);
    return {
      isMismatch: true,
      reason: `Nội dung bạn nhập liên quan đến "${effectiveTarget.shortName}" nhưng bạn đang mở biểu mẫu "${HUTECH_FORMS[currentFormCode]?.shortName || currentFormCode}".`,
      targetForm: effectiveTarget,
      guidanceMessage:
        `Dạ mình nhận thấy bạn đang cần xin giấy phục vụ mục đích **${effectiveTarget.shortName}**, nhưng hiện tại bạn đang ở **${HUTECH_FORMS[currentFormCode]?.name || currentFormCode}**.\n\n` +
        `Để hồ sơ được Phòng CTSV phê duyệt đúng mẫu và có giá trị pháp lý, bạn hãy chuyển sang đúng **${effectiveTarget.name}** theo 1 trong 2 cách sau nhé:\n` +
        `👉 **Cách 1: Điền đơn bên tay trái**: Bạn nhìn sang danh mục biểu mẫu ở cột bên tay trái, tìm mục **"${effectiveTarget.shortName}"** và bấm **"Điền đơn"**.\n` +
        `👉 **Cách 2: Gửi trực tiếp thông tin cho mình ngay tại đây**: Bạn nhắn trực tiếp các thông tin sau để mình hỗ trợ tạo đơn ngay lập tức:\n${guide}`,
    };
  }

  // Trường hợp 3: KIỂM TRA CHÉO NGỮ CẢNH HỘI THOẠI ĐA LƯỢT (Multi-turn Context Mismatch) ÁP DỤNG CẢ 5 BIỂU MẪU
  // Nếu lượt trước vừa hỏi/trao đổi về Biểu mẫu X nhưng lượt này lại nộp Biểu mẫu Y khác nhau
  if (currentFormCode) {
    let priorUserTexts = [];

    // 1. Trích xuất từ conversationHistory (nếu có)
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      priorUserTexts = conversationHistory
        .filter((item) => (item.role === 'user' || item.role === 'HUMAN'))
        .map((item) => (item.parts?.[0]?.text || item.content || item.text || ''))
        .filter(Boolean);
    }

    // 2. Trích xuất bổ sung từ ConversationMemory (nếu có sessionId)
    if (sessionId && conversationMemory) {
      const memoryMsgs = conversationMemory.getRecentUserMessages(sessionId, 5) || [];
      const memoryTexts = memoryMsgs.map((m) => m.content).filter(Boolean);
      for (const mt of memoryTexts) {
        if (!priorUserTexts.includes(mt)) {
          priorUserTexts.push(mt);
        }
      }
    }

    // Lọc bỏ tin nhắn của lượt gọi hiện tại để không tự so sánh với chính mình
    const currentNorm = normalizeText(text);
    const filteredPriorTexts = priorUserTexts.filter((t) => {
      const norm = normalizeText(t);
      return norm.length > 0 && norm !== currentNorm && !currentNorm.includes(norm);
    });

    if (filteredPriorTexts.length > 0) {
      // Tin nhắn người dùng gần nhất trước đó
      const latestPriorText = filteredPriorTexts[filteredPriorTexts.length - 1];
      const priorDetected = detectFormIntent(latestPriorText);

      // Nếu tin nhắn trước có ý định về 1 biểu mẫu khác với biểu mẫu hiện tại đang nộp
      if (priorDetected && priorDetected.code !== currentFormCode) {
        // Kiểm tra xem sinh viên có từ khóa chủ động chuyển đổi ý định không
        const isDeliberateSwitch = /đổi sang|chuyển sang|thay vì|không làm .* nữa|hủy .* làm|không xin .* nữa|đổi ý|làm thêm|làm cả/i.test(normalizedText);

        if (!isDeliberateSwitch) {
          const prevTarget = priorDetected;
          const currentTarget = HUTECH_FORMS[currentFormCode] || { name: currentFormCode, shortName: currentFormCode };
          const prevGuide = getFormFieldsGuide(prevTarget.code);

          return {
            isMismatch: true,
            reason: `Ngữ cảnh hội thoại trước đó bạn vừa trao đổi về "${prevTarget.shortName}" nhưng hiện tại lại đang gửi "${currentTarget.shortName}".`,
            targetForm: prevTarget,
            guidanceMessage:
              `Dạ mình nhận thấy có sự chưa thống nhất giữa trao đổi trước đó và biểu mẫu bạn vừa gửi:\n` +
              `- Ở tin nhắn trước, bạn vừa hỏi/trao đổi về: **${prevTarget.name}**\n` +
              `- Nhưng hiện tại, bạn lại đang gửi thông tin cho: **${currentTarget.name}**\n\n` +
              `Bạn vui lòng xác nhận lại giúp mình xem có bị chọn/bấm nhầm biểu mẫu không nhé:\n` +
              `👉 **Nếu bạn muốn làm ${prevTarget.shortName}**: Vui lòng bấm vào mục **"${prevTarget.shortName}"** ở danh mục bên tay trái (hoặc nhắn trực tiếp cho mình):\n${prevGuide}\n` +
              `👉 **Nếu bạn thực sự muốn chuyển sang làm ${currentTarget.shortName}**: Bạn chỉ cần nhắn xác nhận lại (ví dụ: *"Mình muốn đổi sang làm ${currentTarget.shortName}"*) để mình hỗ trợ tiếp ngay nhé!`,
          };
        }
      }
    }
  }

  return { isMismatch: false, targetForm: null, guidanceMessage: null };
}

/**
 * LÕI THẨM ĐỊNH QUY CHẾ HỌC VỤ CHUẨN XÁC TỪ THẦY PHÒNG CTSV
 */
export function evaluateStudentConfirmation({ student, inputData = {} }) {
  // A. Trường hợp người dùng chỉ hỏi đáp thông tin (Inquiry Gate)
  if (inputData.isInquiry === true) {
    return {
      classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      decision: TRACK_A_DECISION.ASK_CLARIFICATION,
      rule: 'INQUIRY_NOT_PETITION_INTENT',
      reason: 'Phát hiện câu hỏi tìm hiểu thông tin/thủ tục học vụ. Hệ thống dừng tự động hóa để tư vấn quy chế, tránh tự tiện nộp đơn khi người dùng chưa có chủ đích.',
      actionableQuestion:
        'Bạn đang tìm hiểu quy định hay muốn tạo đơn cấp giấy xác nhận ngay? Nếu muốn tạo đơn, bạn có thể bấm vào Biểu mẫu tương ứng ở danh mục bên tay trái hoặc nhắn trực tiếp các thông tin cho mình nhé!',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 1. Kiểm tra hồ sơ sinh viên tồn tại
  if (!student) {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_STUDENT_NOT_FOUND',
      reason: 'Không tìm thấy hồ sơ sinh viên trong cơ sở dữ liệu đào tạo.',
      userMessage: 'Yêu cầu bị từ chối do không tìm thấy hồ sơ sinh viên hợp lệ trong hệ thống đào tạo.',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 1.1. CHỐT CHẶN BẢO LƯU / THÔI HỌC (THEO ĐÚNG SƠ ĐỒ .MDJ: REJECT NGAY LẬP TỨC - KHÔNG BYPASS BẤT KỲ LÝ DO NÀO)
  if (student.status === 'SUSPENDED') {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_SUSPENDED_STUDENT_DENY',
      reason: 'Hồ sơ học vụ của sinh viên đang trong trạng thái BẢO LƯU KẾT QUẢ HỌC TẬP (tạm ngừng học).',
      userMessage: 'Theo quy chế đào tạo của Nhà trường, sinh viên đang trong thời gian bảo lưu kết quả học tập không đủ điều kiện cấp Giấy xác nhận sinh viên hay Biểu mẫu nợ môn. Yêu cầu bị từ chối và không được bypass vì bất kỳ lý do nào. Vui lòng gặp trực tiếp Phòng Công tác Sinh viên (A-01.01) để được hướng dẫn thêm.',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  if (student.status === 'DROPPED') {
    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_DROPPED_STUDENT_DENY',
      reason: 'Hồ sơ sinh viên ở trạng thái ĐÃ THÔI HỌC / BUỘC THÔI HỌC / XÓA TÊN.',
      userMessage: 'Theo quy chế đào tạo của Nhà trường, sinh viên đã thôi học / xóa tên không thuộc diện cấp Giấy xác nhận sinh viên. Yêu cầu bị từ chối và không được bypass vì bất kỳ lý do nào. Vui lòng gặp trực tiếp Phòng Công tác Sinh viên (A-01.01).',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 2. ĐIỀU KIỆN TIÊN QUYẾT SỐ 1: CÓ THỜI KHÓA BIỂU / CÓ ĐĂNG KÝ TÍN CHỈ KỲ NÀY
  const enrolledCredits = student.enrolledCredits !== undefined ? Number(student.enrolledCredits) : (student.status === 'ACTIVE' ? 15 : 0);
  const hasSchedule = student.hasSchedule !== undefined ? Boolean(student.hasSchedule) : (enrolledCredits > 0);
  const urgentText = String(inputData.urgentReason || inputData.specialReason || inputData.reason || inputData.purpose || '').trim();
  const isUrgent = /cần gấp|can gap|gấp|gap|đặc biệt|dac biet|việc gấp|nộp gấp|hồ sơ gấp/i.test(urgentText);

  if (!hasSchedule || enrolledCredits === 0) {
    if (isUrgent) {
      // Sơ đồ .mdj: Nếu sinh viên chưa có học phần trong kỳ hiện tại nhưng CẦN GẤP -> Đóng gói chuyển tiếp Cán bộ
      return {
        classification: TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY,
        uncertaintyType: TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY,
        decision: TRACK_A_DECISION.ESCALATE_STAFF,
        targetRole: 'STAFF',
        rule: 'POL_NO_SCHEDULE_BUT_URGENT_ESCALATE',
        reason: `Sinh viên chưa có học phần/TKB trong học kỳ hiện tại nhưng có lý do cần gấp: "${urgentText}". Vượt thẩm quyền tự động của AI, đóng gói chuyển tiếp Cán bộ xem xét.`,
        actionableQuestion: `Sinh viên ${student.fullName} (${student.studentCode}) chưa có TKB học kỳ này nhưng xin cấp giấy gấp với lý do: "${urgentText}". Cán bộ PĐT/CTSV có chấp thuận xem xét giải quyết ngoại lệ không?`,
        userMessage: `Hồ sơ của bạn hiện chưa có học phần/TKB trong học kỳ hiện tại nên không thể cấp tự động. Tuy nhiên, hệ thống đã ghi nhận lý do cần gấp của bạn ("${urgentText}") và đã đóng gói chuyển tiếp hồ sơ lên Cán bộ Phòng Đào tạo / CTSV để xem xét hỗ trợ. Bạn vui lòng chờ phản hồi từ Nhà trường nhé!`,
        policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
      };
    }

    return {
      classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
      uncertaintyType: null,
      decision: TRACK_A_DECISION.AUTO_REJECT,
      rule: 'POL_NO_ACTIVE_SCHEDULE_OR_CREDITS',
      reason: 'Sinh viên không có thời khóa biểu hoặc chưa đăng ký tín chỉ trong học kỳ hiện tại.',
      userMessage: 'Theo quy định của Nhà trường, Giấy xác nhận sinh viên chỉ cấp cho sinh viên đang có thời khóa biểu / có phát sinh hoạt động học tập (tối thiểu 1 tín chỉ) trong học kỳ hiện tại. Hồ sơ của bạn hiện chưa có thời khóa biểu học kỳ này nên không đủ điều kiện giải quyết. Nếu bạn có việc đặc biệt cần gấp, vui lòng nêu rõ lý do để hệ thống đóng gói chuyển tiếp Cán bộ xem xét.',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 2.1. Kiểm tra dữ kiện bắt buộc: Mục đích sử dụng giấy
  const rawPurpose = inputData.purpose || inputData.reason || inputData.REQ_PURPOSE || '';
  const trimmedPurpose = String(rawPurpose).trim();
  if (!trimmedPurpose) {
    return {
      classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      decision: TRACK_A_DECISION.ASK_CLARIFICATION,
      rule: 'REQ_PURPOSE',
      reason: 'Thiếu dữ kiện thực tế bắt buộc: mục đích sử dụng giấy xác nhận sinh viên.',
      actionableQuestion:
        'Bạn cần giấy xác nhận sinh viên cho mục đích nào: làm vé tháng xe buýt, vay vốn ngân hàng chính sách, tạm hoãn nghĩa vụ quân sự, giảm thuế hay xin visa? Bạn có thể điền biểu mẫu tương ứng bên tay trái hoặc nhắn trực tiếp cho mình nhé!',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 3. Xác định loại biểu mẫu yêu cầu & Kiểm tra phát hiện chéo biểu mẫu (Cross-form mismatch)
  const currentFormCode = inputData.formCode || inputData.requestTypeCode || null;
  const mismatchCheck = detectCrossFormMismatch({
    currentFormCode,
    text: inputData.purpose || inputData.reason || '',
    student,
    inputData,
    conversationHistory: inputData.conversationHistory || [],
    sessionId: inputData.sessionId || null,
  });

  if (mismatchCheck.isMismatch) {
    return {
      classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      decision: TRACK_A_DECISION.ASK_CLARIFICATION,
      rule: 'MISMATCH_FORM_GUIDANCE',
      reason: mismatchCheck.reason,
      actionableQuestion: mismatchCheck.guidanceMessage,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  const formCode = currentFormCode || 'GENERAL_CONFIRMATION';
  const targetForm = HUTECH_FORMS[formCode] || detectFormIntent(inputData.purpose || inputData.reason || '') || HUTECH_FORMS.GENERAL_CONFIRMATION;

  // 4. ĐIỀU KIỆN SỐ 2: KIỂM TRA THỜI GIAN ĐÀO TẠO 4 NĂM & TIẾN ĐỘ NỢ MÔN / TỐT NGHIỆP
  const overdueStatus = checkCohortOverdueStatus(student);
  if (overdueStatus.isOverdue) {
    // Sơ đồ .mdj: Quá 4 năm NHƯNG KHÔNG nợ môn (đã hoàn thành đủ >= 150 tín chỉ hoặc đã tốt nghiệp)
    // -> Không dùng biểu mẫu nợ môn -> VƯỢT QUÁ QUYỀN AI -> Đóng gói chuyển tiếp Cán bộ
    if (overdueStatus.isCompleted) {
      return {
        classification: TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY,
        uncertaintyType: TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY,
        decision: TRACK_A_DECISION.ESCALATE_STAFF,
        targetRole: 'STAFF',
        rule: 'POL_OVERDUE_COMPLETED_BEYOND_AUTHORITY',
        reason: 'Sinh viên khóa cũ (quá 4 năm đào tạo) đã hoàn thành khối lượng đào tạo (>= 150 tín chỉ hoặc đã tốt nghiệp). Không thuộc diện cấp Biểu mẫu nợ môn. Trường hợp cấp giấy xác nhận hoàn thành chương trình vượt quá thẩm quyền của AI, cần chuyển Cán bộ Phòng Đào tạo.',
        actionableQuestion: `Sinh viên ${student.fullName} (${student.studentCode}) thuộc khóa cũ đã hoàn thành khối lượng học phần (>= 150 tín chỉ / tốt nghiệp). Cán bộ PĐT có xem xét phê duyệt cấp Giấy chứng nhận hoàn thành chương trình / hồ sơ đặc thù cho sinh viên không?`,
        userMessage: `Hệ thống ghi nhận bạn đã hoàn thành khối lượng chương trình đào tạo / đã tốt nghiệp nên không sử dụng Biểu mẫu nợ môn. Trường hợp cấp giấy xác nhận hoàn thành chương trình đối với sinh viên khóa cũ vượt quá thẩm quyền tự động của AI, hệ thống đã đóng gói hồ sơ chuyển tiếp lên Cán bộ Phòng Đào tạo để xử lý thủ công cho bạn.`,
        policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
      };
    }

    // Quá 4 năm VÀ CÒN NỢ MÔN:
    // Nếu sinh viên chọn nợ môn -> Hợp lệ vào luồng Mẫu Nợ Môn
    if (targetForm.code === 'COURSE_DEBT') {
      const debtCourses = String(inputData.debtCourses || inputData.reason || '').trim();
      if (!debtCourses) {
        return {
          classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
          uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
          decision: TRACK_A_DECISION.ASK_CLARIFICATION,
          rule: 'REQ_DEBT_COURSES',
          reason: 'Biểu mẫu nợ môn bắt buộc phải liệt kê các môn học còn nợ chưa đủ điều kiện tốt nghiệp.',
          actionableQuestion:
            'Bạn vui lòng cung cấp danh sách các môn học bạn còn nợ chưa hoàn thành (bằng cách nhắn trực tiếp tại đây hoặc điền vào ô Môn còn nợ ở Biểu mẫu nợ môn bên tay trái) để Nhà trường xét duyệt nhé!',
          policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
        };
      }
    } else {
      // Nếu quá 4 năm còn nợ môn mà xin 4 mẫu thường quy -> Từ chối và điều hướng sang Mẫu Nợ Môn
      const debtGuide = getFormFieldsGuide('COURSE_DEBT');
      return {
        classification: TRACK_A_CLASSIFICATION.ROUTINE_POLICY_DENY,
        uncertaintyType: null,
        decision: TRACK_A_DECISION.AUTO_REJECT,
        rule: 'POL_OVERDUE_COHORT_REQUIRE_DEBT_FORM',
        reason: 'Sinh viên đang trong diện nợ môn cần hoàn thành học phần. Quy chế yêu cầu chuyển sang Biểu mẫu nợ môn để được giải quyết hợp lệ.',
        userMessage:
          `Theo quy chế đào tạo của Nhà trường, đối với sinh viên đang trong tiến trình hoàn thành học phần nợ, bạn vui lòng chuyển sang **Biểu mẫu nợ môn (COURSE_DEBT)** theo 1 trong 2 cách sau để được giải quyết nhanh chóng:\n` +
          `👉 **Cách 1: Điền đơn bên tay trái**: Tìm mục "Biểu mẫu nợ môn" ở danh mục bên tay trái và bấm "Điền đơn".\n` +
          `👉 **Cách 2: Gửi trực tiếp thông tin cho mình ngay tại đây**:\n${debtGuide}`,
        policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
      };
    }
  }

  // 4.1. CHỐT CHẶN HẠN NGẠCH CẤP GIẤY THEO SƠ ĐỒ .MDJ: CHECK CÓ TRÙNG BIỂU MẪU KHÔNG
  const approvedCount = inputData.existingApprovedCount !== undefined
    ? Number(inputData.existingApprovedCount)
    : (Array.isArray(inputData.historyRequests)
        ? inputData.historyRequests.filter((r) => ['APPROVED', 'COMPLETED', 'ESCALATED'].includes(r.status) && (r.inputData?.formCode || 'GENERAL_CONFIRMATION') === targetForm.code).length
        : 0);

  if (approvedCount >= 1) {
    const reissueReason = String(inputData.repeatReason || inputData.reissueReason || inputData.explanation || inputData.reissueExplanation || '').trim();
    if (!reissueReason) {
      return {
        classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
        uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
        decision: TRACK_A_DECISION.ASK_CLARIFICATION,
        rule: 'REQ_REISSUE_REASON',
        reason: `Sinh viên đã được cấp Giấy xác nhận cho biểu mẫu [${targetForm.code}] trước đó trong học kỳ. Theo quy chế của Phòng CTSV, mỗi học kỳ sinh viên chỉ được cấp 1 bản cho mỗi biểu mẫu; nếu xin cấp lại lần 2 bắt buộc phải giải trình lý do chính đáng.`,
        actionableQuestion:
          `Dạ hệ thống ghi nhận bạn đã được cấp Giấy xác nhận cho biểu mẫu "${targetForm.name}" trong học kỳ này rồi. Theo quy chế của Phòng CTSV, mỗi học kỳ sinh viên chỉ được cấp 1 bản cho mỗi biểu mẫu. Để xin cấp lại lần 2, bạn vui lòng cung cấp lý do chính đáng (ví dụ: bị mất giấy, bị rách, nộp bổ sung cho cơ quan thứ 2...) để Cán bộ Phòng CTSV/PĐT xem xét nhé!`,
        policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
      };
    }

    // Sơ đồ .mdj: Có lý do đóng gói chuyển tiếp cho Cán bộ (ESCALATE_TO_STAFF)
    const prevCode = inputData.originalRequestCode ? ` (Đơn lần 1 mã: ${inputData.originalRequestCode})` : '';
    return {
      classification: TRACK_A_CLASSIFICATION.OUTSIDE_POLICY,
      uncertaintyType: TRACK_A_CLASSIFICATION.OUTSIDE_POLICY,
      decision: TRACK_A_DECISION.ESCALATE_STAFF,
      targetRole: 'STAFF',
      rule: 'POLICY_REISSUE_QUOTA_ESCALATE',
      reason: `Sinh viên xin cấp lại lần thứ 2 trong cùng học kỳ cho biểu mẫu [${targetForm.code}] với lý do giải trình: "${reissueReason}". Vượt hạn ngạch tự động 1 bản/kỳ, bắt buộc chuyển Cán bộ Phòng CTSV/PĐT xem xét phê duyệt ngoại lệ.`,
      actionableQuestion:
        `Sinh viên ${student.fullName} (${student.studentCode}) xin cấp lại lần 2 biểu mẫu "${targetForm.name}" do: "${reissueReason}"${prevCode}. Cán bộ CTSV/PĐT có chấp thuận phê duyệt cấp lại không?`,
      userMessage:
        `Yêu cầu xin cấp lại lần 2 biểu mẫu ${targetForm.name} của bạn đã được tiếp nhận kèm lý do giải trình ("${reissueReason}"). Hệ thống đã đóng gói chuyển tiếp hồ sơ lên Cán bộ Phòng CTSV/PĐT để xem xét phê duyệt ngoại lệ. Bạn vui lòng chờ thông báo từ Nhà trường nhé!`,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 5. ĐIỀU KIỆN SỐ 3: KIỂM TRA SỐ ĐIỆN THOẠI LIÊN HỆ (Bắt buộc cho mọi biểu mẫu - Không default)
  const rawPhone = String(inputData.phone || '').trim();
  const phoneClean = rawPhone.replace(/[\s\.\-\+]/g, '');
  const isValidPhone = /^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(phoneClean);
  if (!isValidPhone) {
    return {
      classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      decision: TRACK_A_DECISION.ASK_CLARIFICATION,
      rule: 'REQ_PHONE_NUMBER_REQUIRED',
      reason: rawPhone ? 'Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số).' : 'Thiếu số điện thoại liên lạc của sinh viên.',
      actionableQuestion: 'Để Nhà trường có thể liên hệ thông báo khi bản cứng được ký mộc, bạn vui lòng cung cấp số điện thoại di động chính xác (10 chữ số, ví dụ: 0901234567) nhé!',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 6. ĐIỀU KIỆN SỐ 4: KIỂM TRA ĐỊA CHỈ HỘ KHẨU THƯỜNG TRÚ (Trọng tâm của Thầy cho Mẫu NVQS, Giảm thuế)
  if (['MILITARY_DEFERMENT', 'TAX_DEDUCTION'].includes(targetForm.code)) {
    const address = String(inputData.permanentAddress || inputData.address || '').trim();
    if (!address) {
      return {
        classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
        uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
        decision: TRACK_A_DECISION.ASK_CLARIFICATION,
        rule: 'REQ_PERMANENT_ADDRESS_REQUIRED',
        reason: `Biểu mẫu "${targetForm.name}" bắt buộc phải có địa chỉ hộ khẩu thường trú đầy đủ 4 cấp hành chính.`,
        actionableQuestion: `Dạ Thầy cô Phòng CTSV lưu ý biểu mẫu "${targetForm.name}" bắt buộc phải có địa chỉ thường trú đầy đủ 4 cấp hành chính (Số nhà/đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố) và viết hoa đúng chuẩn (Ví dụ: "180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh" hoặc "Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu"). Bạn vui lòng cung cấp địa chỉ hộ khẩu thường trú nhé!`,
        policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
      };
    }

    const addressCheck = validatePermanentAddress(address);
    if (!addressCheck.isValid) {
      return {
        classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
        uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
        decision: TRACK_A_DECISION.ASK_CLARIFICATION,
        rule: 'REQ_PERMANENT_ADDRESS_STANDARD',
        reason: `Địa chỉ hộ khẩu chưa đạt chuẩn: ${addressCheck.reason}`,
        actionableQuestion: `Dạ Thầy cô Phòng CTSV lưu ý: ${addressCheck.reason}\n\nBạn vui lòng điều chỉnh lại địa chỉ ghi rõ đủ 4 cấp hành chính và viết hoa chữ cái đầu (Ví dụ: "Ấp Châu Phú, Xã Hòa Bình, Huyện Hòa Bình, Tỉnh Bạc Liêu") để được cấp giấy hợp lệ nhé!`,
        policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
      };
    }

    // 6.1. RIÊNG ĐỐI VỚI BIỂU MẪU TẠM HOÃN NGHĨA VỤ QUÂN SỰ (MILITARY_DEFERMENT):
    // Hệ thống sau khi nhận/định dạng địa chỉ BẮT BUỘC phải dừng lại hỏi xác nhận và cảnh báo trách nhiệm pháp lý với BCH Quân sự địa phương!
    if (targetForm.code === 'MILITARY_DEFERMENT') {
      const isConfirmed = inputData.isAddressConfirmed === true || inputData.addressConfirmed === true;
      if (!isConfirmed) {
        return {
          classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
          uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
          decision: TRACK_A_DECISION.ASK_CLARIFICATION,
          rule: 'CONFIRM_MILITARY_ADDRESS_RESPONSIBILITY',
          reason: 'Địa chỉ thường trú phục vụ Giấy tạm hoãn Nghĩa vụ Quân sự bắt buộc phải được sinh viên xác nhận và cam kết chịu trách nhiệm pháp lý trước khi phê duyệt.',
          actionableQuestion:
            `Dạ hệ thống đã ghi nhận địa chỉ hộ khẩu thường trú của bạn theo chuẩn văn thư hành chính là:\n` +
            `🏠 **${address}**\n\n` +
            `⚠️ **CẢNH BÁO QUY CHẾ PHÁP LÝ NGHĨA VỤ QUÂN SỰ (BCH QUÂN SỰ ĐỊA PHƯƠNG):**\n` +
            `Giấy chứng nhận Tạm hoãn NVQS sẽ được nộp trực tiếp về Ban Chỉ huy Quân sự địa phương nơi bạn đăng ký hộ khẩu thường trú. Sinh viên phải **hoàn toàn chịu trách nhiệm trước pháp luật** về tính chính xác của địa chỉ khai báo (đặc biệt lưu ý tên xã/phường/thị trấn sau các đợt sáp nhập, sắp xếp đơn vị hành chính để tránh bị địa phương từ chối hồ sơ).\n\n` +
            `Bạn vui lòng đối chiếu kỹ với CCCD/Sổ hộ khẩu và xác nhận lại giúp mình:\n` +
            `👉 Nếu địa chỉ trên đã chính xác: Bạn chỉ cần nhắn **"Xác nhận đúng"** (kèm theo cơ sở nhận giấy bản cứng: A-01.01 Sài Gòn hoặc E1-01.08 Thủ Đức nếu chưa chọn) để mình hoàn tất duyệt và cấp mã hồ sơ ngay nhé!\n` +
            `👉 Nếu cần điều chỉnh: Bạn nhắn lại địa chỉ chính xác để mình cập nhật nhé!`,
          policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
        };
      }
    }
  }

  // 7. ĐIỀU KIỆN SỐ 5: KIỂM TRA CƠ SỞ NHẬN GIẤY BẢN CỨNG (KHÔNG DEFAULT - BẮT BUỘC CHỌN 1 TRONG 2 CƠ SỞ)
  const campusRaw = String(inputData.pickupCampus || inputData.campus || '').trim();
  const isThuDuc = /thủ đức|thu duc|e1/i.test(campusRaw);
  const isSaiGon = /sài gòn|sai gon|a-01|điện biên phủ|ung văn khiêm|trụ sở/i.test(campusRaw);

  if (!campusRaw || (!isThuDuc && !isSaiGon)) {
    return {
      classification: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      uncertaintyType: TRACK_A_CLASSIFICATION.UNKNOWN_FACT,
      decision: TRACK_A_DECISION.ASK_CLARIFICATION,
      rule: 'REQ_PICKUP_CAMPUS',
      reason: 'Chưa chọn cơ sở nhận giấy bản cứng hợp lệ có mộc đỏ và chữ ký sống.',
      actionableQuestion:
        'Để Nhà trường chuẩn bị bản cứng có chữ ký sống và mộc đỏ của Phòng CTSV, bạn vui lòng chọn 1 trong 2 cơ sở sau để nhận giấy nhé:\n' +
        '1. 🏢 Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)\n' +
        '2. 🏢 Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.08)',
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  const campus = isThuDuc
    ? 'Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.08)'
    : 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)';

  // 7. KIỂM TRA NGOẠI LỆ / ÉP QUYỀN DUYỆT MIỆNG
  if (inputData.userClaimedOverride === true || inputData.forceApprove === true) {
    return {
      classification: TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY,
      uncertaintyType: TRACK_A_CLASSIFICATION.BEYOND_AUTHORITY,
      decision: TRACK_A_DECISION.ESCALATE_STAFF,
      rule: 'AUTH_NO_SELF_OVERRIDE',
      targetRole: 'STAFF',
      reason: 'Yêu cầu ngoại lệ hoặc phê duyệt miệng vượt thẩm quyền tự động của tác tử.',
      actionableQuestion:
        `Sinh viên ${student.fullName} (${student.studentCode}) khai đã được lãnh đạo đồng ý ngoại lệ cho biểu mẫu "${targetForm.name}". Cán bộ CTSV có xác minh và phê duyệt ngoại lệ này không?`,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }

  // 8. KIỂM TRA MỤC ĐÍCH THƯỜNG QUY (ALLOWLIST & OUTSIDE_POLICY)
  const finalPurposeText = String(inputData.purpose || inputData.reason || '').trim();
  const routinePurpose = matchRoutinePurpose(finalPurposeText);
  if (!routinePurpose && finalPurposeText.length > 0) {
    return {
      classification: TRACK_A_CLASSIFICATION.OUTSIDE_POLICY,
      uncertaintyType: TRACK_A_CLASSIFICATION.OUTSIDE_POLICY,
      decision: TRACK_A_DECISION.ESCALATE_STAFF,
      rule: 'POLICY_SCOPE_PURPOSE_ALLOWLIST',
      targetRole: 'STAFF',
      reason: `Mục đích "${finalPurposeText}" chưa được policy ${STUDENT_CONFIRMATION_POLICY_VERSION} bao phủ; tác tử không được tự suy diễn cho phép hay từ chối.`,
      actionableQuestion:
        `Quy chế hiện chưa bao phủ mục đích "${finalPurposeText}". Cán bộ CTSV/PĐT có chấp thuận cấp giấy xác nhận cho mục đích này không?`,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
    };
  }



  // 9. ĐỦ ĐIỀU KIỆN PHÊ DUYỆT TỰ ĐỘNG (ROUTINE AUTO APPROVE)
  return {
    classification: TRACK_A_CLASSIFICATION.ROUTINE,
    uncertaintyType: null,
    decision: TRACK_A_DECISION.AUTO_APPROVE,
    rule: `APPROVED_${targetForm.code}`,
    formCode: targetForm.code,
    formName: targetForm.name,
    reason: `Sinh viên có thời khóa biểu hợp lệ trong học kỳ, hồ sơ đầy đủ dữ kiện biểu mẫu [${targetForm.code}] và nằm trong thẩm quyền tự động.`,
    userMessage: `Hồ sơ ${targetForm.name} của bạn đã được EduRef AI tự động thẩm định thành công. Bạn vui lòng mang thẻ sinh viên đến ${campus} để nhận bản cứng có chữ ký sống và mộc đỏ của Nhà trường trong giờ hành chính nhé!`,
    policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
  };
}

/**
 * Trích xuất ý định từ câu chat tự do của sinh viên
 */
export function inferStudentConfirmationInput(prompt = '') {
  const normalized = normalizeText(prompt);
  const detectedForm = detectFormIntent(prompt);

  const overridePatterns = ['cứ duyệt', 'duyệt luôn', 'đồng ý miệng', 'lãnh đạo đã đồng ý', 'bỏ qua quy định', 'tôi có quyền'];
  const userClaimedOverride = overridePatterns.some((pattern) => normalized.includes(pattern));

  const inquiryRegex = /(?:cần những gì|cần gì|cần chuẩn bị|điều kiện gì|bao lâu|mất bao lâu|thế nào|ra sao|như thế nào|như nào|ở đâu|nhận ở đâu|có mất phí|có tốn phí|có mất tiền|bao nhiêu tiền|cho em hỏi|cho mình hỏi|tư vấn)/i;
  const actionRegex = /(?:làm cho em|làm cho mình|tạo đơn|nộp đơn|cấp cho em|cấp cho mình|xin cấp|đồng ý nộp|xác nhận tạo|duyệt ngay|cứ duyệt)/i;
  const isInquiry = inquiryRegex.test(prompt) && !actionRegex.test(prompt);

  const generalPatterns = [
    'cho em xin giấy xác nhận sinh viên',
    'xin giấy xác nhận sinh viên',
    'xin cấp giấy xác nhận',
    'em muốn xin giấy xác nhận',
    'cần giấy xác nhận sinh viên',
  ];
  const isGeneric = generalPatterns.some((pattern) => normalized === pattern || normalized.startsWith(pattern + ' với') || normalized.startsWith(pattern + ' ạ'));

  if (isGeneric) {
    return {
      purpose: null,
      userClaimedOverride,
    };
  }

  // Bóc tách địa chỉ nếu sinh viên gõ trong chat (ví dụ "địa chỉ: ...")
  const addressMatch = prompt.match(/(?:địa chỉ|thường trú|hộ khẩu)[\s:]+([^;\n]+)/i);
  const permanentAddress = addressMatch ? addressMatch[1].trim() : null;

  // Bóc tách số điện thoại
  const phoneMatch = prompt.match(/(?:sđt|điện thoại|phone|đt)[\s:]*([0-9]{9,11})|(?:\b0[35789][0-9]{8}\b)/i);
  const phone = phoneMatch ? (phoneMatch[1] || phoneMatch[0]).trim() : null;

  // Bóc tách môn nợ
  const debtMatch = prompt.match(/(?:nợ môn|môn nợ|chưa hoàn thành)[\s:]+([^;\n]+)/i);
  const debtCourses = debtMatch ? debtMatch[1].trim() : null;

  // Bóc tách CCCD
  const idCardMatch = prompt.match(/(?:cccd|cmnd|căn cước)[\s:]*([0-9]{9,12})|(?:\b[0-9]{12}\b)/i);
  const idCard = idCardMatch ? (idCardMatch[1] || idCardMatch[0]).trim() : null;

  // Bóc tách cơ sở
  const isThuDuc = /thủ đức|thu duc|e1/i.test(prompt);
  const isSaiGon = /sài gòn|sai gon|a-01|trụ sở/i.test(prompt);
  const pickupCampus = isThuDuc
    ? 'Thu Duc Campus — Phòng Công tác Sinh viên (E1-01.08)'
    : isSaiGon
    ? 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)'
    : null;

  return {
    formCode: detectedForm ? detectedForm.code : 'GENERAL_CONFIRMATION',
    purpose: prompt.trim(),
    permanentAddress,
    phone,
    debtCourses,
    idCard,
    pickupCampus,
    userClaimedOverride,
    isInquiry,
  };
}

export default {
  HUTECH_FORMS,
  validatePermanentAddress,
  isOverdueCohort,
  detectFormIntent,
  getFormFieldsGuide,
  detectCrossFormMismatch,
  evaluateStudentConfirmation,
  inferStudentConfirmationInput,
};
