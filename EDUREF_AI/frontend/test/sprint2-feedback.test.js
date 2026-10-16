import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

function callbacks(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8'); const functions = new Map();
  traverseModule.default(parse(source, { sourceType: 'module', plugins: ['jsx'] }), { VariableDeclarator(path) {
    if (path.node.init?.type === 'ArrowFunctionExpression') functions.set(path.node.id.name, source.slice(path.node.init.start, path.node.init.end));
  } }); return functions;
}
const page = callbacks('../src/pages/Sprint2Page.jsx');
const feedback = callbacks('../src/components/forms/EscalationFeedbackForm.jsx');

test('unmeasured rates render as Chưa đo; an observed zero remains zero', () => {
  const percent = vm.runInNewContext(`(${page.get('percent')})`);
  assert.equal(percent(null), 'Chưa đo'); assert.equal(percent(undefined), 'Chưa đo'); assert.equal(percent(0), '0%');
});
test('failed feedback does not claim success or erase the reviewer evidence', async () => {
  let error; let saved = false; let busy;
  const context = vm.createContext({ requestId: 'request-1', decision: 'AUTO_APPROVED', classification: 'ROUTINE',
    reason: 'Original note', evidenceRef: 'Original source', setBusy(value) { busy = value; },
    setError(value) { error = value; }, setSaved(value) { saved = value; },
    api: { post: async () => ({ data: { success: false, message: 'Đã có feedback gốc' } }) },
  });
  await vm.runInContext(`(${feedback.get('submit')})`, context)({ preventDefault() {} });
  assert.equal(saved, false); assert.equal(busy, false); assert.equal(error, 'Đã có feedback gốc');
  assert.equal(context.reason, 'Original note'); assert.equal(context.evidenceRef, 'Original source');
});
test('governance mutation failure preserves the previous dashboard and does not refresh it as success', async () => {
  let error; let busy; let notice;
  const context = vm.createContext({ setBusy(value) { busy = value; }, setError(value) { error = value; }, setNotice(value) { notice = value; },
    setData() { throw new Error('Must retain prior view'); }, api: { get() { throw new Error('Must not refresh after failed mutation'); } },
  });
  const result = await vm.runInContext(`(${page.get('execute')})`, context)(async () => ({ data: { success: false, message: 'Báo cáo đã cũ' } }), 'Activated');
  assert.equal(result, null); assert.equal(error, 'Báo cáo đã cũ'); assert.equal(busy, false); assert.equal(notice, '');
});
