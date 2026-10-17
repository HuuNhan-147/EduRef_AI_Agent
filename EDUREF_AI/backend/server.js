import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';

import prisma from './config/prisma.js';
import agentRoutes from './routes/agentRoutes.js';
import petitionRoutes from './routes/petitionRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import authRoutes from './routes/authRoutes.js';
import sprint2Routes from './routes/sprint2Routes.js';
import { runAgent } from './modules/ai-agent/index.js';
import { agentTerminalLogger } from './modules/ai-agent/core/AgentTerminalLogger.js';
import { scopeSessionId } from './modules/ai-agent/memory/sessionScope.js';
import { warnIfInsecureJwtSecret } from './config/jwtSecret.js';
import { createOriginChecker } from './config/cors.js';
import { checkRateLimit } from './middlewares/rateLimit.js';
import { publicErrorMessage } from './services/ErrorShield.js';

// Global error handlers để tránh crash tiến trình
process.on('uncaughtException', (err) => {
  console.error('💥 [Uncaught Exception]:', err.message);
  process.exit(1);
});
// Một promise lỗi lẻ (vd: lỗi mạng gọi Gemini) không được phép hạ cả máy chủ đang phục vụ
// nhiều người dùng; chỉ ghi log. uncaughtException ở trên mới là trạng thái không an toàn để tiếp tục.
process.on('unhandledRejection', (reason) => {
  console.error('💥 [Unhandled Rejection]:', reason);
});

const app = express();
// Render đứng sau 1 reverse proxy: cần để req.ip là IP thật (rate limit theo IP)
app.set('trust proxy', 1);
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
// Mỗi tin nhắn đi thẳng vào prompt Gemini: chặn văn bản khổng lồ làm tốn chi phí/độ trễ
const MAX_MESSAGE_LENGTH = 4000;
const isAllowedOrigin = createOriginChecker();

// Cấu hình Socket.IO với CORS linh hoạt
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Socket CORS: Nguồn [${origin}] không được phép.`));
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

io.use((socket, next) => {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'eduref_local_demo_secret_change_me');
  const token = socket.handshake.auth?.token;
  if (!secret || !token) return next(new Error('AUTH_REQUIRED'));
  try {
    socket.user = jwt.verify(token, secret);
    return next();
  } catch (_error) {
    return next(new Error('AUTH_INVALID'));
  }
});

// Gắn io vào AgentTerminalLogger để broadcast log thời gian thực về tất cả client
agentTerminalLogger.setIO(io);

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (như curl, mobile apps, server-to-server)
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS Policy: Nguồn truy cập [${origin}] không được phép.`), false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/public', express.static('public'));

// Gắn routes
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/petitions', petitionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sprint2', sprint2Routes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const studentCount = await prisma.student.count();
    res.json({
      status: 'healthy',
      service: 'EduRef AI Backend',
      database: 'Supabase PostgreSQL (Prisma)',
      totalStudents: studentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Endpoint công khai: không trả chi tiết lỗi DB (host, tên bảng...) ra ngoài
    console.error('❌ [Health] Kiểm tra DB thất bại:', err);
    res.status(500).json({ status: 'unhealthy' });
  }
});

// Quản lý các phiên Agent đang thực thi để hỗ trợ ngắt dừng khẩn cấp (Stop Generation)
const activeAgentSessions = new Map();

// Xử lý kết nối Socket.IO thời gian thực
io.on('connection', (socket) => {
  console.log('🟢 [Socket.IO] Client đã kết nối:', socket.id);

  // Phòng riêng để AgentTerminalLogger chỉ phát log phiên của chủ sở hữu (và cán bộ)
  const ownerKey = socket.user?.studentCode || socket.user?.username || socket.user?.id;
  if (ownerKey) socket.join(`user:${ownerKey}`);
  if (['STAFF', 'DEAN', 'ADMIN'].includes(socket.user?.role)) socket.join('staff');

  socket.on('client_send_message', async (data) => {
    const { message, sessionId = `sess_${socket.id}`, attachments, inputData, model, requestedModel } = data || {};
    const targetModel = model || requestedModel || null;

    if (!message) {
      socket.emit('agent_error', { message: 'Tin nhắn không được để trống.' });
      return;
    }

    if (String(message).length > MAX_MESSAGE_LENGTH) {
      socket.emit('agent_error', { sessionId, error: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).` });
      return;
    }

    // Mỗi tin nhắn kích hoạt tối đa 5 vòng gọi Gemini: giới hạn theo người dùng
    const limit = checkRateLimit(`socket-chat:${socket.user?.id || socket.id}`, { max: 20, windowMs: 60_000 });
    if (!limit.allowed) {
      socket.emit('agent_error', {
        sessionId,
        error: `Bạn gửi tin nhắn quá nhanh. Vui lòng thử lại sau ${limit.retryAfterSec} giây.`,
      });
      return;
    }

    const controller = new AbortController();
    const targetSession = sessionId || `sess_${socket.id}`;
    // Khóa theo socket: một client không thể dừng phiên của client khác bằng cách đoán sessionId
    const sessionKey = `${socket.id}:${targetSession}`;
    activeAgentSessions.set(sessionKey, controller);
    activeAgentSessions.set(socket.id, controller);

    try {
      // 1. Tự động nạp ngữ cảnh người dùng thực tế từ Database
      let userContext = {};
      const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'eduref_local_demo_secret_change_me');

      // Nếu client gửi kèm token mới, cập nhật ngay socket.user
      if (data?.token && secret) {
        try {
          const decoded = jwt.verify(data.token, secret);
          if (decoded) {
            socket.user = { ...socket.user, ...decoded };
          }
        } catch (_e) {
          // Bỏ qua nếu token không hợp lệ
        }
      }

      const explicitStudentCode = data?.studentCode || data?.currentUser?.studentCode;
      const isStaffRole = ['STAFF', 'DEAN', 'ADMIN'].includes(socket.user?.role) && !explicitStudentCode;

      if (isStaffRole) {
        const staffUser = await prisma.user.findUnique({
          where: { id: socket.user.id },
        });
        if (staffUser) {
          userContext = {
            username: staffUser.username,
            fullName: staffUser.fullName,
            email: staffUser.email,
            role: staffUser.role,
            type: 'STAFF',
          };
        }
      } else {
        // AN NINH (ZERO-TRUST IDENTITY): Nếu phiên là STUDENT, bắt buộc dùng studentCode từ JWT token đã xác thực
        // Tuyệt đối không cho phép client mạo danh sinh viên khác qua data.studentCode!
        const isStudentToken = socket.user?.role === 'STUDENT' || socket.user?.type === 'STUDENT';
        const codeToFind = isStudentToken
          ? (socket.user?.studentCode || explicitStudentCode)
          : (explicitStudentCode || socket.user?.studentCode);
        if (codeToFind) {
          const student = await prisma.student.findUnique({
            where: { studentCode: String(codeToFind).trim() },
            include: { department: true },
          });
          if (student) {
            userContext = {
              studentCode: student.studentCode,
              fullName: student.fullName,
              email: student.email,
              status: student.status,
              department: student.department?.name,
              tuitionDebt: Number(student.tuitionDebt),
              gpa: Number(student.gpa),
              role: 'STUDENT',
              type: 'STUDENT',
            };
            // Đồng bộ lại danh tính socket hiện tại để các sự kiện kế tiếp không bị lệch
            socket.user = {
              ...socket.user,
              studentCode: student.studentCode,
              role: 'STUDENT',
              fullName: student.fullName,
            };
          }
        }
      }

      if (!userContext.role) {
        throw new Error('Không xác định được danh tính hợp lệ của phiên Socket.IO.');
      }

      // 2. Gọi AI Agent với callback streaming từng chunk text kèm attachments & abort signal
      const result = await runAgent({
        message,
        currentUser: userContext,
        socket,
        // Gắn chủ sở hữu vào sessionId để ConversationMemory không bị dùng chung giữa người dùng
        sessionId: scopeSessionId(userContext, sessionId),
        attachments,
        inputData,
        requestedModel: targetModel,
        signal: controller.signal,
        onChunk: (chunk) => {
          if (!controller.signal.aborted) {
            socket.emit('agent_response_chunk', {
              clientRequestId: data.clientRequestId,
              sessionId,
              chunk,
            });
          }
        },
      });

      // Bắn kết quả hoàn chỉnh về client
      socket.emit('agent_response_end', {
        clientRequestId: data.clientRequestId,
        sessionId,
        reply: result.reply,
        decision: result.decision,
        toolResult: result.toolResult,
        totalDuration: result.totalDuration,
        modelUsed: result.modelUsed,
        isAborted: result.isAborted || false,
        executionEvidence: result.executionEvidence || [],
      });
    } catch (err) {
      if (controller.signal.aborted || err.name === 'AbortError' || err.name === 'CanceledError') {
        console.log(`⏹ [Socket.IO] Đã ngắt tiến trình Agent cho phiên: ${targetSession} theo yêu cầu người dùng.`);
        socket.emit('agent_response_end', {
          clientRequestId: data.clientRequestId,
          sessionId,
          reply: '*(Đã dừng xử lý theo yêu cầu của bạn)*',
          decision: 'USER_ABORTED',
          isAborted: true,
        });
        return;
      }

      console.error('❌ [Socket.IO] Lỗi khi xử lý tin nhắn:', err);
      socket.emit('agent_error', {
        clientRequestId: data.clientRequestId,
        sessionId,
        error: publicErrorMessage(err, `Socket client_send_message (${sessionId})`),
      });
    } finally {
      if (activeAgentSessions.get(sessionKey) === controller) activeAgentSessions.delete(sessionKey);
      if (activeAgentSessions.get(socket.id) === controller) activeAgentSessions.delete(socket.id);
    }
  });

  // Lắng nghe yêu cầu dừng tạo phản hồi từ Client
  socket.on('client_stop_generation', (data) => {
    const { sessionId: stopSessionId } = data || {};
    const targetSession = stopSessionId || `sess_${socket.id}`;
    const sessionKey = `${socket.id}:${targetSession}`;
    const controller = activeAgentSessions.get(sessionKey) || (!stopSessionId ? activeAgentSessions.get(socket.id) : null);
    if (controller) {
      console.log(`⏹ [Socket.IO] Nhận lệnh dừng tác tử từ Client: ${targetSession}`);
      controller.abort();
      activeAgentSessions.delete(sessionKey);
      activeAgentSessions.delete(socket.id);
      socket.emit('agent_stopped', {
        sessionId: targetSession,
        message: 'Đã dừng thực thi theo yêu cầu của bạn.',
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 [Socket.IO] Client ngắt kết nối:', socket.id);
    const controller = activeAgentSessions.get(socket.id);
    if (controller) {
      controller.abort();
      activeAgentSessions.delete(socket.id);
    }
  });
});

// Khởi động server
warnIfInsecureJwtSecret();
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 EduRef AI Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Socket.IO sẵn sàng đón nhận kết nối`);
  console.log(`🗄️  Cơ sở dữ liệu: Supabase PostgreSQL qua Prisma`);
  console.log(`=======================================================`);
});
