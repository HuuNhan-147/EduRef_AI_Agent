import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import prisma from './config/prisma.js';
import agentRoutes from './routes/agentRoutes.js';
import petitionRoutes from './routes/petitionRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { runAgent } from './modules/ai-agent/index.js';
import { agentTerminalLogger } from './modules/ai-agent/core/AgentTerminalLogger.js';

// Global error handlers để tránh crash tiến trình
process.on('uncaughtException', (err) => {
  console.error('💥 [Uncaught Exception]:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 [Unhandled Rejection]:', reason);
});

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Cấu hình Socket.IO với CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Gắn io vào AgentTerminalLogger để broadcast log thời gian thực về tất cả client
agentTerminalLogger.setIO(io);

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (như curl, mobile apps, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const studentCount = await prisma.student.count();
    res.json({
      status: 'healthy',
      service: 'EduRef AI Backend',
      database: 'PostgreSQL (Prisma)',
      totalStudents: studentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Xử lý kết nối Socket.IO thời gian thực
io.on('connection', (socket) => {
  console.log('🟢 [Socket.IO] Client đã kết nối:', socket.id);

  socket.on('client_send_message', async (data) => {
    const { message, studentCode, currentUser: clientUser, sessionId = `sess_${socket.id}`, attachments, inputData } = data || {};

    if (!message) {
      socket.emit('agent_error', { message: 'Tin nhắn không được để trống.' });
      return;
    }

    try {
      // 1. Tự động nạp ngữ cảnh người dùng thực tế từ Database
      let userContext = clientUser || {};
      const codeToFind = studentCode || clientUser?.code || clientUser?.studentCode || '2280602154';

      if (clientUser?.type === 'STAFF' || clientUser?.role === 'STAFF' || clientUser?.role === 'DEAN') {
        const staffUser = await prisma.user.findFirst({
          where: { role: clientUser.role || 'STAFF' },
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
        }
      }

      // 2. Gọi AI Agent với callback streaming từng chunk text kèm attachments
      const result = await runAgent({
        message,
        currentUser: userContext,
        socket,
        sessionId,
        attachments,
        inputData,
        onChunk: (chunk) => {
          socket.emit('agent_response_chunk', {
            sessionId,
            chunk,
          });
        },
      });

      // Bắn kết quả hoàn chỉnh về client
      socket.emit('agent_response_end', {
        sessionId,
        reply: result.reply,
        decision: result.decision,
        toolResult: result.toolResult,
        totalDuration: result.totalDuration,
      });
    } catch (err) {
      console.error('❌ [Socket.IO] Lỗi khi xử lý tin nhắn:', err);
      socket.emit('agent_error', {
        sessionId,
        error: err.message,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 [Socket.IO] Client ngắt kết nối:', socket.id);
  });
});

// Khởi động server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 EduRef AI Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Socket.IO sẵn sàng đón nhận kết nối`);
  console.log(`🗄️  Cơ sở dữ liệu: PostgreSQL (eduref_db via Prisma)`);
  console.log(`=======================================================`);
});
