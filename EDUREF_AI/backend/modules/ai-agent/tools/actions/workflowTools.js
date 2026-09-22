import AcademicWorkflowService from '../../../../services/AcademicWorkflowService.js';

export const workflowTools = {
  // A. Student Context
  async get_student_profile({ studentCode }) {
    return await AcademicWorkflowService.getStudentProfile(studentCode);
  },

  async get_student_requests({ studentCode }) {
    return await AcademicWorkflowService.getStudentRequests(studentCode);
  },

  // B. Request Context
  async create_request({ studentCode, requestTypeCode, purpose = null, inputData = {} }) {
    return await AcademicWorkflowService.createRequest({ studentCode, requestTypeCode, purpose, inputData });
  },

  async get_request({ requestId }) {
    return await AcademicWorkflowService.getRequest(requestId);
  },

  // C. Document & Requirement
  async check_requirements({ requestId }) {
    return await AcademicWorkflowService.checkRequirements(requestId);
  },

  // D. Policy & Authority
  async evaluate_policy({ requestId }) {
    return await AcademicWorkflowService.evaluatePolicy(requestId);
  },

  async check_authority({ requestId, action = 'AUTO_APPROVE' }) {
    return await AcademicWorkflowService.checkAuthority({ requestId, action });
  },

  // E. Action & HITL
  async process_request({ requestId }) {
    return await AcademicWorkflowService.processRequest(requestId);
  },

  async ask_student({ requestId, question }) {
    return await AcademicWorkflowService.askStudent({ requestId, question });
  },

  async escalate_request({ requestId, reason, actionableQuestion, requiredRole = 'STAFF' }) {
    return await AcademicWorkflowService.escalateRequest({ requestId, reason, actionableQuestion, requiredRole });
  },

  // F. Observability & Rollback
  async rollback_request({ requestCode, reason }) {
    return await AcademicWorkflowService.rollbackRequest({ requestCode, reason });
  },

  async get_execution_trace({ requestId }) {
    return await AcademicWorkflowService.getExecutionTrace(requestId);
  },
};

export default workflowTools;
