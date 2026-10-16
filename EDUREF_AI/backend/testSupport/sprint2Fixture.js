import './securityTestEnv.js';
import prisma from '../config/prisma.js';
import { workflowFixture } from './workflowFixture.js';
import { digest } from '../services/EvaluationProtocol.js';

export const staffUser = { id: 'staff-author', role: 'STAFF', fullName: 'Fixture staff' };
export const deanUser = { id: 'dean-reviewer', role: 'DEAN', fullName: 'Fixture dean' };
// Synthetic unit-test data ONLY. Never imported or published as independent evidence.
export function snapshot(purpose = 'Làm vé xe buýt', extra = {}) {
  return { student: { studentCode: '2380600001', fullName: 'Fixture student', status: 'ACTIVE',
    admissionYear: 2023, enrolledCredits: 18, hasSchedule: true },
  inputData: { formCode: 'GENERAL_CONFIRMATION', purpose, phone: '0901234568', pickupCampus: 'Sai Gon Campus', ...extra },
  documents: [], historyRequests: [], referenceDate: '2026-10-16T01:00:00.000Z' };
}
export function heldoutDataset() {
  const cases = Array.from({ length: 30 }, (_, i) => {
    let expectedDecision = 'AUTO_APPROVED'; let expectedClassification = 'ROUTINE';
    let facts = snapshot(`Làm vé xe buýt cho ca ${i}`);
    if (i >= 10 && i < 20) { facts = snapshot(`Bổ sung giấy tờ cho tình huống ${i}`); expectedDecision = 'ESCALATE_TO_STAFF'; expectedClassification = 'OUTSIDE_POLICY'; }
    if (i >= 20 && i < 25) { facts = snapshot('', { phone: `09012345${i}` }); expectedDecision = 'ASK_CLARIFICATION'; expectedClassification = 'UNKNOWN_FACT'; }
    if (i === 25) { facts = snapshot('Bảo lãnh hợp đồng thuê nhà'); expectedDecision = 'ESCALATE_TO_STAFF'; expectedClassification = 'OUTSIDE_POLICY'; }
    if (i === 26) { facts = snapshot('Làm vé xe buýt', { userClaimedOverride: true }); expectedDecision = 'ESCALATE_TO_STAFF'; expectedClassification = 'BEYOND_AUTHORITY'; }
    if (i >= 27) { facts.student.status = 'DROPPED'; facts.inputData.purpose = `Làm vé xe buýt ${i}`; expectedDecision = 'REJECTED_POLICY'; expectedClassification = 'ROUTINE_POLICY_DENY'; }
    return { id: `UNIT-${i}`, split: 'HOLDOUT', expectedDecision, expectedClassification, snapshot: facts,
      label: { labeledBy: 'unit-independent-reviewer', labeledAt: '2026-10-16T01:00:00.000Z', sourceRef: `unit-test-only://${i}` } };
  });
  return { name: 'UNIT TEST ONLY', version: 'unit-v1', origin: 'INDEPENDENT', sourceRef: 'unit-test-only://source',
    sourceSha256: 'a'.repeat(64), referenceDate: '2026-10-16T01:00:00.000Z', policyAuthorIds: [staffUser.id, 'unit-code-author'],
    independenceDeclaration: 'Synthetic test of validation protocol; not actual independent evidence.',
    createdById: staffUser.id, status: 'FROZEN', contentHash: digest(cases), cases };
}
export function sprint2Fixture() {
  const base = workflowFixture();
  const tables = {};
  const match = (row, where = {}) => Object.entries(where).every(([key, value]) =>
    value && typeof value === 'object' && 'in' in value ? value.in.includes(row[key]) : row[key] === value);
  for (const [name, key] of [['escalationThresholdPolicy', 'policies'], ['escalationFeedback', 'feedback'],
    ['escalationEvaluationDataset', 'datasets'], ['escalationEvaluationReport', 'reports']]) {
    tables[key] = [];
    const copy = (row) => row ? structuredClone(row) : null;
    base.mocks.stub(prisma[name], 'findMany', async ({ where = {}, take } = {}) => structuredClone(tables[key].filter((r) => match(r, where)).slice(0, take)));
    base.mocks.stub(prisma[name], 'findFirst', async ({ where = {} } = {}) => copy(tables[key].filter((r) => match(r, where)).at(-1)));
    base.mocks.stub(prisma[name], 'findUnique', async ({ where }) => copy(tables[key].find((r) => match(r, where))));
    base.mocks.stub(prisma[name], 'create', async ({ data }) => {
      const row = { id: `${key}-${tables[key].length + 1}`, createdAt: new Date(), ...structuredClone(data) };
      tables[key].push(row); return copy(row);
    });
    base.mocks.stub(prisma[name], 'update', async ({ where, data }) => {
      const row = tables[key].find((r) => match(r, where)); if (!row) throw new Error('Missing fixture row');
      Object.assign(row, structuredClone(data)); return copy(row);
    });
    base.mocks.stub(prisma[name], 'updateMany', async ({ where, data }) => {
      const rows = tables[key].filter((r) => match(r, where)); rows.forEach((r) => Object.assign(r, structuredClone(data))); return { count: rows.length };
    });
  }
  // Wrap the fixture transaction so governance changes roll back with the audit.
  const originalTransaction = prisma.$transaction;
  base.mocks.stub(prisma, '$transaction', async (operation, options) => {
    const backup = structuredClone(tables);
    try { return await originalTransaction(operation, options); }
    catch (error) { for (const key of Object.keys(tables)) tables[key] = backup[key]; throw error; }
  });
  return { ...base, tables };
}
