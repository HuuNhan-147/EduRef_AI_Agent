let activeAccountKey = 'STUDENT_ACTIVE';
const previewStudentCodes = {
  STUDENT_ACTIVE: '2280602154',
  STUDENT_DROPPED: '2110002',
  STUDENT_DEBT: '2110003',
};
const previewStudentNames = {
  STUDENT_ACTIVE: 'Cao Hữu Nhân',
  STUDENT_DROPPED: 'Trần Thị Bình',
  STUDENT_DEBT: 'Lê Hoàng Cường',
};

export function setPreviewAccount(accountKey) {
  activeAccountKey = accountKey;
}

function nowMinus(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function previewQrDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" fill="#ffffff"/>
      <g fill="#0f172a">
        <rect x="22" y="22" width="58" height="58" rx="4"/><rect x="160" y="22" width="58" height="58" rx="4"/>
        <rect x="22" y="160" width="58" height="58" rx="4"/><rect x="101" y="101" width="18" height="18"/>
        <rect x="132" y="101" width="28" height="12"/><rect x="101" y="132" width="12" height="28"/>
        <rect x="132" y="132" width="28" height="28"/><rect x="174" y="112" width="14" height="14"/>
        <rect x="184" y="144" width="34" height="14"/><rect x="112" y="184" width="14" height="34"/>
      </g>
      <text x="120" y="232" text-anchor="middle" font-family="Arial" font-size="10" fill="#475569">UI PREVIEW</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const proof = '9b1f6d3c4a8270e55c160df2b7398adf17d6d09bf475e0d7b3cc675ecad24f81';

const previewPetitions = [
  {
    id: 'preview-request-approved',
    requestCode: 'UI-24001',
    status: 'APPROVED',
    decision: 'STAFF_MANUAL_APPROVED',
    inputData: { purpose: 'Làm vé xe buýt', recipient: 'Trung tâm Quản lý Giao thông công cộng' },
    requestType: { code: 'STUDENT_CONFIRMATION', name: 'Giấy xác nhận sinh viên' },
    student: { studentCode: '2280602154', fullName: 'Cao Hữu Nhân', status: 'ACTIVE', tuitionDebt: 0 },
    qrCodeUrl: previewQrDataUrl(),
    sha256Proof: proof,
    documents: [],
    assignedStaff: { id: 'preview-staff', fullName: 'Thầy Trần Hữu Nghĩa', role: 'STAFF' },
    createdAt: nowMinus(180),
    updatedAt: nowMinus(178),
  },
  {
    id: 'preview-request-escalated',
    requestCode: 'UI-24002',
    status: 'ESCALATED',
    decision: 'ESCALATE_TO_STAFF',
    escalationReason: 'Mục đích sử dụng nằm ngoài nhóm trường hợp thường quy của fixture UI Preview.',
    inputData: { purpose: 'Xác nhận ngoại lệ theo yêu cầu riêng', recipient: 'Đơn vị tiếp nhận mẫu' },
    requestType: { code: 'STUDENT_CONFIRMATION', name: 'Giấy xác nhận sinh viên' },
    student: { studentCode: '2280602154', fullName: 'Cao Hữu Nhân', status: 'ACTIVE', tuitionDebt: 0 },
    contextCapsule: {
      studentCode: '2280602154',
      studentName: 'Cao Hữu Nhân',
      requestTypeName: 'Giấy xác nhận sinh viên',
      reason: 'Fixture này minh họa trường hợp AI dừng và chuyển quyền quyết định cho cán bộ.',
      actionableQuestion: 'Cán bộ có đồng ý tiếp nhận mục đích ngoại lệ được mô tả trong hồ sơ không?',
      requiredRole: 'STAFF',
      targetUnit: 'ACADEMIC_AFFAIRS',
      escalatedAt: nowMinus(45),
      studentSummary: { status: 'ACTIVE', tuitionDebt: 0, gpa: 3.2 },
    },
    documents: [],
    createdAt: nowMinus(48),
    updatedAt: nowMinus(45),
  },
  {
    id: 'preview-request-waiting',
    requestCode: 'UI-24003',
    status: 'WAITING_STUDENT',
    decision: 'ASK_CLARIFICATION',
    inputData: { purpose: 'Bổ sung hồ sơ vay vốn' },
    requestType: { code: 'STUDENT_CONFIRMATION', name: 'Giấy xác nhận sinh viên' },
    student: { studentCode: '2280602154', fullName: 'Cao Hữu Nhân', status: 'ACTIVE', tuitionDebt: 0 },
    documents: [],
    createdAt: nowMinus(25),
    updatedAt: nowMinus(20),
  },
];

const previewAuditLogs = [
  {
    id: 'preview-audit-1',
    actorType: 'STAFF',
    action: 'STAFF_APPROVE_REQUEST',
    decision: 'APPROVED',
    reason: 'Fixture UI Preview: hồ sơ thường quy đáp ứng điều kiện mẫu.',
    request: { requestCode: 'UI-24001' },
    previousHash: 'GENESIS_HASH_EDUREF_2026',
    sha256Hash: proof,
    decisionTimeMs: 684,
    createdAt: nowMinus(178),
  },
  {
    id: 'preview-audit-2',
    actorType: 'AI_AGENT',
    action: 'ESCALATE_AUTHORITY_TRANSFER',
    decision: 'ESCALATED',
    reason: 'Fixture UI Preview: yêu cầu cần cán bộ quyết định.',
    request: { requestCode: 'UI-24002' },
    previousHash: proof,
    sha256Hash: '5e87992bd06707f4ca6726458e54ab67ae8d44c618e8c76c077dd598a8abf764',
    decisionTimeMs: 512,
    createdAt: nowMinus(45),
  },
];

function parseBody(data) {
  if (!data) return {};
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function response(config, data, status = 200) {
  return { data, status, statusText: status === 200 ? 'OK' : 'Preview response', headers: {}, config, request: null };
}

function buildSuite(mode) {
  const track = mode === 'TRACK_A_ESCALATION';
  const definitions = track
    ? [
        ['A-01', 'Thường quy: làm vé xe buýt', 'ESCALATE_TO_STAFF', 'ROUTINE'],
        ['A-02', 'Thường quy: hồ sơ học bổng', 'ESCALATE_TO_STAFF', 'ROUTINE'],
        ['A-03', 'Thường quy: vay vốn sinh viên', 'ESCALATE_TO_STAFF', 'ROUTINE'],
        ['A-04', 'Mục đích chưa có trong policy', 'ESCALATE_TO_STAFF', 'OUTSIDE_POLICY'],
        ['A-05', 'Yêu cầu vượt thẩm quyền', 'ESCALATE_TO_STAFF', 'BEYOND_AUTHORITY'],
      ]
    : [
        ['G-01', 'Thường quy: làm vé xe buýt', 'ESCALATE_TO_STAFF', 'ROUTINE'],
        ['G-02', 'Thiếu mục đích sử dụng', 'ASK_CLARIFICATION', 'UNKNOWN_FACT'],
        ['G-03', 'Sinh viên đã thôi học', 'ESCALATE_TO_STAFF', 'ROUTINE_POLICY_DENY'],
        ['G-04', 'Yêu cầu duyệt ngoại lệ', 'ESCALATE_TO_STAFF', 'BEYOND_AUTHORITY'],
      ];
  const startedAt = nowMinus(1);
  const completedAt = new Date().toISOString();
  const results = definitions.map(([id, title, decision, classification], index) => ({
    id,
    title,
    prompt: title,
    expectedDecision: decision,
    actualDecision: decision,
    category: classification,
    classification,
    passed: true,
    durationMs: 180 + index * 47,
    startedAt,
    completedAt,
    message: decision.startsWith('ESCALATE_') ? 'Fixture được chuyển cán bộ để minh họa human-in-the-loop.' : 'Fixture đã chạy đúng kết quả kỳ vọng.',
    sha256Proof: null,
  }));
  const escalationCount = results.filter((item) => item.actualDecision.startsWith('ESCALATE_')).length;
  const clarificationCount = results.filter((item) => item.actualDecision === 'ASK_CLARIFICATION').length;
  return {
    success: true,
    mode,
    policyVersion: 'UI_PREVIEW_FIXTURE',
    startedAt,
    completedAt,
    totalDurationMs: results.reduce((sum, item) => sum + item.durationMs, 0),
    totalCases: results.length,
    passedCases: results.length,
    failedCases: 0,
    escalationCount,
    clarificationCount,
    distributionPassed: true,
    allPassed: true,
    results,
  };
}

export function getUiPreviewChatResult(message, inputData = {}) {
  const provided = inputData.formFields || {};
  const previous = inputData.draftFields || {};
  const text = String(message || '').trim();
  const asksQuestion = !provided.purpose && /^(hỏi|cho hỏi|giá|phí|bao nhiêu|quy trình|cách|khi nào)/iu.test(text);
  if (asksQuestion) {
    return {
      reply: 'Trong UI Preview, bạn hãy cho biết mục đích xin giấy. Tôi sẽ lập bản nháp để bạn kiểm tra trước khi gửi; cán bộ Phòng Đào tạo mới là người quyết định hồ sơ. Mức phí và thời hạn cần được phòng xác nhận.',
      decision: 'ANSWERED',
      totalDuration: 850,
    };
  }
  const fields = {
    purpose: String(provided.purpose || previous.purpose || '').trim(),
    recipient: String(provided.recipient || previous.recipient || '').trim(),
    note: String(provided.note || previous.note || '').trim(),
  };
  const purposeAfterDe = text.match(/để\s+(.{4,})/iu)?.[1];
  if (!fields.purpose && (purposeAfterDe || /^(?:làm|bổ sung|nộp)\s+.{4,}/iu.test(text))) {
    fields.purpose = String(purposeAfterDe || text).slice(0, 500);
  }
  if (fields.purpose.length < 4) {
    return {
      reply: 'Bạn cần giấy xác nhận sinh viên để sử dụng vào việc gì? Hãy mô tả mục đích cụ thể; tôi sẽ bổ sung vào bản nháp. Đây là UI Preview, chưa tạo hồ sơ thật.',
      decision: 'ASK_CLARIFICATION',
      toolResult: { status: 'COLLECTING', decision: 'ASK_CLARIFICATION', missingFields: ['purpose'] },
      intakeDraft: { fields, ready: false },
      totalDuration: 900,
    };
  }
  return {
    reply: 'Tôi đã lập bản nháp trong UI Preview. Bạn kiểm tra thông tin bên dưới và chọn gửi hồ sơ khi đã chắc chắn. Chưa có yêu cầu nào được gửi ở bước này.',
    decision: 'DRAFT_READY',
    toolResult: { status: 'DRAFT_READY', decision: 'DRAFT_READY' },
    intakeDraft: {
      id: `preview-draft-${Date.now()}`,
      ready: true,
      requestTypeCode: 'STUDENT_CONFIRMATION',
      student: { fullName: previewStudentNames[activeAccountKey] || 'Sinh viên', studentCode: previewStudentCodes[activeAccountKey] || '2280602154' },
      fields,
      destination: 'Phòng Đào tạo',
    },
    totalDuration: 1050,
  };
}

/* Legacy fixture outcomes are kept for the verification preview below. */
function getLegacyPreviewOutcome(message) {
  const normalized = String(message || '').toLocaleLowerCase('vi');
  if (normalized.includes('bổ sung') || normalized.includes('tài liệu') || normalized.includes('minh chứng')) {
    return {
      reply: 'Đây là trạng thái **UI Preview**: hồ sơ cần bạn bổ sung một tài liệu trước khi tiếp tục. File chưa được gửi tới máy chủ thật.',
      decision: 'ASK_CLARIFICATION',
      toolResult: {
        success: true,
        status: 'WAITING_STUDENT',
        decision: 'ASK_CLARIFICATION',
        requestId: 'preview-request-waiting',
        requestCode: 'UI-24003',
        missingField: 'supportingDocument',
        message: 'Cần bổ sung tài liệu minh chứng. Đây chỉ là fixture UI Preview.',
      },
      totalDuration: 742,
    };
  }
  if (normalized.includes('ngoại lệ') || normalized.includes('visa') || normalized.includes('nghĩa vụ')) {
    return {
      reply: 'Đây là trạng thái **UI Preview**: yêu cầu đã dừng tự động hóa và được đặt vào hàng đợi để cán bộ xem xét.',
      decision: 'ESCALATE_TO_STAFF',
      toolResult: {
        success: true,
        status: 'ESCALATED',
        decision: 'ESCALATE_TO_STAFF',
        requestId: 'preview-request-escalated',
        requestCode: 'UI-24002',
        reason: 'Mục đích mẫu cần con người quyết định trong UI Preview.',
      },
      totalDuration: 618,
    };
  }
  return {
    reply: 'Đây là kết quả **UI Preview**: thông tin đã được AI chuẩn bị và chuyển đến Phòng Đào tạo. Cán bộ có thẩm quyền sẽ đưa ra quyết định cuối cùng.',
    decision: 'ESCALATE_TO_STAFF',
    toolResult: {
      success: true,
      status: 'ESCALATED',
      decision: 'ESCALATE_TO_STAFF',
      requestId: 'preview-request-escalated',
      requestCode: 'UI-24002',
      requiredRole: 'STAFF',
      message: 'Fixture đã chuyển cán bộ dành riêng cho UI Preview; không phải giao dịch backend thật.',
    },
    totalDuration: 684,
  };
}

export function createUiPreviewAdapter() {
  return async (config) => {
    const method = String(config.method || 'get').toLowerCase();
    const parsedUrl = new URL(config.url || '/', 'http://ui-preview.local');
    const path = parsedUrl.pathname.replace(/^\/api/, '');
    const body = parseBody(config.data);
    await new Promise((resolve) => globalThis.setTimeout(resolve, path === '/agent/chat' ? 700 : 180));

    if (method === 'get' && path === '/petitions/types') {
      return response(config, { success: true, data: [{ code: 'STUDENT_CONFIRMATION', name: 'Giấy xác nhận sinh viên', description: 'Fixture UI Preview cho quy trình Sprint 2.' }] });
    }
    if (method === 'get' && path === '/petitions') {
      const accountIsStudent = activeAccountKey.startsWith('STUDENT_');
      const activeStudentCode = previewStudentCodes[activeAccountKey];
      const status = parsedUrl.searchParams.get('status');
      const data = previewPetitions.filter((item) => (!accountIsStudent || item.student.studentCode === activeStudentCode) && (!status || item.status === status));
      return response(config, { success: true, total: data.length, data });
    }
    if (method === 'post' && path === '/petitions') {
      const fields = body.formData || {};
      if (String(fields.purpose || '').trim().length < 4) {
        return response(config, { success: false, message: 'Vui lòng bổ sung mục đích trước khi gửi.' }, 400);
      }
      const createdAt = new Date().toISOString();
      const petition = {
        id: `preview-request-${Date.now()}`,
        requestCode: `UI-${String(Date.now()).slice(-6)}`,
        status: 'ESCALATED',
        decision: 'ESCALATE_TO_STAFF',
        requestType: { code: 'STUDENT_CONFIRMATION', name: 'Giấy xác nhận sinh viên' },
        inputData: fields,
        student: { studentCode: previewStudentCodes[activeAccountKey] || '2280602154', fullName: previewStudentNames[activeAccountKey] || 'Sinh viên', status: 'ACTIVE', tuitionDebt: 0 },
        contextCapsule: { requiredRole: 'STAFF', targetUnit: 'ACADEMIC_AFFAIRS', reason: 'Sinh viên đã xác nhận bản nháp trong UI Preview.', studentSummary: { status: 'ACTIVE' } },
        documents: [],
        createdAt,
        updatedAt: createdAt,
      };
      previewPetitions.unshift(petition);
      return response(config, { success: true, data: petition, preview: true });
    }
    const petitionMatch = path.match(/^\/petitions\/([^/]+)$/);
    if (method === 'get' && petitionMatch) {
      const petition = previewPetitions.find((item) => item.id === petitionMatch[1]);
      return response(config, petition ? { success: true, data: petition } : { success: false, message: 'Không tìm thấy fixture.' }, petition ? 200 : 404);
    }
    const actionMatch = path.match(/^\/petitions\/([^/]+)\/(approve|reject)$/);
    if (method === 'post' && actionMatch) {
      const petition = previewPetitions.find((item) => item.id === actionMatch[1]);
      if (petition) {
        petition.status = actionMatch[2] === 'approve' ? 'APPROVED' : 'REJECTED';
        petition.updatedAt = new Date().toISOString();
      }
      return response(config, { success: Boolean(petition), data: petition, preview: true });
    }
    const claimMatch = path.match(/^\/petitions\/([^/]+)\/claim$/);
    if (method === 'post' && claimMatch) {
      const petition = previewPetitions.find((item) => item.id === claimMatch[1]);
      if (petition) petition.assignedStaff = { id: 'preview-current-user', fullName: 'Tài khoản đang dùng', role: activeAccountKey.startsWith('DEAN_') ? 'DEAN' : 'STAFF' };
      return response(config, { success: Boolean(petition), data: petition, message: 'Đã nhận xử lý trong UI Preview.' }, petition ? 200 : 404);
    }
    const escalateMatch = path.match(/^\/petitions\/([^/]+)\/escalate-to-dean$/);
    if (method === 'post' && escalateMatch) {
      const petition = previewPetitions.find((item) => item.id === escalateMatch[1]);
      if (petition) {
        petition.decision = 'ESCALATE_TO_DEAN';
        petition.contextCapsule = { ...(petition.contextCapsule || {}), requiredRole: 'DEAN', escalationToDeanReason: body.reason };
        petition.assignedStaff = null;
      }
      return response(config, { success: Boolean(petition), data: petition, message: 'Đã chuyển Trưởng Phòng trong UI Preview.' }, petition ? 200 : 404);
    }
    const rollbackMatch = path.match(/^\/petitions\/([^/]+)\/rollback$/);
    if (method === 'post' && rollbackMatch) {
      const petition = previewPetitions.find((item) => item.id === rollbackMatch[1]);
      if (!petition || petition.status === 'CANCELLED') return response(config, { success: false, message: 'Không thể hủy hồ sơ này trong UI Preview.' }, 409);
      petition.status = 'CANCELLED';
      petition.decision = 'HUMAN_OVERRIDE_CANCELLED';
      petition.qrCodeUrl = null;
      petition.escalationReason = body.reason;
      petition.updatedAt = new Date().toISOString();
      return response(config, { success: true, currentStatus: 'CANCELLED', requestCode: petition.requestCode, preview: true });
    }
    if (method === 'post' && path === '/agent/chat') {
      return response(config, { success: true, data: getUiPreviewChatResult(body.message, body.inputData) });
    }
    if (method === 'post' && path === '/agent/verify-90s') return response(config, buildSuite('TRACK_A_ESCALATION'));
    if (method === 'post' && path === '/agent/verify-general') return response(config, buildSuite('GENERAL'));
    if (method === 'post' && path === '/agent/verify-custom-prompt') {
      const result = getLegacyPreviewOutcome(body.prompt);
      return response(config, { success: true, prompt: body.prompt, durationMs: result.totalDuration, completedAt: new Date().toISOString(), data: result.toolResult });
    }
    if (method === 'get' && path === '/audit/logs') return response(config, { success: true, total: previewAuditLogs.length, data: previewAuditLogs });
    if (method === 'get' && path === '/audit/verify-chain') {
      return response(config, { chainValid: true, totalBlocks: previewAuditLogs.length, verifiedAt: new Date().toISOString(), message: 'Các fixture UI Preview khớp tại thời điểm kiểm tra mô phỏng.' });
    }
    if (method === 'get' && path === '/agent/terminal-logs') {
      return response(config, { success: true, data: [
        { id: 'preview-log-1', step: 'REQUEST', type: 'START', timeFormatted: 'Preview', text: 'Đã tiếp nhận ca kiểm thử UI Preview.' },
        { id: 'preview-log-2', step: 'TOOL_CALL', type: 'TOOL_CALL', timeFormatted: 'Preview', text: 'Đang đối chiếu fixture với policy mẫu.' },
        { id: 'preview-log-3', step: 'COMPLETE', type: 'COMPLETE', timeFormatted: 'Preview', text: 'Đã tạo kết quả mô phỏng; không có dữ liệu backend thật.' },
      ] });
    }

    return response(config, { success: false, message: `UI Preview chưa định nghĩa ${method.toUpperCase()} ${path}.` }, 404);
  };
}
