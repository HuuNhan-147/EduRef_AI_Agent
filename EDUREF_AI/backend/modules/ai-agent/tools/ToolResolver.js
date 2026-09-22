import workflowTools from './actions/workflowTools.js';
import verifyTools from './actions/verifyTools.js';

export class ToolResolver {
  static async resolve(toolName, args = {}) {
    console.log(`🛠️ [ToolResolver] Thực thi công cụ: ${toolName}`, args);

    switch (toolName) {
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

      case 'run_verify_90s':
        return await verifyTools.run_verify_90s();

      default:
        throw new Error(`Công cụ không được hỗ trợ: ${toolName}`);
    }
  }
}

export default ToolResolver;
