// frontend/src/components/AIAgentArena.jsx
// ========================================================
// THE ESCALATION REFEREE ARENA — Đấu Trường AI Hackathon Bảng 1 Đề A
// ========================================================

import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import {
  Bot,
  Send,
  User,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Key,
  ShieldCheck,
  Check,
  X,
  Clock,
  ArrowRight,
  Search,
  FileText,
  Layers,
  Globe,
  Activity,
  XCircle,
  AlertCircle,
  Sparkles,
  Terminal,
  Trash2,
  Copy,
} from "lucide-react";
import api, { switchRoleAuth } from "../api";
import { webMcpManager } from "../webmcp";
import MarkdownText from "./MarkdownText";


const DEFAULT_WELCOME_MSG = {
  sender: "agent",
  text: `Xin chào! Tôi là **The Escalation Referee** 🤖 — Trọng tài AI cấp phát và điều phối thiết bị tự hành theo đúng quy chế MLAI Hackathon Bảng 1 Đề A.\n\n*\"AI tự làm việc. AI biết giới hạn. Con người giữ quyền quyết định.\"*\n\n🛡️ **Quy Chế Thẩm Quyền Deterministic Policy:**\n- 🟢 **Thường quy (≤ 20.000.000đ & ≤ 7 ngày):** Tự động phê duyệt 100%, cấp mã PIN nhận đồ tại kho ngay lập tức.\n- 🟣 **Vượt thẩm quyền (> 20.000.000đ hoặc > 7 ngày):** AI lập hồ sơ chuyển tiếp Quản lý ký duyệt.\n- 🟠 **Thông tin mờ/bất thường:** Tự động hỏi lại để làm rõ.\n- 🔄 **Compensating Rollback:** Cho phép hoàn tác thực tế và khôi phục tồn kho vào cơ sở dữ liệu.`,
  timestamp: new Date(),
};

export default function AIAgentArena({ currentRole, onLoanCreated }) {
  const [messages, setMessages] = useState(() => {
    try {
      const cached = sessionStorage.getItem("iels_arena_messages");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Lỗi nạp cached messages:", e);
    }
    return [DEFAULT_WELCOME_MSG];
  });

  const [sessionId, setSessionId] = useState(() => {
    return sessionStorage.getItem("iels_arena_session_id") || null;
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Tự động lưu hội thoại vào sessionStorage để không bị mất khi chuyển tab hoặc F5
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem("iels_arena_messages", JSON.stringify(messages));
      } catch (e) {
        console.warn("Lỗi lưu sessionStorage:", e);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem("iels_arena_session_id", sessionId);
    }
  }, [sessionId]);

  // Trạng thái cho Verify Harness 90s
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyData, setVerifyData] = useState(null);
  const [activeTab, setActiveTab] = useState("chat"); // chat | verify | policy

  // Live Agent Terminal Logs
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const terminalEndRef = useRef(null);

  // BGK Decision state: { [caseId or loanId]: { decision, auditLogId, tamperHash, note } }
  const [bgkDecisions, setBgkDecisions] = useState({});

  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // Load terminal logs khi mount
  useEffect(() => {
    fetchTerminalLogs();
  }, []);

  // Tự động cuộn xuống cuối terminal khi có log mới
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  const fetchTerminalLogs = async () => {
    setTerminalLoading(true);
    try {
      const res = await api.get(`/agent/terminal-logs?limit=100&_t=${Date.now()}`);
      if (res.data?.success) {
        setTerminalLogs(res.data.data || []);
      }
    } catch (e) {
      console.warn("Không thể tải terminal log:", e.message);
    } finally {
      setTerminalLoading(false);
    }
  };

  const clearTerminalLogs = async () => {
    try {
      await api.post("/agent/terminal-logs/clear");
      setTerminalLogs([]);
    } catch (e) {
      console.warn("Không thể xóa terminal log:", e.message);
    }
  };


  // Kết nối Socket.IO
  useEffect(() => {
    const socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 [Arena] Socket.IO đã kết nối:", socket.id);
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("🔴 [Arena] Socket.IO mất kết nối");
      setSocketConnected(false);
    });

    // Nhận stream text chunk
    socket.on("agent_response_chunk", (data) => {
      if (data.sessionId) setSessionId(data.sessionId);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === "agent") {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + data.text },
          ];
        }
        return prev;
      });
    });

    // Nhận kết thúc stream kèm payload cấu trúc
    socket.on("agent_response_end", (data) => {
      console.log("📡 [Arena] agent_response_end:", data);
      if (data.sessionId) setSessionId(data.sessionId);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === "agent") {
          const replyText = data.reply || lastMsg.text || "Yêu cầu đã được xử lý.";
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              text: replyText,
              loan: data.payload?.loan,
              escalation: data.payload?.escalation,
              equipments: data.payload?.equipments,
              verifyResults: data.payload?.verifyResults,
            },
          ];
        }
        return prev;
      });

      setLoading(false);
      fetchTerminalLogs();
      if (data.payload?.loan && onLoanCreated) {
        setTimeout(() => onLoanCreated(), 500);
      }
    });

    // Lắng nghe Terminal Log bắn từ Backend
    socket.on("agent_terminal_log", (entry) => {
      setTerminalLogs((prev) => {
        if (prev.some((p) => p.id === entry.id)) return prev;
        return [...prev.slice(-150), entry];
      });
    });

    socket.on("agent_terminal_clear", () => {
      setTerminalLogs([]);
    });

    // WebMCP Client Tool Execution
    socket.on("execute_webmcp_tool", async (data) => {
      const { executionId, toolName, args } = data;
      console.log(`🌐 [Arena WebMCP] Nhận yêu cầu thực thi [${toolName}]:`, args);
      try {
        const result = await webMcpManager.executeTool(toolName, args);
        socket.emit(`webmcp_tool_result_${executionId}`, result);
      } catch (err) {
        socket.emit(`webmcp_tool_result_${executionId}`, {
          success: false,
          error: err?.message || "Lỗi WebMCP client tool",
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Cuộn mượt chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Gửi tin nhắn qua Socket.IO (hoặc fallback qua HTTP)
  const sendMessageWithText = async (textToSend) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    const agentPlaceholder = {
      sender: "agent",
      text: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, agentPlaceholder]);
    setLoading(true);

    const token = localStorage.getItem("token");

    if (socketRef.current && socketConnected) {
      socketRef.current.emit("client_send_message", {
        message: textToSend,
        sessionId,
        userId: null,
        token,
        hasWebMCP: true,
      });
    } else {
      // Fallback qua HTTP POST /api/agent/chat
      try {
        const res = await api.post("/agent/chat", {
          message: textToSend,
          sessionId,
        });
        const data = res.data;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            sender: "agent",
            text: data.reply,
            loan: data.payload?.loan,
            escalation: data.payload?.escalation,
            equipments: data.payload?.equipments,
            timestamp: new Date(),
          },
        ]);
        if (data.sessionId) setSessionId(data.sessionId);
        setLoading(false);
        fetchAuditLogs();
        // Neu AI da tao phieu muon → refresh loan list o tab LOANS
        if (data.payload?.loan && onLoanCreated) {
          setTimeout(() => onLoanCreated(), 500);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            sender: "agent",
            text: "⚠️ Lỗi kết nối đến máy chủ AI Agent: " + err.message,
            timestamp: new Date(),
          },
        ]);
        setLoading(false);
      }
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    sendMessageWithText(text);
  };

  // Tạo phiên làm việc mới
  const handleNewSession = () => {
    setSessionId(null);
    sessionStorage.removeItem("iels_arena_session_id");
    const freshMessages = [
      {
        sender: "agent",
        text: "Đã khởi tạo phiên làm việc mới. Mời bạn nhập yêu cầu tra cứu hoặc cấp phát thiết bị!",
        timestamp: new Date(),
      },
    ];
    setMessages(freshMessages);
    sessionStorage.setItem("iels_arena_messages", JSON.stringify(freshMessages));
  };


  // Chạy Bộ Kiểm Thử Verify Harness 90s
  const handleRunVerify90s = async () => {
    setVerifyLoading(true);
    setVerifyData(null);
    setBgkDecisions({}); // reset decisions khi chạy lại
    try {
      const res = await api.post("/agent/verify-90s");
      setVerifyData(res.data);
      fetchAuditLogs();
    } catch (err) {
      alert("Lỗi khi chạy Verify 90s: " + (err.response?.data?.message || err.message));
    } finally {
      setVerifyLoading(false);
    }
  };

  // BGK xác nhận escalation case
  const handleBGKConfirm = async (key, loanId, caseLabel) => {
    try {
      const note = `[Verify ${caseLabel}] BGK xác nhận phê duyệt — hệ thống đã phân loại đúng vượt thẩm quyền`;
      const res = await api.post("/agent/bgk-confirm", {
        loanId: loanId || key,
        judgeNote: note,
        judgeName: "BGK_JUDGE",
      });
      setBgkDecisions((prev) => ({
        ...prev,
        [key]: {
          decision: "BGK_APPROVED",
          auditLogId: res.data.auditLogId,
          tamperHash: res.data.tamperHash,
          note,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        },
      }));
      fetchAuditLogs();
    } catch (err) {
      alert("Lỗi BGK confirm: " + (err.response?.data?.error || err.message));
    }
  };

  // BGK từ chối escalation case
  const handleBGKReject = async (key, loanId, caseLabel) => {
    try {
      const note = `[Verify ${caseLabel}] BGK từ chối — xác nhận AI đã phân loại đúng cần chuyển tiếp`;
      const res = await api.post("/agent/bgk-reject", {
        loanId: loanId || key,
        judgeNote: note,
        judgeName: "BGK_JUDGE",
      });
      setBgkDecisions((prev) => ({
        ...prev,
        [key]: {
          decision: "BGK_REJECTED",
          auditLogId: res.data.auditLogId,
          tamperHash: res.data.tamperHash,
          note,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        },
      }));
      fetchAuditLogs();
    } catch (err) {
      alert("Lỗi BGK reject: " + (err.response?.data?.error || err.message));
    }
  };

  // Hoàn tác phiếu mượn (Compensating Rollback)
  const handleRollbackLoan = async (loanId) => {
    if (!loanId) return;
    if (!window.confirm("Bạn có chắc chắn muốn HOÀN TÁC phiếu mượn này và hoàn trả tồn kho về CSDL?")) {
      return;
    }

    try {
      const res = await api.post("/agent/rollback", {
        loanId,
        reason: "Hoàn tác can thiệp từ Đấu Trường AI Arena",
      });

      alert(`✅ Hoàn tác thành công! ${res.data.message || ""}`);

      // Cập nhật card trên UI
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.loan && (msg.loan.loanId === loanId || msg.loan.requestCode === loanId)) {
            return {
              ...msg,
              loan: {
                ...msg.loan,
                status: "CANCELLED",
                message: "Đã hoàn tác thực tế và khôi phục trạng thái thiết bị về AVAILABLE.",
              },
            };
          }
          return msg;
        })
      );
      fetchAuditLogs();
    } catch (err) {
      alert("Lỗi khi hoàn tác: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Đấu Trường */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                MLAI HACKATHON • BẢNG 1 - ĐỀ A
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  socketConnected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    socketConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {socketConnected ? "Socket.IO Realtime Active" : "HTTP Fallback Mode"}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              The Escalation Referee Arena 🤖
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Trọng tài AI cấp phát thiết bị tự hành: Tự duyệt thường quy (≤ 20M & ≤ 7 ngày) •
              Chuyển tiếp Quản lý khi vượt quyền • Bù trừ hoàn tác thực tế (Real Compensating Rollback).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunVerify90s}
              disabled={verifyLoading}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${verifyLoading ? "animate-spin" : ""}`} />
              <span>{verifyLoading ? "Đang chạy 5 kịch bản..." : "⚡ Verify Harness 90s"}</span>
            </button>

            <button
              onClick={handleNewSession}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Khởi tạo phiên mới"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Phiên mới</span>
            </button>
          </div>
        </div>

        {/* Thước đo thẩm quyền trực quan */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/60 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              🟢
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-300">TỰ DUYỆT THƯỜNG QUY</p>
              <p className="text-[11px] text-slate-400">≤ 20.000.000đ & ≤ 7 ngày (Cấp mã PIN ngay)</p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-purple-500/20 p-3 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              🟣
            </div>
            <div>
              <p className="text-xs font-bold text-purple-300">CHUYỂN TIẾP QUẢN LÝ</p>
              <p className="text-[11px] text-slate-400">&gt; 20.000.000đ hoặc &gt; 7 ngày (Escalation)</p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-orange-500/20 p-3 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
              🔄
            </div>
            <div>
              <p className="text-xs font-bold text-orange-300">HOÀN TÁC THỰC TẾ</p>
              <p className="text-[11px] text-slate-400">Khôi phục tồn kho & SHA-256 Audit Trail</p>
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực Chính 2 Cột */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (7/12): Khung Chatbot Trọng Tài AI Live Stream */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[720px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">EquipReferee Chat Stream</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Session: {sessionId ? sessionId.substring(0, 16) + "..." : "Khởi tạo tự động"}
                </p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
              Vai trò: <strong className="text-amber-400">{currentRole}</strong>
            </span>
          </div>

          {/* Quick Prompts Banner */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-amber-400 font-semibold flex items-center whitespace-nowrap">
              <Zap className="w-3.5 h-3.5 mr-1" /> Thử nhanh:
            </span>
            <button
              onClick={() => sendMessageWithText("Mượn bộ đàm Motorola điều phối sự kiện 3 ngày tại phòng sự kiện")}
              className="px-2.5 py-1 bg-slate-800/90 hover:bg-emerald-950 hover:border-emerald-500/50 border border-slate-700 text-slate-300 hover:text-emerald-300 rounded-lg whitespace-nowrap transition cursor-pointer"
            >
              Bộ đàm 3 ngày (Tự duyệt)
            </button>
            <button
              onClick={() => sendMessageWithText("Mượn bàn phím cơ DareU EK87 làm việc tại Lab 2 ngày")}
              className="px-2.5 py-1 bg-slate-800/90 hover:bg-emerald-950 hover:border-emerald-500/50 border border-slate-700 text-slate-300 hover:text-emerald-300 rounded-lg whitespace-nowrap transition cursor-pointer"
            >
              Bàn phím 2 ngày (Tự duyệt)
            </button>
            <button
              onClick={() => sendMessageWithText("Mượn laptop MacBook Pro M3 Max 10 ngày làm đồ án AI tốt nghiệp")}
              className="px-2.5 py-1 bg-slate-800/90 hover:bg-purple-950 hover:border-purple-500/50 border border-slate-700 text-slate-300 hover:text-purple-300 rounded-lg whitespace-nowrap transition cursor-pointer"
            >
              MacBook M3 10 ngày (BGK)
            </button>
            <button
              onClick={() => sendMessageWithText("Cho mượn cái máy chiếu")}
              className="px-2.5 py-1 bg-slate-800/90 hover:bg-orange-950 hover:border-orange-500/50 border border-slate-700 text-slate-300 hover:text-orange-300 rounded-lg whitespace-nowrap transition cursor-pointer"
            >
              Máy chiếu (Làm rõ)
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex items-start gap-2.5 max-w-[92%] ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-amber-500 text-slate-950 font-bold"
                    }`}
                  >
                    {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Bubble Text */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white rounded-tr-none shadow-md"
                          : "bg-slate-800/95 text-slate-100 rounded-tl-none border border-slate-700/80 shadow-md"
                      }`}
                    >
                      {!msg.text && loading && idx === messages.length - 1 ? (
                        <div className="flex items-center space-x-2 py-1 text-amber-400">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          <span className="text-xs text-slate-400">
                            The Escalation Referee đang đối chiếu quy chế và thẩm định...
                          </span>
                        </div>
                      ) : msg.sender === "user" ? (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      ) : (
                        <MarkdownText content={msg.text} />
                      )}

                    </div>

                    {/* THẺ QUYẾT ĐỊNH PHIẾU MƯỢN (LOAN DECISION CARD) */}
                    {msg.loan && (
                      <div
                        className={`p-4 rounded-xl border text-xs space-y-3 shadow-lg ${
                          msg.loan.status === "AUTO_APPROVED" || msg.loan.status === "APPROVED"
                            ? "bg-emerald-950/40 border-emerald-500/40"
                            : msg.loan.status === "ESCALATED_PENDING"
                            ? "bg-purple-950/40 border-purple-500/40"
                            : msg.loan.status === "CANCELLED"
                            ? "bg-slate-900 border-slate-700 opacity-85"
                            : "bg-red-950/40 border-red-500/40"
                        }`}
                      >
                        {/* Header Thẻ */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            {msg.loan.status === "AUTO_APPROVED" || msg.loan.status === "APPROVED" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : msg.loan.status === "ESCALATED_PENDING" ? (
                              <AlertTriangle className="w-4 h-4 text-purple-400" />
                            ) : (
                              <RotateCcw className="w-4 h-4 text-orange-400" />
                            )}

                            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                              {msg.loan.status === "AUTO_APPROVED"
                                ? "TỰ ĐỘNG PHÊ DUYỆT 100% (AUTO_APPROVED)"
                                : msg.loan.status === "APPROVED"
                                ? "QUẢN LÝ ĐÃ PHÊ DUYỆT"
                                : msg.loan.status === "ESCALATED_PENDING"
                                ? "⚖️ BGK XÁC NHẬN THẨM QUYỀN (ESCALATION)"
                                : msg.loan.status === "CANCELLED"
                                ? "ĐÃ HOÀN TÁC THỰC TẾ (CANCELLED)"
                                : "TỪ CHỐI CẤP PHÁT"}
                            </span>
                          </div>

                          {msg.loan.requestCode && (
                            <span className="font-mono text-[10px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                              {msg.loan.requestCode}
                            </span>
                          )}
                        </div>

                        {/* Ô MÃ PIN NHẬN ĐỒ TẠI KHO (CỰC KỲ QUAN TRỌNG) */}
                        {msg.loan.pickupCode && (
                          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase font-semibold text-emerald-300 flex items-center gap-1">
                                <Key className="w-3.5 h-3.5" /> Mã PIN nhận đồ tại kho:
                              </p>
                              <p className="font-mono text-2xl font-black text-emerald-300 tracking-widest mt-0.5">
                                {msg.loan.pickupCode}
                              </p>
                            </div>
                            <div className="text-right text-[11px] text-slate-300">
                              <p className="font-semibold text-white">{msg.loan.equipmentName || "Thiết bị"}</p>
                              <p className="text-slate-400">{msg.loan.location || "Kho Trung tâm"}</p>
                            </div>
                          </div>
                        )}

                        {/* Chi tiết Chuyển tiếp — Thiết kế BGK xác nhận ngược lại */}
                        {msg.loan.status === "ESCALATED_PENDING" && (
                          <div className="space-y-2 bg-purple-950/30 p-3 rounded-lg border border-purple-800/30">
                            {msg.loan.category && (
                              <div className="text-[11px] text-purple-300">
                                <strong>Phân loại vượt quyền:</strong> {msg.loan.category}
                              </div>
                            )}
                            {msg.loan.reason && (
                              <p className="text-slate-300 text-[11px]">
                                <strong>Căn cứ pháp lý:</strong> {msg.loan.reason}
                              </p>
                            )}
                            {msg.loan.specificQuestion && (
                              <p className="text-amber-300 text-[11px] bg-amber-950/30 p-2 rounded border border-amber-800/40">
                                <strong>⚖️ Câu hỏi AI gửi BGK:</strong> {msg.loan.specificQuestion}
                              </p>
                            )}
                            {/* BGK xác nhận trực tiếp */}
                            {(() => {
                              const lKey = msg.loan?.loanId || msg.loan?.requestCode;
                              const bgkD = bgkDecisions[lKey];
                              return bgkD ? (
                                <div className={`mt-2 p-2 rounded-lg border text-[11px] ${
                                  bgkD.decision === "BGK_APPROVED"
                                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                                    : "bg-rose-950/50 border-rose-500/40 text-rose-300"
                                }`}>
                                  <strong>{bgkD.decision === "BGK_APPROVED" ? "✅ BGK ĐÃ PHÊ DUYỆT" : "❌ BGK ĐÃ TỪ CHỐI"}</strong>
                                  <div className="text-slate-400 mt-0.5">Audit: <span className="font-mono">{bgkD.auditLogId}</span> • {bgkD.timestamp}</div>
                                </div>
                              ) : (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleBGKConfirm(lKey, lKey, msg.loan?.requestCode || "CHAT")}
                                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> BGK Phê duyệt
                                  </button>
                                  <button
                                    onClick={() => handleBGKReject(lKey, lKey, msg.loan?.requestCode || "CHAT")}
                                    className="flex-1 px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <X className="w-3 h-3" /> BGK Từ chối
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Nút Hoàn tác Rollback */}
                        {(msg.loan.status === "APPROVED" ||
                          msg.loan.status === "AUTO_APPROVED" ||
                          msg.loan.status === "ESCALATED_PENDING") && (
                          <div className="pt-2 border-t border-slate-800 flex justify-end">
                            <button
                              onClick={() => handleRollbackLoan(msg.loan?.loanId || msg.loan?.requestCode)}
                              className="text-[11px] text-orange-300 hover:text-orange-200 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-950/50 border border-orange-500/30 hover:bg-orange-900/60 transition cursor-pointer"
                              title="Hoàn tác và khôi phục trạng thái thiết bị"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Hoàn tác phiếu này (Rollback)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DANH SÁCH THIẾT BỊ TÌM ĐƯỢC */}
                    {msg.equipments && msg.equipments.length > 0 && (
                      <div className="space-y-2 mt-1">
                        {msg.equipments.map((eq) => (
                          <div
                            key={eq.id || eq.assetCode}
                            className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                  {eq.assetCode}
                                </span>
                                <span className="font-bold text-white">{eq.name}</span>
                              </div>
                              <div className="text-slate-400 text-[11px] mt-1">
                                {eq.formattedValue || (eq.value?.toLocaleString("vi-VN") + " đ")} • Còn{" "}
                                {eq.countInStock} tại {eq.location || "Kho"}
                              </div>
                            </div>

                            <button
                              onClick={() => sendMessageWithText(`Mượn ${eq.name} 2 ngày`)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition whitespace-nowrap cursor-pointer text-xs"
                            >
                              Mượn ngay
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Chat Box */}
          <form onSubmit={handleSend} className="p-3.5 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập yêu cầu: 'Mượn chuột quang 2 ngày', 'Tra cứu máy quay Sony'..."
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* CỘT PHẢI (5/12): Bảng Điều Khiển Giám Khảo & Verify Harness 90s */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Bảng Kiểm Thử Verify Harness 90s (12 Điểm Barem) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Verify Harness 90s</h3>
                  <p className="text-[11px] text-slate-400">BGK thấy tin nhắn test thực tế + phản hồi AI</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                12 Điểm
              </span>
            </div>

            {verifyLoading && (
              <div className="py-8 text-center space-y-3">
                <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-300">Đang gọi AI Agent cho 5 kịch bản thực tế...</p>
                <p className="text-[11px] text-slate-500">Thời gian dự kiến: 10–25 giây</p>
              </div>
            )}

            {!verifyLoading && verifyData && (
              <div className="mt-4 space-y-3">
                {/* Summary Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  verifyData.failedTests === 0
                    ? "bg-emerald-950/60 border-emerald-500/30"
                    : "bg-amber-950/60 border-amber-500/30"
                }`}>
                  <div className="flex items-center gap-2">
                    {verifyData.failedTests === 0
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : <AlertCircle className="w-5 h-5 text-amber-400" />
                    }
                    <div>
                      <p className={`text-xs font-bold uppercase ${
                        verifyData.failedTests === 0 ? "text-emerald-300" : "text-amber-300"
                      }`}>
                        {verifyData.summary || `${verifyData.passedTests}/${verifyData.totalTests} PASSED`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(verifyData.timestamp).toLocaleString("vi-VN")} • {verifyData.executionTimeMs}ms
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                    verifyData.failedTests === 0
                      ? "text-emerald-300 bg-emerald-900/60"
                      : "text-amber-300 bg-amber-900/60"
                  }`}>
                    {verifyData.scoreAwarded?.split(" ")[0] || "12/12"}
                  </span>
                </div>

                {/* Danh sách 5 kịch bản — input + output thực tế */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {(verifyData.scenarios || []).map((sc, idx) => {
                    const bgkKey = sc.caseId;
                    const bgkD = bgkDecisions[bgkKey];
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl space-y-2 text-xs border ${
                          sc.passed
                            ? "bg-slate-950/80 border-slate-800"
                            : "bg-red-950/30 border-red-800/40"
                        }`}
                      >
                        {/* Header: tên + pass/fail */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-200 text-[11px]">
                            {sc.caseId}. {sc.name}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              sc.passed
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-300 border border-red-500/30"
                            }`}>
                              {sc.passed ? "✅ PASSED" : "❌ FAILED"}
                            </span>
                            <span className="text-[10px] text-slate-500">{sc.decisionTimeMs}ms</span>
                          </div>
                        </div>

                        {/* Input message */}
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] text-blue-400 font-semibold whitespace-nowrap mt-0.5">📨 Input:</span>
                          <span className="text-[11px] text-slate-300 italic">"{sc.inputPrompt}"</span>
                        </div>

                        {/* AI Reply */}
                        {sc.aiReply && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-[10px] text-amber-400 font-semibold whitespace-nowrap mt-0.5">🤖 AI:</span>
                            <span className="text-[11px] text-slate-400 line-clamp-2">{sc.aiReply}</span>
                          </div>
                        )}

                        {/* Status badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-slate-500">Kỳ vọng:</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{sc.expectedStatus}</span>
                          <span className="text-[10px] text-slate-500">→ Thực tế:</span>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                            sc.passed ? "bg-emerald-950/40 text-emerald-300 border-emerald-700/40" : "bg-red-950/40 text-red-300 border-red-700/40"
                          }`}>{sc.actualStatus}</span>
                        </div>

                        {/* BGK Action Panel — chỉ với case requiresBGKConfirm */}
                        {sc.requiresBGKConfirm && (
                          <div className="pt-2 border-t border-purple-800/30">
                            {bgkD ? (
                              <div className={`p-2 rounded-lg border text-[11px] ${
                                bgkD.decision === "BGK_APPROVED"
                                  ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                                  : "bg-rose-950/50 border-rose-500/40 text-rose-300"
                              }`}>
                                <div className="font-bold">
                                  {bgkD.decision === "BGK_APPROVED" ? "✅ BGK ĐÃ PHÊ DUYỆT" : "❌ BGK ĐÃ TỪ CHỐI"}
                                </div>
                                <div className="text-slate-400 text-[10px] mt-0.5 space-y-0.5">
                                  <div>Audit: <span className="font-mono">{bgkD.auditLogId}</span></div>
                                  <div>SHA: <span className="font-mono">{bgkD.tamperHash?.slice(0, 14)}...</span></div>
                                  <div>Thời gian: {bgkD.timestamp}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-purple-300 font-semibold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  ⚖️ BGK xác nhận quyết định AI (Escalation Case)
                                </p>
                                {sc.specificQuestion && (
                                  <p className="text-[10px] text-amber-300 bg-amber-950/30 p-1.5 rounded border border-amber-800/30">
                                    <strong>AI hỏi BGK:</strong> {sc.specificQuestion}
                                  </p>
                                )}
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleBGKConfirm(bgkKey, sc.loanId || bgkKey, sc.caseId)}
                                    className="flex-1 px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> BGK Phê duyệt
                                  </button>
                                  <button
                                    onClick={() => handleBGKReject(bgkKey, sc.loanId || bgkKey, sc.caseId)}
                                    className="flex-1 px-2 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <X className="w-3 h-3" /> BGK Từ chối
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!verifyLoading && !verifyData && (
              <div className="mt-4 p-6 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Chưa chạy kiểm thử. Bấm nút <strong>[⚡ Verify Harness 90s]</strong> ở trên để tự động thẩm định
                  toàn diện 5 kịch bản — BGK sẽ thấy tin nhắn test thực tế và phản hồi AI.
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Live Reasoning Terminal Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {/* 3 nút macOS */}
                <div className="flex items-center gap-1.5 mr-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold font-mono text-slate-200">
                  Live Terminal Console
                </h3>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 animate-pulse">
                  ● LIVE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearTerminalLogs}
                  title="Xóa log terminal"
                  className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={fetchTerminalLogs}
                  disabled={terminalLoading}
                  title="Tải lại log"
                  className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${terminalLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Terminal Window Box */}
            <div className="mt-3 bg-[#070b14] border border-slate-800/90 rounded-xl p-3 font-mono text-[11px] max-h-[260px] overflow-y-auto space-y-2 select-text shadow-inner">
              {terminalLogs.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <p className="text-slate-500 text-xs">$ node --agent-orchestrator.js</p>
                  <p className="text-slate-600 text-[10px]">
                    Sẵn sàng! Hãy chat hoặc chạy Verify 90s để xem log suy luận bắn thời gian thực...
                  </p>
                </div>
              ) : (
                terminalLogs.map((log, idx) => {
                  let badgeColor = "text-slate-400 bg-slate-800/60 border-slate-700";
                  let tag = log.type || "INFO";
                  if (log.type === "REQUEST") badgeColor = "text-cyan-400 bg-cyan-950/50 border-cyan-800/60 font-semibold";
                  if (log.type === "INTENT") badgeColor = "text-purple-400 bg-purple-950/50 border-purple-800/60 font-semibold";
                  if (log.type === "REASONING") badgeColor = "text-amber-400 bg-amber-950/50 border-amber-800/60 font-semibold";
                  if (log.type === "TOOL_CALL") badgeColor = "text-yellow-300 bg-yellow-950/50 border-yellow-800/60 font-bold";
                  if (log.type === "TOOL_RESULT") badgeColor = "text-emerald-400 bg-emerald-950/50 border-emerald-800/60 font-semibold";
                  if (log.type === "DECISION") badgeColor = "text-fuchsia-400 bg-fuchsia-950/50 border-fuchsia-800/60 font-bold";
                  if (log.type === "ERROR") badgeColor = "text-rose-400 bg-rose-950/50 border-rose-800/60 font-bold";

                  return (
                    <div key={log.id || idx} className="space-y-0.5 leading-relaxed border-b border-slate-900/60 pb-1.5 last:border-b-0">
                      <div className="flex items-start gap-1.5 flex-wrap">
                        <span className="text-slate-500 text-[10px] select-none">
                          [{log.timeFormatted || ""}]
                        </span>
                        <span className={`px-1 py-0.2 rounded text-[9px] border ${badgeColor}`}>
                          {tag}
                        </span>
                        <span className="text-slate-200 flex-1 break-words">
                          {log.text}
                        </span>
                      </div>
                      {log.details && (
                        <div className="ml-4 pl-2 border-l border-slate-800 text-[10px] text-slate-400">
                          {typeof log.details === "string" ? (
                            <p className="line-clamp-2">{log.details}</p>
                          ) : (
                            <pre className="text-[9px] text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-24">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {/* Terminal cursor */}
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] pt-1">
                <span className="text-slate-600 select-none">$</span>
                <span className="text-slate-500 text-[10px]">agent-trace</span>
                <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse"></span>
              </div>
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
