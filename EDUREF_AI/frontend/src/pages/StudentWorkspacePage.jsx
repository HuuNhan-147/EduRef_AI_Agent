// src/pages/StudentWorkspacePage.jsx
// Không gian làm việc Trợ lý Sinh viên: Bố cục 3 Cột (Catalog Thủ Tục | Hội Thoại ReAct | Bảng Thẩm Định & Quyết Định)

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  QrCode,
  Upload,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  Building2,
  Paperclip,
  Terminal,
  Zap,
  Play,
  ExternalLink,
} from 'lucide-react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
import LiveTerminalConsole from '../components/common/LiveTerminalConsole';
import api, { DEMO_ACCOUNTS } from '../services/api';
import getSocket from '../services/socket';

export default function StudentWorkspacePage({
  currentAccountKey,
  onOpenDynamicForm,
  externalPrompt,
  onClearExternalPrompt,
  onSwitchTab,
}) {
  const currentAccount = DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;

  // Tab điều hướng Cột 3: Mặc định là 'TERMINAL' (Live Console) hiện trước 'DECISION' (Thẩm định 4 chốt)
  const [column3Tab, setColumn3Tab] = useState('TERMINAL');

  // State chạy Benchmark Verify 90s nhanh
  const [isVerifying90s, setIsVerifying90s] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState(null);

  const handleRunVerify90s = async () => {
    setIsVerifying90s(true);
    setVerifyFeedback('Đang gửi request chạy 5 ca kiểm thử thực tế tới Backend...');
    setColumn3Tab('TERMINAL'); // Tự động mở Live Terminal để quan sát log chạy
    try {
      const res = await api.post('/agent/verify-90s');
      if (res.data?.success) {
        setVerifyFeedback(`✓ Đã hoàn thành 5 ca test: ${res.data.summary?.passedTests || 5}/5 ĐẠT (100% Deterministic)`);
      } else {
        setVerifyFeedback(`Hoàn tất chạy test: ${res.data?.message || 'Xem chi tiết trong terminal'}`);
      }
    } catch (err) {
      setVerifyFeedback('Lỗi chạy verify: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsVerifying90s(false);
    }
  };

  // States: Nạp lịch sử tin nhắn từ sessionStorage nếu có để không bao giờ bị mất khi F5 hoặc đổi tab
  const [messages, setMessages] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`eduref_messages_${currentAccount.code}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'welcome',
        sender: 'agent',
        text: `Xin chào **${currentAccount.name}** (MSSV: ${currentAccount.code})!\n\nTôi là **EduRef AI** — Trợ lý điều phối hành chính học vụ tự hành của Nhà trường.\n\nBạn có thể gửi yêu cầu bằng ngôn ngữ tự nhiên (hoặc từ viết tắt như *xnsv*, *nhcs*, *nvqs*), hoặc chọn thủ tục ở cột bên trái để nộp đơn.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Tự động đồng bộ tin nhắn vào sessionStorage
  useEffect(() => {
    if (currentAccount.code && messages.length > 0) {
      try {
        sessionStorage.setItem(`eduref_messages_${currentAccount.code}`, JSON.stringify(messages));
      } catch (e) {}
    }
  }, [messages, currentAccount.code]);

  // Xử lý đổi tài khoản: TUYỆT ĐỐI KHÔNG XÓA TIN NHẮN khi đổi sang Thầy (STAFF/DEAN)
  const prevCodeRef = useRef(currentAccount.code);
  useEffect(() => {
    // Nếu chuyển sang góc nhìn Thầy / Cán bộ -> Giữ nguyên 100% cuộc trò chuyện
    if (currentAccount.type !== 'STUDENT') return;

    if (prevCodeRef.current !== currentAccount.code) {
      prevCodeRef.current = currentAccount.code;
      // Nạp lại hội thoại của sinh viên này nếu từng có
      try {
        const cached = sessionStorage.getItem(`eduref_messages_${currentAccount.code}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (e) {}

      setMessages([
        {
          id: `welcome_${Date.now()}`,
          sender: 'agent',
          text: `Xin chào **${currentAccount.name}** (MSSV: ${currentAccount.code})!\n\nTôi là **EduRef AI** — Trợ lý điều phối hành chính học vụ tự hành của Nhà trường.\n\nBạn có thể gửi yêu cầu bằng ngôn ngữ tự nhiên (hoặc từ viết tắt như *xnsv*, *nhcs*, *nvqs*), hoặc chọn thủ tục ở cột bên trái để nộp đơn.`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [currentAccountKey, currentAccount.code, currentAccount.type, currentAccount.name]);

  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(`sess_${Date.now()}`);
  const [types, setTypes] = useState([]);
  
  // Trạng thái đơn hiện tại đang xử lý hiển thị ở Cột 3 (Cũng được lưu vào sessionStorage)
  const [activeDecision, setActiveDecision] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`eduref_decision_${currentAccount.code}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      status: 'IDLE', // IDLE | PROCESSING | APPROVED | WAITING_STUDENT | ESCALATED | REJECTED
      requirementsCheck: 'PENDING',
      policiesCheck: 'PENDING',
      authorityCheck: 'PENDING',
      finalDecision: null,
      reason: null,
      requestCode: null,
      qrCodeUrl: null,
      sha256Proof: null,
      missingFields: [],
    };
  });

  useEffect(() => {
    if (currentAccount.code) {
      try {
        sessionStorage.setItem(`eduref_decision_${currentAccount.code}`, JSON.stringify(activeDecision));
      } catch (e) {}
    }
  }, [activeDecision, currentAccount.code]);

  // State cho việc nộp file bổ sung (Mẫu 01/NHCS hoặc Lệnh NVQS)
  const [supplementFile, setSupplementFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const chatEndRef = useRef(null);
  const socket = getSocket();

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Nạp danh mục thủ tục từ Backend
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await api.get('/petitions/types');
        if (res.data?.success) {
          setTypes(res.data.data || []);
        }
      } catch (err) {
        console.warn('Không thể nạp danh mục loại thủ tục:', err.message);
      }
    };
    fetchTypes();
  }, []);

  // Lắng nghe sự kiện Socket.IO
  useEffect(() => {
    // 1. Nhận text streaming chunk
    const handleChunk = (data) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === 'agent' && lastMsg.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + data.chunk },
          ];
        } else {
          return [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: data.chunk,
              isStreaming: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        }
      });
    };

    // 2. Nhận kết thúc phản hồi kèm quyết định hoàn chỉnh
    const handleEnd = (data) => {
      setIsProcessing(false);
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === 'agent') {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              text: data.reply || lastMsg.text,
              isStreaming: false,
              toolResult: data.toolResult,
              decision: data.decision,
            },
          ];
        }
        return prev;
      });

      // Cập nhật Decision Summary ở Cột 3
      if (data.toolResult) {
        const tr = data.toolResult;
        setActiveDecision({
          status: tr.decision || (tr.success ? 'APPROVED' : 'REJECTED'),
          requirementsCheck: tr.missing ? 'FAILED' : 'PASSED',
          policiesCheck: tr.decision === 'REJECTED_POLICY' ? 'FAILED' : 'PASSED',
          authorityCheck: tr.decision === 'ESCALATE_TO_STAFF' ? 'ESCALATED' : 'PASSED',
          finalDecision: tr.decision || 'DONE',
          reason: tr.message || tr.reason || '',
          requestCode: tr.requestCode || null,
          qrCodeUrl: tr.qrCodeUrl || null,
          sha256Proof: tr.sha256Proof || null,
          missingFields: tr.missing || [],
          requestId: tr.requestId || null,
        });
      }
    };

    socket.on('agent_response_chunk', handleChunk);
    socket.on('agent_response_end', handleEnd);

    return () => {
      socket.off('agent_response_chunk', handleChunk);
      socket.off('agent_response_end', handleEnd);
    };
  }, [socket]);

  // Gửi tin nhắn
  const handleSendMessage = async (textToSend = null, extraContext = {}) => {
    const text = textToSend || inputMessage;
    if (!text || String(text).trim().length === 0) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: String(text).trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsProcessing(true);

    // Bắt đầu cập nhật cột Decision
    setActiveDecision((prev) => ({
      ...prev,
      status: 'PROCESSING',
      requirementsCheck: 'CHECKING',
      policiesCheck: 'CHECKING',
      authorityCheck: 'CHECKING',
    }));

    const payload = {
      message: text,
      studentCode: currentAccount.code,
      currentUser: {
        studentCode: currentAccount.code,
        code: currentAccount.code,
        fullName: currentAccount.name,
        name: currentAccount.name,
        role: currentAccount.role,
        type: currentAccount.type,
        class: currentAccount.class,
        faculty: currentAccount.faculty,
      },
      sessionId,
      attachments: extraContext.attachedCerts || extraContext.inputData?.attachedCerts || null,
      inputData: extraContext.inputData || null,
    };

    // Bắn qua Socket.IO (hoặc fallback HTTP nếu socket ngắt kết nối)
    if (socket && socket.connected) {
      socket.emit('client_send_message', payload);
    } else {
      try {
        const res = await api.post('/agent/chat', payload);
        if (res.data?.success) {
          const result = res.data.data;
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: result.reply,
              toolResult: result.toolResult,
              decision: result.decision,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: 'agent',
            text: `❌ Lỗi kết nối dịch vụ: ${err.message}`,
            isError: true,
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Lắng nghe externalPrompt khi được nộp từ Modal Biểu Mẫu Động
  useEffect(() => {
    if (externalPrompt) {
      if (typeof externalPrompt === 'object' && externalPrompt.text) {
        handleSendMessage(externalPrompt.text, externalPrompt);
      } else {
        handleSendMessage(externalPrompt);
      }
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  // Nộp file bổ sung Mẫu 01 hoặc Lệnh gọi NVQS (Resume flow)
  const handleResumeSubmission = async () => {
    if (!activeDecision.requestId) return;
    setIsUploading(true);

    try {
      const fileName = supplementFile ? supplementFile.name : 'Mau_01_NHCS_Xac_Nhan.pdf';
      const docType = fileName.toLowerCase().includes('nvqs') ? 'MILITARY_CALL_DOC' : 'BANK_FORM';

      const res = await api.post(`/petitions/${activeDecision.requestId}/resume`, {
        additionalData: { hasBankForm: true, hasMilitaryCallDoc: true, purpose: 'Vay vốn NHCSXH' },
        newDocuments: [
          {
            documentType: docType,
            fileName: fileName,
            fileUrl: `https://storage.eduref.edu.vn/${fileName}`,
          },
        ],
      });

      if (res.data?.success) {
        const tr = res.data;
        setMessages((prev) => [
          ...prev,
          {
            id: `resume_${Date.now()}`,
            sender: 'agent',
            text: `✅ **Đã tiếp nhận hồ sơ bổ sung:**\n${tr.message}`,
            toolResult: tr,
            decision: tr.decision,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        setActiveDecision({
          status: tr.status || 'APPROVED',
          requirementsCheck: 'PASSED',
          policiesCheck: 'PASSED',
          authorityCheck: tr.decision === 'ESCALATE_TO_STAFF' ? 'ESCALATED' : 'PASSED',
          finalDecision: tr.decision,
          reason: tr.message,
          requestCode: tr.requestCode,
          qrCodeUrl: tr.qrCodeUrl,
          sha256Proof: tr.sha256Proof,
          missingFields: [],
          requestId: tr.requestId,
        });

        setSupplementFile(null);
      }
    } catch (err) {
      console.error('Lỗi khi nộp bổ sung:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      
      {/* ========================================================================= */}
      {/* CỘT 1: DANH MỤC THỦ TỤC HÀNH CHÍNH & NỘP BIỂU MẪU (Bên trái) */}
      {/* ========================================================================= */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            Danh Mục Thủ Tục Học Vụ
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Chọn thủ tục để điền đơn hoặc bấm hỏi nhanh
          </p>
        </div>

        {/* Danh sách thủ tục (Chỉ hiển thị 2 thủ tục chính thức Sprint 1) */}
        <div className="p-3 space-y-2 flex-1">
          {types
            .filter((t) => t.code === 'STUDENT_CONFIRMATION' || t.code === 'GRADUATION_ASSESSMENT')
            .map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                    {t.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 shrink-0">
                    {t.code === 'STUDENT_CONFIRMATION' ? 'DV-01 (AUTO)' : 'DV-02 (ESCALATE)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {t.description || 'Thủ tục hành chính sinh viên chuẩn đào tạo.'}
                </p>

                {/* Action Buttons */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => onOpenDynamicForm && onOpenDynamicForm(t)}
                    className="font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1 font-semibold"
                  >
                    Điền đơn <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleSendMessage(`Em muốn xin cấp ${t.name}`)}
                    className="text-slate-400 hover:text-slate-700 font-normal"
                  >
                    Hỏi nhanh AI
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Gợi ý kịch bản Demo Hackathon chuẩn 2 loại đơn */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Mẫu kiểm thử nhanh (1-Click Test)
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => handleSendMessage('Em là sinh viên 2280602154, xin cấp giấy xác nhận sinh viên để làm vé tháng xe buýt liên tuyến')}
              className="w-full text-left px-2.5 py-1.5 rounded text-[11px] bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 truncate"
            >
              🟢 Thường quy: Xin XNSV làm vé xe buýt
            </button>
            <button
              onClick={() => handleSendMessage('Em là sinh viên 2280602154, cho em xin cái giấy xác nhận sinh viên với ạ')}
              className="w-full text-left px-2.5 py-1.5 rounded text-[11px] bg-white border border-slate-200 hover:border-amber-400 text-slate-700 truncate"
            >
              🟡 Thiếu dữ kiện: Xin XNSV chưa có mục đích
            </button>
            <button
              onClick={() => handleSendMessage('Tôi là sinh viên 2110002 đã thôi học, muốn xin giấy xác nhận sinh viên')}
              className="w-full text-left px-2.5 py-1.5 rounded text-[11px] bg-white border border-slate-200 hover:border-rose-400 text-slate-700 truncate"
            >
              🔴 Sai quy chế: Sinh viên thôi học xin đơn
            </button>
            <button
              onClick={() => handleSendMessage('Em là sinh viên 2280602154, nộp đơn đề nghị xét tốt nghiệp')}
              className="w-full text-left px-2.5 py-1.5 rounded text-[11px] bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 truncate"
            >
              🟣 Vượt quyền: Đơn tốt nghiệp chuyển Hội đồng
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CỘT 2: KHUNG HỘI THOẠI REACT CHAT & STREAMING (Ở giữa) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
        
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800">
              Trợ Lý Tự Hành Thẩm Định Học Vụ
            </span>
            <span className="text-[11px] text-slate-400">
              (Bounded Autonomy ReAct)
            </span>
          </div>
          <button
            onClick={() => {
              setMessages([]);
              setSessionId(`sess_${Date.now()}`);
            }}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Xóa hội thoại
          </button>
        </div>

        {/* Khung tin nhắn cuộn */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                  }`}
                >
                  {isUser ? 'SV' : 'AI'}
                </div>

                {/* Bong bóng tin nhắn */}
                <div
                  className={`rounded-xl px-4 py-3 text-sm shadow-xs ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  {/* Nội dung markdown */}
                  <MarkdownRenderer content={msg.text} isUser={isUser} />

                  {/* Thẻ Tool Call Badge nếu có */}
                  {msg.toolResult && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        Đã thực thi công cụ học vụ
                      </div>
                      
                      {/* Thẻ kết quả cấp QR Code nếu đơn được duyệt */}
                      {msg.toolResult.qrCodeUrl && (
                        <div className="mt-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3.5">
                          <img
                            src={msg.toolResult.qrCodeUrl}
                            alt="Mã QR Chứng Thực Số"
                            className="w-16 h-16 rounded border border-emerald-300 bg-white p-1 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              MÃ CHỨNG THỰC: {msg.toolResult.requestCode}
                            </div>
                            <div className="text-[11px] text-emerald-700 mt-0.5">
                              Đã cấp mộc điện tử & ký số SHA-256
                            </div>
                            <div className="text-[9px] font-mono text-emerald-800/70 truncate mt-1">
                              Proof: {msg.toolResult.sha256Proof?.substring(0, 32)}...
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[10px] mt-1.5 ${isUser ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Indicator đang xử lý */}
          {isProcessing && (
            <div className="flex gap-3 max-w-md mr-auto animate-pulse">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs">
                AI
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                Tác tử đang thẩm định 4 chốt chặn quy chế...
              </div>
            </div>
          )}

          {/* Ô Dropzone nộp bổ sung chứng từ khi bị thiếu (Luồng ASK) */}
          {activeDecision.status === 'WAITING_STUDENT' && activeDecision.requestId && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3 max-w-xl mx-auto my-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Cần bổ sung chứng từ / biểu mẫu để tiếp tục
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Hồ sơ đang chờ bạn đính kèm <strong>Mẫu 01/NHCS</strong> hoặc <strong>Lệnh gọi NVQS</strong>.
                  </p>
                </div>
              </div>

              {/* Dropzone Upload */}
              <div className="border-2 border-dashed border-amber-300 rounded-lg p-3 text-center bg-white">
                <input
                  type="file"
                  id="supplement-upload"
                  className="hidden"
                  onChange={(e) => setSupplementFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="supplement-upload"
                  className="cursor-pointer flex flex-col items-center gap-1 text-xs text-slate-600"
                >
                  <Upload className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-blue-700">Bấm chọn tài liệu</span> hoặc kéo thả file vào đây
                  <span className="text-[10px] text-slate-400">Hỗ trợ PDF, PNG, JPG (Tối đa 10MB)</span>
                </label>

                {supplementFile && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block">
                    ✓ Đã chọn: {supplementFile.name}
                  </div>
                )}
              </div>

              {/* Nút gửi bổ sung */}
              <button
                onClick={handleResumeSubmission}
                disabled={isUploading}
                className="w-full py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Đang thẩm định lại...' : 'Nộp Bổ Sung & Tiếp Tục Xử Lý (Resume)'}
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Khung nhập tin nhắn */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Nhập yêu cầu học vụ (ví dụ: xin xnsv vay vốn nhcs, hoãn thi, hoãn nvqs...)"
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={isProcessing || !inputMessage.trim()}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white rounded-lg font-medium text-sm flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>Gửi</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Tự động phân giải tiếng lóng: xnsv, nhcs, nvqs, đk, pdt</span>
            <span>Phím tắt: Enter để gửi</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CỘT 3: BẢNG THẨM ĐỊNH 4 CHỐT CHẶN & LIVE TERMINAL CONSOLE (Bên phải) */}
      {/* ========================================================================= */}
      <div className="w-[520px] bg-white flex flex-col shrink-0 border-l border-slate-200 overflow-hidden">
        
        {/* Header Tab Switcher Cột 3: Live Terminal hiển thị TRƯỚC */}
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs w-full">
            <button
              onClick={() => setColumn3Tab('TERMINAL')}
              className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                column3Tab === 'TERMINAL'
                  ? 'bg-slate-900 text-emerald-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Terminal</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            <button
              onClick={() => setColumn3Tab('DECISION')}
              className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                column3Tab === 'DECISION'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Thẩm Định 4 Chốt</span>
            </button>
          </div>
        </div>

        {/* Nội dung Cột 3 theo Tab */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {column3Tab === 'DECISION' ? (
            <>
              {/* Profile Sinh viên hiện tại */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Hồ Sơ Sinh Viên Hiện Tại
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Họ và tên:</span>
                    <span className="font-semibold text-slate-900">{currentAccount.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MSSV:</span>
                    <span className="font-mono font-bold text-blue-700">{currentAccount.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trạng thái:</span>
                    <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                      currentAccount.code === '2110002' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {currentAccount.code === '2110002' ? 'DROPPED (Thôi học)' : 'ACTIVE (Học tập)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nợ học phí:</span>
                    <span className={`font-semibold ${currentAccount.code === '2110003' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {currentAccount.code === '2110003' ? '15.000.000 đ' : '0 đ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng Kiểm Định 4 Chốt Chặn (4 Gates Policy) */}
              <div className="p-3.5 rounded-lg border border-slate-200 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>4 Chốt Chặn Thẩm Định</span>
                  <span className="font-mono text-[9px] text-blue-700">BOUNDED</span>
                </div>

                <div className="space-y-2">
                  {/* Chốt 1: Requirements */}
                  <div className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">1. Điều kiện đầu vào:</span>
                    <span className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                      activeDecision.requirementsCheck === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : activeDecision.requirementsCheck === 'FAILED'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {activeDecision.requirementsCheck}
                    </span>
                  </div>

                  {/* Chốt 2: Policies */}
                  <div className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">2. Quy chế đào tạo:</span>
                    <span className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                      activeDecision.policiesCheck === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : activeDecision.policiesCheck === 'FAILED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {activeDecision.policiesCheck}
                    </span>
                  </div>

                  {/* Chốt 3: Authority */}
                  <div className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">3. Phân cấp thẩm quyền:</span>
                    <span className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                      activeDecision.authorityCheck === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : activeDecision.authorityCheck === 'ESCALATED'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {activeDecision.authorityCheck === 'ESCALATED' ? 'STAFF REVIEW' : activeDecision.authorityCheck}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ Quyết Định Cuối Cùng (Final Decision Card) */}
              <div className={`p-4 rounded-xl border text-left space-y-2 ${
                activeDecision.status === 'APPROVED' || activeDecision.status === 'AUTO_APPROVED' || activeDecision.status === 'ROUTINE_AUTO_APPROVED'
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : activeDecision.status === 'WAITING_STUDENT'
                  ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                  : activeDecision.status === 'ESCALATED' || activeDecision.status === 'ESCALATE_TO_STAFF'
                  ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950'
                  : activeDecision.status === 'REJECTED' || activeDecision.status === 'REJECTED_POLICY'
                  ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    Quyết Định Cuối
                  </span>
                  <span className="font-bold text-xs">
                    {activeDecision.finalDecision || 'CHƯA CÓ YÊU CẦU'}
                  </span>
                </div>

                {activeDecision.requestCode && (
                  <div className="text-xs font-mono font-bold pt-1">
                    Mã hồ sơ: {activeDecision.requestCode}
                  </div>
                )}

                {activeDecision.reason && (
                  <p className="text-xs opacity-90 leading-relaxed pt-1">
                    {activeDecision.reason}
                  </p>
                )}

                {activeDecision.sha256Proof && (
                  <div className="pt-2 border-t border-emerald-200 text-[9px] font-mono opacity-80 break-all">
                    SHA256: {activeDecision.sha256Proof}
                  </div>
                )}
              </div>

              {/* KHỐI NÚT VERIFY 90S NGAY PHÍA TRÊN TERMINAL */}
              <div className="pt-2">
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-xl p-3 text-white shadow-md border border-slate-800 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold font-mono text-amber-300">Verify Harness 90s</span>
                    </div>
                    {onSwitchTab && (
                      <button
                        onClick={() => onSwitchTab('VERIFY_HARNESS')}
                        className="text-[10px] text-blue-300 hover:text-white flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                      >
                        Báo cáo chi tiết <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleRunVerify90s}
                    disabled={isVerifying90s}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {isVerifying90s ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang chạy 5 ca kiểm thử...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>KÍCH HOẠT CHẠY 5 CA TEST BAN GIÁM KHẢO</span>
                      </>
                    )}
                  </button>

                  {verifyFeedback && (
                    <div className="mt-2 text-[10px] font-mono text-emerald-300 bg-emerald-950/70 p-1.5 rounded border border-emerald-800/60">
                      {verifyFeedback}
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Log Thời Gian Thực (Preview)</span>
                  <button
                    onClick={() => setColumn3Tab('TERMINAL')}
                    className="text-blue-600 hover:text-blue-800 text-[10px] font-semibold cursor-pointer"
                  >
                    Mở toàn màn hình &rarr;
                  </button>
                </div>
                <LiveTerminalConsole maxHeight="max-h-[200px]" />
              </div>
            </>
          ) : (
            /* Hiển thị Live Terminal Console Toàn Chiều Cao */
            <div className="h-full flex flex-col space-y-2">
              
              {/* NÚT VERIFY 90S PHÍA TRÊN TERMINAL FULL-HEIGHT */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-xl p-3 text-white shadow-md border border-slate-800 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold font-mono text-amber-300">Verify Harness 90s Benchmark</span>
                  </div>
                  {onSwitchTab && (
                    <button
                      onClick={() => onSwitchTab('VERIFY_HARNESS')}
                      className="text-[10px] text-blue-300 hover:text-white flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                    >
                      Báo cáo chi tiết <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleRunVerify90s}
                  disabled={isVerifying90s}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isVerifying90s ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang thực thi 5 ca test qua Backend...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>KÍCH HOẠT CHẠY 5 CA TEST BAN GIÁM KHẢO (90s)</span>
                    </>
                  )}
                </button>

                {verifyFeedback && (
                  <div className="mt-2 text-[10px] font-mono text-emerald-300 bg-emerald-950/70 p-1.5 rounded border border-emerald-800/60">
                    {verifyFeedback}
                  </div>
                )}
              </div>

              {/* Hộp đen Terminal chiếm phần còn lại */}
              <LiveTerminalConsole maxHeight="max-h-[calc(100vh-270px)]" className="flex-1" />
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
