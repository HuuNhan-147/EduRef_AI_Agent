// backend/testSupport/geminiFastTimeouts.js
// Import TRƯỚC GeminiStreamClient: ngưỡng timeout được đọc một lần lúc nạp module.
process.env.GEMINI_STREAM_IDLE_TIMEOUT_MS = '300';
process.env.GEMINI_STREAM_MAX_DURATION_MS = '1500';

export const FAST_IDLE_MS = 300;
export const FAST_MAX_MS = 1500;
