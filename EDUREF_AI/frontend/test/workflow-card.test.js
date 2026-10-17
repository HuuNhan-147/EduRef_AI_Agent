import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildConfirmationInput } from '../src/config/confirmationForms.js';

const bundle = buildSync({ entryPoints: [new URL('../src/components/agent/PetitionWorkflowCard.jsx', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom'] }).outputFiles[0].text;
const exported = { exports: {} };
vm.runInNewContext(bundle, { module: exported, exports: exported.exports, require: createRequire(import.meta.url), console });
const Card = exported.exports.default;
const field = { key: 'phone', label: 'Số điện thoại', type: 'tel' };
const render = (draft, extra = {}) => renderToStaticMarkup(React.createElement(Card, { workflow: {
  draft: { id: 'draft-1', revision: 1, formName: 'Giấy xác nhận', data: { fullName: 'Sinh viên', studentCode: '2380600001', phone: '0901234568' }, fields: [field], missingFields: [], ...draft },
  busy: false, error: '', action() {}, ...extra,
} }));
test('a missing fact renders only the required control and no submit confirmation', () => {
  const html = render({ state: 'NEEDS_INPUT', missingFields: [field] });
  assert.match(html, /type="tel"/); assert.doesNotMatch(html, /CCCD|Tình trạng mồ côi|Xác nhận và nộp hồ sơ/);
});
test('a ready military draft displays the address commitment and one final submit action', () => {
  const html = render({ state: 'READY', addressConsentRequired: true });
  assert.match(html, /cam kết địa chỉ/); assert.equal((html.match(/Xác nhận địa chỉ và nộp hồ sơ/g) || []).length, 1);
  assert.doesNotMatch(html, /type="checkbox"/);
});
test('a submitted workflow shows its persisted request without another submit action', () => {
  const html = render({ state: 'SUBMITTED', result: { status: 'ESCALATED', requestCode: 'XNSV-TEST', message: 'Đang thẩm định' } });
  assert.match(html, /XNSV-TEST/); assert.match(html, /Đang chờ cán bộ/); assert.doesNotMatch(html, /Xác nhận và nộp hồ sơ/);
});
test('empty inputs do not acquire sample personal data or a fabricated general purpose', () => {
  const value = buildConfirmationInput('GENERAL_CONFIRMATION', {});
  for (const key of ['phone', 'permanentAddress', 'idCard', 'pickupCampus', 'debtCourses']) assert.equal(value[key], undefined);
  assert.equal(value.purpose, '');
});
test('a policy denial closes the task with a clear reason and next action, without NVQS consent or editable inputs', () => {
  const html = render({ state: 'REJECTED', addressConsentRequired: true, targetForm: 'COURSE_DEBT',
    resolution: { reason: 'Khóa cũ còn nợ học phần; không đủ điều kiện cấp giấy NVQS.', nextStep: 'Chọn hồ sơ xác nhận nợ môn.' } });
  assert.match(html, /Đã từ chối · Quy trình này đã kết thúc/); assert.match(html, /Lý do từ chối/);
  assert.match(html, /Khóa cũ còn nợ/); assert.match(html, /Hướng xử lý tiếp theo/);
  assert.match(html, /Bắt đầu hồ sơ xác nhận nợ môn/);
  assert.doesNotMatch(html, /cam kết địa chỉ|sẵn sàng|<input|Xem \/ chỉnh sửa|Xác nhận địa chỉ và nộp/);
});
test('a blocked form without missing fields must not claim it is ready to submit', () => {
  const html = render({ state: 'BLOCKED', notice: 'Cần đối chiếu điều kiện' });
  assert.match(html, /Chưa thể tiếp tục/); assert.doesNotMatch(html, /Hồ sơ đã sẵn sàng/);
});
test('a rejected submitted request explicitly ends the task and explains how to seek clarification', () => {
  const html = render({ state: 'SUBMITTED', result: { status: 'REJECTED', requestCode: 'XNSV-R', message: 'Học vụ không đủ điều kiện' } });
  assert.match(html, /Học vụ không đủ điều kiện/); assert.match(html, /Quy trình này đã kết thúc/);
  assert.match(html, /liên hệ đơn vị tiếp nhận/); assert.doesNotMatch(html, /<input|Xác nhận và nộp/);
});
