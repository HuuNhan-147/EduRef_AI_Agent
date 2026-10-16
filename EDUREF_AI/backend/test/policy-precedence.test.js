import { restorer, transactionClient } from '../testSupport/securityTestEnv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { PetitionWorkflowCore } from '../modules/petition-core/PetitionWorkflowCore.js';
import { studentConfirmationHandler } from '../modules/petition-core/handlers/StudentConfirmationHandler.js';

function setup(t, status) {
  const mocks = restorer();
  t.after(() => mocks.restoreAll());
  const student = { id: 'sid-precedence', studentCode: '2380600001', fullName: 'Sinh viên test', status };
  const requestType = { id: 'type-confirmation', code: 'STUDENT_CONFIRMATION' };
  let request = {
    id: 'request-precedence', requestCode: 'XNSV-123456', status: 'WAITING_STUDENT',
    inputData: { formCode: 'MILITARY_DEFERMENT', purpose: 'Tạm hoãn nghĩa vụ quân sự', isInquiry: true },
    student, requestType, studentId: student.id, requestTypeId: requestType.id, documents: [],
  };
  const audits = [];
  let requirementChecks = 0;
  mocks.stub(console, 'log', () => {});
  mocks.stub(prisma.student, 'findUnique', async () => student);
  mocks.stub(prisma.requestType, 'findUnique', async () => requestType);
  mocks.stub(prisma.studentRequest, 'findMany', async () => []);
  mocks.stub(prisma.studentRequest, 'findFirst', async () => request);
  mocks.stub(prisma.studentRequest, 'update', async ({ data }) => {
    request = { ...request, ...data };
    return request;
  });
  mocks.stub(prisma, '$transaction', async (fn) => fn(transactionClient(prisma, {
    auditLog: {
      findFirst: async () => null,
      create: async ({ data }) => { audits.push(data); return { ...data, sha256Hash: 'test-proof' }; },
    },
    studentRequest: { update: prisma.studentRequest.update },
  })));
  mocks.stub(studentConfirmationHandler, 'validateRequirements', async () => {
    requirementChecks++;
    return { complete: false, missing: [{ code: 'REQ_ADDRESS', name: 'Địa chỉ', description: 'Thiếu địa chỉ' }] };
  });
  return { core: new PetitionWorkflowCore(), audits, requirementChecks: () => requirementChecks, request: () => request };
}

for (const status of ['DROPPED', 'SUSPENDED']) {
  for (const entry of ['submit', 'resume']) {
    test(`Core ${entry}: ${status} thiếu địa chỉ/SĐT bị từ chối trước khi hỏi bổ sung`, async (t) => {
      const s = setup(t, status);
      const result = entry === 'resume'
        ? await s.core.resumePetitionWorkflow({ requestId: s.request().id, additionalData: {} })
        : await s.core.processPetitionWorkflow({
            studentCode: '2380600001', requestTypeCode: 'STUDENT_CONFIRMATION',
            inputData: s.request().inputData, actorType: 'STUDENT',
          });
      assert.equal(result.decision, 'REJECTED_POLICY');
      assert.equal(result.status, 'REJECTED');
      assert.equal(s.request().status, 'REJECTED');
      assert.equal(s.requirementChecks(), 0);
      assert.equal(s.audits.length, 1);
      assert.equal(s.audits[0].action, 'POLICY_VIOLATION_REJECT');
      assert.equal(s.audits[0].actorType, 'STUDENT');
    });
  }
}

test('Core: sinh viên ACTIVE thiếu địa chỉ vẫn được hỏi bổ sung', async (t) => {
  const s = setup(t, 'ACTIVE');
  const result = await s.core.processPetitionWorkflow({
    studentCode: '2380600001', requestTypeCode: 'STUDENT_CONFIRMATION',
    inputData: s.request().inputData, actorType: 'STUDENT',
  });
  assert.equal(result.decision, 'ASK_CLARIFICATION');
  assert.equal(s.request().status, 'WAITING_STUDENT');
  assert.equal(s.requirementChecks(), 1);
  assert.equal(s.audits[0].action, 'REQUIREMENT_CHECK_INCOMPLETE');
});
