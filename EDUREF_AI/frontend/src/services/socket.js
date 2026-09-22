// src/services/socket.js
// Client Socket.IO quản lý kết nối thời gian thực tới Backend EduRef AI

import { io } from 'socket.io-client';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const getSocket = () => {
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
      console.warn('🔴 [Socket.IO] Mất kết nối EduRef Backend:', reason);
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
