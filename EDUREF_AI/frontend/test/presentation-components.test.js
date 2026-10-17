import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
async function component(file) {
  const result = await build({ entryPoints: [new URL(file, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom', 'axios'],
    define: { 'import.meta.env': '{}' }, plugins: [{ name: 'no-network-api', setup(build) {
      build.onLoad({ filter: /[\\/]services[\\/]api\.js$/ }, () => ({ contents: 'export default {};', loader: 'js' }));
    } }] });
  const code = result.outputFiles[0].text;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: createRequire(import.meta.url), console });
  return module.exports.default;
}
const Outcome = await component('../src/components/agent/WorkflowOutcome.jsx');
const Feedback = await component('../src/components/forms/EscalationFeedbackForm.jsx');
test('historical outcomes show the decision and appointment without a live form or stale submit controls', () => {
  const html = renderToStaticMarkup(React.createElement(Outcome, { outcome: { state: 'SUBMITTED',
    result: { status: 'APPROVED', requestCode: 'XNSV-1', requestId: 'r1', message: '**Lịch nhận:** Thứ Hai\n**Nơi nhận:** Cơ sở Sài Gòn' } } }));
  assert.match(html, /XNSV-1/); assert.match(html, /<strong[^>]*>Lịch nhận:/);
  assert.match(html, /Xem trong Đơn của tôi/); assert.doesNotMatch(html, /<input|nộp hồ sơ|cam kết địa chỉ|\*\*/);
});
test('staff dropdowns display Vietnamese labels while preserving the backend decision values on submission', () => {
  const html = renderToStaticMarkup(React.createElement(Feedback, { requestId: 'r1' }));
  assert.match(html, /value="ESCALATE_TO_STAFF"/); assert.match(html, /value="OUTSIDE_POLICY"/);
  const visible = html.replace(/<[^>]*>/g, '');
  assert.doesNotMatch(visible, /ESCALATE_TO_STAFF|OUTSIDE_POLICY|UNKNOWN_FACT|AUTO_APPROVED/);
  assert.match(visible, /Chuyển cán bộ thẩm định/);
});
