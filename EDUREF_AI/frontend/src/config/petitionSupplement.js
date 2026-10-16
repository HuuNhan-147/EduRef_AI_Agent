const TEXT_FIELDS = [
  'purpose', 'phone', 'pickupCampus', 'permanentAddress',
  'idCard', 'recipientAgency', 'debtCourses', 'reissueReason',
  'fullName', 'birthDate', 'gender', 'studentClass', 'urgentReason',
  'idCardDate', 'idCardPlace', 'major', 'faculty', 'orphanStatus',
  'loanFormCount', 'loanGrantedCount', 'lastLoanAmount',
];

// Empty controls must not overwrite information already stored on the petition.
export function buildSupplementInput(values) {
  const input = {};
  for (const key of TEXT_FIELDS) {
    const value = typeof values[key] === 'string' ? values[key].trim()
      : typeof values[key] === 'number' ? String(values[key]) : '';
    if (value) input[key] = value;
  }
  if (values.isAddressConfirmed === true) input.isAddressConfirmed = true;
  return input;
}

export function supplementDecisionState(result) {
  const decision = result.decision;
  const status = result.status || {
    ASK_CLARIFICATION: 'WAITING_STUDENT', REJECT: 'REJECTED', REJECTED_POLICY: 'REJECTED',
    ESCALATE_TO_STAFF: 'ESCALATED', ESCALATE_TO_DEAN: 'ESCALATED', AUTO_APPROVE: 'APPROVED',
    AUTO_APPROVED: 'APPROVED',
  }[decision] || 'PROCESSING';
  return {
    status, finalDecision: decision,
    requirementsCheck: status === 'WAITING_STUDENT' ? 'INCOMPLETE' : status === 'APPROVED' ? 'PASSED' : 'PENDING',
    policiesCheck: status === 'REJECTED' ? 'FAILED' : status === 'APPROVED' ? 'PASSED' : 'PENDING',
    authorityCheck: status === 'ESCALATED' ? 'ESCALATED' : status === 'APPROVED' ? 'PASSED' : 'PENDING',
    reason: result.message || result.question || result.reason || result.actionableQuestion || '',
    requestId: result.requestId, requestCode: result.requestCode,
    qrCodeUrl: result.qrCodeUrl || null, sha256Proof: result.sha256Proof || null,
    missingFields: result.missing || [],
  };
}
