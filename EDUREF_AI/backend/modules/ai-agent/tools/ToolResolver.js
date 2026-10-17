import workflowTools from './actions/workflowTools.js';
import verifyTools from './actions/verifyTools.js';
import prisma from '../../../config/prisma.js';
import Drafts from '../../../services/PetitionDraftService.js';
import { cleanDraftInput } from '../../../services/PetitionFields.js';
import { checkRateLimit } from '../../../middlewares/rateLimit.js';

// Các công cụ thao tác trên một hồ sơ cụ thể qua requestId/requestCode do LLM sinh ra.
const REQUEST_SCOPED_TOOLS = new Set([
  'get_request',
  'check_requirements',
  'evaluate_policy',
  'check_authority',
  'process_request',
  'ask_student',
  'escalate_request',
  'get_execution_trace',
]);

export class ToolResolver {
  /**
   * Zero-Trust: requestId do LLM sinh ra (có thể bị Prompt Injection dẫn dắt) nên với phiên
   * sinh viên phải xác minh hồ sơ thuộc đúng sinh viên đang đăng nhập trước khi chạy công cụ.
   * Trả về object lỗi nếu bị chặn, hoặc null nếu được phép đi tiếp.
   */
  static async denyIfNotOwner(toolName, args) {
    if (!REQUEST_SCOPED_TOOLS.has(toolName)) return null;
    const caller = args.currentUser;
    const isStudentCaller = caller?.role === 'STUDENT' || caller?.type === 'STUDENT';
    if (!isStudentCaller) return null;

    const requestId = args.requestId ? String(args.requestId).trim() : '';
    if (!requestId) return null; // công cụ tự báo thiếu tham số

    const owned = await prisma.studentRequest.findFirst({
      where: { OR: [{ id: requestId }, { requestCode: requestId }] },
      select: { student: { select: { studentCode: true } } },
    });
    if (!owned) return null; // công cụ tự báo không tìm thấy, không lộ thêm thông tin

    if (!caller.studentCode || owned.student?.studentCode !== caller.studentCode) {
      console.warn(`🚨 [ToolResolver] Chặn truy cập hồ sơ của sinh viên khác: tool=${toolName}, caller=${caller.studentCode}`);
      return {
        success: false,
        found: false,
        error: 'FORBIDDEN',
        message: 'Bạn chỉ được thao tác trên hồ sơ của chính mình.',
      };
    }
    return null;
  }

  static async resolve(toolName, args = {}) {
    // Không log nguyên `args`: chứa currentUser (CCCD, SĐT, địa chỉ) và cả lịch sử hội thoại,
    // sẽ nằm lại vĩnh viễn trong log của máy chủ.
    console.log(`🛠️ [ToolResolver] Thực thi công cụ: ${toolName}${args.requestId ? ` (requestId=${args.requestId})` : ''}`);

    const denied = await ToolResolver.denyIfNotOwner(toolName, args);
    if (denied) return denied;

    if (args.currentUser?.role === 'STUDENT' && ['process_student_confirmation', 'create_request'].includes(toolName)) {
      const existing = await Drafts.latest(args.currentUser.studentCode);
      const text = String(args.userMessage || '').toLocaleLowerCase('vi');
      const grounded = Object.fromEntries(Object.entries(cleanDraftInput({ ...args, ...args.inputData }))
        .filter(([, value]) => value && text.includes(value.toLocaleLowerCase('vi'))));
      const data = { ...grounded, ...cleanDraftInput(args.clientInput), formCode: args.formCode || args.inputData?.formCode };
      // A reply such as "Có" cannot reopen a task that ended in a policy denial.
      // A student can explicitly start another procedure from its button or a new request.
      if (existing?.state === 'REJECTED' && (!data.formCode || data.formCode === existing.formCode)
        && !/(xin|tạo|làm|bắt đầu|yêu cầu|cấp).*(đơn|giấy|hồ sơ|xác nhận)|(?:đơn|hồ sơ) mới/u.test(text)) {
        return Drafts.agentResult(existing);
      }
      if (!existing || ['SUBMITTED', 'CANCELLED', 'REJECTED'].includes(existing.state)) data.purpose ||= args.userMessage || '';
      const view = await Drafts.prepare({ studentCode: args.currentUser.studentCode,
        formCode: data.formCode || existing?.formCode || 'GENERAL_CONFIRMATION', inputData: data,
        ...(existing && (!['SUBMITTED', 'CANCELLED', 'REJECTED'].includes(existing.state) || existing.state !== 'REJECTED' && existing.result?.status === 'WAITING_STUDENT') ? { draftId: existing.id, revision: existing.revision } : {}) });
      return Drafts.agentResult(view);
    }
    if (args.currentUser?.role === 'STUDENT' && ['process_request', 'ask_student', 'escalate_request'].includes(toolName)) {
      return { success: false, message: 'Hãy tiếp tục hồ sơ bằng bản nháp và nút xác nhận. Công cụ hội thoại không tự nộp hoặc đổi quyết định.' };
    }

    switch (toolName) {
      // ⚡ Fast-Path Master Tool
      case 'process_student_confirmation':
        return await workflowTools.process_student_confirmation(args);
      // A. Student Context
      case 'get_student_profile':
        return await workflowTools.get_student_profile(args);

      case 'get_student_requests':
        return await workflowTools.get_student_requests(args);

      // B. Request Context
      case 'create_request':
        return await workflowTools.create_request(args);

      case 'get_request':
        return await workflowTools.get_request(args);

      // C. Document & Requirement
      case 'check_requirements':
        return await workflowTools.check_requirements(args);

      // D. Policy & Authority
      case 'evaluate_policy':
        return await workflowTools.evaluate_policy(args);

      case 'check_authority':
        return await workflowTools.check_authority(args);

      // E. Action & HITL
      case 'process_request':
        return await workflowTools.process_request(args);

      case 'ask_student':
        return await workflowTools.ask_student(args);

      case 'escalate_request':
        return await workflowTools.escalate_request(args);

      // F. Observability & Verification

      case 'get_execution_trace':
        return await workflowTools.get_execution_trace(args);

      case 'run_verify_90s': {
        // Bộ verify ghi 5 đơn thật vào DB dùng chung: LLM (có thể bị dẫn dắt bằng prompt) chỉ
        // được kích hoạt tối đa 3 lần/10 phút cho mỗi người dùng.
        const who = args.currentUser?.studentCode || args.currentUser?.username || 'anonymous';
        const gate = checkRateLimit(`tool-verify90s:${who}`, { max: 3, windowMs: 10 * 60_000 });
        if (!gate.allowed) {
          return {
            success: false,
            error: 'RATE_LIMITED',
            message: `Bộ kiểm thử 90s vừa được chạy nhiều lần, vui lòng thử lại sau ${gate.retryAfterSec} giây.`,
          };
        }
        return await verifyTools.run_verify_90s();
      }

      default:
        throw new Error(`Công cụ không được hỗ trợ: ${toolName}`);
    }
  }
}

export default ToolResolver;
