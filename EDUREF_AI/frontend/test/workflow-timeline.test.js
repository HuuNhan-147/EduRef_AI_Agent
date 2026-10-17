import test from 'node:test';
import assert from 'node:assert/strict';
import { isOpenWorkflow, reconcileWorkflowMessages } from '../src/config/workflowTimeline.js';
const draft = { id: 'd1', revision: 1, formCode: 'GENERAL_CONFIRMATION', state: 'READY', data: { phone: 'private' }, missingFields: [] };

test('only open or waiting-for-supplement workflows stay in the working form', () => {
  assert.equal(isOpenWorkflow(draft), true);
  for (const status of ['APPROVED', 'COMPLETED', 'ESCALATED', 'REJECTED', 'CANCELLED']) assert.equal(isOpenWorkflow({ ...draft, state: 'SUBMITTED', result: { status } }), false);
  assert.equal(isOpenWorkflow({ ...draft, state: 'SUBMITTED', result: { status: 'WAITING_STUDENT' } }), true);
  assert.equal(isOpenWorkflow({ ...draft, state: 'REJECTED' }), false);
});
test('completion replaces its existing chat entry and never follows a later conversation back to the bottom', () => {
  let messages = reconcileWorkflowMessages([{ id: 'welcome', sender: 'agent', text: 'Chào' }], draft);
  const approved = { ...draft, revision: 2, state: 'SUBMITTED', result: { status: 'APPROVED', requestCode: 'XNSV-1', message: 'Lịch hẹn đã lưu' } };
  messages = reconcileWorkflowMessages(messages, approved);
  assert.equal(messages.length, 2); assert.equal(messages[1].workflowOutcome.result.status, 'APPROVED');
  assert.equal(messages[1].workflowOutcome.data, undefined, 'a historical result needs no duplicate personal profile');
  messages = [...messages, { id: 'u2', sender: 'user', text: 'hello' }, { id: 'a2', sender: 'agent', text: 'Chào bạn' }];
  const polled = reconcileWorkflowMessages(messages, structuredClone(approved));
  assert.equal(polled, messages); assert.equal(polled.at(-1).id, 'a2');
});
test('realtime status changes update the same historical result and reopen only a genuine supplement request', () => {
  const submitted = { ...draft, state: 'SUBMITTED', result: { status: 'ESCALATED', requestId: 'r1' } };
  let messages = reconcileWorkflowMessages([], submitted);
  messages.push({ id: 'u2', sender: 'user', text: 'Câu hỏi mới' });
  const waiting = { ...submitted, result: { status: 'WAITING_STUDENT', requestId: 'r1' }, missingFields: [{ key: 'phone' }] };
  messages = reconcileWorkflowMessages(messages, waiting);
  assert.equal(messages.length, 2); assert.equal(messages.at(-1).id, 'u2'); assert.equal(isOpenWorkflow(waiting), true);
  assert.equal(messages[0].workflowOutcome.result.status, 'WAITING_STUDENT');
});
test('a chat tool draft is reconciled in place instead of creating a duplicate result bubble', () => {
  const messages = reconcileWorkflowMessages([{ id: 'ai1', sender: 'agent', text: 'Đã chuẩn bị', toolResult: { draft } }], { ...draft, state: 'REJECTED', resolution: { reason: 'Không đủ điều kiện' } });
  assert.equal(messages.length, 1); assert.equal(messages[0].id, 'ai1'); assert.equal(messages[0].workflowOutcome.state, 'REJECTED');
});
test('a first completion is shown once after intervening chat, then stays behind the next conversation', () => {
  let messages = reconcileWorkflowMessages([], draft);
  messages.push({ id: 'intervening', sender: 'agent', text: 'Giải thích thủ tục' });
  const finished = { ...draft, state: 'SUBMITTED', result: { status: 'APPROVED', requestCode: 'XNSV-1' } };
  messages = reconcileWorkflowMessages(messages, finished);
  assert.equal(messages.at(-1).workflowOutcome.result.status, 'APPROVED');
  messages.push({ id: 'new-chat', sender: 'user', text: 'hello' });
  assert.equal(reconcileWorkflowMessages(messages, finished).at(-1).id, 'new-chat');
});
test('a realtime completion during a streamed answer preserves the in-progress response at the end', () => {
  let messages = reconcileWorkflowMessages([], draft);
  const partial = { id: 'streaming', sender: 'agent', text: 'Thông tin đang trả lời', isStreaming: true };
  messages.push(partial);
  const completed = { ...draft, state: 'SUBMITTED', result: { status: 'APPROVED' } };
  messages = reconcileWorkflowMessages(messages, completed);
  assert.equal(messages.at(-1), partial); assert.equal(messages.at(-2).workflowOutcome.result.status, 'APPROVED');
  assert.equal(messages.filter(message => message.workflowOutcome).length, 1);
});
