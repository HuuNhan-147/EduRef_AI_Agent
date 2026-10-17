import crypto from 'node:crypto';
import prisma from '../config/prisma.js';
import AuditLogService from './AuditLogService.js';
import { getStudentFullProfile } from '../config/studentRegistry.js';
import { studentConfirmationHandler } from '../modules/petition-core/handlers/StudentConfirmationHandler.js';
import { HUTECH_FORMS, evaluateStudentConfirmation, detectFormIntent, calculatePickupAppointment } from './StudentConfirmationDecisionService.js';
import { cleanDraftInput, DEFAULT_PURPOSES, formFields, missingFieldMetadata, PETITION_FIELDS } from './PetitionFields.js';
import { publishPetitionStatus } from './PetitionEvents.js';
import AgentTerminalLogger from '../modules/ai-agent/core/AgentTerminalLogger.js';
import { publicErrorMessage } from './ErrorShield.js';

export class WorkflowError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const protectedFields = ['fullName', 'studentCode', 'studentClass', 'faculty', 'major'];
const statusDecision = { APPROVED: 'AUTO_APPROVED', REJECTED: 'REJECTED_POLICY', ESCALATED: 'ESCALATE_TO_STAFF', WAITING_STUDENT: 'ASK_CLARIFICATION' };

export default class PetitionDraftService {
  static async traced(studentCode, operation, execute) {
    const logger = new AgentTerminalLogger(null, `${studentCode}::workflow_${crypto.randomUUID()}`);
    const trace = (step, message, details = null, type = 'TOOL_RESULT') => logger.log({ step, message, details, type });
    trace('WORKFLOW_START', operation, null, 'START');
    try {
      const view = await execute(trace);
      trace(view.state === 'REJECTED' ? 'WORKFLOW_CLOSED' : view.state === 'READY' ? 'WAITING_CONFIRMATION'
        : view.state === 'NEEDS_INPUT' ? 'WAITING_INPUT' : 'WORKFLOW_RESULT', this.agentMessage(view),
      { draftId: view.id, revision: view.revision, state: view.state, rule: view.policyRule,
        requestId: view.result?.requestId || null, status: view.result?.status || null }, 'DECISION');
      if (view.result?.requestId) await publishPetitionStatus(view.result.requestId);
      return view;
    } catch (error) {
      trace('WORKFLOW_ERROR', error.status ? error.message : publicErrorMessage(error), null, 'ERROR');
      throw error;
    }
  }
  static agentMessage(view) {
    if (view.state === 'REJECTED') return `Không thể cấp ${view.formName}: ${view.resolution.reason} Quy trình này đã kết thúc. ${view.resolution.nextStep}`;
    if (view.state === 'SUBMITTED') return (view.result?.message || 'Đã lưu kết quả xử lý hồ sơ.') +
      (view.result?.status === 'REJECTED' ? ' Quy trình này đã kết thúc. Nếu cần kiểm tra lại quyết định, vui lòng liên hệ đơn vị tiếp nhận hồ sơ.' : '');
    if (view.state === 'CANCELLED') return 'Đã hủy bản nháp. Quy trình này đã kết thúc.';
    if (view.state === 'READY') return 'Đã chuẩn bị hồ sơ từ dữ liệu có sẵn. Bạn kiểm tra và bấm xác nhận nộp một lần.';
    if (view.state === 'BLOCKED') return view.notice || 'Chưa thể tiếp tục; vui lòng kiểm tra điều kiện hiển thị trong hồ sơ.';
    return view.targetForm ? 'Biểu mẫu chưa phù hợp với mục đích. Hãy chọn nút chuyển biểu mẫu bên dưới.'
      : `Đã điền thông tin có sẵn. Chỉ cần bổ sung: ${view.missingFields.map(f => f.label).join(', ')}.`;
  }
  static agentResult(view) {
    return { success: true, decision: view.state === 'REJECTED' || view.result?.status === 'REJECTED' ? 'REJECTED_POLICY' : 'DRAFT_READY',
      draft: view, message: this.agentMessage(view) };
  }
  static rejection(policy, targetForm) {
    let nextStep = 'Bạn hãy liên hệ Phòng Công tác Sinh viên để kiểm tra hồ sơ học vụ và được hướng dẫn thủ tục phù hợp. Nếu dữ liệu học vụ chưa chính xác, đề nghị đơn vị phụ trách cập nhật trước khi tạo yêu cầu mới.';
    if (targetForm) nextStep = `Bạn có thể bắt đầu hồ sơ ${HUTECH_FORMS[targetForm].shortName} bằng nút bên dưới. Hệ thống sẽ dùng lại thông tin hồ sơ và chỉ hỏi phần còn thiếu.`;
    else if (policy.rule === 'POL_NO_ACTIVE_SCHEDULE_OR_CREDITS') nextStep = 'Bạn có thể mang đơn hoặc biểu mẫu riêng đến Phòng Công tác Sinh viên để được xem xét. Nếu cần xem xét ngoại lệ, hãy tạo một yêu cầu mới kèm lý do cụ thể.';
    return { decision: 'REJECTED_POLICY', rule: policy.rule, reason: policy.reason,
      nextStep, targetForm, closedAt: new Date().toISOString() };
  }
  static async saveResolution(draft, view, db, trace = null) {
    if (view.state !== 'REJECTED' || draft.state === 'REJECTED') return view;
    const saved = await db.petitionDraft.update({ where: { id: draft.id }, data: {
      state: 'REJECTED', resolution: view.resolution, revision: { increment: 1 } } });
    let result = view.result;
    if (draft.submittedRequestId) {
      const request = await db.studentRequest.findUnique({ where: { id: draft.submittedRequestId } });
      if (request?.status === 'WAITING_STUDENT') {
        const { default: core } = await import('../modules/petition-core/PetitionWorkflowCore.js');
        result = await core.rejectForPolicy({ request, studentCode: draft.studentCode, actorType: 'AI_AGENT',
          policyResult: { reason: view.resolution.reason, rule: view.resolution.rule }, startTime: Date.now() });
      }
    }
    await AuditLogService.recordLog({ actorType: 'AI_AGENT', action: 'DRAFT_REJECTED_POLICY', decision: 'REJECTED_POLICY',
      reason: view.resolution.reason, inputSnapshot: { draftId: draft.id, studentCode: draft.studentCode,
        formCode: draft.formCode, resolution: view.resolution } });
    trace?.('DECISION_SAVED', 'Đã ghi quyết định từ chối và bằng chứng kiểm toán trong giao dịch dữ liệu.',
      { draftId: draft.id, rule: view.policyRule }, 'AUDIT');
    return { ...view, revision: saved.revision, result };
  }
  static async student(db, code) {
    const student = await db.student.findUnique({ where: { studentCode: code }, include: { department: true } });
    if (!student) throw new WorkflowError('Không tìm thấy hồ sơ sinh viên.', 404);
    return student;
  }
  static async owned(db, id, code) {
    const draft = await db.petitionDraft.findUnique({ where: { id } });
    if (!draft || draft.studentCode !== code) throw new WorkflowError('Không tìm thấy bản nháp của bạn.', 404);
    return draft;
  }
  static async inspect(draft, db = prisma, trace = null) {
    const student = await this.student(db, draft.studentCode);
    const profile = getStudentFullProfile(draft.studentCode, student);
    const data = { ...draft.inputData, studentCode: draft.studentCode, formCode: draft.formCode };
    const checked = await studentConfirmationHandler.validateRequirements({ student }, data);
    trace?.('REQUIREMENTS_CHECK', 'Đã kiểm tra các trường bắt buộc của biểu mẫu.', { missingFields: checked.missing });
    // Preview only: actual address consent is recorded exclusively by SUBMIT.
    const historyRequests = await db.studentRequest.findMany({ where: { studentId: student.id, verificationRunId: null,
      ...(draft.submittedRequestId ? { id: { not: draft.submittedRequestId } } : {}), status: { in: ['APPROVED', 'COMPLETED', 'ESCALATED'] } },
      select: { status: true, createdAt: true, inputData: true } });
    const policy = evaluateStudentConfirmation({ student: { ...student, ...profile }, inputData: { ...data, historyRequests, isAddressConfirmed: true } });
    trace?.('POLICY_CHECK', 'Đã đối chiếu dữ liệu học vụ và lịch sử hồ sơ với quy định nhà trường.',
      { decision: policy.decision, rule: policy.rule, reason: policy.reason });
    const missing = missingFieldMetadata(checked.missing);
    if (policy.rule === 'REQ_REISSUE_REASON' || /REISSUE.*REASON/.test(policy.rule || '')) {
      if (!data.reissueReason) missing.push(PETITION_FIELDS.find(f => f.key === 'reissueReason'));
    }
    const linked = draft.submittedRequestId ? await db.studentRequest.findUnique({ where: { id: draft.submittedRequestId } }) : null;
    if (linked?.contextCapsule?.supplementFields) {
      for (const key of linked.contextCapsule.supplementFields) {
        if (!String(data[key] ?? '').trim() && !missing.some(f => f.key === key)) missing.push(PETITION_FIELDS.find(f => f.key === key));
      }
    }
    const denied = draft.state === 'REJECTED' || policy.decision === 'REJECTED_POLICY';
    if (denied) missing.length = 0;
    let state = draft.state === 'CANCELLED' ? 'CANCELLED' : draft.state === 'SUBMITTED' && linked?.status !== 'WAITING_STUDENT' ? 'SUBMITTED'
      : denied ? 'REJECTED' : missing.length ? 'NEEDS_INPUT' : 'READY';
    const mismatch = detectFormIntent(data.purpose || '');
    const targetForm = policy.rule === 'MISMATCH_FORM_GUIDANCE' && mismatch?.code !== draft.formCode ? mismatch?.code
      : policy.rule === 'POL_OVERDUE_COHORT_REQUIRE_DEBT_FORM' && draft.formCode !== 'COURSE_DEBT' ? 'COURSE_DEBT' : null;
    if (targetForm && !['REJECTED', 'SUBMITTED', 'CANCELLED'].includes(state)) state = 'NEEDS_INPUT';
    else if (policy.decision === 'ASK_CLARIFICATION' && policy.rule !== 'UNKNOWN_ACADEMIC_RECORD' && !missing.length && !['REJECTED', 'SUBMITTED', 'CANCELLED'].includes(state)) state = 'BLOCKED';
    const resolution = state === 'REJECTED' ? draft.resolution || this.rejection(policy, targetForm) : null;
    const result = linked ? { requestId: linked.id, requestCode: linked.requestCode, status: linked.status,
      decision: statusDecision[linked.status], message: linked.escalationReason || 'Đã tiếp nhận hồ sơ.',
      missingFields: linked.status === 'WAITING_STUDENT' ? missing : [] } : null;
    if (result) {
      result.sha256Proof = linked.sha256Proof;
      if (linked.status === 'APPROVED') {
        result.appointment = calculatePickupAppointment({ pickupCampus: data.pickupCampus, submissionDate: linked.createdAt });
        result.message = `Hồ sơ [${linked.requestCode}] đã được phê duyệt. Lịch nhận bản cứng dự kiến: ${result.appointment.fullAppointmentText}, ${result.appointment.room}.`;
      }
    }
    return { id: draft.id, revision: draft.revision, formCode: draft.formCode, formName: HUTECH_FORMS[draft.formCode].shortName,
      state, data, fieldSources: draft.fieldSources, fields: formFields(draft.formCode).map(f => ({ ...f,
        readOnly: draft.fieldSources[f.key] === 'SCHOOL_RECORD' })), missingFields: missing.filter(Boolean),
      addressConsentRequired: state === 'READY' && draft.formCode === 'MILITARY_DEFERMENT', targetForm: resolution ? resolution.targetForm : targetForm,
      notice: resolution?.reason || (denied || policy.decision === 'ASK_CLARIFICATION' ? policy.reason : ''),
      policyRule: resolution?.rule || policy.rule, result, resolution,
      actions: state === 'REJECTED' ? (resolution.targetForm ? ['START_RECOMMENDED'] : [])
        : state === 'READY' ? ['SUBMIT', 'EDIT', 'CANCEL'] : ['SUBMITTED', 'CANCELLED'].includes(state) ? [] : ['UPDATE', ...(targetForm ? ['SWITCH_FORM'] : []), 'CANCEL'] };
  }
  static async latest(code) {
    const drafts = await prisma.petitionDraft.findMany({ where: { studentCode: code, state: { not: 'CANCELLED' } }, orderBy: { updatedAt: 'desc' }, take: 1 });
    if (!drafts[0]) return null;
    const view = await this.inspect(drafts[0]);
    if (view.state !== 'REJECTED' || drafts[0].state === 'REJECTED') return view;
    // Close a draft created before terminal policy decisions were introduced, once only.
    return this.traced(code, 'Đối chiếu lại điều kiện của công việc đang mở.', trace => AuditLogService.runWorkflowTransaction(async db => {
      const draft = await this.owned(db, drafts[0].id, code);
      return this.saveResolution(draft, await this.inspect(draft, db, trace), db, trace);
    }));
  }
  static async fromRequest(studentCode, requestId) {
    return this.traced(studentCode, 'Tiếp tục hồ sơ đang chờ bổ sung.', trace => AuditLogService.runWorkflowTransaction(async db => {
      const request = await db.studentRequest.findUnique({ where: { id: requestId }, include: { student: true } });
      if (!request || request.student.studentCode !== studentCode) throw new WorkflowError('Không tìm thấy hồ sơ của bạn.', 404);
      if (request.status !== 'WAITING_STUDENT') throw new WorkflowError('Hồ sơ không còn chờ bổ sung.', 409);
      const existing = await db.petitionDraft.findUnique({ where: { submittedRequestId: request.id } });
      if (existing) return this.saveResolution(existing, await this.inspect(existing, db, trace), db, trace);
      const profile = getStudentFullProfile(studentCode, request.student);
      const inputData = { ...cleanDraftInput(profile), ...cleanDraftInput(request.inputData) };
      for (const key of protectedFields) if (profile[key]) inputData[key] = profile[key];
      const draft = await db.petitionDraft.create({ data: { studentCode, formCode: request.inputData.formCode || 'GENERAL_CONFIRMATION',
        state: 'COLLECTING', inputData, submittedRequestId: request.id,
        fieldSources: Object.fromEntries(Object.keys(inputData).map(key => [key, protectedFields.includes(key) ? 'SCHOOL_RECORD' : 'SAVED_REQUEST'])) } });
      trace('DRAFT_RESTORED', 'Đã khôi phục thông tin đã lưu của hồ sơ, giữ nguyên mã hồ sơ.', { draftId: draft.id, requestId });
      return this.saveResolution(draft, await this.inspect(draft, db, trace), db, trace);
    }));
  }
  static async prepare({ studentCode, formCode, inputData = {}, draftId = null, revision = null, newTask = false }) {
    if (typeof formCode !== 'string' || !Object.hasOwn(HUTECH_FORMS, formCode)) throw new WorkflowError('Vui lòng chọn một trong 5 thủ tục.');
    return this.traced(studentCode, draftId ? 'Cập nhật công việc từ thông tin được cung cấp.' : `Bắt đầu chuẩn bị ${HUTECH_FORMS[formCode].shortName}.`, trace => AuditLogService.runWorkflowTransaction(async db => {
      const student = await this.student(db, studentCode);
      const profile = getStudentFullProfile(studentCode, student);
      trace('PROFILE_LOADED', 'Đã lấy hồ sơ sinh viên từ backend; tái sử dụng thông tin có sẵn.',
        { source: 'BACKEND_PROFILE', availableFields: Object.keys(cleanDraftInput(profile)) });
      let draft = draftId ? await this.owned(db, draftId, studentCode) : newTask ? null : await db.petitionDraft.findFirst({
        where: { studentCode, formCode, state: { in: ['COLLECTING', 'NEEDS_INPUT', 'READY', 'BLOCKED'] } }, orderBy: { updatedAt: 'desc' } });
      if (draft && revision !== null && draft.revision !== revision) throw new WorkflowError('Thông tin đã thay đổi. Hãy tải lại bản nháp trước khi tiếp tục.', 409);
      if (draft?.state === 'CANCELLED') throw new WorkflowError('Bản nháp đã được hủy.');
      if (draft?.state === 'REJECTED') throw new WorkflowError('Quy trình đã kết thúc do không đủ điều kiện. Hãy bắt đầu một yêu cầu mới theo hướng dẫn.', 409);
      if (draft?.submittedRequestId) {
        const linked = await db.studentRequest.findUnique({ where: { id: draft.submittedRequestId } });
        if (linked?.status !== 'WAITING_STUDENT') throw new WorkflowError('Hồ sơ đã nộp; không thể sửa quyết định đã lưu.', 409);
        if (formCode !== draft.formCode) throw new WorkflowError('Không thể đổi biểu mẫu của hồ sơ đã nộp.');
      }
      const data = draft ? { ...draft.inputData } : cleanDraftInput(profile);
      const sources = draft ? { ...draft.fieldSources } : Object.fromEntries(Object.keys(data).map(key => [key, protectedFields.includes(key) ? 'SCHOOL_RECORD' : 'PROFILE']));
      if (!draft || draft.formCode !== formCode) {
        data.purpose = DEFAULT_PURPOSES[formCode] || '';
        data.recipientAgency = '';
      }
      for (const [key, value] of Object.entries(cleanDraftInput(inputData))) {
        if (protectedFields.includes(key) && profile[key]) continue;
        data[key] = value; sources[key] = 'USER_INPUT';
      }
      for (const key of protectedFields) if (profile[key]) data[key] = profile[key];
      if (formCode === 'BANK_LOAN') {
        data.loanFormCount = await db.studentRequest.count({ where: { studentId: student.id, verificationRunId: null,
          status: { in: ['APPROVED', 'COMPLETED'] }, inputData: { path: ['formCode'], equals: 'BANK_LOAN' } } });
        sources.loanFormCount = 'SCHOOL_RECORD';
      }
      delete data.isAddressConfirmed;
      const record = { formCode, state: 'COLLECTING', inputData: data, fieldSources: sources, confirmation: null };
      draft = draft ? await db.petitionDraft.update({ where: { id: draft.id }, data: { ...record, revision: { increment: 1 } } })
        : await db.petitionDraft.create({ data: { ...record, studentCode } });
      trace('DRAFT_SAVED', 'Đã lưu dữ liệu công việc; chưa nộp đơn khi chưa có xác nhận cuối.',
        { draftId: draft.id, revision: draft.revision, updatedFields: Object.keys(cleanDraftInput(inputData)) });
      return this.saveResolution(draft, await this.inspect(draft, db, trace), db, trace);
    }));
  }
  static async action({ studentCode, draftId, revision, action, acknowledgeAddress = false, inputData = {} }) {
    if (!Number.isInteger(revision)) throw new WorkflowError('Thiếu phiên bản bản nháp.');
    if (action === 'START_RECOMMENDED') {
      return AuditLogService.runWorkflowTransaction(async db => {
        const draft = await this.owned(db, draftId, studentCode);
        if (draft.revision !== revision) throw new WorkflowError('Thông tin đã thay đổi. Hãy tải lại kết quả.', 409);
        const closed = await this.inspect(draft, db);
        if (closed.state !== 'REJECTED' || !closed.resolution?.targetForm) throw new WorkflowError('Không có thủ tục thay thế được đề xuất cho công việc này.');
        // Start a separate task, keeping the original denial immutable. Retain user-provided
        // personal facts without carrying the denied form's purpose or form-specific answers.
        const personalKeys = ['birthDate', 'gender', 'phone', 'permanentAddress', 'idCard', 'idCardDate', 'idCardPlace', 'pickupCampus'];
        const personal = Object.fromEntries(personalKeys.filter(key => draft.inputData[key] !== undefined).map(key => [key, draft.inputData[key]]));
        return this.prepare({ studentCode, formCode: closed.resolution.targetForm, inputData: personal, newTask: true });
      });
    }
    if (action === 'UPDATE' || action === 'SWITCH_FORM') {
      const draft = await this.owned(prisma, draftId, studentCode);
      return this.prepare({ studentCode, draftId, revision,
        formCode: action === 'SWITCH_FORM' ? inputData.formCode : draft.formCode, inputData });
    }
    const view = await this.traced(studentCode, action === 'SUBMIT' ? 'Tiếp nhận xác nhận cuối và thực thi quy trình cấp giấy.' : 'Hủy công việc theo yêu cầu.', trace => AuditLogService.runWorkflowTransaction(async db => {
      let draft = await this.owned(db, draftId, studentCode);
      if (draft.state === 'REJECTED') throw new WorkflowError('Quy trình đã kết thúc do không đủ điều kiện; không thể nộp hoặc sửa yêu cầu đã từ chối.', 409);
      if (draft.state === 'SUBMITTED' && action === 'SUBMIT') {
        const linked = await db.studentRequest.findUnique({ where: { id: draft.submittedRequestId } });
        if (linked?.status !== 'WAITING_STUDENT') return this.inspect(draft, db); // idempotent retry
      }
      if (draft.revision !== revision) throw new WorkflowError('Thông tin đã thay đổi. Hãy kiểm tra bản nháp mới nhất.', 409);
      if (draft.state === 'CANCELLED') throw new WorkflowError('Bản nháp đã được hủy.');
      if (action === 'CANCEL') {
        if (draft.submittedRequestId) {
          const linked = await db.studentRequest.findUnique({ where: { id: draft.submittedRequestId } });
          if (linked?.status !== 'CANCELLED') throw new WorkflowError('Hồ sơ đã nộp; hãy liên hệ đơn vị tiếp nhận để thu hồi.');
        }
        return this.inspect(await db.petitionDraft.update({ where: { id: draft.id }, data: { state: 'CANCELLED', revision: { increment: 1 } } }), db);
      }
      if (action !== 'SUBMIT') throw new WorkflowError('Hành động không hợp lệ.');
      const prepared = await this.inspect(draft, db, trace);
      if (prepared.state === 'REJECTED') return this.saveResolution(draft, prepared, db, trace);
      if (prepared.state !== 'READY') throw new WorkflowError('Hãy hoàn tất thông tin cần bổ sung trước khi xác nhận.');
      if (prepared.addressConsentRequired && acknowledgeAddress !== true) throw new WorkflowError('Cần xác nhận địa chỉ và cam kết NVQS đã hiển thị.');
      const confirmation = { revision, at: new Date().toISOString(), address: prepared.addressConsentRequired ? draft.inputData.permanentAddress : null,
        contentHash: crypto.createHash('sha256').update(AuditLogService.canonicalStringify(draft.inputData)).digest('hex') };
      const data = { ...draft.inputData, formCode: draft.formCode, studentCode,
        isAddressConfirmed: prepared.addressConsentRequired && acknowledgeAddress, draftId: draft.id };
      trace('CONFIRMATION_CHECKED', 'Đã kiểm tra xác nhận cuối gắn với đúng phiên bản dữ liệu.',
        { draftId, revision, addressConsent: prepared.addressConsentRequired ? acknowledgeAddress : 'NOT_REQUIRED' });
      const { default: core } = await import('../modules/petition-core/PetitionWorkflowCore.js');
      trace('WORKFLOW_EXECUTION', draft.submittedRequestId ? 'Gọi bộ xử lý để tiếp tục hồ sơ đã bổ sung.' : 'Gọi bộ xử lý tạo hồ sơ, kiểm tra quy định và thẩm quyền quyết định.',
        { tool: draft.submittedRequestId ? 'resumePetitionWorkflow' : 'processPetitionWorkflow', formCode: draft.formCode }, 'TOOL_CALL');
      let result = draft.submittedRequestId
        ? await core.resumePetitionWorkflow({ requestId: draft.submittedRequestId, additionalData: data })
        : await core.processPetitionWorkflow({ studentCode, requestTypeCode: 'STUDENT_CONFIRMATION', inputData: data, forceNewRequest: true, actorType: 'STUDENT' });
      if (result.success && result.rule === 'UNKNOWN_ACADEMIC_RECORD') {
        const { default: workflow } = await import('./AcademicWorkflowService.js');
        result = await workflow.escalateRequest({ requestId: result.requestId, requiredRole: 'STAFF', retainHumanReview: true,
          reason: 'Nguồn dữ liệu học vụ chưa đủ căn cứ; cần đơn vị phụ trách xác minh.',
          actionableQuestion: 'Cán bộ vui lòng xác minh dữ liệu đăng ký học hiện tại trước khi quyết định hồ sơ.' });
      }
      if (!result.success || !result.requestId) throw new WorkflowError(result.error || result.message || 'Chưa thể nộp hồ sơ.');
      await AuditLogService.recordLog({ requestId: result.requestId, actorType: 'STUDENT', action: 'DRAFT_CONFIRMED_AND_SUBMITTED',
        decision: result.decision, inputSnapshot: { draftId, confirmation } });
      trace('DECISION_SAVED', 'Bộ xử lý đã trả kết quả; đã ghi xác nhận và bằng chứng kiểm toán.',
        { requestId: result.requestId, status: result.status, decision: result.decision }, 'AUDIT');
      draft = await db.petitionDraft.update({ where: { id: draft.id }, data: {
        state: 'SUBMITTED', submittedRequestId: result.requestId, confirmation, revision: { increment: 1 } } });
      return { ...await this.inspect(draft, db), result };
    }));
    return view;
  }
}
