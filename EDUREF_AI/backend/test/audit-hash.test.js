import test from 'node:test';
import assert from 'node:assert/strict';
import AuditLogService from '../services/AuditLogService.js';

test('canonical audit hash is stable across object key order', () => {
  const base = {
    previousHash: 'GENESIS_HASH_EDUREF_2026',
    actorType: 'AI_AGENT',
    action: 'TEST',
    decision: 'AUTO_APPROVED',
    reason: 'deterministic',
    timestamp: new Date('2026-09-22T00:00:00.000Z'),
  };
  const first = AuditLogService.calculateHash({ ...base, inputSnapshot: { a: 1, b: { x: 2, y: 3 } } });
  const second = AuditLogService.calculateHash({ ...base, inputSnapshot: { b: { y: 3, x: 2 }, a: 1 } });
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});
