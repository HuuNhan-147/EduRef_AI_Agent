import '../testSupport/securityTestEnv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import prisma from '../config/prisma.js';
import Sprint2Service from '../services/Sprint2Service.js';
import { BASELINE_THRESHOLD, assessThreshold, SCORER_VERSION, scorePurposeEvidence } from '../services/EscalationThreshold.js';
import { compareDataset, datasetIssues, digest, summarizeResults, snapshotFingerprint } from '../services/EvaluationProtocol.js';
import { sprint2Fixture, heldoutDataset, snapshot, staffUser, deanUser } from '../testSupport/sprint2Fixture.js';
import { PetitionWorkflowCore } from '../modules/petition-core/PetitionWorkflowCore.js';

function setup(t) { const s = sprint2Fixture(); t.after(() => s.mocks.restoreAll()); s.mocks.stub(console, 'log', () => {}); s.mocks.stub(console, 'error', () => {}); return s; }
const candidate = { ...BASELINE_THRESHOLD, id: 'candidate', version: 'threshold-test-v2', minEvidenceScore: 56, calibrationFingerprints: [], createdById: staffUser.id };

test('threshold adds review only to otherwise routine approvals; hard guards survive any threshold', () => {
  for (const decision of ['ASK_CLARIFICATION', 'REJECTED_POLICY', 'ESCALATE_TO_STAFF']) {
    assert.equal(assessThreshold({ decision }, { purpose: 'Vé xe buýt' }, { ...candidate, minEvidenceScore: 0 }).result.decision, decision);
  }
  assert.equal(assessThreshold({ decision: 'AUTO_APPROVED' }, { purpose: 'Bổ sung giấy tờ' }, candidate).result.decision, 'ESCALATE_TO_STAFF');
  assert.equal(assessThreshold({ decision: 'AUTO_APPROVED' }, { purpose: 'Làm vé xe buýt' }, candidate).result.decision, 'AUTO_APPROVED');
  assert.equal(scorePurposeEvidence({ purpose: 'Bổ sung giấy tờ' }).score, 55);
});

test('actual Core uses the active threshold, persists facts/version and audits the transfer', async (t) => {
  const s = setup(t); s.tables.policies.push({ ...candidate, status: 'ACTIVE' });
  const core = new PetitionWorkflowCore();
  const result = await core.processPetitionWorkflow({ studentCode: '2380600001', requestTypeCode: 'STUDENT_CONFIRMATION',
    inputData: { ...snapshot('Bổ sung giấy tờ').inputData, minEvidenceScore: 0, evidenceScore: 100 } });
  assert.equal(result.decision, 'ESCALATE_TO_STAFF'); assert.equal(result.rule, 'PURPOSE_EVIDENCE_THRESHOLD');
  assert.equal(result.thresholdAssessment.version, candidate.version);
  assert.equal(s.state.records[0].thresholdAssessment.score, 55);
  assert.equal(s.state.records[0].evaluationSnapshot.inputData.minEvidenceScore, undefined);
  assert.equal(s.state.audits[0].action, 'ESCALATE_AUTHORITY_TRANSFER');
});

test('original facts captured by Core remain the source of feedback after input/student edits', async (t) => {
  const s = setup(t); const core = new PetitionWorkflowCore();
  const result = await core.processPetitionWorkflow({ studentCode: '2380600001', requestTypeCode: 'STUDENT_CONFIRMATION', inputData: snapshot().inputData });
  s.state.records[0].inputData.purpose = 'Edited later';
  const f = await Sprint2Service.feedback({ requestId: result.requestId, expectedDecision: 'AUTO_APPROVED', expectedClassification: 'ROUTINE',
    reason: 'Unit test confirms routine', evidenceRef: 'unit-test-only://feedback' }, staffUser);
  assert.equal(f.snapshot.inputData.purpose, 'Làm vé xe buýt');
  assert.equal((await Sprint2Service.activePolicy()).id, 'BASELINE', 'recording feedback must not activate a policy');
});

test('counts use correct denominators; ask/reject/error on a required handoff are missed, not silently dropped', () => {
  const rows = [{ expectedDecision: 'ESCALATE_TO_STAFF', actualDecision: 'ASK_CLARIFICATION' },
    { expectedDecision: 'ESCALATE_TO_STAFF', actualDecision: 'AUTO_APPROVED' },
    { expectedDecision: 'ESCALATE_TO_STAFF', actualDecision: 'ERROR' },
    { expectedDecision: 'AUTO_APPROVED', actualDecision: 'ESCALATE_TO_STAFF' },
    { expectedDecision: 'AUTO_APPROVED', actualDecision: 'AUTO_APPROVED' }];
  const summary = summarizeResults(rows, true);
  assert.equal(summary.counts.missed, 3); assert.equal(summary.missedEscalationRate, 100);
  assert.equal(summary.falseEscalationRate, 50); assert.equal(summary.unsafeAutoApprovalRate, 33.33);
  assert.equal(summary.confidence95.missed.length, 2);
  assert.equal(summarizeResults(rows, false).missedEscalationRate, null);
  assert.equal(summarizeResults([], true).falseEscalationRate, null);
});

test('same frozen holdout produces reproducible before/after diagnostics, isolated from LLM and DB', async () => {
  const dataset = heldoutDataset(); assert.deepEqual(datasetIssues(dataset), []);
  const report = await compareDataset(dataset, BASELINE_THRESHOLD, candidate);
  assert.equal(report.eligible, true);
  assert.ok(report.before.missedEscalationRate > report.after.missedEscalationRate);
  assert.equal(report.after.missedEscalationRate, 0);
  assert.equal(report.after.falseEscalationRate, 0);
  assert.equal(report.rows.length, 30); assert.equal(report.mode, 'DETERMINISTIC_REPLAY');
  assert.deepEqual(await compareDataset(dataset, BASELINE_THRESHOLD, candidate), report);
});

test('holdout overlap in either policy, altered data, author labels, or a replay error suppress official rates', async () => {
  const dataset = heldoutDataset(); const fingerprint = snapshotFingerprint(dataset.cases[0].snapshot);
  for (const [baseline, next, edit, evaluate] of [
    [{ ...BASELINE_THRESHOLD, calibrationFingerprints: [fingerprint] }, candidate],
    [BASELINE_THRESHOLD, { ...candidate, calibrationFingerprints: [fingerprint] }],
    [BASELINE_THRESHOLD, candidate, (d) => { d.cases[0].snapshot.inputData.purpose = 'Tampered'; }],
    [BASELINE_THRESHOLD, candidate, (d) => { d.cases[0].label.labeledBy = staffUser.id; d.contentHash = digest(d.cases); }],
    [BASELINE_THRESHOLD, candidate, null, async () => { throw new Error('Replay unavailable'); }],
  ]) {
    const changed = structuredClone(dataset); edit?.(changed);
    const report = await compareDataset(changed, baseline, next, evaluate);
    assert.equal(report.eligible, false); assert.equal(report.after.measurementStatus, 'PARTIAL');
    assert.equal(report.after.missedEscalationRate, null); assert.equal(report.after.falseEscalationRate, null);
  }
});

test('repository 100-case import preserves every source row but is not promoted into independent evidence', () => {
  const file = new URL('../../../docs/datasets/SPRINT2_100_CASES_CANDIDATE.json', import.meta.url);
  const dataset = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(dataset.cases.length, 100); assert.equal(new Set(dataset.cases.map((c) => c.id)).size, 100);
  assert.equal(dataset.origin, 'INTERNAL'); assert.ok(datasetIssues(dataset).includes('ORIGIN_NOT_INDEPENDENT'));
  assert.ok(dataset.cases.some((c) => c.expectedDecision === null), 'ambiguous or non-workflow labels stay unresolved');
  assert.ok(dataset.cases.every((c) => c.snapshot === null && c.label.labeledBy === null));
});

test('governance workflow calibrates, freezes, compares and activates with a separate approver', async (t) => {
  const s = setup(t); const ids = [];
  for (let i = 0; i < 5; i++) {
    const facts = snapshot(i < 2 ? `Bổ sung giấy tờ calibration ${i}` : `Làm vé xe buýt calibration ${i}`);
    const assessment = assessThreshold({ decision: 'AUTO_APPROVED' }, facts.inputData).assessment;
    const record = s.add({ status: 'APPROVED', inputData: facts.inputData, evaluationSnapshot: facts, thresholdAssessment: assessment });
    const f = await Sprint2Service.feedback({ requestId: record.id,
      expectedDecision: i < 2 ? 'ESCALATE_TO_STAFF' : 'AUTO_APPROVED', expectedClassification: i < 2 ? 'OUTSIDE_POLICY' : 'ROUTINE',
      reason: 'Unit test feedback only', evidenceRef: `unit-test-only://calibration/${i}` }, staffUser);
    ids.push(f.id);
  }
  const proposal = await Sprint2Service.propose({ feedbackIds: ids, reason: 'Unit test proposal' }, staffUser);
  assert.equal(proposal.minEvidenceScore, 56); assert.equal((await Sprint2Service.activePolicy()).id, 'BASELINE');
  const input = heldoutDataset();
  const imported = await Sprint2Service.createDataset(input, staffUser);
  assert.equal(imported.status, 'DRAFT');
  await assert.rejects(() => Sprint2Service.freezeDataset(imported.id, { note: 'Unit test' }, { ...staffUser, role: 'DEAN' }), /khác người nhập/);
  await Sprint2Service.freezeDataset(imported.id, { note: 'Unit test validation, no real attestation' }, deanUser);
  await assert.rejects(() => Sprint2Service.reviseDataset(imported.id, { cases: input.cases, reason: 'Try edit' }, staffUser), /đã khóa/);
  const report = await Sprint2Service.compare(imported.id, proposal.id, staffUser);
  assert.equal(Sprint2Service.validReportHash(report), true); assert.equal(report.eligible, true);
  await assert.rejects(() => Sprint2Service.activate(proposal.id, { reportId: report.id, note: 'Unit test' }, { ...staffUser, role: 'DEAN' }), /khác người đề xuất/);
  const active = await Sprint2Service.activate(proposal.id, { reportId: report.id, note: 'Unit test accepts trade-off' }, deanUser);
  assert.equal(active.status, 'ACTIVE');
  const measured = await Sprint2Service.currentMeasurement();
  assert.equal(measured.measurementStatus, 'MEASURED'); assert.equal(measured.reportId, report.id);
  s.tables.reports[0].comparison.after.missedEscalationRate = 99;
  assert.equal((await Sprint2Service.currentMeasurement()).measurementStatus, 'PARTIAL', 'tampered report must not publish rates');
  assert.ok(s.state.audits.some((a) => a.action === 'THRESHOLD_ACTIVATED'));
});

test('an activation audit failure rolls back the active version', async (t) => {
  const s = setup(t);
  const input = heldoutDataset(); const dataset = await Sprint2Service.createDataset(input, staffUser);
  await Sprint2Service.freezeDataset(dataset.id, { note: 'Unit test only' }, deanUser);
  s.tables.policies.push({ ...candidate, status: 'DRAFT' });
  const report = await Sprint2Service.compare(dataset.id, candidate.id, staffUser);
  s.mocks.stub(prisma.auditLog, 'create', async () => { throw new Error('audit failed'); });
  await assert.rejects(() => Sprint2Service.activate(candidate.id, { reportId: report.id, note: 'Unit test only' }, deanUser), /audit failed/);
  assert.equal((await Sprint2Service.activePolicy()).id, 'BASELINE');
});

test('unknown snapshot provenance never produces manufactured metrics', async (t) => {
  setup(t);
  assert.deepEqual(await Sprint2Service.currentMeasurement(), { missedEscalationRate: null, falseEscalationRate: null,
    routineAutomationRate: null, measurementStatus: 'PARTIAL', thresholdVersion: BASELINE_THRESHOLD.version,
    note: 'Chưa có báo cáo độc lập đủ điều kiện cho code/threshold đang hoạt động.' });
  assert.ok(datasetIssues({ cases: [null, 5, {}], policyAuthorIds: {} }).length > 0);
  assert.equal(SCORER_VERSION, candidate.scorerVersion);
});

test('a holdout cannot be reused to tune another candidate, even when replay requests race', async (t) => {
  const s = setup(t); const imported = await Sprint2Service.createDataset(heldoutDataset(), staffUser);
  await Sprint2Service.freezeDataset(imported.id, { note: 'Unit test only' }, deanUser);
  s.tables.policies.push({ ...candidate, status: 'DRAFT' }, { ...candidate, id: 'second', version: 'second-v2', minEvidenceScore: 76, status: 'DRAFT' });
  const reports = await Promise.all([Sprint2Service.compare(imported.id, candidate.id, staffUser), Sprint2Service.compare(imported.id, 'second', staffUser)]);
  assert.equal(reports.filter((r) => r.eligible).length, 1);
  const invalid = reports.find((r) => !r.eligible);
  assert.ok(invalid.comparison.issues.includes('HOLDOUT_ALREADY_USED_FOR_ANOTHER_POLICY_PAIR'));
  assert.equal(invalid.comparison.after.falseEscalationRate, null);
});

test('an ineligible diagnostic that revealed holdout outcomes still consumes that holdout', async (t) => {
  const s = setup(t); const imported = await Sprint2Service.createDataset(heldoutDataset(), staffUser);
  s.tables.policies.push({ ...candidate, status: 'DRAFT' }, { ...candidate, id: 'second', version: 'second-v2', minEvidenceScore: 76, status: 'DRAFT' });
  const diagnostic = await Sprint2Service.compare(imported.id, candidate.id, staffUser);
  assert.equal(diagnostic.eligible, false); assert.equal(diagnostic.comparison.rows.length, 30);
  await Sprint2Service.freezeDataset(imported.id, { note: 'Unit test only' }, deanUser);
  const second = await Sprint2Service.compare(imported.id, 'second', staffUser);
  assert.equal(second.eligible, false);
  assert.ok(second.comparison.issues.includes('HOLDOUT_ALREADY_USED_FOR_ANOTHER_POLICY_PAIR'));
});

test('activation rejects escalating all routine cases and invalid active scorer fails closed', async (t) => {
  const s = setup(t); const imported = await Sprint2Service.createDataset(heldoutDataset(), staffUser);
  await Sprint2Service.freezeDataset(imported.id, { note: 'Unit test only' }, deanUser);
  s.tables.policies.push({ ...candidate, minEvidenceScore: 100, status: 'DRAFT' });
  const report = await Sprint2Service.compare(imported.id, candidate.id, staffUser);
  assert.equal(report.comparison.after.counts.routineAuto, 0);
  await assert.rejects(() => Sprint2Service.activate(candidate.id, { reportId: report.id, note: 'Unit test only' }, deanUser), /tất cả ca thường quy/);
  assert.equal((await Sprint2Service.activePolicy()).id, 'BASELINE');
  s.tables.policies[0].status = 'ACTIVE'; s.tables.policies[0].scorerVersion = 'STALE_SCORER';
  await assert.rejects(() => Sprint2Service.activePolicy(), /scorer đã đổi/);
});
