// frontend/src/components/AuditTrailView.jsx
// ============================================================
// AGENT LIVE TERMINAL CONSOLE — Màn Hình Log Terminal Thời Gian Thực
// Mô phỏng Terminal Node.js: Luồng suy luận, Tool Execution & Quyết Định của AI
// Bắn log thời gian thực qua Socket.IO khi hỏi AI
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import {
  Terminal,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Zap,
  ArrowDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
  Maximize2,
  Sliders,
  ChevronDown,
  ChevronRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import api from "../api";

const LOG_FILTERS = [
  { key: "ALL", label: "Tất cả", color: "text-slate-300 border-slate-700 bg-slate-800/40" },
  { key: "REQUEST", label: "Yêu cầu (Request)", color: "text-cyan-400 border-cyan-700/60 bg-cyan-950/40" },
  { key: "INTENT", label: "Ý định (Intent)", color: "text-purple-400 border-purple-700/60 bg-purple-950/40" },
  { key: "REASONING", label: "Suy luận (Think)", color: "text-amber-400 border-amber-700/60 bg-amber-950/40" },
  { key: "TOOL_CALL", label: "Gọi Tool", color: "text-yellow-300 border-yellow-700/60 bg-yellow-950/40" },
  { key: "TOOL_RESULT", label: "Kết quả Tool", color: "text-emerald-400 border-emerald-700/60 bg-emerald-950/40" },
  { key: "DECISION", label: "Phán quyết", color: "text-fuchsia-400 border-fuchsia-700/60 bg-fuchsia-950/40" },
  { key: "ERROR", label: "Lỗi", color: "text-rose-400 border-rose-700/60 bg-rose-950/40" },
];

export default function AuditTrailView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState({});

  const terminalEndRef = useRef(null);
  const terminalContainerRef = useRef(null);
  const socketRef = useRef(null);

  // 1. Nạp log ban đầu từ Backend API
  const fetchTerminalLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/agent/terminal-logs?limit=250&_t=${Date.now()}`);
      if (res.data?.success) {
        setLogs(res.data.data || []);
      }
    } catch (e) {
      console.warn("Không thể nạp terminal log:", e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Xóa sạch log buffer
  const clearTerminalLogs = async () => {
    try {
      await api.post("/agent/terminal-logs/clear");
      setLogs([]);
    } catch (e) {
      console.warn("Lỗi xóa terminal log:", e.message);
    }
  };

  // 3. Sao chép toàn bộ log dạng plain text
  const copyAllLogs = () => {
    const textData = logs
      .map((l) => `[${l.timeFormatted || l.timestamp}] [${l.type || "INFO"}] ${l.text}${l.details ? "\n  " + JSON.stringify(l.details) : ""}`)
      .join("\n");
    navigator.clipboard.writeText(textData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 4. Bật tắt xem chi tiết từng log
  const toggleDetail = (id) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 5. Kết nối Socket.IO nhận log bắn thời gian thực
  useEffect(() => {
    fetchTerminalLogs();

    const socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("agent_terminal_log", (entry) => {
      setLogs((prev) => {
        if (prev.some((p) => p.id === entry.id)) return prev;
        return [...prev.slice(-300), entry];
      });
    });

    socket.on("agent_terminal_clear", () => {
      setLogs([]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 6. Tự động cuộn xuống cuối terminal
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Lọc log theo filter
  const filteredLogs = activeFilter === "ALL"
    ? logs
    : logs.filter((l) => l.type === activeFilter);

  // Thống kê nhanh
  const stats = {
    total: logs.length,
    tools: logs.filter((l) => l.type === "TOOL_CALL").length,
    decisions: logs.filter((l) => l.type === "DECISION").length,
    errors: logs.filter((l) => l.type === "ERROR").length,
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Agent Live Terminal Console
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  socketConnected
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 animate-pulse"
                    : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                }`}>
                  {socketConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {socketConnected ? "LIVE STREAMING" : "OFFLINE"}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Màn hình dòng lệnh Node.js: Theo dõi suy luận, Tool Execution & Quyết định của AI Agent theo thời gian thực
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút bật/tắt Auto-Scroll */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              autoScroll
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
            title="Tự động cuộn theo log mới"
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? "animate-bounce" : ""}`} />
            <span>Auto-scroll: {autoScroll ? "ON" : "OFF"}</span>
          </button>

          {/* Nút Sao chép */}
          <button
            onClick={copyAllLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Sao chép toàn bộ log terminal"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã chép" : "Copy Log"}</span>
          </button>

          {/* Nút Xóa console */}
          <button
            onClick={clearTerminalLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/50 text-slate-400 transition cursor-pointer disabled:opacity-50"
            title="Xóa sạch màn hình log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa log</span>
          </button>

          {/* Nút Làm mới */}
          <button
            onClick={fetchTerminalLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Đang nạp..." : "Làm mới"}</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Bar & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
        {/* KPI Counter */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span className="text-slate-400">
            Dòng log: <strong className="text-white text-xs">{stats.total}</strong>
          </span>
          <span className="text-yellow-400">
            Tool gọi: <strong className="text-yellow-300 text-xs">{stats.tools}</strong>
          </span>
          <span className="text-fuchsia-400">
            Phán quyết: <strong className="text-fuchsia-300 text-xs">{stats.decisions}</strong>
          </span>
          {stats.errors > 0 && (
            <span className="text-rose-400">
              Lỗi: <strong className="text-rose-300 text-xs">{stats.errors}</strong>
            </span>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3 h-3 text-slate-500 mr-1 flex-shrink-0" />
          {LOG_FILTERS.map((f) => {
            const count = f.key === "ALL" ? logs.length : logs.filter((l) => l.type === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                  activeFilter === f.key
                    ? f.color
                    : "text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {f.label} <span className="opacity-60 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TERMINAL CONSOLE WINDOW */}
      <div className="rounded-2xl border border-slate-800 bg-[#050811] shadow-2xl overflow-hidden font-mono">
        {/* Terminal Titlebar (macOS Style) */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
            </div>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              node --agent-orchestrator.js (PID: 16584)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="hidden sm:inline">UTF-8</span>
            <span>•</span>
            <span className="text-emerald-400">Socket.IO :5000</span>
          </div>
        </div>

        {/* Terminal Screen Body */}
        <div
          ref={terminalContainerRef}
          className="p-4 sm:p-5 min-h-[500px] max-h-[680px] overflow-y-auto space-y-2 select-text text-[11px] leading-relaxed text-slate-200"
        >
          {/* Welcome Prompt */}
          <div className="pb-3 border-b border-slate-800/80 text-slate-500 space-y-1">
            <p className="text-emerald-400 font-bold">
              $ node modules/ai-agent/core/AgentOrchestrator.js --listen --socket-stream
            </p>
            <p className="text-slate-400 text-[10px]">
              [The Escalation Referee Engine v2.0] — Deterministic Policy Rules & Real-time Reasoning Logger
            </p>
            <p className="text-slate-500 text-[10px]">
              💡 Hãy mở Đấu Trường AI Arena hoặc chạy "Verify Harness 90s" — từng dòng suy luận sẽ bắn trực tiếp tại đây.
            </p>
          </div>

          {/* Danh sách log */}
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Terminal className="w-10 h-10 text-slate-700 mx-auto animate-pulse" />
              <p className="text-xs text-slate-400 font-semibold">Chưa có dòng log nào cho bộ lọc này</p>
              <p className="text-[10px] text-slate-600">
                Khi AI Agent tiếp nhận câu hỏi, log bước xử lý sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              let tagColor = "text-slate-400 bg-slate-800/60 border-slate-700";
              let tag = log.type || "INFO";
              let prefixIcon = "•";

              if (log.type === "REQUEST") {
                tagColor = "text-cyan-400 bg-cyan-950/50 border-cyan-800/60 font-semibold";
                prefixIcon = ">";
              } else if (log.type === "INTENT") {
                tagColor = "text-purple-400 bg-purple-950/50 border-purple-800/60 font-semibold";
                prefixIcon = "⚡";
              } else if (log.type === "REASONING") {
                tagColor = "text-amber-400 bg-amber-950/50 border-amber-800/60 font-semibold";
                prefixIcon = "🧠";
              } else if (log.type === "TOOL_CALL") {
                tagColor = "text-yellow-300 bg-yellow-950/50 border-yellow-800/60 font-bold";
                prefixIcon = "⚙️";
              } else if (log.type === "TOOL_RESULT") {
                tagColor = "text-emerald-400 bg-emerald-950/50 border-emerald-800/60 font-semibold";
                prefixIcon = "✅";
              } else if (log.type === "DECISION") {
                tagColor = "text-fuchsia-400 bg-fuchsia-950/50 border-fuchsia-800/60 font-bold";
                prefixIcon = "🛡️";
              } else if (log.type === "ERROR") {
                tagColor = "text-rose-400 bg-rose-950/50 border-rose-800/60 font-bold";
                prefixIcon = "❌";
              }

              const hasDetails = log.details != null;
              const isExpanded = !!expandedDetails[log.id || idx];

              return (
                <div
                  key={log.id || idx}
                  className="group hover:bg-slate-900/40 p-1.5 rounded-lg transition-colors border-b border-slate-900/40 last:border-b-0 space-y-1"
                >
                  <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
                    {/* Timestamp */}
                    <span className="text-slate-500 select-none text-[10px] w-20 flex-shrink-0">
                      [{log.timeFormatted || new Date(log.timestamp).toLocaleTimeString("vi-VN")}]
                    </span>

                    {/* Tag Badge */}
                    <span className={`px-1.5 py-0.2 rounded text-[9px] border flex-shrink-0 flex items-center gap-1 ${tagColor}`}>
                      <span>{prefixIcon}</span>
                      <span>[{tag}]</span>
                    </span>

                    {/* Log text content */}
                    <span className="text-slate-200 flex-1 break-words font-medium">
                      {log.text}
                    </span>

                    {/* Nút xem chi tiết nếu có details */}
                    {hasDetails && (
                      <button
                        onClick={() => toggleDetail(log.id || idx)}
                        className="text-[10px] text-slate-500 hover:text-amber-400 transition flex items-center gap-0.5 cursor-pointer select-none ml-auto"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span>{isExpanded ? "Ẩn JSON" : "Chi tiết"}</span>
                      </button>
                    )}
                  </div>

                  {/* Expanded JSON Details */}
                  {hasDetails && isExpanded && (
                    <div className="mt-1.5 ml-24 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-emerald-300 overflow-x-auto shadow-inner">
                      <pre className="whitespace-pre-wrap">
                        {typeof log.details === "string"
                          ? log.details
                          : JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Active Terminal Cursor */}
          <div className="pt-2 flex items-center gap-2 text-emerald-400 select-none">
            <span className="text-slate-600">$</span>
            <span className="text-slate-400 text-xs">agent-session-stream</span>
            <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse"></span>
          </div>

          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
