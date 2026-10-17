import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { chatSuggestions } from '../src/config/chatSuggestions.js';
const reply = (text, extra = {}) => ({ id: 'a1', sender: 'agent', text, ...extra });
const taskReply = draft => reply('Kết quả', { workflowOutcome: { id: 'd1', revision: 2, formCode: 'BANK_LOAN', ...draft } });

test('welcome offers at most three supported procedures without unrelated services', () => {
  const values = chatSuggestions(reply('Chào bạn', { id: 'welcome' }));
  assert.equal(values.length, 3); assert.ok(values.every(v => v.kind === 'SEND' && v.prompt));
  assert.ok(!values.some(v => /hoãn thi|tốt nghiệp|hợp đồng/i.test(v.label)));
});
test('loan follow-ups are grounded in actual missing fields and do not fabricate loan answers', () => {
  const values = chatSuggestions(taskReply({ state: 'NEEDS_INPUT', missingFields: [{ key: 'loanGrantedCount', label: 'Số lần đã được giải ngân' }] }));
  assert.equal(values.length, 2); assert.equal(values[0].kind, 'FOCUS_WORKFLOW');
  assert.match(values[1].prompt, /Số lần đã được giải ngân/); assert.doesNotMatch(values[1].prompt, /mồ côi|CCCD|nhập 0/);
});
test('ready drafts keep confirmation on the form and never offer a text shortcut to submit', () => {
  const values = chatSuggestions(taskReply({ state: 'READY' }));
  assert.ok(values.every(v => v.kind !== 'SUBMIT' && !/tôi xác nhận|đồng ý nộp/i.test(v.prompt || '')));
});
test('denial suggests the backend-recommended new procedure with the right task and revision', () => {
  const values = chatSuggestions(taskReply({ state: 'REJECTED', targetForm: 'COURSE_DEBT' }));
  assert.equal(values[0].kind, 'START_RECOMMENDED'); assert.equal(values[0].draftId, 'd1'); assert.equal(values[0].revision, 2);
  assert.match(values[0].label, /nợ môn/); assert.ok(!values.some(v => /nộp lại|xác nhận/i.test(v.prompt || '')));
});
test('approved requests offer their actual request context instead of collecting the previous draft again', () => {
  const values = chatSuggestions(taskReply({ state: 'SUBMITTED', result: { status: 'APPROVED', requestCode: 'XNSV-1' } }));
  assert.equal(values[0].kind, 'VIEW_PETITIONS'); assert.match(values[1].prompt, /XNSV-1/);
  assert.ok(!values.some(v => ['FOCUS_WORKFLOW', 'START_RECOMMENDED'].includes(v.kind)));
});
test('unrelated, user and unfinished streaming messages do not get invented suggestions', () => {
  assert.deepEqual(chatSuggestions(reply('Trời đang mưa ở Hà Nội')), []);
  assert.deepEqual(chatSuggestions({ sender: 'user', text: 'Vay vốn' }), []);
  assert.deepEqual(chatSuggestions(reply('Vay vốn', { isStreaming: true })), []);
});
test('a catalog answer with several procedures offers explicit choices instead of assuming the first matched form', () => {
  const values = chatSuggestions(reply('Có thể làm giấy vay vốn, nghĩa vụ quân sự, thuế TNCN, nợ môn và xác nhận xe buýt.'));
  assert.equal(values.length, 3); assert.ok(values.some(v => v.id === 'choose-bus'));
  assert.ok(!values.some(v => v.id === 'start-related'));
});
test('errors retry exactly the prior user request without unrelated procedure buttons', () => {
  const values = chatSuggestions(reply('Dịch vụ AI hiện chưa sẵn sàng', { decision: 'ERROR' }), { lastUserText: 'hello' });
  assert.equal(values[0].prompt, 'hello'); assert.equal(values.length, 2);
});
test('a missing-provider-key error suggests an explicit switch to automatic routing', () => {
  const values = chatSuggestions(reply('OPENAI_API_KEY chưa được cấu hình', { decision: 'ERROR' }), { lastUserText: 'Xin giấy vay vốn' });
  assert.equal(values[0].kind, 'RETRY_AUTO'); assert.equal(values[0].prompt, 'Xin giấy vay vốn');
});

const source = fs.readFileSync(new URL('../src/pages/StudentWorkspacePage.jsx', import.meta.url), 'utf8');
let handler;
traverseModule.default(parse(source, { sourceType: 'module', plugins: ['jsx'] }), {
  VariableDeclarator(path) { if (path.node.id.name === 'handleSuggestion') handler = source.slice(path.node.init.start, path.node.init.end); },
});
test('clicking a text suggestion sends it immediately through the real workspace handler', async () => {
  const sent = []; const env = vm.createContext({ isProcessing: false, workflow: { busy: false }, handleSendMessage: text => sent.push(text) });
  await vm.runInContext(`(${handler})`, env)({ kind: 'SEND', prompt: 'Tôi cần giấy xác nhận để xin visa.' });
  assert.deepEqual(sent, ['Tôi cần giấy xác nhận để xin visa.']);
});
test('a recommendation click acts on its own task ID instead of the currently selected draft', async () => {
  let acted; let messages = [];
  const env = vm.createContext({ isProcessing: false, crypto: { randomUUID: () => 'click1' },
    setMessages: fn => { messages = fn(messages); }, workflow: { busy: false, actOn: async (...args) => { acted = args; } } });
  await vm.runInContext(`(${handler})`, env)({ kind: 'START_RECOMMENDED', draftId: 'closed-task', revision: 7, label: 'Làm giấy xác nhận nợ môn' });
  assert.equal(acted[0].id, 'closed-task'); assert.equal(acted[0].revision, 7); assert.equal(acted[1], 'START_RECOMMENDED');
  assert.equal(messages.at(-1).sender, 'user');
});
test('automatic-model retry uses the new model immediately instead of waiting for React state to update', async () => {
  const calls = []; let selected;
  const env = vm.createContext({ isProcessing: false, workflow: { busy: false },
    setSelectedModel: value => { selected = value; }, handleSendMessage: (...args) => calls.push(args) });
  await vm.runInContext(`(${handler})`, env)({ kind: 'RETRY_AUTO', prompt: 'hello' });
  assert.equal(selected, 'auto'); assert.equal(calls[0][0], 'hello'); assert.equal(calls[0][1].model, 'auto');
});
