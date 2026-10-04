// src/services/socket.js
// Client Socket.IO quản lý kết nối thời gian thực tới Backend EduRef AI

import { io } from 'socket.io-client';
import { UI_PREVIEW_MODE } from './previewMode';

const isBrowser = typeof window !== 'undefined';
const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL 
  || (isLocal ? 'http://localhost:5000' : 'https://eduref-ai-agent-1.onrender.com');

let socketInstance = null;
const previewListeners = new Map();
const previewRunTimers = new Map();
const previewCancelledRuns = new Set();
const notifyPreviewListeners = (event, payload) => {
  previewListeners.get(event)?.forEach((listener) => listener(payload));
};
const previewSocket = {
  connected: true,
  auth: {},
  on: (event, listener) => {
    const listeners = previewListeners.get(event) || new Set();
    listeners.add(listener);
    previewListeners.set(event, listeners);
    return previewSocket;
  },
  off: (event, listener) => {
    if (listener) previewListeners.get(event)?.delete(listener);
    else previewListeners.delete(event);
    return previewSocket;
  },
  emit: (event, payload) => {
    if (event === 'client_cancel_run') {
      previewCancelledRuns.add(payload?.runId);
      const timers = previewRunTimers.get(payload?.runId) || [];
      timers.forEach((timer) => globalThis.clearTimeout(timer));
      previewRunTimers.delete(payload?.runId);
      if (timers.length) previewCancelledRuns.delete(payload?.runId);
      notifyPreviewListeners('agent_progress', {
        sessionId: payload?.sessionId,
        runId: payload?.runId,
        sequence: Date.now(),
        phase: 'CANCELLED',
        status: 'CANCELLED',
        label: 'Đã dừng xử lý theo yêu cầu của bạn',
        summary: 'Đây là thao tác dừng trong UI Preview.',
      });
      notifyPreviewListeners('agent_response_cancelled', { sessionId: payload?.sessionId, runId: payload?.runId, totalDuration: 420 });
      return previewSocket;
    }
    if (event !== 'client_send_message') return previewSocket;
    import('./uiPreview').then(({ getUiPreviewChatResult }) => {
      if (previewCancelledRuns.has(payload?.runId)) {
        previewCancelledRuns.delete(payload?.runId);
        return;
      }
      const result = getUiPreviewChatResult(payload?.message, payload?.inputData);
      const chunks = result.reply.match(/.{1,52}(?:\s|$)/gu) || [result.reply];
      const progress = [
        ['UNDERSTAND_REQUEST', 'Đang đọc yêu cầu', 'Xác định bạn muốn hỏi hay chuẩn bị hồ sơ.'],
        ['CHECK_FIELDS', 'Đang kiểm tra thông tin', 'Kiểm tra mục đích sử dụng và các trường bạn cung cấp.'],
        ['PREPARE_DRAFT', 'Đang chuẩn bị phản hồi', 'Bản nháp chỉ được gửi sau khi bạn xác nhận.'],
      ];
      const timers = [];
      const schedule = (callback, delay) => {
        const timer = globalThis.setTimeout(callback, delay);
        timers.push(timer);
      };
      progress.forEach(([phase, label, summary], index) => {
        schedule(() => notifyPreviewListeners('agent_progress', {
          sessionId: payload?.sessionId,
          runId: payload?.runId,
          sequence: index + 1,
          phase,
          status: 'RUNNING',
          label,
          summary,
        }), 220 + index * 320);
      });
      chunks.forEach((chunk, index) => {
        schedule(() => {
          notifyPreviewListeners('agent_response_chunk', { sessionId: payload?.sessionId, runId: payload?.runId, chunk });
        }, 1400 + index * 100);
      });
      schedule(() => {
        notifyPreviewListeners('agent_progress', {
          sessionId: payload?.sessionId,
          runId: payload?.runId,
          sequence: progress.length + 1,
          phase: 'COMPLETED',
          status: 'COMPLETED',
          label: 'Đã chuẩn bị phản hồi',
          summary: result.decision === 'DRAFT_READY' ? 'Đang chờ bạn kiểm tra bản nháp trước khi gửi.' : 'Chưa tạo hồ sơ từ cuộc trò chuyện này.',
        });
        notifyPreviewListeners('agent_response_end', { sessionId: payload?.sessionId, runId: payload?.runId, ...result });
        previewRunTimers.delete(payload?.runId);
        previewCancelledRuns.delete(payload?.runId);
      }, 1460 + chunks.length * 100);
      previewRunTimers.set(payload?.runId, timers);
    });
    return previewSocket;
  },
  connect: () => previewSocket,
  disconnect: () => previewSocket,
};

export const getSocket = () => {
  if (UI_PREVIEW_MODE) return previewSocket;
  const currentToken = localStorage.getItem('eduref_token');
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      auth: { token: currentToken },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('🟢 [Socket.IO] Đã kết nối EduRef Backend:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      // Ngắt kết nối chủ động là một phần bình thường của việc thay JWT khi
      // chuyển vai trò; chỉ cảnh báo với các sự cố kết nối thực sự.
      if (reason === 'io client disconnect') {
        console.info('🔄 [Socket.IO] Đang kết nối lại với phiên mới.');
      } else {
        console.warn('🔴 [Socket.IO] Mất kết nối EduRef Backend:', reason);
      }
    });

    window.addEventListener('eduref-auth-changed', () => {
      const token = localStorage.getItem('eduref_token');
      if (socketInstance && socketInstance.auth?.token !== token) {
        socketInstance.auth = { token };
        socketInstance.disconnect().connect();
      }
    });
  } else if (socketInstance.auth?.token !== currentToken) {
    socketInstance.auth = { token: currentToken };
    socketInstance.disconnect().connect();
  }

  return socketInstance;
};

export default getSocket;
