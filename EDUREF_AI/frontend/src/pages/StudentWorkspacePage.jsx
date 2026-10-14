// src/pages/StudentWorkspacePage.jsx
// Không gian trợ lý sinh viên và công cụ quan sát dành cho bản demo.

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  FileText,
  CheckCircle,
  AlertTriangle,
  Upload,
  ArrowRight,
  RefreshCw,
  Terminal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Square,
  Trash2,
} from 'lucide-react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
import LiveTerminalConsole from '../components/common/LiveTerminalConsole';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import AgentTrace from '../components/common/AgentTrace';
import VerifyEntry from '../components/common/VerifyEntry';
import useAgentTrace from '../hooks/useAgentTrace';
import api, { DEMO_ACCOUNTS } from '../services/api';
import getSocket from '../services/socket';

// Danh mục 5 Biểu Mẫu Học Vụ Thực Tế của Trường Đại học HUTECH (Phòng Công tác Sinh viên)
export const CONFIRMATION_FORMS = [
  {
    id: 'form_tax',
    formCode: 'TAX_DEDUCTION',
    badge: 'DV-01 · THUẾ',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    title: 'Đơn Xác Nhận Giảm Trừ Gia Cảnh',
    name: 'Đơn xác nhận giảm trừ gia cảnh (Thuế TNCN)',
    description: 'Nộp Cơ quan Thuế để giảm trừ gia cảnh thuế TNCN cho phụ huynh. Thời hạn 1 học kỳ.',
    quickPrompt: 'Em muốn xin cấp giấy xác nhận giảm trừ gia cảnh thuế TNCN nộp Chi cục Thuế cho ba mẹ em',
  },
  {
    id: 'form_bank',
    formCode: 'BANK_LOAN',
    badge: 'DV-02 · VAY VỐN',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    title: 'Giấy Xác Nhận Vay Vốn NHCSXH',
    name: 'Giấy xác nhận vay vốn Ngân hàng Chính sách Xã hội',
    description: 'Theo Mẫu 01/TDSV (TT 27/2019/TT-NHCS), nộp Ngân hàng CSXH địa phương. Hạn 1 học kỳ.',
    quickPrompt: 'Em muốn xin giấy xác nhận vay vốn ngân hàng chính sách xã hội theo mẫu 01',
  },
  {
    id: 'form_military',
    formCode: 'MILITARY_DEFERMENT',
    badge: 'DV-03 · NVQS',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    title: 'Đơn Xin Tạm Hoãn Nghĩa Vụ Quân Sự',
    name: 'Đơn xin tạm hoãn nghĩa vụ quân sự',
    description: 'Gửi Ban Chỉ huy Quân sự cấp Xã/Phường/Thị trấn để tạm hoãn gọi nhập ngũ. Hiệu lực 30 ngày.',
    quickPrompt: 'Em xin cấp Giấy chứng nhận tạm hoãn nghĩa vụ quân sự nộp Ban chỉ huy quân sự',
  },
  {
    id: 'form_debt',
    formCode: 'COURSE_DEBT',
    badge: 'DV-04 · NỢ MÔN',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    title: 'Đơn Xác Nhận Sinh Viên Nợ Môn',
    name: 'Đơn xác nhận sinh viên nợ môn / hoàn thành chương trình',
    description: 'Xác nhận sinh viên còn nợ học phần và đang trong thời gian trả nợ môn để hoàn thành chương trình đào tạo.',
    quickPrompt: 'Em muốn xin đơn xác nhận sinh viên còn nợ môn để bổ sung hồ sơ và trả nợ học phần',
  },
  {
    id: 'form_general',
    formCode: 'GENERAL_CONFIRMATION',
    badge: 'DV-05 · CHUNG',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    title: 'Giấy Xác Nhận Sinh Viên (Mục Đích Chung)',
    name: 'Giấy xác nhận sinh viên (Mục đích chung)',
    description: 'Xác nhận làm vé tháng xe buýt, xin visa du lịch, việc làm, bổ sung hồ sơ. Hạn 1 học kỳ.',
    quickPrompt: 'Em xin cấp giấy xác nhận sinh viên mục đích thông thường để làm vé xe buýt hoặc xin visa',
  },
];

export default function StudentWorkspacePage({
  currentAccountKey,
  customProfile = null,
  onOpenDynamicForm,
  externalPrompt,
  onClearExternalPrompt,
  onSwitchTab,
}) {
  const currentAccount = currentAccountKey === 'CUSTOM_STUDENT' && customProfile
    ? customProfile
    : DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;

  // Tab điều hướng phụ trên Mobile (khi màn hình < 1280px): 'CHAT' | 'PROCEDURES' | 'DECISION'
  const [mobileTab, setMobileTab] = useState('CHAT');

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  // State và hàm xử lý Xóa dữ liệu thử nghiệm (Reset Test Data) 1-click
  const [isResetting, setIsResetting] = useState(false);
  const handleResetTestData = async () => {
    if (!currentAccount.code) return;
    const confirmMsg = `Bạn có chắc muốn xóa toàn bộ đơn thử nghiệm của sinh viên ${currentAccount.name} (${currentAccount.code}) để kiểm thử lại từ đầu không?`;
    if (!window.confirm(confirmMsg)) return;

    setIsResetting(true);
    try {
      const res = await api.post('/petitions/reset-test', { studentCode: currentAccount.code });
      if (res.data?.success) {
        // Xóa sạch bộ nhớ tạm sessionStorage của sinh viên này
        try {
          sessionStorage.removeItem(`eduref_messages_${currentAccount.code}`);
          sessionStorage.removeItem(`eduref_decision_${currentAccount.code}`);
        } catch (e) {}

        // Đặt lại hộp thoại hội thoại về trạng thái chào mừng ban đầu
        setMessages([
          {
            id: `welcome_${Date.now()}`,
            sender: 'agent',
            text: `Chào bạn **${currentAccount.name}** nhé! 👋\n\nMình là **EduRef AI** — Trợ lý học vụ số của trường.\n\nDữ liệu thử nghiệm đã được dọn sạch. Bạn có thể kiểm thử lại quy trình cấp giấy xác nhận ngay bây giờ nhé!`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        // Giữ trạng thái đơn đồng bộ khi xóa dữ liệu demo.
        setActiveDecision({
          status: 'IDLE',
          requirementsCheck: 'PENDING',
          policiesCheck: 'PENDING',
          authorityCheck: 'PENDING',
          finalDecision: null,
          reason: null,
          requestCode: null,
          qrCodeUrl: null,
          sha256Proof: null,
          missingFields: [],
        });

        // Cấp sessionId mới
        setSessionId(`sess_${currentAccount.code}_${Date.now()}`);
        alert(`Đã xóa thành công ${res.data.deletedCount} đơn thử nghiệm của sinh viên ${currentAccount.code}!`);
      } else {
        alert(res.data?.message || 'Không thể xóa dữ liệu kiểm thử.');
      }
    } catch (err) {
      alert('Lỗi khi xóa dữ liệu test: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsResetting(false);
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
        text: `Chào bạn **${currentAccount.name}** nhé! 👋\n\nMình là **EduRef AI** — Trợ lý học vụ số của trường.\n\nMình có thể hỗ trợ bạn cấp **Giấy xác nhận sinh viên** siêu tốc (để vay vốn ngân hàng, tạm hoãn NVQS, làm vé xe buýt, bổ sung hồ sơ học bổng, xin visa...) hoặc giải đáp các thắc mắc về quy chế đào tạo.\n\nHôm nay bạn cần mình hỗ trợ thủ tục gì nè?`,
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
      // Cấp mới sessionId gắn chặt với MSSV của tài khoản hiện tại để tách biệt bộ nhớ ReAct
      setSessionId(`sess_${currentAccount.code}_${Date.now()}`);
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
          text: `Chào bạn **${currentAccount.name}** nhé! 👋\n\nMình là **EduRef AI** — Trợ lý học vụ số của trường.\n\nMình có thể hỗ trợ bạn cấp **Giấy xác nhận sinh viên** siêu tốc (để vay vốn ngân hàng, tạm hoãn NVQS, làm vé xe buýt, bổ sung hồ sơ học bổng, xin visa...) hoặc giải đáp các thắc mắc về quy chế đào tạo.\n\nHôm nay bạn cần mình hỗ trợ thủ tục gì nè?`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [currentAccountKey, currentAccount.code, currentAccount.type, currentAccount.name]);

  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(() => `sess_${currentAccount.code || 'student'}_${Date.now()}`);
  const [types, setTypes] = useState([]);

  // Trạng thái đơn dùng cho kết quả và bước bổ sung hồ sơ.
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
  const [, setIsUploading] = useState(false);

  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const followLatestRef = useRef(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const socket = getSocket();
  const { traces, startTrace, requestTraceStop } = useAgentTrace(socket, sessionId, messages, isProcessing);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    const container = chatScrollRef.current;
    if (!container) return;
    if (!followLatestRef.current || !container.clientHeight) {
      setHasNewActivity(true);
      return;
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'instant',
    });
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

      // Đồng bộ trạng thái đơn từ kết quả công cụ.
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

    const handleStopped = () => {
      setIsProcessing(false);
    };

    socket.on('agent_response_chunk', handleChunk);
    socket.on('agent_response_end', handleEnd);
    socket.on('agent_stopped', handleStopped);

    return () => {
      socket.off('agent_response_chunk', handleChunk);
      socket.off('agent_response_end', handleEnd);
      socket.off('agent_stopped', handleStopped);
    };
  }, [socket]);

  // Dừng tiến trình tạo phản hồi của AI Agent (Stop Generation / Cancel)
  const handleStopGeneration = () => {
    if (!isProcessing) return;
    requestTraceStop();

    if (socket && socket.connected) {
      socket.emit('client_stop_generation', { sessionId });
    }

    setIsProcessing(false);

    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.sender === 'agent') {
        const stoppedText = lastMsg.text
          ? `${lastMsg.text}\n\n*(Đã dừng tạo phản hồi theo yêu cầu)*`
          : '*(Đã dừng tạo phản hồi theo yêu cầu)*';
        return [
          ...prev.slice(0, -1),
          {
            ...lastMsg,
            text: stoppedText,
            isStreaming: false,
          },
        ];
      }
      return prev;
    });
  };

  // Phím tắt Escape để dừng sinh câu trả lời khẩn cấp
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isProcessing) {
        e.preventDefault();
        handleStopGeneration();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, sessionId]);

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

    startTrace(userMsg.id);
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsProcessing(true);
    setMobileTab('CHAT');

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
      token: localStorage.getItem('eduref_token'),
      currentUser: {
        studentCode: currentAccount.code,
        code: currentAccount.code,
        fullName: currentAccount.name,
        name: currentAccount.name,
        role: currentAccount.role,
        type: currentAccount.type,
        status: currentAccount.status || (currentAccount.code === '2110002' ? 'DROPPED' : currentAccount.code === '2110004' ? 'SUSPENDED' : 'ACTIVE'),
        class: currentAccount.class || currentAccount.studentClass || null,
        studentClass: currentAccount.class || currentAccount.studentClass || null,
        faculty: currentAccount.faculty || currentAccount.department || null,
        department: currentAccount.faculty || currentAccount.department || null,
        major: currentAccount.major || null,
        birthDate: currentAccount.birthDate || null,
        gender: currentAccount.gender || null,
        phone: currentAccount.phone || null,
        idCard: currentAccount.idCard || null,
        permanentAddress: currentAccount.permanentAddress || null,
        admissionYear: currentAccount.admissionYear || null,
        enrolledCredits: currentAccount.enrolledCredits ?? null,
        hasSchedule: currentAccount.hasSchedule ?? null,
      },
      sessionId,
      attachments: extraContext.attachedCerts || extraContext.inputData?.attachedCerts || null,
      inputData: extraContext.inputData ? { studentClass: currentAccount.class || currentAccount.studentClass || null, ...extraContext.inputData } : null,
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
    <div className="student-workspace competition-workspace" data-processing={isProcessing} data-left-collapsed={leftCollapsed} data-right-collapsed={rightCollapsed} data-terminal-expanded={terminalExpanded}>
      <div className="workspace-mobile-nav bg-eduref-primary border-b border-eduref-hover px-3 py-2 shrink-0">
        <div className="flex items-center gap-1 bg-eduref-hover p-1 rounded-xl">
          <button
            onClick={() => setMobileTab('CHAT')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'CHAT'
                ? 'bg-white/20 text-white shadow-xs border border-white/30 backdrop-blur-xs'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Chat AI</span>
          </button>

          <button
            onClick={() => setMobileTab('PROCEDURES')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'PROCEDURES'
                ? 'bg-white/20 text-white shadow-xs border border-white/30 backdrop-blur-xs'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Thủ tục</span>
          </button>

          <button
            onClick={() => setMobileTab('DECISION')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'DECISION'
                ? 'bg-white/20 text-white shadow-xs border border-white/30 backdrop-blur-xs'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-300" />
            <span>Live Terminal</span>
          </button>
        </div>
      </div>
      <aside className={'procedure-sidebar workspace-sidebar' + (mobileTab === 'PROCEDURES' ? ' is-mobile-active' : '')} aria-label="Thủ tục học vụ">
        <div className="workspace-sidebar-header">
          {!leftCollapsed && <div><h2>Thủ tục học vụ</h2><p>5 biểu mẫu · Chọn để bắt đầu</p></div>}
          <button type="button" className="sidebar-control" aria-label={leftCollapsed ? 'Mở sidebar thủ tục' : 'Thu gọn sidebar thủ tục'} aria-expanded={!leftCollapsed} aria-controls="procedure-panel" onClick={() => setLeftCollapsed(!leftCollapsed)}>
            {leftCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
        {leftCollapsed && <div className="sidebar-rail" aria-hidden="true"><FileText size={20} /><span>5</span></div>}
        <div id="procedure-panel" className="workspace-sidebar-body" hidden={leftCollapsed}>
        <div className="p-3 space-y-2.5 flex-1">
          {CONFIRMATION_FORMS.map((f) => (
            <div
              key={f.id}
              data-form={f.formCode}
              className="procedure-card p-3 rounded-xl border border-slate-200 bg-white hover:border-eduref-primary hover:shadow-xs transition-all text-left group"
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-xs font-bold text-slate-900 group-hover:text-eduref-primary transition-colors leading-snug">
                  {f.title}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${f.badgeColor}`}>
                  {f.badge}
                </span>
              </div>
              <p className="procedure-description text-slate-500 mt-1 leading-relaxed line-clamp-2">
                {f.description}
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => onOpenDynamicForm && onOpenDynamicForm({
                    code: 'STUDENT_CONFIRMATION',
                    formCode: f.formCode,
                    name: f.name,
                    title: f.title,
                    description: f.description,
                  })}
                  className="font-semibold text-eduref-primary hover:text-eduref-hover flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Điền đơn <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSendMessage(f.quickPrompt)}
                  className="text-slate-500 hover:text-slate-800 font-medium text-[11px] cursor-pointer"
                >
                  Hỏi nhanh AI
                </button>
              </div>
            </div>
          ))}
        </div>
        <details className="workspace-test-presets">
          <summary>Tình huống mẫu bổ sung</summary>
          <div className="p-3">
          <div className="space-y-1.5">
            <button
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em xin cấp Giấy chứng nhận tạm hoãn NVQS. Địa chỉ: 180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh; SĐT: 0901234567; nhận tại Trụ sở chính (A-01.01)')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100/70 text-emerald-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">NVQS: Đủ 4 cấp Title Case (AUTO)</span>
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em đang mở đơn Xác nhận sinh viên chung nhưng mục đích của em là xin vay vốn ngân hàng chính sách xã hội')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-amber-50/70 border border-amber-200 hover:bg-amber-100/70 text-amber-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span className="truncate">Lệch biểu mẫu: Vay vốn vs Chung (MISMATCH)</span>
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em là sinh viên khóa 20 (mã 2110005) muốn xin giấy chứng nhận tạm hoãn nghĩa vụ quân sự')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-purple-50/70 border border-purple-200 hover:bg-purple-100/70 text-purple-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
              <span className="truncate">SV Nợ môn: Hướng dẫn Mẫu Nợ Môn (COURSE_DEBT)</span>
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em xin cấp Giấy xác nhận vay vốn ngân hàng chính sách Mẫu 01; CCCD: 079203001234; Lớp: 22DTHE4; nhận tại Cơ sở E1-01.08')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-blue-50/70 border border-blue-200 hover:bg-blue-100/70 text-blue-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
              <span className="truncate">Vay vốn NHCSXH: Mẫu 01 (AUTO)</span>
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em xin giấy NVQS, địa chỉ: 180 ung văn khiêm phường 25 bình thạnh hcm')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-orange-50/70 border border-orange-200 hover:bg-orange-100/70 text-orange-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
              <span className="truncate">Địa chỉ viết thường: Hỏi chuẩn hóa (ASK)</span>
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleSendMessage('Tôi là sinh viên 2110002 đã thôi học, muốn xin giấy xác nhận sinh viên')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-rose-50/70 border border-rose-200 hover:bg-rose-100/70 text-rose-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span className="truncate">Không có TKB kỳ này: Thôi học (REJECT)</span>
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em xin cấp lại Giấy chứng nhận tạm hoãn nghĩa vụ quân sự lần 2 do em làm thất lạc bản chính')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-amber-50/80 border border-amber-300 hover:bg-amber-100 text-amber-950 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span className="truncate">Cấp lại lần 2: Tự động kế thừa đơn cũ (REISSUE)</span>
            </button>
          </div>
          </div>
        </details>
        </div>
      </aside>
      <div className={'student-chat' + (mobileTab === 'CHAT' ? ' is-mobile-active' : '')}>
        <div className="student-chat-header px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="chat-avatar w-9 h-9 rounded-xl bg-eduref-tint text-eduref-primary flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="chat-title text-sm font-semibold text-slate-900">
                  Trợ lý học vụ EduRef
                </span>
              </div>
              <p className="chat-caption text-xs text-eduref-muted">
                Thử một yêu cầu · Theo dõi tiến trình · Kiểm tra kết quả
              </p>
            </div>
          </div>

          <div className="chat-header-tools flex items-center gap-1.5">
            <details className="chat-actions-menu">
              <summary aria-label="Thao tác dữ liệu demo"><MoreHorizontal size={20} aria-hidden="true" /></summary>
              <div className="chat-actions-popover">
                <p>Chỉ dùng trên dữ liệu demo. Xóa đơn khác với làm mới hội thoại.</p>
            <button
              onClick={handleResetTestData}
              disabled={isResetting}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              title="Xóa toàn bộ đơn thử nghiệm của sinh viên này để kiểm thử lại từ đầu"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">{isResetting ? 'Đang xóa...' : 'Xóa đơn test'}</span>
            </button>
              </div>
            </details>
            <button
              onClick={() => {
                try {
                  sessionStorage.removeItem(`eduref_messages_${currentAccount.code}`);
                } catch (e) {}
                setMessages([
                  {
                    id: `welcome_${Date.now()}`,
                    sender: 'agent',
                    text: `Chào bạn **${currentAccount.name}** nhé! 👋\n\nMình là **EduRef AI** — Trợ lý học vụ số của trường.\n\nMình có thể hỗ trợ bạn cấp **Giấy xác nhận sinh viên** siêu tốc (để vay vốn ngân hàng, tạm hoãn NVQS, làm vé xe buýt, bổ sung hồ sơ học bổng, xin visa...) hoặc giải đáp các thắc mắc về quy chế đào tạo.\n\nHôm nay bạn cần mình hỗ trợ thủ tục gì nè?`,
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
                setSessionId(`sess_${Date.now()}`);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tạo hội thoại mới; không xóa các đơn đã gửi"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Hội thoại mới</span>
            </button>
          </div>
        </div>
        <div
          ref={chatScrollRef}
          className="chat-messages flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 bg-white"
          aria-label="Hội thoại với trợ lý"
          onScroll={(event) => {
            const container = event.currentTarget;
            followLatestRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
            if (followLatestRef.current) setHasNewActivity(false);
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <React.Fragment key={msg.id}>
              <div
                className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                    isUser
                      ? 'bg-eduref-primary text-white'
                      : 'bg-eduref-hover text-white border border-blue-400/30'
                  }`}
                >
                  {isUser ? 'SV' : 'AI'}
                </div>
                <div
                  className={`chat-message-content rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-eduref-primary text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                  }`}
                >
                  <MarkdownRenderer
                    content={msg.id === 'welcome' || String(msg.id).startsWith('welcome_')
                      ? `Xin chào **${currentAccount.name}**.\n\nBạn cần giấy xác nhận sinh viên cho việc gì? Hãy mô tả yêu cầu hoặc chọn một gợi ý bên dưới. Mình sẽ hỗ trợ làm rõ thông tin và hướng dẫn theo quy trình.`
                      : msg.text}
                    isUser={isUser}
                  />
                  {msg.toolResult && (
                    <div className="chat-outcome" data-outcome={msg.toolResult.decision || msg.toolResult.status}>
                      <p className="chat-outcome-label">{outcomeLabel(msg.toolResult.decision || msg.toolResult.status)}</p>
                      {(msg.toolResult.requestCode || msg.toolResult.actionableQuestion || msg.toolResult.reason || msg.toolResult.message) && <p>{msg.toolResult.requestCode && <strong>{msg.toolResult.requestCode} · </strong>}{msg.toolResult.actionableQuestion || msg.toolResult.reason || msg.toolResult.message}</p>}
                    </div>
                  )}
                  {msg.toolResult && (
                    <details className="chat-tool-detail mt-3 pt-2.5 border-t border-slate-200/80">
                      <summary>Thông tin xử lý yêu cầu</summary>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-eduref-primary"></span>
                        Kết quả từ hệ thống
                      </div>
                      {(msg.toolResult.requestCode && ['APPROVED', 'AUTO_APPROVED', 'ROUTINE_AUTO_APPROVED'].includes(msg.toolResult.decision || msg.toolResult.status)) && (
                        <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 shadow-2xs">
                          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                              <span>MÃ CÔNG VĂN:</span>
                              <span className="font-mono bg-emerald-100/80 px-1.5 py-0.5 rounded text-emerald-900 border border-emerald-300/60">
                                {msg.toolResult.requestCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-800 mt-1 font-medium">
                              Đã cấp mã công văn & ghi nhận hồ sơ CTSV
                            </div>
                            <div className="text-[10px] text-emerald-700/90 mt-0.5">
                              📍 Nhận bản cứng có mộc đỏ & chữ ký sống tại Phòng CTSV (A-01.01 hoặc E1-01.08)
                            </div>
                            {msg.toolResult.sha256Proof && (
                              <div className="text-[9px] font-mono text-emerald-800/60 truncate mt-1">
                                Proof SHA-256: {msg.toolResult.sha256Proof.substring(0, 32)}...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </details>
                  )}

                  <div className={`text-[10px] mt-1.5 ${isUser ? 'text-blue-100 text-right' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
              {isUser && traces[msg.id] && <AgentTrace trace={traces[msg.id]} />}
              </React.Fragment>
            );
          })}
          {isProcessing && !Object.values(traces).some((trace) => trace.status === 'running') && !(messages[messages.length - 1]?.isStreaming && messages[messages.length - 1]?.text) && (
            <div className="chat-progress"><LoadingSkeleton label="Đang xử lý yêu cầu của bạn…" rows={2} /></div>
          )}
          {activeDecision.status === 'WAITING_STUDENT' && activeDecision.requestId && (
            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 space-y-3 max-w-xl mx-auto my-2 shadow-xs">
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
                  <span className="font-medium text-eduref-primary">Chọn tệp để chuẩn bị bổ sung</span>
                  <span className="text-xs text-slate-500">Tệp được chọn chưa được tải lên máy chủ.</span>
                </label>

                {supplementFile && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block">
                    ✓ Đã chọn: {supplementFile.name}
                  </div>
                )}
              </div>
              <button
                onClick={handleResumeSubmission}
                disabled
                className="w-full py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Gửi tài liệu — chưa khả dụng
              </button>
              <p className="text-xs text-amber-900">Kết nối tải tài liệu thật đang chờ tích hợp. Hồ sơ chưa được cập nhật từ tệp đã chọn.</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
        {hasNewActivity && (
          <button type="button" className="chat-new-activity" onClick={() => { followLatestRef.current = true; setHasNewActivity(false); scrollToBottom(); }}>
            Xem hoạt động mới <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
        <div className="chat-composer p-3.5 sm:p-4 border-t border-slate-200 bg-white">
          <div className="chat-suggestions flex items-center gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Gợi ý:</span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em xin cấp giấy xác nhận sinh viên để làm vé tháng xe buýt')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-eduref-primary border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              Vé tháng xe buýt
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em muốn xin giấy xác nhận sinh viên để vay vốn ngân hàng chính sách xã hội')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-eduref-primary border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              Vay vốn NHCSXH
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSendMessage('Em xin giấy xác nhận để làm thủ tục tạm hoãn nghĩa vụ quân sự')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-eduref-primary border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              Tạm hoãn NVQS
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSendMessage('Cho em hỏi làm giấy vay vốn sinh viên cần những giấy tờ gì vậy bot?')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-eduref-primary border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              Hỏi thủ tục cần gì
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isProcessing) {
                handleStopGeneration();
              } else {
                handleSendMessage();
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              aria-label="Nội dung gửi cho trợ lý học vụ"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isProcessing
                  ? 'Tác tử đang xử lý... Nhấn "Dừng lại" hoặc phím Esc để ngắt'
                  : 'Bạn cần hỗ trợ việc gì?'
              }
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-eduref-primary/20 focus:border-eduref-primary transition-all disabled:bg-slate-50 disabled:text-slate-500"
            />
            {isProcessing ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer animate-pulse"
                title="Dừng sinh phản hồi (Esc)"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Dừng lại</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="px-4 py-2.5 bg-eduref-primary hover:bg-eduref-hover active:bg-eduref-hover disabled:opacity-40 text-white rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
          <div className="chat-composer-hint flex items-center justify-between gap-2 text-[11px] text-eduref-muted mt-2 px-1">
            <span>Tự động phân giải tiếng lóng: xnsv, nhcs, nvqs, đk, pdt</span>
            <span>{isProcessing ? 'Nhấn Esc hoặc nút Dừng lại để hủy' : 'Phím tắt: Enter để gửi'}</span>
          </div>
        </div>

      </div>
      <aside className={'decision-sidebar workspace-sidebar' + (mobileTab === 'DECISION' ? ' is-mobile-active' : '')} aria-label="Live Terminal">
        <div className="workspace-sidebar-header">
          {!rightCollapsed && <div><h2><Terminal size={17} aria-hidden="true" /> Live Terminal</h2><p>Lọc hiển thị theo phiên chat</p></div>}
          <div className="sidebar-controls">
            {!rightCollapsed && <button type="button" className="sidebar-control terminal-expand" aria-label={terminalExpanded ? 'Thu lại terminal' : 'Mở rộng terminal'} aria-pressed={terminalExpanded} onClick={() => setTerminalExpanded(!terminalExpanded)}>{terminalExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>}
            <button type="button" className="sidebar-control" aria-label={rightCollapsed ? 'Mở sidebar terminal' : 'Thu gọn sidebar terminal'} aria-expanded={!rightCollapsed} aria-controls="terminal-panel" onClick={() => { setRightCollapsed(!rightCollapsed); setTerminalExpanded(false); }}>{rightCollapsed ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}</button>
          </div>
        </div>
        {rightCollapsed && <div className="sidebar-rail" aria-hidden="true"><Terminal size={20} /></div>}
        <div id="terminal-panel" className="workspace-sidebar-body terminal-panel-body" hidden={rightCollapsed}>
          <VerifyEntry onNavigate={onSwitchTab} />
          <LiveTerminalConsole sessionId={sessionId} allowClear={false} maxHeight="" className="workspace-terminal" />
        </div>
      </aside>
    </div>
  );
}

function outcomeLabel(decision) {
  if (['APPROVED', 'AUTO_APPROVED', 'ROUTINE_AUTO_APPROVED'].includes(decision)) return 'Hồ sơ đã được xử lý';
  if (['ASK_CLARIFICATION', 'WAITING_STUDENT'].includes(decision)) return 'Cần bạn bổ sung hoặc xác nhận';
  if (['ESCALATE_TO_STAFF', 'ESCALATED'].includes(decision)) return 'Cần cán bộ xem xét';
  if (decision?.startsWith('REJECTED')) return 'Yêu cầu chưa được chấp nhận';
  return 'Kết quả từ hệ thống';
}
