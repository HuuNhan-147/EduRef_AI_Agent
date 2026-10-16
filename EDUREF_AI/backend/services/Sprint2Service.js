import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import AuditLogService from './AuditLogService.js';
import { BASELINE_THRESHOLD, SCORER_VERSION, scorePurposeEvidence } from './EscalationThreshold.js';
import { compareDataset, datasetIssues, digest, snapshotFingerprint, replaySnapshot, summarizeResults, DECISIONS, CLASSIFICATIONS,
  PROTOCOL_VERSION, REPLAY_VERSION, RUNTIME_CODE_HASH } from './EvaluationProtocol.js';
import { STUDENT_CONFIRMATION_POLICY_VERSION } from './StudentConfirmationDecisionService.js';

function requireValue(condition, message) { if (!condition) { const error = new Error(message); error.status = 400; throw error; } }
function text(value, name, max = 2000) {
  requireValue(typeof value === 'string' && value.trim().length >= 3 && value.length <= max, `${name}: cần 3–${max} ký tự.`);
  return value.trim();
}
function datasetMetadata(body) {
  for (const key of ['sourceSha256', 'referenceDate', 'independenceDeclaration']) {
    requireValue(body[key] === undefined || typeof body[key] === 'string', `${key} cần là chuỗi.`);
  }
  requireValue(body.policyAuthorIds === undefined || (Array.isArray(body.policyAuthorIds) &&
    body.policyAuthorIds.every((id) => typeof id === 'string' && id.trim())), 'policyAuthorIds cần là mảng ID chuỗi.');
}
const json = (value) => JSON.parse(JSON.stringify(value));
const policyHash = (policy) => digest({ id: policy.id, version: policy.version,
  minEvidenceScore: policy.minEvidenceScore, scorerVersion: policy.scorerVersion,
  parentPolicyId: policy.parentPolicyId || null, createdById: policy.createdById || null,
  feedbackIds: policy.feedbackIds || [], calibrationFingerprints: policy.calibrationFingerprints || [],
  calibrationReport: policy.calibrationReport || null });
const actor = (user) => ({ actorType: user.role, actorId: user.id });
function staff(user) { requireValue(['STAFF', 'DEAN', 'ADMIN'].includes(user?.role) && user.id, 'Cần phiên cán bộ hợp lệ.'); }
function dean(user) { requireValue(['DEAN', 'ADMIN'].includes(user?.role) && user.id, 'Cần lãnh đạo phê duyệt.'); }

export default class Sprint2Service {
  static async activePolicy(db = prisma) {
    const policy = await db.escalationThresholdPolicy.findFirst({ where: { status: 'ACTIVE' } }) || BASELINE_THRESHOLD;
    requireValue(Number.isInteger(policy.minEvidenceScore) && policy.minEvidenceScore >= 0 && policy.minEvidenceScore <= 100 && policy.scorerVersion === SCORER_VERSION,
      'Threshold hiện hành không hợp lệ hoặc scorer đã đổi; cần cán bộ rà soát, không tự hạ về baseline.');
    return policy;
  }
  static async policy(id, db = prisma) {
    requireValue(typeof id === 'string' && id.length > 0 && id.length <= 120, 'Cần ID version threshold hợp lệ.');
    if (id === 'BASELINE') return BASELINE_THRESHOLD;
    const policy = await db.escalationThresholdPolicy.findUnique({ where: { id } });
    requireValue(policy, 'Không tìm thấy version threshold.'); return policy;
  }
  static async feedback(body, user) {
    staff(user);
    text(body.requestId, 'ID hồ sơ', 120);
    requireValue(DECISIONS.includes(body.expectedDecision) && CLASSIFICATIONS.includes(body.expectedClassification), 'Nhãn feedback không hợp lệ.');
    const validClasses = { AUTO_APPROVED: ['ROUTINE'], ASK_CLARIFICATION: ['UNKNOWN_FACT'],
      REJECTED_POLICY: ['ROUTINE_POLICY_DENY'], ESCALATE_TO_STAFF: ['OUTSIDE_POLICY', 'BEYOND_AUTHORITY', 'UNKNOWN_FACT'] };
    requireValue(validClasses[body.expectedDecision].includes(body.expectedClassification), 'Quyết định và phân loại feedback không nhất quán.');
    const reason = text(body.reason, 'Lý do'); const evidenceRef = text(body.evidenceRef, 'Nguồn feedback');
    return AuditLogService.runWorkflowTransaction(async (db) => {
      const request = await db.studentRequest.findUnique({ where: { id: body.requestId }, include: { requestType: true,
        auditLogs: { orderBy: { createdAt: 'desc' } } } });
      requireValue(request && request.requestType.code === 'STUDENT_CONFIRMATION', 'Cần hồ sơ xác nhận sinh viên đã lưu.');
      requireValue(!request.verificationRunId, 'Không dùng hồ sơ Verify làm feedback độc lập.');
      requireValue(!await db.escalationFeedback.findFirst({ where: { requestId: request.id, reviewerId: user.id } }), 'Cán bộ đã ghi feedback cho hồ sơ này; giữ bản gốc bất biến.');
      requireValue(request.evaluationSnapshot, 'Hồ sơ chưa có snapshot tại quyết định gốc; không tái dựng dữ kiện cũ bằng hồ sơ hiện tại. Dùng một lần chạy mới có snapshot.');
      const snapshot = json(request.evaluationSnapshot);
      const originalAudit = request.auditLogs?.find((log) => ['WORKFLOW_AUTO_APPROVE', 'ESCALATE_AUTHORITY_TRANSFER', 'POLICY_VIOLATION_REJECT',
        'REQUIREMENT_CHECK_INCOMPLETE', 'POLICY_ASK_CLARIFICATION'].includes(log.action));
      const feedback = await db.escalationFeedback.create({ data: { requestId: request.id,
        reviewerId: user.id, reviewerName: user.fullName || user.username || user.id,
        expectedDecision: body.expectedDecision, expectedClassification: body.expectedClassification, reason, evidenceRef,
        observedDecision: originalAudit?.decision || request.decision || request.status, snapshot, fingerprint: snapshotFingerprint(snapshot),
        thresholdAssessment: request.thresholdAssessment || undefined } });
      await AuditLogService.recordLog({ ...actor(user), requestId: request.id, action: 'ESCALATION_FEEDBACK_RECORDED',
        reason, inputSnapshot: { feedbackId: feedback.id, fingerprint: feedback.fingerprint,
          expectedDecision: body.expectedDecision, expectedClassification: body.expectedClassification, evidenceRef } });
      return feedback;
    });
  }
  static async propose(body, user) {
    staff(user);
    requireValue(Array.isArray(body.feedbackIds) && body.feedbackIds.length >= 5 && body.feedbackIds.length <= 200, 'Chọn 5–200 feedback để hiệu chỉnh; không dùng holdout.');
    requireValue(body.feedbackIds.every((id) => typeof id === 'string' && id.trim()), 'feedbackIds cần là các ID chuỗi.');
    const reason = text(body.reason, 'Lý do đề xuất');
    return AuditLogService.runWorkflowTransaction(async (db) => {
      const feedback = await db.escalationFeedback.findMany({ where: { id: { in: [...new Set(body.feedbackIds)] } } });
      requireValue(feedback.length === new Set(body.feedbackIds).size, 'Có feedback không tồn tại.');
      const distinct = new Map();
      for (const row of feedback) {
        requireValue(!distinct.has(row.fingerprint) || distinct.get(row.fingerprint).expectedDecision === row.expectedDecision, 'Nhãn feedback mâu thuẫn trên cùng snapshot; cần phân xử trước.');
        distinct.set(row.fingerprint, row);
      }
      const calibration = [];
      for (const row of distinct.values()) {
        if (!['AUTO_APPROVED', 'ESCALATE_TO_STAFF'].includes(row.expectedDecision) || !row.snapshot?.referenceDate) continue;
        const replay = await replaySnapshot({ snapshot: row.snapshot }, BASELINE_THRESHOLD, row.snapshot.referenceDate);
        if (replay.decision === 'AUTO_APPROVED') calibration.push(row);
      }
      requireValue(calibration.length >= 5 && calibration.some((r) => r.expectedDecision === 'AUTO_APPROVED') && calibration.some((r) => r.expectedDecision === 'ESCALATE_TO_STAFF'),
        'Cần ít nhất 5 snapshot khác nhau đủ điều kiện auto, có cả nhãn thường quy và cần chuyển cán bộ. Feedback về hard guard được giữ nhưng không dùng để nới policy.');
      const current = await this.activePolicy(db);
      const candidates = [...new Set([0, current.minEvidenceScore, ...calibration.map((r) => Math.min(100, scorePurposeEvidence(r.snapshot.inputData).score + 1))])].sort((a, b) => a - b);
      const curve = candidates.map((threshold) => {
        let missed = 0; let falseEscalation = 0;
        for (const row of calibration) {
          const escalated = scorePurposeEvidence(row.snapshot.inputData).score < threshold;
          if (row.expectedDecision === 'ESCALATE_TO_STAFF' && !escalated) missed++;
          if (row.expectedDecision === 'AUTO_APPROVED' && escalated) falseEscalation++;
        }
        return { threshold, missed, falseEscalation, loss: 10 * missed + falseEscalation };
      });
      const best = [...curve].sort((a, b) => a.loss - b.loss || a.threshold - b.threshold)[0];
      const policy = await db.escalationThresholdPolicy.create({ data: { version: `THRESHOLD_${randomUUID()}`,
        minEvidenceScore: best.threshold, scorerVersion: SCORER_VERSION, status: 'DRAFT', parentPolicyId: current.id,
        createdById: user.id, reason, feedbackIds: calibration.map((r) => r.id),
        calibrationFingerprints: calibration.map((r) => r.fingerprint),
        calibrationReport: { objective: '10*missed + falseEscalation; calibration only; proposed technical weights, subject to business sign-off', curve, runtimeCodeHash: RUNTIME_CODE_HASH,
          used: calibration.length, excluded: feedback.length - calibration.length } } });
      await AuditLogService.recordLog({ ...actor(user), action: 'THRESHOLD_PROPOSED', reason,
        inputSnapshot: { policyId: policy.id, version: policy.version, threshold: best.threshold, parentPolicyId: current.id, feedbackIds: policy.feedbackIds } });
      return policy;
    });
  }
  static async createDataset(body, user) {
    staff(user);
    datasetMetadata(body);
    requireValue(Array.isArray(body.cases) && body.cases.length > 0 && body.cases.length <= 500, 'Cần 1–500 ca, tối đa 500.');
    requireValue(body.cases.every((c) => c && typeof c === 'object' && !Array.isArray(c)), 'Mỗi ca cần là một object.');
    requireValue(!body.policyAuthorIds || Array.isArray(body.policyAuthorIds), 'policyAuthorIds cần là mảng.');
    requireValue(['INTERNAL', 'INDEPENDENT'].includes(body.origin), 'Nguồn dataset không hợp lệ.');
    const name = text(body.name, 'Tên dataset', 200); const version = text(body.version, 'Version dataset', 120);
    const sourceRef = text(body.sourceRef, 'Nguồn dataset');
    const data = json({ name, version, sourceRef, sourceSha256: body.sourceSha256 || '', origin: body.origin,
      referenceDate: body.referenceDate || '', policyAuthorIds: body.policyAuthorIds || [],
      independenceDeclaration: body.independenceDeclaration || '', cases: body.cases, createdById: user.id, status: 'DRAFT' });
    return AuditLogService.runWorkflowTransaction(async (db) => {
      requireValue(!await db.escalationEvaluationDataset.findFirst({ where: { name, version } }), 'Tên/version dataset đã tồn tại; dùng version mới.');
      const dataset = await db.escalationEvaluationDataset.create({ data });
      await AuditLogService.recordLog({ ...actor(user), action: 'EVALUATION_DATASET_IMPORTED', reason: sourceRef,
        inputSnapshot: { datasetId: dataset.id, version, cases: body.cases.length, origin: body.origin, sourceSha256: data.sourceSha256 } });
      return { ...dataset, issues: datasetIssues(dataset) };
    });
  }
  static async reviseDataset(id, body, user) {
    staff(user);
    datasetMetadata(body);
    requireValue(Array.isArray(body.cases) && body.cases.length > 0 && body.cases.length <= 500, 'Cần 1–500 ca.');
    requireValue(body.cases.every((c) => c && typeof c === 'object' && !Array.isArray(c)), 'Mỗi ca cần là một object.');
    requireValue(!body.policyAuthorIds || Array.isArray(body.policyAuthorIds), 'policyAuthorIds cần là mảng.');
    return AuditLogService.runWorkflowTransaction(async (db) => {
      const dataset = await db.escalationEvaluationDataset.findUnique({ where: { id } });
      requireValue(dataset?.status === 'DRAFT', 'Dataset đã khóa không thể sửa; tạo version mới.');
      const updated = await db.escalationEvaluationDataset.update({ where: { id }, data: json({
        cases: body.cases, referenceDate: body.referenceDate ?? dataset.referenceDate,
        policyAuthorIds: body.policyAuthorIds ?? dataset.policyAuthorIds,
        independenceDeclaration: body.independenceDeclaration ?? dataset.independenceDeclaration }) });
      await AuditLogService.recordLog({ ...actor(user), action: 'EVALUATION_DATASET_REVISED', reason: text(body.reason, 'Lý do sửa'),
        inputSnapshot: { datasetId: id, oldHash: digest(dataset.cases), newHash: digest(updated.cases) } });
      return { ...updated, issues: datasetIssues(updated) };
    });
  }
  static async freezeDataset(id, body, user) {
    dean(user); const note = text(body.note, 'Xác nhận nguồn và người gán nhãn độc lập');
    return AuditLogService.runWorkflowTransaction(async (db) => {
      const dataset = await db.escalationEvaluationDataset.findUnique({ where: { id } });
      requireValue(dataset?.status === 'DRAFT', 'Chỉ khóa được dataset nháp.');
      requireValue(dataset.createdById !== user.id, 'Người kiểm duyệt dataset phải khác người nhập.');
      const issues = datasetIssues(dataset);
      requireValue(issues.length === 0, `Dataset chưa đủ điều kiện: ${issues.slice(0, 12).join(', ')}`);
      const contentHash = digest(dataset.cases);
      const frozen = await db.escalationEvaluationDataset.update({ where: { id }, data: {
        status: 'FROZEN', contentHash, frozenById: user.id, freezeNote: note, frozenAt: new Date() } });
      await AuditLogService.recordLog({ ...actor(user), action: 'EVALUATION_DATASET_FROZEN', reason: note,
        inputSnapshot: { datasetId: id, contentHash, sourceSha256: dataset.sourceSha256, independenceDeclaration: dataset.independenceDeclaration } });
      return frozen;
    });
  }
  static async compare(id, candidateId, user) {
    staff(user);
    // Freeze all inputs once; evaluation never modifies policy or business requests.
    const [dataset, baseline, candidate] = await Promise.all([
      prisma.escalationEvaluationDataset.findUnique({ where: { id } }), this.activePolicy(), this.policy(candidateId) ]);
    requireValue(dataset, 'Không tìm thấy dataset.');
    let comparison = await compareDataset(dataset, baseline, candidate);
    return AuditLogService.runWorkflowTransaction(async (db) => {
      // Once a holdout reveals results, do not reuse it to select a different version.
      // Check under the same DB lock as report creation to close concurrent replay races.
      const prior = await db.escalationEvaluationReport.findMany({ where: { datasetId: id },
        select: { baselinePolicyHash: true, candidatePolicyHash: true, runtimeCodeHash: true, datasetHash: true, comparison: true } });
      if (prior.some((r) => r.comparison?.rows?.length && (r.datasetHash !== digest(dataset.cases) || r.baselinePolicyHash !== policyHash(baseline) || r.candidatePolicyHash !== policyHash(candidate) || r.runtimeCodeHash !== RUNTIME_CODE_HASH))) {
        const summary = (key) => summarizeResults(comparison.rows.map((r) => ({ ...r, actualDecision: r[key].decision, actualClassification: r[key].classification })), false);
        comparison = { ...comparison, eligible: false, issues: [...comparison.issues, 'HOLDOUT_ALREADY_USED_FOR_ANOTHER_POLICY_PAIR'],
          before: summary('before'), after: summary('after'), delta: { missedEscalationPoints: null, falseEscalationPoints: null } };
      }
      const payload = json({ datasetId: id, datasetHash: digest(dataset.cases), baselinePolicyId: baseline.id,
        candidatePolicyId: candidate.id, baselinePolicyHash: policyHash(baseline), candidatePolicyHash: policyHash(candidate),
        protocolVersion: PROTOCOL_VERSION, replayVersion: REPLAY_VERSION, policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION,
        runtimeCodeHash: RUNTIME_CODE_HASH, scorerVersion: SCORER_VERSION, eligible: comparison.eligible, comparison, createdById: user.id });
      const report = await db.escalationEvaluationReport.create({ data: { ...payload, reportHash: digest(payload) } });
      await AuditLogService.recordLog({ ...actor(user), action: 'THRESHOLD_COMPARISON_RECORDED',
        reason: comparison.eligible ? 'Đánh giá trước/sau trên holdout đã khóa.' : 'Chẩn đoán PARTIAL; chưa công bố tỷ lệ.',
        inputSnapshot: { reportId: report.id, reportHash: report.reportHash, datasetId: id, baselinePolicyId: baseline.id, candidatePolicyId: candidate.id, eligible: comparison.eligible } });
      return report;
    });
  }
  static validReportHash(report) {
    const { id: _id, createdAt: _createdAt, reportHash, ...payload } = report;
    return digest(payload) === reportHash;
  }
  static async activate(id, body, user) {
    dean(user); const note = text(body.note, 'Lý do chấp thuận trade-off trước/sau');
    return AuditLogService.runWorkflowTransaction(async (db) => {
      const [current, candidate, report] = await Promise.all([this.activePolicy(db), this.policy(id, db),
        db.escalationEvaluationReport.findUnique({ where: { id: body.reportId || '' } })]);
      requireValue(id !== current.id, 'Version này đã đang hoạt động.');
      requireValue(candidate.id === 'BASELINE' || ['DRAFT', 'RETIRED'].includes(candidate.status), 'Version không thể kích hoạt.');
      requireValue(candidate.createdById !== user.id, 'Người phê duyệt phải khác người đề xuất.');
      requireValue(report && this.validReportHash(report) && report.eligible, 'Cần báo cáo holdout đủ điều kiện và hash hợp lệ.');
      requireValue(report.candidatePolicyId === id && report.baselinePolicyHash === policyHash(current) && report.candidatePolicyHash === policyHash(candidate), 'Báo cáo không khớp version hiện hành/đề xuất; chạy lại so sánh.');
      requireValue(report.policyVersion === STUDENT_CONFIRMATION_POLICY_VERSION && report.scorerVersion === SCORER_VERSION && report.protocolVersion === PROTOCOL_VERSION && report.replayVersion === REPLAY_VERSION && report.runtimeCodeHash === RUNTIME_CODE_HASH, 'Báo cáo của phiên bản code khác; đo lại.');
      const dataset = await db.escalationEvaluationDataset.findUnique({ where: { id: report.datasetId } });
      requireValue(dataset?.status === 'FROZEN' && dataset.contentHash === report.datasetHash && digest(dataset.cases) === report.datasetHash && datasetIssues(dataset).length === 0, 'Dataset không còn khớp báo cáo đã khóa.');
      requireValue(!report.comparison.after.counts.errors && report.comparison.after.missedEscalationRate <= report.comparison.before.missedEscalationRate, 'Không kích hoạt khi replay lỗi hoặc missed escalation tăng.');
      requireValue(report.comparison.after.counts.routineAuto > 0, 'Không kích hoạt giải pháp chuyển tất cả ca thường quy cho cán bộ để làm đẹp missed escalation.');
      await db.escalationThresholdPolicy.updateMany({ where: { status: 'ACTIVE' }, data: { status: 'RETIRED' } });
      const active = id === 'BASELINE' ? BASELINE_THRESHOLD : await db.escalationThresholdPolicy.update({ where: { id }, data: {
        status: 'ACTIVE', approvedById: user.id, approvalNote: note, approvalReportId: report.id, activatedAt: new Date() } });
      await AuditLogService.recordLog({ ...actor(user), action: 'THRESHOLD_ACTIVATED', reason: note,
        beforeState: { policyId: current.id, threshold: current.minEvidenceScore }, afterState: { policyId: active.id, threshold: active.minEvidenceScore },
        inputSnapshot: { reportId: report.id, datasetHash: report.datasetHash, before: report.comparison.before, after: report.comparison.after } });
      return active;
    });
  }
  static async currentMeasurement(db = prisma) {
    const active = await this.activePolicy(db);
    const report = await db.escalationEvaluationReport.findFirst({ where: { candidatePolicyId: active.id, eligible: true,
      policyVersion: STUDENT_CONFIRMATION_POLICY_VERSION, scorerVersion: SCORER_VERSION, protocolVersion: PROTOCOL_VERSION, replayVersion: REPLAY_VERSION, runtimeCodeHash: RUNTIME_CODE_HASH }, orderBy: { createdAt: 'desc' } });
    if (report && this.validReportHash(report) && report.candidatePolicyHash === policyHash(active)) {
      const dataset = await db.escalationEvaluationDataset.findUnique({ where: { id: report.datasetId } });
      if (dataset?.status === 'FROZEN' && dataset.contentHash === report.datasetHash && digest(dataset.cases) === report.datasetHash && !datasetIssues(dataset).length) {
        return { ...report.comparison.after, reportId: report.id, datasetId: report.datasetId, mode: 'DETERMINISTIC_REPLAY', thresholdVersion: active.version };
      }
    }
    return { missedEscalationRate: null, falseEscalationRate: null, routineAutomationRate: null,
      measurementStatus: 'PARTIAL', thresholdVersion: active.version, note: 'Chưa có báo cáo độc lập đủ điều kiện cho code/threshold đang hoạt động.' };
  }
  static async overview() {
    const [activePolicy, measurement, policies, feedback, datasets, reports] = await Promise.all([
      this.activePolicy(), this.currentMeasurement(),
      prisma.escalationThresholdPolicy.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.escalationFeedback.findMany({ orderBy: { createdAt: 'desc' }, take: 200,
        select: { id: true, requestId: true, reviewerName: true, expectedDecision: true, reason: true, evidenceRef: true, createdAt: true } }),
      prisma.escalationEvaluationDataset.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.escalationEvaluationReport.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }) ]);
    return { activePolicy, measurement, policies, feedback, datasets: datasets.map((d) => ({ ...d, issues: datasetIssues(d) })), reports };
  }
}
