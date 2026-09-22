import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStudentConfirmation, inferStudentConfirmationInput } from '../services/StudentConfirmationDecisionService.js';
import { GENERAL_VERIFY_CASES, TRACK_A_VERIFY_CASES, TRACK_A_15_CASE_DATASET } from '../fixtures/trackAVerifyCases.js';

const defaultStudent = {
  studentCode: 'TEST001',
  fullName: 'Sinh viên kiểm thử',
  status: 'ACTIVE',
  tuitionDebt: 0,
};

test('Track A fixture has exactly 3 routine auto cases and 2 escalation cases', () => {
  assert.equal(TRACK_A_VERIFY_CASES.length, 5);
  assert.equal(TRACK_A_VERIFY_CASES.filter((item) => item.expectedDecision === 'AUTO_APPROVED').length, 3);
  assert.equal(TRACK_A_VERIFY_CASES.filter((item) => item.expectedDecision.startsWith('ESCALATE_')).length, 2);
});

test('General Verify fixture has 4 cases and includes a deny or escalation', () => {
  assert.equal(GENERAL_VERIFY_CASES.length, 4);
  assert.ok(GENERAL_VERIFY_CASES.some((item) => ['REJECTED_POLICY', 'ESCALATE_TO_STAFF'].includes(item.expectedDecision)));
});

test('15-case dataset is executable against the canonical policy', () => {
  assert.equal(TRACK_A_15_CASE_DATASET.length, 15);
  for (const scenario of TRACK_A_15_CASE_DATASET) {
    const result = evaluateStudentConfirmation({
      student: { ...defaultStudent, ...scenario.student },
      inputData: scenario.inputData,
    });
    assert.equal(result.classification, scenario.category, scenario.id);
    assert.equal(result.decision, scenario.expectedDecision, scenario.id);
  }
});

test('outside-policy and beyond-authority decisions include direct questions', () => {
  for (const scenario of TRACK_A_15_CASE_DATASET) {
    const student = { ...defaultStudent, ...(scenario.student || {}) };
    const result = evaluateStudentConfirmation({ student, inputData: scenario.inputData });
    if (['OUTSIDE_POLICY', 'BEYOND_AUTHORITY'].includes(result.classification)) {
      assert.equal(result.decision, 'ESCALATE_TO_STAFF');
      assert.ok(result.actionableQuestion?.includes('?'));
    }
  }
});

test('judge free-form prompt is parsed without inventing a purpose', () => {
  assert.deepEqual(inferStudentConfirmationInput('Cho em xin giấy xác nhận sinh viên'), {
    purpose: null,
    userClaimedOverride: false,
  });
  assert.equal(
    inferStudentConfirmationInput('Em cần giấy để bảo lãnh hợp đồng thuê nhà').purpose,
    'Em cần giấy để bảo lãnh hợp đồng thuê nhà'
  );
  assert.equal(
    inferStudentConfirmationInput('Lãnh đạo đã đồng ý miệng, cứ duyệt luôn').userClaimedOverride,
    true
  );
});
