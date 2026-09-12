// frontend/src/components/AIAgentChat.tsx
// ========================================================
// EQUIPREFEREE AI AGENT CHAT — Giao Diện Trọng Tài Phê Duyệt & Cấp Phát Tự Hành
// ========================================================

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { io, Socket } from "socket.io-client";
import { webMcpManager } from "../webmcp";
import { approveLoan, rejectLoan, rollbackLoan } from "../api/equipmentApi";
import {
  FaPaperPlane,
  FaRobot,
  FaUser,
  FaTimes,
  FaRedo,
  FaMinus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUndo,
  FaBolt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaKey,
  FaShieldAlt,
  FaUserShield,
} from "react-icons/fa";

interface LoanCardData {
  loanId?: string;
  requestCode?: string;
  status: string;
  autoApproved?: boolean;
  escalated?: boolean;
  pickupCode?: string;
  equipmentName?: string;
  equipmentValue?: number;
  durationDays?: number;
  location?: string;
  message?: string;
  category?: string;
  reason?: string;
  specificQuestion?: string;
}

interface EquipmentCardData {
  id: string;
  assetCode: string;
  name: string;
  category?: string;
  value: number;
  formattedValue?: string;
  countInStock: number;
  location?: string;
  isHighValue?: boolean;
  status?: string;
}

interface Message {
  sender: "user" | "agent";
  text: string;
  equipments?: EquipmentCardData[];
  loan?: LoanCardData;
  escalation?: any;
  timestamp?: Date;
}

const AIAgentChat: React.FC = () => {
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"EMPLOYEE" | "MANAGER">(() => {
    return (localStorage.getItem("equip_active_role") as any) || "EMPLOYEE";
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Lắng nghe thay đổi vai trò từ RoleSwitcher
  useEffect(() => {
    const handleRoleChanged = (e: any) => {
      if (e.detail?.role) {
        setUserRole(e.detail.role);
      }
    };
    window.addEventListener("equip_role_changed", handleRoleChanged);
    return () => window.removeEventListener("equip_role_changed", handleRoleChanged);
  }, []);

  // Lắng nghe sự kiện mượn nhanh từ Equipment Catalog
  useEffect(() => {
    const handleAgentPrompt = (e: any) => {
      const { prompt } = e.detail || {};
      if (prompt) {
        setIsMinimized(false);
        setTimeout(() => {
          sendMessageWithText(prompt);
        }, 300);
      }
    };
    window.addEventListener("equip_agent_prompt", handleAgentPrompt);
    return () => window.removeEventListener("equip_agent_prompt", handleAgentPrompt);
  }, [sessionId]);

  // Tin nhắn chào mừng khởi đầu
  useEffect(() => {
    if (messages.length === 0 && !isMinimized) {
      setMessages([
        {
          sender: "agent",
          text: "Xin chào! Tôi là **EquipReferee** 🤖 — Trọng tài AI tự hành điều phối & cấp phát thiết bị nội bộ.\n\n*\"AI tự làm việc. AI biết giới hạn. Con người giữ quyền quyết định.\"*\n\n🛡️ **Quy chế thẩm quyền:**\n- **Thường quy (≤ 20M & ≤ 7 ngày):** Tự động phê duyệt 100% & cấp mã PIN nhận đồ.\n- **Vượt thẩm quyền (> 20M hoặc > 7 ngày):** Chuyển tiếp Quản lý quyết định.",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isMinimized]);

  // Kết nối Socket.IO
  useEffect(() => {
    const socket = io("http://localhost:5000", {
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 [Socket.IO] Connected to EquipReferee Agent Server!");
    });

    // Chunk text stream thời gian thực
    socket.on("agent_response_chunk", (data: { text: string; sessionId: string }) => {
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

    // Kết thúc stream kèm payload cấu trúc
    socket.on("agent_response_end", (data: any) => {
      console.log("📡 [Socket.IO] agent_response_end received:", data);
      if (data.sessionId) setSessionId(data.sessionId);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === "agent") {
          const replyText = data.reply || lastMsg.text || "Tôi đã xử lý yêu cầu của bạn.";

          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              text: replyText,
              equipments: data.payload?.equipments || undefined,
              loan: data.payload?.loan || (data.payload?.escalation ? { ...data.payload.escalation, status: "ESCALATED_PENDING" } : undefined),
              escalation: data.payload?.escalation || undefined,
            },
          ];
        }
        return prev;
      });

      setLoading(false);
    });

    // WebMCP Tool Handler
    socket.on("execute_webmcp_tool", async (data: { executionId: string; toolName: string; args: any }) => {
      const { executionId, toolName, args } = data;
      console.log(`🌐 [WebMCP] Server yêu cầu client thực thi tool [${toolName}]:`, args);
      try {
        const result = await webMcpManager.executeTool(toolName, args);
        socket.emit(`webmcp_tool_result_${executionId}`, result);
      } catch (err: any) {
        socket.emit(`webmcp_tool_result_${executionId}`, {
          success: false,
          error: err?.message || "WebMCP tool error",
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // Gửi tin nhắn văn bản
  const sendMessageWithText = (textToSend: string) => {
    if (!textToSend.trim() || loading || !socketRef.current) return;

    const userMsg: Message = {
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    const agentPlaceholder: Message = {
      sender: "agent",
      text: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, agentPlaceholder]);
    setLoading(true);

    try {
      const token = getToken ? getToken() : null;
      socketRef.current.emit("client_send_message", {
        message: textToSend,
        sessionId,
        userId: user?.id || null,
        token,
        hasWebMCP: true,
      });
    } catch (err) {
      console.error("Socket emit error:", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          sender: "agent",
          text: "⚠️ Lỗi kết nối đến máy chủ Agent. Vui lòng thử lại!",
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessageWithText(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([
      {
        sender: "agent",
        text: "Đã tạo phiên làm việc mới. Mời bạn nhập yêu cầu tra cứu hoặc cấp phát thiết bị!",
        timestamp: new Date(),
      },
    ]);
  };

  // Quản lý phê duyệt trực tiếp trên Chat Card
  const handleApproveLoan = async (loanId?: string) => {
    if (!loanId) return;
    try {
      const res = await approveLoan(loanId, {
        approverName: "Quản lý Lab (Phê duyệt qua Chat)",
        managerNote: "Đã thẩm định nhu cầu, đồng ý cấp phát",
      });
      alert(`✅ Đã phê duyệt! Mã nhận đồ: ${res.pickupCode}`);

      // Cập nhật card trên UI
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.loan && (msg.loan.loanId === loanId || msg.loan.requestCode === loanId)) {
            return {
              ...msg,
              loan: {
                ...msg.loan,
                status: "APPROVED",
                pickupCode: res.pickupCode,
                message: `Quản lý đã phê duyệt thành công. Mã nhận đồ: ${res.pickupCode}`,
              },
            };
          }
          return msg;
        })
      );
    } catch (err: any) {
      alert("Lỗi khi phê duyệt: " + (err?.response?.data?.message || err.message));
    }
  };

  // Quản lý từ chối trực tiếp trên Chat Card
  const handleRejectLoan = async (loanId?: string) => {
    if (!loanId) return;
    try {
      await rejectLoan(loanId, {
        approverName: "Quản lý Lab",
        reason: "Yêu cầu chưa đủ căn cứ phê duyệt",
      });
      alert("❌ Đã từ chối phiếu mượn.");

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.loan && (msg.loan.loanId === loanId || msg.loan.requestCode === loanId)) {
            return {
              ...msg,
              loan: {
                ...msg.loan,
                status: "REJECTED",
                message: "Quản lý đã từ chối cấp phát thiết bị này.",
              },
            };
          }
          return msg;
        })
      );
    } catch (err: any) {
      alert("Lỗi khi từ chối: " + (err?.response?.data?.message || err.message));
    }
  };

  // Hoàn tác trực tiếp trên Chat Card
  const handleRollbackLoan = async (loanId?: string) => {
    if (!loanId) return;
    if (!window.confirm("Bạn có chắc chắn muốn HOÀN TÁC và khôi phục tồn kho?")) return;
    try {
      const res = await rollbackLoan(loanId, {
        actorName: "Quản lý / Giám khảo",
        reason: "Hoàn tác can thiệp từ Chat UI",
      });
      alert(`Đã hoàn tác thành công! ${res.message || ""}`);

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.loan && (msg.loan.loanId === loanId || msg.loan.requestCode === loanId)) {
            return {
              ...msg,
              loan: {
                ...msg.loan,
                status: "CANCELLED",
                message: "Đã hoàn tác và khôi phục tồn kho thực tế vào Database.",
              },
            };
          }
          return msg;
        })
      );
    } catch (err: any) {
      alert("Lỗi khi hoàn tác: " + (err?.response?.data?.message || err.message));
    }
  };

  // Nút thu nhỏ
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 rounded-full shadow-2xl flex items-center justify-center hover:shadow-amber-500/40 transition-all duration-300 z-50 hover:scale-110 group cursor-pointer border-2 border-amber-300/40"
        title="Mở Trợ lý EquipReferee AI"
      >
        <FaRobot className="text-2xl" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-gray-900 animate-ping"></span>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-gray-900"></span>

        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-amber-300 text-xs py-1.5 px-3 rounded-xl whitespace-nowrap border border-gray-700 shadow-xl">
          🤖 Chat với EquipReferee AI
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] max-w-[calc(100vw-32px)] h-[640px] bg-gray-950 text-gray-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-amber-500/30 z-50 animate-fade-in font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-amber-950/40 border-b border-gray-800 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-gray-950 flex items-center justify-center font-bold text-lg shadow-md shadow-amber-500/20">
            <FaRobot />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-base">EquipReferee AI</h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                Online
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Trọng tài Phê duyệt Tự hành</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleNewChat}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            title="Phiên mới"
          >
            <FaRedo className="text-xs" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            title="Thu nhỏ"
          >
            <FaMinus className="text-xs" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            title="Đóng"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>
      </div>

      {/* Quick Prompts Banner */}
      <div className="px-4 py-2 bg-gray-900/90 border-b border-gray-800/80 flex items-center space-x-2 overflow-x-auto text-[11px]">
        <span className="text-amber-400 font-semibold flex items-center whitespace-nowrap">
          <FaBolt className="mr-1" /> Thử ngay:
        </span>
        <button
          onClick={() => sendMessageWithText("Mượn chuột quang Logitech 2 ngày")}
          className="px-2.5 py-1 bg-gray-800 hover:bg-emerald-950 hover:border-emerald-500/50 border border-gray-700 text-gray-300 hover:text-emerald-300 rounded-lg whitespace-nowrap transition cursor-pointer"
        >
          Chuột 2 ngày (Tự duyệt)
        </button>
        <button
          onClick={() => sendMessageWithText("Mượn Máy quay Sony A7IV 10 ngày làm đồ án")}
          className="px-2.5 py-1 bg-gray-800 hover:bg-purple-950 hover:border-purple-500/50 border border-gray-700 text-gray-300 hover:text-purple-300 rounded-lg whitespace-nowrap transition cursor-pointer"
        >
          Sony A7IV 10 ngày (Chuyển tiếp)
        </button>
        <button
          onClick={() => sendMessageWithText("Cho tôi mượn máy ảnh")}
          className="px-2.5 py-1 bg-gray-800 hover:bg-amber-950 hover:border-amber-500/50 border border-gray-700 text-gray-300 hover:text-amber-300 rounded-lg whitespace-nowrap transition cursor-pointer"
        >
          Thiếu ngày (Mờ thông tin)
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex items-start gap-2.5 max-w-[90%] ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-amber-500 text-gray-950 font-bold"
                }`}
              >
                {msg.sender === "user" ? <FaUser /> : <FaRobot />}
              </div>

              <div className="flex flex-col gap-2">
                {/* Bubble Text */}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md"
                      : "bg-gray-800/90 text-gray-100 rounded-tl-none border border-gray-700/80 shadow-md"
                  }`}
                >
                  {!msg.text && loading && idx === messages.length - 1 ? (
                    <div className="flex items-center space-x-1.5 py-1 text-amber-400">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                      <span className="text-xs text-gray-400 ml-1">EquipReferee đang thẩm định...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}
                </div>

                {/* THẺ QUYẾT ĐỊNH PHIẾU MƯỢN (LOAN DECISION CARD) */}
                {msg.loan && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-2.5 shadow-lg ${
                      msg.loan.status === "AUTO_APPROVED" || msg.loan.status === "APPROVED" || msg.loan.status === "DISPATCHED"
                        ? "bg-emerald-950/40 border-emerald-500/40"
                        : msg.loan.status === "ESCALATED_PENDING"
                        ? "bg-purple-950/40 border-purple-500/40"
                        : msg.loan.status === "CANCELLED"
                        ? "bg-gray-900 border-gray-700 opacity-80"
                        : "bg-red-950/40 border-red-500/40"
                    }`}
                  >
                    {/* Header Card */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        {msg.loan.status === "AUTO_APPROVED" || msg.loan.status === "APPROVED" || msg.loan.status === "DISPATCHED" ? (
                          <FaCheckCircle className="text-emerald-400 text-sm" />
                        ) : msg.loan.status === "ESCALATED_PENDING" ? (
                          <FaExclamationTriangle className="text-amber-400 text-sm" />
                        ) : (
                          <FaShieldAlt className="text-red-400 text-sm" />
                        )}

                        <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                          {msg.loan.status === "AUTO_APPROVED"
                            ? "TỰ ĐỘNG PHÊ DUYỆT 100%"
                            : msg.loan.status === "APPROVED"
                            ? "QUẢN LÝ ĐÃ PHÊ DUYỆT"
                            : msg.loan.status === "ESCALATED_PENDING"
                            ? "CHUYỂN TIẾP QUẢN LÝ PHÊ DUYỆT"
                            : msg.loan.status === "CANCELLED"
                            ? "ĐÃ HOÀN TÁC (CANCELLED)"
                            : "TỪ CHỐI CẤP PHÁT"}
                        </span>
                      </div>

                      {msg.loan.requestCode && (
                        <span className="font-mono text-[10px] text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">
                          {msg.loan.requestCode}
                        </span>
                      )}
                    </div>

                    {/* Pickup Code Highlight */}
                    {msg.loan.pickupCode && (
                      <div className="p-2.5 rounded-lg bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-emerald-300 flex items-center">
                            <FaKey className="mr-1" /> Mã nhận đồ tại kho:
                          </p>
                          <p className="font-mono text-xl font-extrabold text-emerald-300 tracking-wider">
                            {msg.loan.pickupCode}
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-gray-300">
                          <p className="flex items-center justify-end">
                            <FaMapMarkerAlt className="mr-1 text-gray-400" />
                            {msg.loan.location || "Kho Trung tâm"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Escalation details & questions */}
                    {msg.loan.status === "ESCALATED_PENDING" && (
                      <div className="space-y-2">
                        {msg.loan.category && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/50 p-2 rounded border border-amber-800/40">
                            <strong>Phân loại:</strong> {msg.loan.category}
                          </div>
                        )}

                        {msg.loan.reason && (
                          <p className="text-gray-300 text-[11px]">
                            <strong>Lý do:</strong> {msg.loan.reason}
                          </p>
                        )}

                        {/* Thao tác dành cho Quản lý / Giám khảo */}
                        <div className="pt-2 border-t border-purple-800/30">
                          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                            <span className="flex items-center text-purple-300">
                              <FaUserShield className="mr-1" /> Phê duyệt thẩm quyền
                            </span>
                            <span className="text-[10px] text-gray-400">Vai trò: {userRole}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleApproveLoan(msg.loan?.loanId || msg.loan?.requestCode)}
                              className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <FaCheckCircle />
                              <span>Phê duyệt ngay</span>
                            </button>
                            <button
                              onClick={() => handleRejectLoan(msg.loan?.loanId || msg.loan?.requestCode)}
                              className="py-1.5 px-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <FaTimes />
                              <span>Từ chối</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nút Rollback cho phép hoàn tác thực tế */}
                    {(msg.loan.status === "APPROVED" || msg.loan.status === "AUTO_APPROVED" || msg.loan.status === "DISPATCHED") && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => handleRollbackLoan(msg.loan?.loanId || msg.loan?.requestCode)}
                          className="text-[11px] text-orange-300 hover:text-orange-200 flex items-center space-x-1 px-2 py-1 rounded bg-orange-950/40 border border-orange-500/30 hover:bg-orange-900/50 transition cursor-pointer"
                          title="Hoàn tác và khôi phục tồn kho"
                        >
                          <FaUndo className="text-[10px]" />
                          <span>Hoàn tác phiếu này</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* DANH SÁCH THẺ THIẾT BỊ TRẢ VỀ */}
                {msg.equipments && msg.equipments.length > 0 && (
                  <div className="space-y-2 mt-1">
                    {msg.equipments.map((eq) => (
                      <div
                        key={eq.id || eq.assetCode}
                        className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-xs hover:border-gray-700 transition"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                              {eq.assetCode}
                            </span>
                            <span className="font-bold text-white">{eq.name}</span>
                          </div>
                          <div className="text-gray-400 text-[11px] mt-1">
                            {eq.formattedValue || eq.value?.toLocaleString("vi-VN") + " đ"} • Còn {eq.countInStock} tại {eq.location || "Kho"}
                          </div>
                        </div>

                        <button
                          onClick={() => sendMessageWithText(`Mượn ${eq.name} 2 ngày`)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg transition whitespace-nowrap cursor-pointer"
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

      {/* Input Box */}
      <div className="p-3 bg-gray-950 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập yêu cầu: 'Mượn chuột 2 ngày', 'Tra cứu máy quay'..."
            disabled={loading}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-hidden focus:border-amber-500 transition"
          />

          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-gray-950 rounded-xl transition shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <FaPaperPlane className={loading ? "animate-pulse" : ""} />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-500 mt-1.5">
          EquipReferee AI • Deterministic Policy Gate & Real Compensating Rollback
        </p>
      </div>
    </div>
  );
};

export default AIAgentChat;
              className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-500"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
          >
            <FaPaperPlane className={loading ? "animate-pulse" : ""} />
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-2">
          E-ComMate • Luôn sẵn sàng hỗ trợ bạn 🚀
        </p>
      </div>
    </div>
  );
};

export default AIAgentChat;
