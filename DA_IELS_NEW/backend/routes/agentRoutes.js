// routes/agentRoutes.js
// ========================================================
// AI AGENT API ROUTES — The Escalation Referee Endpoints
// ========================================================

import express from "express";
import { runAgent } from "../modules/ai-agent/index.js";
import { runVerify90s } from "../modules/ai-agent/tools/actions/verifyTools.js";
import { rollbackLoan } from "../modules/ai-agent/tools/actions/loanTools.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

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

export default router;
