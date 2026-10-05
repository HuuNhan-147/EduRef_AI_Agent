import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { petitionWorkflowCore } from '../modules/petition-core/PetitionWorkflowCore.js';
import AcademicWorkflowService from '../services/AcademicWorkflowService.js';

test('Unified Workflow: Routine Auto-Approve matches between Core and Agent Facade', async () => {
  const studentCode = '2280602154';
  const inputData = {
    purpose: 'Đăng ký vé tháng xe buýt',
    pickupCampus: 'Sai Gon Campus — Phòng Công tác Sinh viên (A-01.01)',
  };

  // 1. Kênh REST API / Core
  const coreResult = await petitionWorkflowCore.processPetitionWorkflow({
    studentCode,
    requestTypeCode: 'STUDENT_CONFIRMATION',
    inputData,
    forceNewRequest: true,
    actorType: 'STUDENT',
  });

  // 2. Kênh AI Agent
  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    purpose: inputData.purpose,
    pickupCampus: inputData.pickupCampus,
  });

  // So sánh kết quả nhất quán 100%
  assert.equal(coreResult.decision, 'AUTO_APPROVED');
  assert.equal(agentResult.decision, 'AUTO_APPROVED');
  assert.equal(coreResult.status, 'APPROVED');
  assert.equal(agentResult.status, 'APPROVED');
  assert.ok(coreResult.sha256Proof, 'Core result must produce a valid sha256Proof');
  assert.ok(agentResult.sha256Proof, 'Agent result must inherit the valid sha256Proof from Core');
});

test('Unified Workflow: Policy Reject (DROPPED student) matches between Core and Agent Facade', async () => {
  const studentCode = '2110002'; // Sinh viên đã thôi học
  const inputData = {
    purpose: 'Xin cấp giấy xác nhận',
    pickupCampus: 'Sai Gon Campus (A-01.01)',
  };

  const coreResult = await petitionWorkflowCore.processPetitionWorkflow({
    studentCode,
    requestTypeCode: 'STUDENT_CONFIRMATION',
    inputData,
    forceNewRequest: true,
    actorType: 'STUDENT',
  });

  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    purpose: inputData.purpose,
    pickupCampus: inputData.pickupCampus,
  });

  assert.equal(coreResult.decision, 'REJECTED_POLICY');
  assert.equal(agentResult.decision, 'REJECTED_POLICY');
  assert.equal(coreResult.status, 'REJECTED');
  assert.equal(agentResult.status, 'REJECTED');
});

test('Unified Workflow: Missing Purpose returns ASK_CLARIFICATION on both channels', async () => {
  const studentCode = '2280602154';

  const coreResult = await petitionWorkflowCore.processPetitionWorkflow({
    studentCode,
    requestTypeCode: 'STUDENT_CONFIRMATION',
    inputData: { purpose: '' },
    forceNewRequest: true,
    actorType: 'STUDENT',
  });

  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    purpose: '',
    pickupCampus: 'Sai Gon Campus',
  });

  assert.equal(coreResult.decision, 'ASK_CLARIFICATION');
  assert.equal(agentResult.decision, 'ASK_CLARIFICATION');
  assert.ok(coreResult.question || coreResult.actionableQuestion);
  assert.ok(agentResult.actionableQuestion || agentResult.message);
});

test('Unified Workflow: Missing Campus on AI Agent halts with ASK_CLARIFICATION', async () => {
  const studentCode = '2280602154';

  const agentResult = await AcademicWorkflowService.processStudentConfirmation({
    studentCode,
    purpose: 'Làm vé tháng xe buýt',
    pickupCampus: '', // Thiếu cơ sở
  });

  assert.equal(agentResult.decision, 'ASK_CLARIFICATION');
  assert.ok(agentResult.actionableQuestion.includes('cơ sở'));
});
