export function describeToolOutcome(result = {}) {
  if (result.decision) return String(result.decision);
  if (result.success === true) return 'SUCCESS';
  if (result.success === false) return 'FAILED';
  if (result.found === true) return 'FOUND';
  if (result.found === false) return 'NOT_FOUND';
  if (result.complete === true) return 'COMPLETE';
  if (result.complete === false) return 'INCOMPLETE';
  if (result.allowed === true) return 'ALLOWED';
  if (result.allowed === false) return 'NOT_ALLOWED';
  if (result.isValid === true) return 'VALID';
  if (result.isValid === false) return 'INVALID';
  return 'COMPLETED';
}

export default describeToolOutcome;
