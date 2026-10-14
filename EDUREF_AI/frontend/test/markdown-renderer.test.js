import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';

// Exercise the actual JSX renderer without starting the app, sockets or backend.
const require = createRequire(import.meta.url);
const source = await readFile(new URL('../src/components/common/MarkdownRenderer.jsx', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'MarkdownRenderer.jsx', {
  loader: 'jsx', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
});
const reactUrl = pathToFileURL(require.resolve('react')).href;
const moduleSource = `import React from ${JSON.stringify(reactUrl)};\n${code}`;
const { default: MarkdownRenderer } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
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
