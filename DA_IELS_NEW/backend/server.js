import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';


// Import và đăng ký toàn bộ Mongoose Models
import './models/Department.js';
import './models/User.js';
import './models/Category.js';
import './models/Location.js';
import './models/EquipmentModel.js';
import './models/Equipment.js';
import './models/LoanRequest.js';
import './models/LoanItem.js';
import './models/ApprovalAction.js';
import './models/HandoverRecord.js';
import './models/MaintenanceRecord.js';
import './models/IncidentReport.js';
import './models/AuditLog.js';
import './models/SystemPolicy.js';
import './models/Notification.js';

import authRoutes from './routes/authRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import { runAgent } from './modules/ai-agent/index.js';

const app = express();

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// HTTP Server & Socket.IO
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('🟢 [Socket.IO] Client connected:', socket.id);

  // Lắng nghe sự kiện Chat từ Arena / Client hỗ trợ streaming
  socket.on('client_send_message', async (data) => {
    const { message, sessionId, userId, token, hasWebMCP } = data;
    console.log(`📡 [Socket.IO] Received client_send_message from ${socket.id}:`, {
      messagePreview: message?.substring(0, 50),
      sessionId: sessionId || 'none',
      hasWebMCP: !!hasWebMCP,
    });

    try {
      const result = await runAgent(
        message,
        [],
        userId || null,
        token || null,
        sessionId || null,
        // Chunk text stream về đúng client qua socket
        (chunkText, activeSessionId) => {
          socket.emit('agent_response_chunk', {
            text: chunkText,
            sessionId: activeSessionId,
          });
        },
        {
          clientSupportsWebMCP: !!hasWebMCP,
          socket,
        }
      );

      // Phát toàn bộ payload quyết định, mã nhận đồ, thiết bị
      socket.emit('agent_response_end', {
        success: result.success,
        reply: result.reply,
        sessionId: result.sessionId,
        payload: result.payload,
        hasPayload: result.hasPayload,
        equipmentsCount: result.equipmentsCount,
        functionCalls: result.functionCalls,
        _debug: result._debug,
      });

      console.log(`📡 [Socket.IO] agent_response_end sent to ${socket.id}`);
    } catch (error) {
      console.error(`❌ [Socket.IO] Error processing message for ${socket.id}:`, error);
      socket.emit('agent_response_end', {
        success: false,
        reply: 'Hệ thống AI đang gặp sự cố nhỏ. Vui lòng thử lại sau! 🙏',
        sessionId: sessionId || null,
        payload: null,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 [Socket.IO] Client disconnected:', socket.id);
  });
});

// Gán io vào request để controller khác có thể broadcast nếu cần
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middlewares
app.use(
  cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/agent', agentRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'EquipAgent AI - Internal Equipment Lending System (IELS)',
    architecture: 'Enterprise 13 Tables + The Escalation Referee AI + WebMCP Runtime',
    timestamp: new Date().toISOString(),
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Server] IELS Backend running on http://localhost:${PORT}`);
  console.log(`[Server] Socket.IO server is ready for The Escalation Referee!`);
});

export default app;

