import test from 'node:test';
import assert from 'node:assert/strict';
import { describeToolOutcome } from '../modules/ai-agent/core/toolOutcome.js';

test('tool outcome prioritizes explicit business decisions', () => {
  assert.equal(describeToolOutcome({ decision: 'AUTO_APPROVED', success: true }), 'AUTO_APPROVED');
});

test('tool outcome does not label successful requirement or authority checks as failed', () => {
  assert.equal(describeToolOutcome({ complete: true, missing: [] }), 'COMPLETE');
  assert.equal(describeToolOutcome({ allowed: true, action: 'AUTO_APPROVE' }), 'ALLOWED');
  assert.equal(describeToolOutcome({ found: true }), 'FOUND');
});

test('tool outcome distinguishes expected negative states from execution failure', () => {
  assert.equal(describeToolOutcome({ complete: false }), 'INCOMPLETE');
  assert.equal(describeToolOutcome({ allowed: false }), 'NOT_ALLOWED');
  assert.equal(describeToolOutcome({ success: false }), 'FAILED');
});
