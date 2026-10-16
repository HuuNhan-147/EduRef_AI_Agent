import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { studentConfirmationHandler } from '../modules/petition-core/handlers/StudentConfirmationHandler.js';
import { evaluateStudentConfirmation, STUDENT_CONFIRMATION_POLICY_VERSION } from './StudentConfirmationDecisionService.js';
import { assessThreshold, SCORER_VERSION } from './EscalationThreshold.js';

export const PROTOCOL_VERSION = 'ESCALATION_EVALUATION_V2';
export const REPLAY_VERSION = 'WORKFLOW_SNAPSHOT_REPLAY_V1';
export const DECISIONS = ['AUTO_APPROVED', 'ESCALATE_TO_STAFF', 'ASK_CLARIFICATION', 'REJECTED_POLICY'];
export const CLASSIFICATIONS = ['ROUTINE', 'OUTSIDE_POLICY', 'BEYOND_AUTHORITY', 'UNKNOWN_FACT', 'ROUTINE_POLICY_DENY'];
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
export const digest = (value) => createHash('sha256').update(canonical(value)).digest('hex');
export const snapshotFingerprint = (snapshot) => digest({ student: snapshot.student, inputData: snapshot.inputData, historyRequests: snapshot.historyRequests });
export const RUNTIME_CODE_HASH = digest([
  './StudentConfirmationDecisionService.js', './EscalationThreshold.js', './EvaluationProtocol.js',
  '../config/studentRegistry.js', '../modules/petition-core/handlers/StudentConfirmationHandler.js',
  '../modules/petition-core/PetitionWorkflowCore.js',
  './Sprint2Service.js', './AcademicWorkflowService.js', './ClientInputGuard.js',
].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\r\n/g, '\n')));
export function datasetIssues(dataset) {
  const reasons = [];
  const cases = Array.isArray(dataset.cases) ? dataset.cases : [];
  const holdout = cases.filter((item) => item?.split === 'HOLDOUT');
  if (dataset.origin !== 'INDEPENDENT') reasons.push('ORIGIN_NOT_INDEPENDENT');
  if (!dataset.sourceRef || !/^[a-f0-9]{64}$/.test(dataset.sourceSha256 || '')) reasons.push('SOURCE_PROVENANCE_REQUIRED');
  const authors = Array.isArray(dataset.policyAuthorIds) ? dataset.policyAuthorIds : [];
  if (!dataset.independenceDeclaration || !authors.length) reasons.push('INDEPENDENCE_DECLARATION_REQUIRED');
  if (!Number.isFinite(Date.parse(dataset.referenceDate))) reasons.push('REFERENCE_DATE_REQUIRED');
  if (holdout.length < 30) reasons.push('AT_LEAST_30_HOLDOUT_CASES_REQUIRED');
  if (holdout.filter((c) => c.expectedDecision === 'AUTO_APPROVED').length < 5) reasons.push('AT_LEAST_5_ROUTINE_HOLDOUT_CASES_REQUIRED');
  if (holdout.filter((c) => c.expectedDecision === 'ESCALATE_TO_STAFF').length < 5) reasons.push('AT_LEAST_5_ESCALATION_HOLDOUT_CASES_REQUIRED');
  for (const label of CLASSIFICATIONS) if (!holdout.some((c) => c.expectedClassification === label)) reasons.push(`MISSING_CLASS_${label}`);
  const ids = new Set(); const fingerprints = new Set();
  for (const item of cases) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { reasons.push('CASE_OBJECT_REQUIRED'); continue; }
    const prefix = item.id || 'UNNAMED';
    if (!item.id || ids.has(item.id)) reasons.push(`${prefix}:DUPLICATE_OR_MISSING_ID`);
    ids.add(item.id);
    if (!['HOLDOUT', 'CALIBRATION'].includes(item.split)) reasons.push(`${prefix}:SPLIT_REQUIRED`);
    const expectedClass = { AUTO_APPROVED: ['ROUTINE'], ESCALATE_TO_STAFF: ['OUTSIDE_POLICY', 'BEYOND_AUTHORITY', 'UNKNOWN_FACT'],
      ASK_CLARIFICATION: ['UNKNOWN_FACT'], REJECTED_POLICY: ['ROUTINE_POLICY_DENY'] }[item.expectedDecision] || [];
    if (!expectedClass.includes(item.expectedClassification)) reasons.push(`${prefix}:SINGLE_CONSISTENT_LABEL_REQUIRED`);
    if (!item.label?.labeledBy || !Number.isFinite(Date.parse(item.label?.labeledAt)) || !item.label?.sourceRef) reasons.push(`${prefix}:LABEL_PROVENANCE_REQUIRED`);
    if (authors.includes(item.label?.labeledBy)) reasons.push(`${prefix}:LABELER_IS_POLICY_AUTHOR`);
    const snapshot = item.snapshot;
    if (!snapshot?.student?.studentCode || !snapshot.student.fullName || !snapshot.student.status ||
        !snapshot.inputData || typeof snapshot.inputData !== 'object' || Array.isArray(snapshot.inputData) ||
        !Array.isArray(snapshot.historyRequests) || !Array.isArray(snapshot.documents)) {
      reasons.push(`${prefix}:COMPLETE_SNAPSHOT_REQUIRED`); continue;
    }
    const fingerprint = snapshotFingerprint(snapshot);
    if (!['ACTIVE', 'INACTIVE', 'DROPPED', 'GRADUATED', 'SUSPENDED'].includes(snapshot.student.status) ||
        !Object.hasOwn(snapshot.student, 'admissionYear') || !Object.hasOwn(snapshot.student, 'enrolledCredits')) reasons.push(`${prefix}:ACADEMIC_STATE_REQUIRED`);
    if (snapshot.historyRequests.some((record) => !record || !Number.isFinite(Date.parse(record.createdAt)) ||
        !['APPROVED', 'COMPLETED', 'ESCALATED'].includes(record.status) || !record.inputData?.formCode)) reasons.push(`${prefix}:HISTORY_SNAPSHOT_INCOMPLETE`);
    if (fingerprints.has(fingerprint)) reasons.push(`${prefix}:DUPLICATE_SNAPSHOT`);
    fingerprints.add(fingerprint);
    if (snapshot.verificationRunId || snapshot.dataSource === 'SYNTHETIC_BENCHMARK') reasons.push(`${prefix}:VERIFY_FIXTURE_NOT_INDEPENDENT`);
  }
  return [...new Set(reasons)];
}

// No DB mutations, LLM calls, inferred missing facts, or policy changes during replay.
export async function replaySnapshot(item, policy, referenceDate) {
  const { student, inputData, historyRequests, documents } = structuredClone(item.snapshot);
  const input = { ...inputData, submissionDate: referenceDate, referenceDate, historyRequests };
  delete input.existingApprovedCount;
  delete input.sessionId; // Never consult live conversation memory during an immutable replay.
  let base;
  if (['DROPPED', 'SUSPENDED'].includes(student.status)) base = evaluateStudentConfirmation({ student, inputData: {} });
  else {
    const requirements = await studentConfirmationHandler.validateRequirements({ student }, input, documents);
    base = requirements.complete ? evaluateStudentConfirmation({ student, inputData: input })
      : { decision: 'ASK_CLARIFICATION', classification: 'UNKNOWN_FACT', rule: requirements.missing[0]?.code };
  }
  const { result, assessment } = assessThreshold(base, input, policy);
  return { decision: result.decision, classification: result.classification, rule: result.rule, assessment };
}

const escalation = (decision) => decision === 'ESCALATE_TO_STAFF' || decision === 'ESCALATE_TO_DEAN';
function rate(numerator, denominator) { return denominator ? Math.round(numerator / denominator * 10000) / 100 : null; }
function wilson(numerator, denominator) {
  if (!denominator) return null;
  const z = 1.96; const p = numerator / denominator; const divisor = 1 + z * z / denominator;
  const centre = (p + z * z / (2 * denominator)) / divisor;
  const margin = z * Math.sqrt(p * (1 - p) / denominator + z * z / (4 * denominator * denominator)) / divisor;
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)].map((x) => Math.round(x * 10000) / 100);
}
export function summarizeResults(results, eligible) {
  const required = results.filter((r) => escalation(r.expectedDecision));
  const routine = results.filter((r) => r.expectedDecision === 'AUTO_APPROVED');
  const counts = { total: results.length, escalationRequired: required.length, routine: routine.length,
    missed: required.filter((r) => !escalation(r.actualDecision)).length,
    unsafeAuto: required.filter((r) => r.actualDecision === 'AUTO_APPROVED').length,
    falseEscalation: routine.filter((r) => escalation(r.actualDecision)).length,
    routineAuto: routine.filter((r) => r.actualDecision === 'AUTO_APPROVED').length,
    errors: results.filter((r) => r.actualDecision === 'ERROR').length,
    exactMatches: results.filter((r) => r.actualDecision === r.expectedDecision && r.actualClassification === r.expectedClassification).length };
  const measured = eligible && required.length > 0 && routine.length > 0;
  return { counts, measurementStatus: measured ? 'MEASURED' : 'PARTIAL', unit: 'PERCENT',
    missedEscalationRate: measured ? rate(counts.missed, required.length) : null,
    falseEscalationRate: measured ? rate(counts.falseEscalation, routine.length) : null,
    unsafeAutoApprovalRate: measured ? rate(counts.unsafeAuto, required.length) : null,
    routineAutomationRate: measured ? rate(counts.routineAuto, routine.length) : null,
    confidence95: measured ? { missed: wilson(counts.missed, required.length), falseEscalation: wilson(counts.falseEscalation, routine.length) } : null };
}

export async function compareDataset(dataset, baseline, candidate, evaluate = replaySnapshot) {
  const issues = datasetIssues(dataset);
  if (dataset.status !== 'FROZEN' || dataset.contentHash !== digest(dataset.cases)) issues.push('DATASET_NOT_FROZEN_OR_HASH_MISMATCH');
  const holdout = (Array.isArray(dataset.cases) ? dataset.cases : []).filter((c) => c?.split === 'HOLDOUT');
  const calibration = new Set([...(candidate.calibrationFingerprints || []), ...(baseline.calibrationFingerprints || [])]);
  if (holdout.some((c) => c.snapshot && calibration.has(snapshotFingerprint(c.snapshot)))) issues.push('CALIBRATION_HOLDOUT_LEAKAGE');
  if (holdout.some((c) => [candidate.createdById, baseline.createdById].filter(Boolean).includes(c.label?.labeledBy))) issues.push('LABELER_IS_THRESHOLD_AUTHOR');
  if (candidate.scorerVersion !== SCORER_VERSION || baseline.scorerVersion !== SCORER_VERSION) issues.push('SCORER_VERSION_MISMATCH');
  const rows = [];
  for (const item of holdout) {
    const row = { id: item.id, expectedDecision: item.expectedDecision, expectedClassification: item.expectedClassification };
    for (const [key, policy] of [['before', baseline], ['after', candidate]]) {
      try { row[key] = await evaluate(item, policy, dataset.referenceDate); }
      catch { row[key] = { decision: 'ERROR', classification: null, rule: 'REPLAY_ERROR' }; }
    }
    rows.push(row);
  }
  if (rows.some((row) => row.before.decision === 'ERROR' || row.after.decision === 'ERROR')) issues.push('REPLAY_FAILED');
  const eligible = issues.length === 0;
  const summarize = (key) => summarizeResults(rows.map((r) => ({ ...r, actualDecision: r[key].decision, actualClassification: r[key].classification })), eligible);
  const before = summarize('before'); const after = summarize('after');
  return { protocolVersion: PROTOCOL_VERSION, replayVersion: REPLAY_VERSION,
    policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION, scorerVersion: SCORER_VERSION,
    runtimeCodeHash: RUNTIME_CODE_HASH, mode: 'DETERMINISTIC_REPLAY', eligible, issues, before, after, rows,
    delta: { missedEscalationPoints: eligible ? after.missedEscalationRate - before.missedEscalationRate : null,
      falseEscalationPoints: eligible ? after.falseEscalationRate - before.falseEscalationRate : null } };
}
