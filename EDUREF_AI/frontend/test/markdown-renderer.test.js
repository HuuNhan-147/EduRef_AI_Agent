import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { buildSync } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Exercise the actual JSX renderer without starting the app, sockets or backend.
const require = createRequire(import.meta.url);
const bundle = buildSync({ entryPoints: [new URL('../src/components/common/MarkdownRenderer.jsx', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom'] }).outputFiles[0].text;
const exported = { exports: {} };
vm.runInNewContext(bundle, { module: exported, exports: exported.exports, require, console });
const MarkdownRenderer = exported.exports.default;
const render = (content, props = {}) => renderToStaticMarkup(React.createElement(MarkdownRenderer, { content, ...props }));

test('approval appointment renders bold labels and each detail on its own line', () => {
  const html = render('Đơn [XNSV-544700] đã được phê duyệt.\n\n🏢 **Lịch hẹn nhận bản cứng:**\n- **Địa điểm:** Phòng CTSV (A-01.01)\n- **Thời gian dự kiến nhận:** Buổi chiều\n- **Hotline hỗ trợ:** (028) 3512 0785', { compact: true, inheritColor: true });
  assert.match(html, /<strong[^>]*>Lịch hẹn nhận bản cứng:<\/strong>/);
  assert.match(html, /<strong[^>]*>Địa điểm:<\/strong>/);
  assert.match(html, /<strong[^>]*>Thời gian dự kiến nhận:<\/strong>/);
  assert.ok(!html.includes('**'));
  assert.match(html, /text-xs/);
  assert.match(html, /text-inherit/);
});

test('missing requirements keep numbered rows, bold field names and paragraph breaks', () => {
  const html = render('⚠️ **Hồ sơ còn thiếu thông tin bắt buộc:**\n\n1. **Số điện thoại**: Vui lòng cung cấp số điện thoại.\n2. **Cơ sở nhận giấy**: Chọn Sai Gon Campus hoặc Thu Duc Campus.\n3. **Mục đích sử dụng**: Nêu mục đích.\n\n👉 Bạn vui lòng bổ sung đầy đủ.', { compact: true, inheritColor: true });
  assert.match(html, /<strong[^>]*>Số điện thoại<\/strong>/);
  assert.match(html, /tabular-nums">1\.<\/span>/);
  assert.match(html, /tabular-nums">3\.<\/span>/);
  assert.match(html, /<p>👉 Bạn vui lòng bổ sung đầy đủ\.<\/p>/);
  assert.ok(!html.includes('**'));
});

test('Markdown remains escaped text for HTML and unsafe link schemes', () => {
  const html = render('<img src=x onerror=alert(1)>\n[x](javascript:alert(1))\n[Hướng dẫn](https://example.com/guide)');
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('href="javascript:'));
  assert.match(html, /&lt;img/);
  assert.match(html, /href="https:\/\/example.com\/guide"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
test('escaped line breaks and compact numbered requirements render without exposed markdown markers', () => {
  const html = render('⚠️ **Hồ sơ BANK_LOAN còn thiếu:**\\n1. **Tình trạng mồ côi**: Cần cung cấp. 2. **Số lần vay**: Có thể nhập 0.\\nPhân loại: UNKNOWN_FACT');
  assert.doesNotMatch(html, /\\n|\*\*|BANK_LOAN|UNKNOWN_FACT/);
  assert.match(html, /<strong[^>]*>Tình trạng mồ côi<\/strong>/);
  assert.match(html, /tabular-nums">2\.<\/span>/);
  assert.match(html, /Thiếu thông tin cần xác minh/);
});
test('headings, tables, code blocks, emphasis and strike-through render as readable elements', () => {
  const html = render('# Thông tin\n| Mục | Giá trị |\n| --- | --- |\n| Trạng thái | **APPROVED** |\n\n```text\nNội dung <script>\n```\n__In đậm__ và *nhấn mạnh* và ~~đã bỏ~~');
  assert.match(html, /<h3/); assert.match(html, /<table/); assert.match(html, /<th/); assert.match(html, /<pre/);
  assert.match(html, /&lt;script&gt;/); assert.match(html, /<em>nhấn mạnh<\/em>/); assert.match(html, /<del>đã bỏ<\/del>/);
  assert.doesNotMatch(html, /\*\*|```|~~|__In/);
});
test('links keep one safe anchor and translate backend labels without breaking their destinations', () => {
  const html = render('[**COURSE_DEBT**](https://example.com/COURSE_DEBT)\nhttps://example.com/guide.');
  assert.equal((html.match(/<a /g) || []).length, 2);
  assert.match(html, /href="https:\/\/example.com\/COURSE_DEBT"/); assert.match(html, /Xác nhận sinh viên nợ môn/);
  assert.doesNotMatch(html, /\*\*/);
});
test('incomplete streaming formatting stays readable and inline rendering contains no block elements', () => {
  const html = render('**Mục đích sử dụng chưa nhập', { inline: true });
  assert.doesNotMatch(html, /\*\*|<p>|<div/); assert.match(html, /Mục đích sử dụng/);
});
test('underscore emphasis around backend codes keeps both the correct Vietnamese name and formatting', () => {
  const html = render('__COURSE_DEBT__ · __APPROVED__');
  assert.match(html, /<strong[^>]*>Xác nhận sinh viên nợ môn<\/strong>/);
  assert.match(html, /<strong[^>]*>Đã phê duyệt<\/strong>/);
  assert.doesNotMatch(html, /__|COURSE_DEBT|APPROVED/);
});
test('compact staff messages remove block markdown syntax without nesting block elements in a paragraph', () => {
  const html = render('# Phân loại\n> **UNKNOWN_FACT**\n| Trường | Giá trị |\n| --- | --- |\n| Loại | COURSE_DEBT |', { inline: true });
  assert.doesNotMatch(html, /<p>|<div|<table|---|\| Trường|# Phân loại|UNKNOWN_FACT|COURSE_DEBT|\*\*/);
  assert.match(html, /Thiếu thông tin cần xác minh/); assert.match(html, /Xác nhận sinh viên nợ môn/);
});
