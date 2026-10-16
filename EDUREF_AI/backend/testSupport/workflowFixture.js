import prisma from '../config/prisma.js';
import { restorer, transactionClient } from './securityTestEnv.js';

// In-memory database for workflow regressions; importing securityTestEnv first
// prevents any unstubbed operation from reaching the shared demo database.
export function workflowFixture() {
  const mocks = restorer();
  const state = { records: [], audits: [], locks: 0 };
  const students = [
    { id: 'student-active', studentCode: '2380600001', fullName: 'Sinh viên benchmark', status: 'ACTIVE' },
    { id: 'student-dropped', studentCode: '2150200002', fullName: 'Sinh viên thôi học benchmark', status: 'DROPPED' },
    { id: 'student-overdue', studentCode: '2080600099', fullName: 'Sinh viên khóa cũ benchmark', status: 'ACTIVE' },
  ].map((student) => ({ ...student, department: { name: 'Khoa kiểm thử' } }));
  const requestType = { id: 'confirmation-type', code: 'STUDENT_CONFIRMATION', name: 'Xác nhận sinh viên', requirements: [] };
  const match = (record, where = {}) => {
    if (where.OR) return where.OR.some((item) => record.id === item.id || record.requestCode === item.requestCode);
    return (!where.id?.not || record.id !== where.id.not)
      && (!where.studentId || record.studentId === where.studentId)
      && (!where.requestTypeId || record.requestTypeId === where.requestTypeId)
      && (!where.status?.in || where.status.in.includes(record.status))
      && (typeof where.status !== 'string' || record.status === where.status)
      && (where.verificationRunId !== null || !record.verificationRunId)
      && (!where.inputData?.equals || record.inputData?.formCode === where.inputData.equals);
  };
  const copy = (value) => value == null ? value : structuredClone(value);
  const add = (data = {}) => {
    const student = students.find((item) => item.id === data.studentId) || students[0];
    const record = { id: `request-${state.records.length + 1}`, requestCode: `XNSV-TEST-${state.records.length + 1}`,
      studentId: student.id, requestTypeId: requestType.id, student, requestType, documents: [],
      createdAt: new Date(), status: 'PENDING', inputData: {}, ...data };
    state.records.push(record);
    return copy(record);
  };
  mocks.stub(prisma.student, 'findUnique', async ({ where }) => copy(students.find((s) => s.studentCode === where.studentCode || s.id === where.id) || null));
  mocks.stub(prisma.requestType, 'findUnique', async () => copy(requestType));
  mocks.stub(prisma.studentRequest, 'findFirst', async ({ where }) => copy(state.records.find((r) => match(r, where)) || null));
  mocks.stub(prisma.studentRequest, 'findUnique', async ({ where }) => copy(state.records.find((r) => r.id === where.id) || null));
  mocks.stub(prisma.studentRequest, 'findMany', async ({ where = {}, take, skip = 0 } = {}) => copy(state.records.filter((r) => match(r, where)).slice(skip, take ? skip + take : undefined)));
  mocks.stub(prisma.studentRequest, 'create', async ({ data }) => add(data));
  mocks.stub(prisma.studentRequest, 'update', async ({ where, data }) => {
    const record = state.records.find((r) => r.id === where.id);
    if (!record) throw new Error('Fixture request not found');
    Object.assign(record, Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)));
    return copy(record);
  });
  mocks.stub(prisma.auditLog, 'findFirst', async ({ where } = {}) => copy(state.audits.filter((item) => !where?.requestId || item.requestId === where.requestId).at(-1) || null));
  mocks.stub(prisma.auditLog, 'create', async ({ data }) => { const log = { id: `audit-${state.audits.length + 1}`, ...data }; state.audits.push(log); return copy(log); });
  mocks.stub(prisma, '$transaction', async (operation) => {
    const snapshot = copy({ records: state.records, audits: state.audits });
    try {
      return await operation(transactionClient(prisma, { $executeRaw: async () => { state.locks++; return 1; } }));
    } catch (error) {
      state.records = snapshot.records; state.audits = snapshot.audits;
      throw error;
    }
  });
  return { state, add, mocks, students, requestType };
}
