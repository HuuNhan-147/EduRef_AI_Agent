import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTraceTracker, visibleTraceStep } from '../src/lib/agentTrace.js';

function fixture() {
  let snapshot;
  const tracker = createTraceTracker((value) => { snapshot = value; });
  return { tracker, get: (turn = 'turn-1') => snapshot[turn] };
}

const log = (id, step, sessionId = 'session-1') => ({ id, step, sessionId, text: 'PRIVATE_RAW_TEXT', details: { secret: 'PRIVATE_ARGUMENT' } });

test('trace maps observable step codes without exposing model text, arguments or unknown steps', () => {
  const step = visibleTraceStep(log('one', 'REASONING'));
  assert.deepEqual(step, { id: 'one', step: 'REASONING', label: 'Đang phân tích yêu cầu và dữ kiện' });
  assert.doesNotMatch(JSON.stringify(step), /PRIVATE/);
  assert.equal(visibleTraceStep(log('two', 'UNKNOWN')), null);
});

test('only exact-session logs after a START boundary are associated with the active turn', () => {
  const { tracker, get } = fixture();
  tracker.start('turn-1', 'session-1');
  tracker.log(log('old', 'REASONING'));
  tracker.log(log('other', 'START', 'other-session'));
  tracker.log(log('global', 'START', null));
  assert.equal(get().steps.length, 0);
  tracker.log(log('start', 'START'));
  tracker.log(log('reason', 'REASONING'));
  tracker.log(log('reason', 'REASONING'));
  tracker.log(log('start', 'START'));
  assert.equal(get().steps.length, 2);
  assert.equal(get().limited, false);
});

test('fast final response and duration remain available; later logs cannot mutate completed trace', () => {
  const { tracker, get } = fixture();
  tracker.start('turn-1', 'session-1');
  tracker.log(log('start', 'START'));
  tracker.end({ sessionId: 'other-session', totalDuration: 900 });
  assert.equal(get().status, 'running');
  tracker.end({ sessionId: 'session-1', totalDuration: 321 });
  tracker.log(log('late', 'TOOL_OBSERVATION'));
  assert.equal(get().status, 'completed');
  assert.equal(get().durationMs, 321);
  assert.equal(get().steps.length, 1);
  tracker.start('turn-2', 'session-1');
  tracker.log(log('start-2', 'START'));
  assert.equal(get('turn-2').steps.length, 1);
  assert.equal(get().durationMs, 321);
});

test('local stop is not a rollback or confirmed server stop, and late same-session events are excluded', () => {
  const { tracker, get } = fixture();
  tracker.start('turn-1', 'session-1');
  tracker.log(log('start', 'START'));
  tracker.requestStop();
  tracker.settle({ sender: 'agent', isStreaming: false });
  assert.equal(get().status, 'stopRequested');
  tracker.start('turn-2', 'session-1');
  tracker.log(log('late-start', 'START'));
  tracker.end({ sessionId: 'session-1', isAborted: true });
  assert.equal(get('turn-2').status, 'running');
  assert.equal(get('turn-2').steps.length, 0);
  tracker.settle({ sender: 'agent', isStreaming: false });
  assert.equal(get('turn-2').status, 'limited');
});

test('overlapping START boundaries are flagged instead of merging two runs', () => {
  const { tracker, get } = fixture();
  tracker.start('turn-1', 'session-1');
  tracker.log(log('first', 'START'));
  tracker.log(log('second', 'START'));
  assert.equal(get().limited, true);
  assert.equal(get().steps.length, 0);
});

test('error and disconnect states do not show completed or fabricated duration', () => {
  const { tracker, get } = fixture();
  tracker.start('turn-1', 'session-1');
  tracker.error({ sessionId: 'session-1', error: 'secret backend error' });
  assert.equal(get().status, 'failed');
  assert.equal(get().durationMs, null);
  tracker.start('turn-2', 'session-1');
  tracker.disconnect();
  assert.equal(get('turn-2').status, 'disconnected');
  assert.equal(get('turn-2').durationMs, null);
});

test('HTTP fallback can show completion without claiming unreceived tool steps or measured duration', () => {
  const { tracker, get } = fixture();
  tracker.start('turn-1', 'session-1');
  tracker.settle({ sender: 'agent', isStreaming: false });
  assert.equal(get().status, 'completed');
  assert.equal(get().steps.length, 0);
  assert.equal(get().durationMs, null);
});

test('account/session changes close active traces and ignore old-session events', () => {
  const { tracker, get } = fixture();
  tracker.start('turn-1', 'session-1');
  tracker.changeSession('session-2');
  tracker.log(log('late', 'START'));
  assert.equal(get().status, 'interrupted');
  tracker.start('turn-2', 'session-2');
  tracker.log(log('other', 'REASONING', 'session-1'));
  assert.equal(get('turn-2').steps.length, 0);
});

test('trace retention and per-turn step lists are bounded', () => {
  const { tracker, get } = fixture();
  tracker.start('turn-1', 'session-1');
  tracker.log(log('start', 'START'));
  for (let index = 0; index < 100; index++) tracker.log(log('step-' + index, 'TOOL_OBSERVATION'));
  assert.equal(get().steps.length, 30);
  tracker.end({ sessionId: 'session-1', totalDuration: -1 });
  assert.equal(get().durationMs, null);
  let history;
  const limited = createTraceTracker((value) => { history = value; }, 3);
  for (let index = 0; index < 8; index++) {
    limited.start('turn-' + index, 'session-1');
    limited.end({ sessionId: 'session-1', totalDuration: 20 });
  }
  assert.deepEqual(Object.keys(history), ['turn-5', 'turn-6', 'turn-7']);
});
