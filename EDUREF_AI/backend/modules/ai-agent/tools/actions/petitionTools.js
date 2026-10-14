import AcademicWorkflowService from '../../../../services/AcademicWorkflowService.js';

// Compatibility adapter for /api/agent/staff-confirm. State guards, the audit
// transaction and compare-and-set live in the same service as /petitions/:id/approve.
export const petitionTools = {
  async staff_confirm_request({ requestId, reviewerNote = '', approved = true, actorType = 'STAFF', staffName = null }) {
    const result = await AcademicWorkflowService.staffDecision({
      requestId,
      decision: approved ? 'APPROVE' : 'REJECT',
      reviewerNote,
      actorType: ['STAFF', 'DEAN', 'ADMIN'].includes(actorType) ? actorType : 'STAFF',
      staffName: staffName || 'Chuyên viên PĐT',
    });
    if (!result.success) return { success: false, message: result.error || result.message };
    return {
      success: true,
      requestCode: result.requestCode,
      status: result.status,
      sha256Proof: result.sha256Proof,
      message: approved
        ? `Cán bộ đã phê duyệt ngoại lệ cho hồ sơ [${result.requestCode}].`
        : `Cán bộ đã bác bỏ yêu cầu [${result.requestCode}].`,
    };
  },
};

export default petitionTools;
