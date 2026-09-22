// src/components/common/LiveTerminalConsole.jsx
// LIVE AGENT TERMINAL CONSOLE — Cửa sổ theo dõi log suy luận tác tử thời gian thực (Chuẩn DA_IELS_NEW)

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, RefreshCw, Trash2, ShieldCheck, Sparkles, Activity } from 'lucide-react';
import api from '../../services/api';
import getSocket from '../../services/socket';

export default function LiveTerminalConsole({ maxHeight = 'max-h-[350px]', className = '' }) {
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const terminalEndRef = useRef(null);
  const socket = getSocket();

  // Nạp lịch sử log từ API khi mount
  const fetchTerminalLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/agent/terminal-logs?limit=150&_t=${Date.now()}`);
      if (res.data?.success) {
        setTerminalLogs(res.data.data || []);
      }
    } catch (e) {
      console.warn('Không thể nạp terminal log:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Xóa log
  const clearTerminalLogs = async () => {
    try {
      await api.post('/agent/terminal-logs/clear');
      setTerminalLogs([]);
    } catch (e) {
      console.warn('Không thể xóa terminal log:', e.message);
    }
  };

  useEffect(() => {
    fetchTerminalLogs();
  }, []);

  // Tự động cuộn xuống cuối khi có log mới
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Lắng nghe Socket.IO thời gian thực
  useEffect(() => {
    const handleLog = (entry) => {
      setTerminalLogs((prev) => {
        // Tránh trùng ID
        if (prev.some((p) => p.id === entry.id)) return prev;
        return [...prev, entry];
      });
    };

    const handleClear = () => {
      setTerminalLogs([]);
    };

    socket.on('agent_terminal_log', handleLog);
    socket.on('agent_terminal_clear', handleClear);

    return () => {
      socket.off('agent_terminal_log', handleLog);
      socket.off('agent_terminal_clear', handleClear);
    };
  }, [socket]);

  // Helper gán màu sắc từng thẻ log chuẩn AI Reasoning
  const getBadgeStyle = (type, step) => {
    const t = (type || step || 'INFO').toUpperCase();
    if (t === 'REQUEST' || t === 'START') {
      return 'text-cyan-300 bg-cyan-950/60 border-cyan-800/80 font-bold';
    }
    if (t === 'INTENT' || t === 'CONTEXT_RESOLVED') {
      return 'text-purple-300 bg-purple-950/60 border-purple-800/80 font-bold';
    }
    if (t === 'REASONING' || t === 'THOUGHT') {
      return 'text-amber-300 bg-amber-950/60 border-amber-800/80 font-bold';
    }
    if (t === 'TOOL_CALL' || t === 'TOOL_INVOCATION') {
      return 'text-yellow-300 bg-yellow-950/60 border-yellow-800/80 font-extrabold';
    }
    if (t === 'TOOL_RESULT' || t === 'TOOL_OBSERVATION') {
      return 'text-emerald-300 bg-emerald-950/60 border-emerald-800/80 font-bold';
    }
    if (t === 'DECISION' || t === 'COMPLETE') {
      return 'text-fuchsia-300 bg-fuchsia-950/60 border-fuchsia-800/80 font-extrabold';
    }
    if (t === 'ERROR') {
      return 'text-rose-300 bg-rose-950/60 border-rose-800/80 font-extrabold';
    }
    return 'text-slate-300 bg-slate-800/60 border-slate-700';
  };

  return (
    <div className={`flex flex-col bg-[#070b14] border border-slate-800 rounded-xl overflow-hidden shadow-2xl ${className}`}>
      
      {/* Header phong cách macOS Terminal */}
      <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        
        {/* 3 nút chấm tròn macOS */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>

          <div className="h-3 w-px bg-slate-700 mx-1"></div>

          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-200">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Reasoning Terminal</span>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live
          </span>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchTerminalLogs}
            disabled={loading}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Làm mới log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          <button
            onClick={clearTerminalLogs}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Xóa toàn bộ log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Vùng hiển thị log terminal */}
      <div className={`p-3 font-mono text-[11px] overflow-y-auto space-y-2 select-text ${maxHeight}`}>
        {terminalLogs.length === 0 ? (
          <div className="py-8 text-center space-y-1.5 text-slate-500 select-none">
            <p className="text-slate-400 text-xs">$ node --agent-orchestrator.js</p>
            <p className="text-slate-600 text-[10px]">
              Sẵn sàng! Hãy chat câu hỏi hoặc nộp đơn để xem các nhịp suy luận ReAct và Tool Execution bắn thời gian thực...
            </p>
          </div>
        ) : (
          terminalLogs.map((log, idx) => {
            const tag = log.step || log.type || 'INFO';
            const badgeClass = getBadgeStyle(log.type, log.step);
            const timeStr = log.timeFormatted || log.timestamp || '';

            return (
              <div
                key={log.id || idx}
                className="space-y-0.5 leading-relaxed border-b border-slate-900/80 pb-1.5 last:border-b-0 animate-fade-in"
              >
                <div className="flex items-start gap-1.5 flex-wrap">
                  {timeStr && (
                    <span className="text-slate-500 text-[10px] select-none shrink-0 font-mono">
                      [{timeStr}]
                    </span>
                  )}
                  <span className={`px-1.5 py-0.2 rounded text-[9px] border font-mono shrink-0 ${badgeClass}`}>
                    {tag}
                  </span>
                  <span className="text-slate-200 flex-1 break-words font-mono text-[11px]">
                    {log.text || log.message}
                  </span>
                </div>

                {/* Chi tiết đính kèm (Tool args hoặc Tool Result) */}
                {log.details && (
                  <div className="ml-4 pl-2 border-l border-slate-800 text-[10px] text-slate-400 font-mono mt-1">
                    {typeof log.details === 'string' ? (
                      <p className="line-clamp-3">{log.details}</p>
                    ) : (
                      <pre className="text-[9px] text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-28 bg-slate-950/60 p-1.5 rounded border border-slate-900">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Dấu nhắc lệnh và con trỏ terminal nhấp nháy */}
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] pt-1.5 select-none">
          <span className="text-slate-600">$</span>
          <span className="text-slate-500 text-[10px]">agent-trace</span>
          <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse"></span>
        </div>
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
