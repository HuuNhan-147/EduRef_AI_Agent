import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTerminalLogs } from '../src/config/terminalLogs.js';

test('late HTTP history preserves newer socket steps, removes duplicates and orders execution time', () => {
  const live = [{ id: 'log_300_a', step: 'DONE' }, { id: 'log_200_b', step: 'POLICY' }];
  const history = [{ id: 'log_100_c', step: 'START' }, { id: 'log_200_b', step: 'POLICY' }];
  assert.deepEqual(mergeTerminalLogs(live, history).map(e => e.step), ['START', 'POLICY', 'DONE']);
});
test('reconnect merges remain bounded and idempotent', () => {
  const history = Array.from({ length: 350 }, (_, i) => ({ id: `log_${i + 1}_a` }));
  const merged = mergeTerminalLogs([], history);
  assert.equal(merged.length, 300); assert.equal(merged[0].id, 'log_51_a');
  assert.deepEqual(mergeTerminalLogs(merged, history), merged);
});
