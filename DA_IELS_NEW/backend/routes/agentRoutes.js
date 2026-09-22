// routes/agentRoutes.js
// ========================================================
// AI AGENT API ROUTES — The Escalation Referee Endpoints
// ========================================================

import express from "express";
import { runAgent } from "../modules/ai-agent/index.js";
import { runVerify90s } from "../modules/ai-agent/tools/actions/verifyTools.js";
import { rollbackLoan } from "../modules/ai-agent/tools/actions/loanTools.js";
import { rollbackLoanRequest } from "../controllers/loanController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import AuditLogService from "../services/AuditLogService.js";
import LoanRequest from "../models/LoanRequest.js";
import { agentTerminalLogger } from "../modules/ai-agent/core/AgentTerminalLogger.js";

const router = express.Router();

/**
 * GET /api/agent/terminal-logs
 * Lấy danh sách live terminal logs gần nhất
 */
router.get("/terminal-logs", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 300);
  res.json({
    success: true,
    count: agentTerminalLogger.getRecentLogs(limit).length,
    data: agentTerminalLogger.getRecentLogs(limit),
  });
});

/**
 * POST /api/agent/terminal-logs/clear
 * Xóa sạch buffer terminal logs
 */
router.post("/terminal-logs/clear", (req, res) => {
  agentTerminalLogger.clear();
  res.json({ success: true, message: "Đã xóa log terminal" });
});

/**
 * POST /api/agent/chat
 * Endpoint HTTP cho Agent Chat (khi client không dùng Socket hoặc fallback)
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId, userId: bodyUserId } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || null;

    // Lấy userId nếu có từ token hoặc body
    let userId = bodyUserId || null;

    console.log(`📱 [AgentRoute] HTTP Chat Request:`, {
      userId,
      messagePreview: message?.substring(0, 50),
      sessionId: sessionId || "none",
    });

    const result = await runAgent(
      message,
      [],
      userId,
      token,
      sessionId,
      null, // onChunk
      {
        clientSupportsWebMCP: false,
      }
    );

    res.json({
      success: result.success,
      reply: result.reply,
      sessionId: result.sessionId,
      payload: result.payload,
      hasPayload: result.hasPayload,
      iterations: result.iterations,
      functionCalls: result.functionCalls,
      _debug: result._debug,
    });
  } catch (error) {
    console.error("❌ [AgentRoute] HTTP Chat error:", error);
    res.status(500).json({
      success: false,
      reply: "Xin lỗi, đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại!",
      error: error.message,
    });
  }
});

/**
 * POST /api/agent/verify-90s
 * Kích hoạt bộ kiểm thử tự động 90s phục vụ giám khảo Hackathon Bảng 1 Đề A
 */
router.post("/verify-90s", async (req, res) => {
  try {
    console.log("⚡ [AgentRoute] Trigger Verify Harness 90s...");
    const results = await runVerify90s();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("❌ [AgentRoute] Verify 90s error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi thực thi kiểm thử 90s",
      error: error.message,
    });
  }
});

/**
 * POST /api/agent/rollback
 * Can thiệp hoàn tác bù trừ (Compensating Rollback)
 */
router.post("/rollback", async (req, res) => {
  try {
    const { loanId, reason } = req.body;
    if (!loanId) {
      return res.status(400).json({ success: false, message: "loanId là bắt buộc" });
    }

    const result = await rollbackLoan({ loanId, reason: reason || "Can thiệp từ Agent Arena" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/bgk-confirm
 * Ban Giám Khảo xác nhận phê duyệt một escalation case
 * Body: { loanId, judgeNote, judgeName }
 */
router.post("/bgk-confirm", async (req, res) => {
  try {
    const { loanId, judgeNote, judgeName } = req.body;
    if (!loanId) {
      return res.status(400).json({ success: false, message: "loanId là bắt buộc" });
    }

    const judgeLabel = judgeName || "BGK_JUDGE";
    const note = judgeNote || "Ban Giám Khảo xác nhận phê duyệt yêu cầu vượt thẩm quyền";

    // Cập nhật loan nếu tìm thấy trong DB (tùy chọn — verify case có thể không có loan thật)
    let loanRecord = null;
    try {
      loanRecord = await LoanRequest.findOneAndUpdate(
        { $or: [{ loanId }, { requestCode: loanId }] },
        { status: "APPROVED", escalationReason: note, updatedAt: new Date() },
        { new: true }
      );
    } catch (dbErr) {
      console.warn("[BGK-Confirm] Không tìm thấy loan trong DB (verify case):", dbErr.message);
    }

    // Ghi Audit Log với actor BGK_JUDGE
    const auditLog = await AuditLogService.record({
      eventType: "BGK_AUTHORITY_DECISION",
      actor: "BGK_JUDGE",
      actorId: judgeLabel,
      decision: "BGK_APPROVED",
      policyRuleId: "BGK-OVERRIDE-001",
      factsSnapshot: {
        loanId,
        judgeNote: note,
        judgeName: judgeLabel,
        timestamp: new Date().toISOString(),
        loanFound: !!loanRecord,
      },
      reason: `[BGK PHÊ DUYỆT] ${note}`,
    });

    console.log(`[BGK-Confirm] ✅ BGK đã xác nhận phê duyệt loanId=${loanId} bởi ${judgeLabel}`);

    res.json({
      success: true,
      decision: "BGK_APPROVED",
      message: `Ban Giám Khảo đã phê duyệt. Ghi nhận vào Audit Trail: ${auditLog.logId}`,
      auditLogId: auditLog.logId,
      tamperHash: auditLog.tamperHash,
    });
  } catch (error) {
    console.error("❌ [AgentRoute] BGK-confirm error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/bgk-reject
 * Ban Giám Khảo từ chối một escalation case
 * Body: { loanId, judgeNote, judgeName }
 */
router.post("/bgk-reject", async (req, res) => {
  try {
    const { loanId, judgeNote, judgeName } = req.body;
    if (!loanId) {
      return res.status(400).json({ success: false, message: "loanId là bắt buộc" });
    }

    const judgeLabel = judgeName || "BGK_JUDGE";
    const note = judgeNote || "Ban Giám Khảo từ chối yêu cầu vượt thẩm quyền";

    // Cập nhật loan nếu có trong DB
    try {
      await LoanRequest.findOneAndUpdate(
        { $or: [{ loanId }, { requestCode: loanId }] },
        { status: "REJECTED", escalationReason: note, updatedAt: new Date() },
        { new: true }
      );
    } catch (dbErr) {
      console.warn("[BGK-Reject] Không tìm thấy loan trong DB (verify case):", dbErr.message);
    }

    // Ghi Audit Log với actor BGK_JUDGE
    const auditLog = await AuditLogService.record({
      eventType: "BGK_AUTHORITY_DECISION",
      actor: "BGK_JUDGE",
      actorId: judgeLabel,
      decision: "BGK_REJECTED",
      policyRuleId: "BGK-OVERRIDE-001",
      factsSnapshot: {
        loanId,
        judgeNote: note,
        judgeName: judgeLabel,
        timestamp: new Date().toISOString(),
      },
      reason: `[BGK TỪ CHỐI] ${note}`,
    });

    console.log(`[BGK-Reject] ❌ BGK đã từ chối loanId=${loanId} bởi ${judgeLabel}`);

    res.json({
      success: true,
      decision: "BGK_REJECTED",
      message: `Ban Giám Khảo đã từ chối. Ghi nhận vào Audit Trail: ${auditLog.logId}`,
      auditLogId: auditLog.logId,
      tamperHash: auditLog.tamperHash,
    });
  } catch (error) {
    console.error("❌ [AgentRoute] BGK-reject error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agent/rollback
 * Hoàn tác phiếu mượn từ AI Arena — không bắt buộc token (demo mode)
 * Actor mặc định là AI_AGENT, override bởi req.user nếu có auth
 */
router.post("/rollback", async (req, res) => {
  const { loanId, reason } = req.body;
  if (!loanId) {
    return res.status(400).json({ success: false, message: 'Thiếu loanId' });
  }
  // Gán actor mặc định cho Arena (không cần đăng nhập)
  req.params = { loanId };
  req.body = { rollbackReason: reason || 'Hoàn tác can thiệp từ AI Arena' };
  if (!req.user) {
    req.user = { role: 'MANAGER', email: 'arena@ai-agent.system' };
  }
  return rollbackLoanRequest(req, res);
});

export default router;
