import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_ACCOUNT_TARGETS, isDemoRoleSwitchEnabled } from '../controllers/authController.js';

test('demo role switch is disabled by default in production', () => {
  assert.equal(isDemoRoleSwitchEnabled({ NODE_ENV: 'production' }), false);
  assert.equal(isDemoRoleSwitchEnabled({ NODE_ENV: 'production', ALLOW_DEMO_ROLE_SWITCH: 'true' }), true);
  assert.equal(isDemoRoleSwitchEnabled({ NODE_ENV: 'development', ALLOW_DEMO_ROLE_SWITCH: 'false' }), false);
});

test('demo role switch exposes only fixed allowlisted account keys', () => {
  assert.deepEqual(Object.keys(DEMO_ACCOUNT_TARGETS), [
    'STUDENT_ACTIVE',
    'STUDENT_DROPPED',
    'STUDENT_DEBT',
    'STAFF_DAOTAO',
    'DEAN_DAOTAO',
  ]);
});
