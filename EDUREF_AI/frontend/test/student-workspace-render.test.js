import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { reconcileWorkflowMessages } from '../src/config/workflowTimeline.js';

// Render the real workspace with deterministic transport state. No DOM injection,
// network calls or backend records; this checks how its actual children fit together.
const bundled = await build({ entryPoints: [new URL('../src/pages/StudentWorkspacePage.jsx', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom'],
  plugins: [{ name: 'offline-workspace', setup(build) {
    build.onLoad({ filter: /[\\/]services[\\/]api\.js$/ }, () => ({ loader: 'js', contents: `export default {};
      export const DEMO_ACCOUNTS = { STUDENT_ACTIVE: { code: '2380600001', name: 'Sinh viên kiểm thử', type: 'STUDENT', role: 'STUDENT', tag: 'Sinh viên' } };` }));
    build.onLoad({ filter: /[\\/]services[\\/]socket\.js$/ }, () => ({ loader: 'js', contents: 'export default () => ({ connected: false });' }));
    build.onLoad({ filter: /[\\/]services[\\/]usePetitionWorkflow\.js$/ }, () => ({ loader: 'js', contents: 'export default () => globalThis.__qaWorkflow;' }));
  } }] });
function render(draft, messages) {
  const module = { exports: {} };
  const context = { module, exports: module.exports, require: createRequire(import.meta.url), console,
    __qaWorkflow: { draft, busy: false, error: '', action() {}, accept() {}, prepare() {} },
    sessionStorage: { getItem: key => key.startsWith('eduref_messages_') ? JSON.stringify(messages) : null },
    localStorage: { getItem: () => null } };
  vm.runInNewContext(bundled.outputFiles[0].text, context);
  return renderToStaticMarkup(React.createElement(module.exports.default, { currentAccountKey: 'STUDENT_ACTIVE' }));
}
const draft = { id: 'd1', revision: 1, formCode: 'GENERAL_CONFIRMATION', formName: 'Giấy xác nhận', state: 'READY',
  data: { fullName: 'Sinh viên kiểm thử', studentCode: '2380600001' }, fieldSources: {}, fields: [], missingFields: [] };
test('the real workspace keeps a completed petition only in history while the next chat remains clear', () => {
  const approved = { ...draft, state: 'SUBMITTED', result: { status: 'APPROVED', requestCode: 'XNSV-QA', requestId: 'r1', message: '**Lịch nhận:** Thứ Hai' } };
  const messages = [...reconcileWorkflowMessages([], approved), { id: 'u2', sender: 'user', text: 'hello' }, { id: 'a2', sender: 'agent', text: 'Chào bạn, tôi có thể hỗ trợ gì tiếp theo?' }];
  const html = render(approved, messages);
  assert.equal((html.match(/aria-label="Kết quả công việc trong lịch sử"/g) || []).length, 1);
  assert.doesNotMatch(html, /aria-label="Công việc đang xử lý"|Xác nhận và nộp hồ sơ/);
  assert.ok(html.indexOf('Lịch nhận:') < html.indexOf('hello')); assert.match(html, /Chào bạn, tôi có thể hỗ trợ gì tiếp theo/);
  assert.doesNotMatch(html, /\*\*Lịch nhận|>APPROVED</);
});
test('the real workspace still shows the final confirmation form for a genuinely open petition', () => {
  const html = render(draft, reconcileWorkflowMessages([], draft));
  assert.match(html, /aria-label="Công việc đang xử lý"/); assert.match(html, /Xác nhận và nộp hồ sơ/);
  assert.doesNotMatch(html, /aria-label="Kết quả công việc trong lịch sử"/);
  assert.match(html, /aria-label="Gợi ý theo câu trả lời"/);
});
