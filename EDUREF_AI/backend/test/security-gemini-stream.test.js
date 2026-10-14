// Regression cho timeout của stream Gemini. axios.post được stub bằng Readable giả nên
// KHÔNG gọi mạng và KHÔNG chạm DB. Ngưỡng timeout thu nhỏ qua testSupport/geminiFastTimeouts.js.
import '../testSupport/securityTestEnv.js';
import { FAST_MAX_MS } from '../testSupport/geminiFastTimeouts.js';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import axios from 'axios';
import { GeminiStreamClient } from '../modules/ai-agent/llm/GeminiStreamClient.js';

const realPost = axios.post;
const realWarn = console.warn;
console.warn = () => {};
after(() => {
  axios.post = realPost;
  console.warn = realWarn;
});

const sse = (text) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;
const client = () => new GeminiStreamClient('test-key', 'test-model');

let lastStream = null;
function stubStream(build) {
  axios.post = async () => {
    lastStream = new Readable({ read() {} });
    build(lastStream);
    return { data: lastStream };
  };
}

test('stream im lặng sau chunk đầu -> ESTREAMTIMEOUT nhanh, stream bị huỷ, lỗi an toàn để hiển thị', async () => {
  stubStream((s) => { s.push(sse('Xin chào')); });
  const started = Date.now();
  const error = await client().streamGenerateContent([], [], '').catch((e) => e);
  assert.equal(error.code, 'ESTREAMTIMEOUT');
  assert.equal(error.expose, true);
  assert.ok(Date.now() - started < 1200, `mất ${Date.now() - started}ms`);
  assert.equal(lastStream.destroyed, true);
});

test('stream không gửi gì cả -> vẫn timeout (không treo vĩnh viễn)', async () => {
  stubStream(() => {});
  const error = await client().streamGenerateContent([], [], '').catch((e) => e);
  assert.equal(error.code, 'ESTREAMTIMEOUT');
});

test('stream nhỏ giọt mãi không dừng -> bị chặn bởi trần tổng thời lượng', async () => {
  let interval;
  stubStream((s) => { interval = setInterval(() => s.push(sse('.')), 100); });
  const started = Date.now();
  const error = await client().streamGenerateContent([], [], '').catch((e) => e);
  clearInterval(interval);
  const elapsed = Date.now() - started;
  assert.equal(error.code, 'ESTREAMTIMEOUT');
  assert.ok(elapsed >= FAST_MAX_MS - 100 && elapsed < FAST_MAX_MS + 1000, `mất ${elapsed}ms`);
});

test('stream bình thường -> trả đủ văn bản, không bị timer làm hỏng', async () => {
  stubStream((s) => { s.push(sse('Xin ')); s.push(sse('chào')); s.push(null); });
  const result = await client().streamGenerateContent([], [], '');
  assert.equal(result.text, 'Xin chào');
  assert.equal(result.isAborted, false);
});

test('stream bị đóng giữa chừng không có end -> ESTREAMCLOSED (trước đây treo vĩnh viễn)', async () => {
  stubStream((s) => { s.push(sse('a')); setTimeout(() => s.destroy(), 20); });
  const error = await client().streamGenerateContent([], [], '').catch((e) => e);
  assert.equal(error.code, 'ESTREAMCLOSED');
  assert.equal(error.expose, true);
});

test('người dùng bấm Dừng giữa chừng -> isAborted, giữ phần text đã nhận, timer không bắn lỗi muộn', async () => {
  stubStream((s) => { s.push(sse('abc')); });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 50);
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const result = await client().streamGenerateContent([], [], '', null, controller.signal);
    assert.equal(result.isAborted, true);
    assert.equal(result.text, 'abc');
    await new Promise((resolve) => setTimeout(resolve, 500)); // vượt ngưỡng idle 300ms
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});
