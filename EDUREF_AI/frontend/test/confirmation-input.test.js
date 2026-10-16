import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfirmationInput } from '../src/config/confirmationForms.js';
import { buildSupplementInput, supplementDecisionState } from '../src/config/petitionSupplement.js';

test('submission preserves a general purpose and uses the selected specific form purpose', () => {
  assert.equal(buildConfirmationInput('GENERAL_CONFIRMATION', { purpose: 'Làm vé xe buýt' }).purpose, 'Làm vé xe buýt');
  assert.equal(buildConfirmationInput('MILITARY_DEFERMENT', { phone: '0901234567' }).purpose, 'Tạm hoãn nghĩa vụ quân sự');
  assert.equal(buildConfirmationInput('MILITARY_DEFERMENT', { phone: '0901234567' }).phone, '0901234567');
});

test('supplement sends only entered fields and an explicit address confirmation', () => {
  assert.deepEqual(buildSupplementInput({ phone: ' 0901234567 ', purpose: '',
    submissionDate: '2020-01-01', hasBankForm: true, isAddressConfirmed: false }), { phone: '0901234567' });
  assert.deepEqual(buildSupplementInput({ isAddressConfirmed: true }), { isAddressConfirmed: true });
});

test('supplement does not turn another clarification or rejection into an approval', () => {
  const ask = supplementDecisionState({ decision: 'ASK_CLARIFICATION', missing: [{ name: 'phone' }] });
  assert.equal(ask.status, 'WAITING_STUDENT');
  assert.equal(ask.requirementsCheck, 'INCOMPLETE');
  assert.equal(ask.missingFields.length, 1);
  assert.equal(supplementDecisionState({ decision: 'REJECT' }).status, 'REJECTED');
  assert.equal(supplementDecisionState({ decision: 'REJECTED_POLICY' }).status, 'REJECTED');
  assert.equal(supplementDecisionState({ decision: 'AUTO_APPROVED' }).policiesCheck, 'PASSED');
  assert.equal(supplementDecisionState({ success: true }).status, 'PROCESSING');
  assert.equal(supplementDecisionState({ status: 'ESCALATED', decision: 'ESCALATE_TO_STAFF' }).authorityCheck, 'ESCALATED');
});

test('loan and missing identity supplements preserve explicit zero without filling blanks', () => {
  assert.deepEqual(buildSupplementInput({ orphanStatus: 'Không', loanFormCount: 0,
    loanGrantedCount: '0', lastLoanAmount: '0', idCardDate: '', major: 'Công nghệ thông tin',
    idCardPlace: ' Cơ quan cấp ', existingApprovedCount: 0 }), {
    idCardPlace: 'Cơ quan cấp', major: 'Công nghệ thông tin', orphanStatus: 'Không',
    loanFormCount: '0', loanGrantedCount: '0', lastLoanAmount: '0',
  });
});
