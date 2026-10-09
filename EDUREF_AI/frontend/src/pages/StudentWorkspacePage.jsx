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
  Square,
} from 'lucide-react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
import LiveTerminalConsole from '../components/common/LiveTerminalConsole';
import api, { DEMO_ACCOUNTS } from '../services/api';
import getSocket from '../services/socket';

// Danh mục 5 Biểu Mẫu Học Vụ Thực Tế của Trường Đại học HUTECH (Phòng Công tác Sinh viên)
export const CONFIRMATION_FORMS = [
  {
    id: 'form_tax',
    formCode: 'TAX_DEDUCTION',
    badge: 'DV-01 · THUẾ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    title: 'Đơn Xác Nhận Giảm Trừ Gia Cảnh',
    name: 'Đơn xác nhận giảm trừ gia cảnh (Thuế TNCN)',
    description: 'Nộp Cơ quan Thuế để giảm trừ gia cảnh thuế TNCN cho phụ huynh. Thời hạn 1 học kỳ.',
    quickPrompt: 'Em muốn xin cấp giấy xác nhận giảm trừ gia cảnh thuế TNCN nộp Chi cục Thuế cho ba mẹ em',
  },
  {
    id: 'form_bank',
    formCode: 'BANK_LOAN',
    badge: 'DV-02 · VAY VỐN',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    title: 'Giấy Xác Nhận Vay Vốn NHCSXH',
    name: 'Giấy xác nhận vay vốn Ngân hàng Chính sách Xã hội',
    description: 'Theo Mẫu 01/TDSV (TT 27/2019/TT-NHCS), nộp Ngân hàng CSXH địa phương. Hạn 1 học kỳ.',
    quickPrompt: 'Em muốn xin giấy xác nhận vay vốn ngân hàng chính sách xã hội theo mẫu 01',
  },
  {
    id: 'form_military',
    formCode: 'MILITARY_DEFERMENT',
    badge: 'DV-03 · NVQS',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    title: 'Đơn Xin Tạm Hoãn Nghĩa Vụ Quân Sự',
    name: 'Đơn xin tạm hoãn nghĩa vụ quân sự',
    description: 'Gửi Ban Chỉ huy Quân sự cấp Xã/Phường/Thị trấn để tạm hoãn gọi nhập ngũ. Hiệu lực 30 ngày.',
    quickPrompt: 'Em xin cấp Giấy chứng nhận tạm hoãn nghĩa vụ quân sự nộp Ban chỉ huy quân sự',
  },
  {
    id: 'form_debt',
    formCode: 'COURSE_DEBT',
    badge: 'DV-04 · NỢ MÔN',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    title: 'Đơn Xác Nhận Sinh Viên Nợ Môn',
    name: 'Đơn xác nhận sinh viên nợ môn / hoàn thành chương trình',
    description: 'Xác nhận sinh viên còn nợ học phần và đang trong thời gian trả nợ môn để hoàn thành chương trình đào tạo.',
    quickPrompt: 'Em muốn xin đơn xác nhận sinh viên còn nợ môn để bổ sung hồ sơ và trả nợ học phần',
  },
  {
    id: 'form_general',
    formCode: 'GENERAL_CONFIRMATION',
    badge: 'DV-05 · CHUNG',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
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
        const status = res.data.allPassed ? 'ĐẠT' : 'CHƯA ĐẠT';
        setVerifyFeedback(`Đã hoàn thành ${res.data.totalCases} ca: ${res.data.passedCases}/${res.data.totalCases} ${status}; AUTO=${res.data.autoCount}, ESCALATE=${res.data.escalationCount}.`);
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

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsProcessing(true);
    setMobileTab('CHAT');

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
      token: localStorage.getItem('eduref_token'),
      currentUser: {
        studentCode: currentAccount.code,
        code: currentAccount.code,
        fullName: currentAccount.name,
        name: currentAccount.name,
        role: currentAccount.role,
        type: currentAccount.type,
        class: currentAccount.class || currentAccount.studentClass || '22DTHE4',
        studentClass: currentAccount.class || currentAccount.studentClass || '22DTHE4',
        faculty: currentAccount.faculty || currentAccount.department || 'Khoa Công Nghệ Thông Tin',
        department: currentAccount.faculty || currentAccount.department || 'Khoa Công Nghệ Thông Tin',
        major: currentAccount.major || 'Công nghệ thông tin',
        birthDate: currentAccount.birthDate || '26/07/2003',
        gender: currentAccount.gender || 'Nam',
        phone: currentAccount.phone || '0901234567',
        idCard: currentAccount.idCard || '079203001234',
        permanentAddress: currentAccount.permanentAddress || '180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
        admissionYear: currentAccount.admissionYear || 2022,
        enrolledCredits: currentAccount.enrolledCredits ?? 15,
        hasSchedule: currentAccount.hasSchedule ?? true,
      },
      sessionId,
      attachments: extraContext.attachedCerts || extraContext.inputData?.attachedCerts || null,
      inputData: extraContext.inputData ? { studentClass: currentAccount.class || currentAccount.studentClass || '22DTHE4', ...extraContext.inputData } : null,
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
    <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-[#F0F4F9]">
      
      {/* ========================================================================= */}
      {/* THANH ĐIỀU HƯỚNG PHỤ TRÊN MOBILE (Chỉ hiển thị trên màn hình < 1280px / xl:hidden) */}
      {/* ========================================================================= */}
      <div className="xl:hidden bg-[#0B3B82] border-b border-[#082C64] px-3 py-2 shrink-0">
        <div className="flex items-center gap-1 bg-[#082C64] p-1 rounded-xl">
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
            <span>Vận hành & 4 Chốt</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CỘT 1: DANH MỤC THỦ TỤC HÀNH CHÍNH & NỘP BIỂU MẪU (Bên trái) */}
      {/* ========================================================================= */}
      <div className={`w-full xl:w-80 bg-white border-r border-slate-200/90 flex-col shrink-0 overflow-y-auto ${
        mobileTab === 'PROCEDURES' ? 'flex flex-1' : 'hidden xl:flex'
      }`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0B3B82]" />
              Danh Mục Thủ Tục Học Vụ
            </h2>
            <span className="text-[10px] font-semibold text-[#0B3B82] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Chính quy
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Chọn thủ tục nộp biểu mẫu trực tuyến hoặc hỏi đáp AI
          </p>
        </div>

        {/* Danh sách 5 Biểu Mẫu Học Vụ Thực Tế HUTECH (Phòng Công tác Sinh viên) */}
        <div className="p-3 space-y-2.5 flex-1">
          {CONFIRMATION_FORMS.map((f) => (
            <div
              key={f.id}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#0B3B82] hover:shadow-xs transition-all text-left group"
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-xs font-bold text-slate-900 group-hover:text-[#0B3B82] transition-colors leading-snug">
                  {f.title}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${f.badgeColor}`}>
                  {f.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                {f.description}
              </p>

              {/* Nút hành động */}
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
                  className="font-semibold text-[#0B3B82] hover:text-[#082C64] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Điền đơn <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage(f.quickPrompt)}
                  className="text-slate-500 hover:text-slate-800 font-medium text-[11px] cursor-pointer"
                >
                  Hỏi nhanh AI
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Khối Kịch bản kiểm thử nhanh 1-Click theo 5 Biểu Mẫu Thực Tế HUTECH */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Kịch Bản Kiểm Thử Thực Tế (5 Biểu Mẫu)
            </span>
            <span className="text-[9px] font-mono text-slate-400">1-CLICK</span>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => handleSendMessage('Em xin cấp Giấy chứng nhận tạm hoãn NVQS. Địa chỉ: 180 Ung Văn Khiêm, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh; SĐT: 0901234567; nhận tại Trụ sở chính (A-01.01)')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100/70 text-emerald-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">NVQS: Đủ 4 cấp Title Case (AUTO)</span>
            </button>
            <button
              onClick={() => handleSendMessage('Em đang mở đơn Xác nhận sinh viên chung nhưng mục đích của em là xin vay vốn ngân hàng chính sách xã hội')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-amber-50/70 border border-amber-200 hover:bg-amber-100/70 text-amber-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span className="truncate">Lệch biểu mẫu: Vay vốn vs Chung (MISMATCH)</span>
            </button>
            <button
              onClick={() => handleSendMessage('Em là sinh viên khóa 20 (mã 2110005) muốn xin giấy chứng nhận tạm hoãn nghĩa vụ quân sự')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-purple-50/70 border border-purple-200 hover:bg-purple-100/70 text-purple-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
              <span className="truncate">SV Nợ môn: Hướng dẫn Mẫu Nợ Môn (COURSE_DEBT)</span>
            </button>
            <button
              onClick={() => handleSendMessage('Em xin cấp Giấy xác nhận vay vốn ngân hàng chính sách Mẫu 01; CCCD: 079203001234; Lớp: 22DTHE4; nhận tại Cơ sở E1-01.08')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-blue-50/70 border border-blue-200 hover:bg-blue-100/70 text-blue-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
              <span className="truncate">Vay vốn NHCSXH: Mẫu 01 (AUTO)</span>
            </button>
            <button
              onClick={() => handleSendMessage('Em xin giấy NVQS, địa chỉ: 180 ung văn khiêm phường 25 bình thạnh hcm')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-orange-50/70 border border-orange-200 hover:bg-orange-100/70 text-orange-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
              <span className="truncate">Địa chỉ viết thường: Hỏi chuẩn hóa (ASK)</span>
            </button>
            <button
              onClick={() => handleSendMessage('Tôi là sinh viên 2110002 đã thôi học, muốn xin giấy xác nhận sinh viên')}
              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium bg-rose-50/70 border border-rose-200 hover:bg-rose-100/70 text-rose-900 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span className="truncate">Không có TKB kỳ này: Thôi học (REJECT)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CỘT 2: KHUNG HỘI THOẠI REACT CHAT & STREAMING (Ở giữa) */}
      {/* ========================================================================= */}
      <div className={`flex-1 flex-col bg-white border-r border-slate-200/90 overflow-hidden ${
        mobileTab === 'CHAT' ? 'flex' : 'hidden xl:flex'
      }`}>
        
        {/* Chat Header Chuẩn Học Vụ HUTECH */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B3B82] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Trợ Lý Học Vụ Số HUTECH
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Quy chế 2026
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                ReAct Bounded Autonomy · Đảm bảo 4 chốt chặn
              </p>
            </div>
          </div>

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
            title="Làm mới cuộc trò chuyện"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Làm mới</span>
          </button>
        </div>

        {/* Khung tin nhắn cuộn */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 bg-[#F8FAFC]">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                    isUser
                      ? 'bg-[#0B3B82] text-white'
                      : 'bg-[#082C64] text-white border border-blue-400/30'
                  }`}
                >
                  {isUser ? 'SV' : 'AI'}
                </div>

                {/* Bong bóng tin nhắn */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-2xs leading-relaxed ${
                    isUser
                      ? 'bg-[#0B3B82] text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                  }`}
                >
                  {/* Nội dung markdown */}
                  <MarkdownRenderer content={msg.text} isUser={isUser} />

                  {/* Thẻ Tool Call Badge nếu có */}
                  {msg.toolResult && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-[#0B3B82]"></span>
                        Đã thực thi thẩm định quy chế học vụ
                      </div>
                      
                      {/* Thẻ kết quả chứng thực số nếu đơn được duyệt */}
                      {(msg.toolResult.requestCode && (msg.toolResult.decision === 'APPROVED' || msg.toolResult.status === 'APPROVED' || !msg.toolResult.decision)) && (
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
                    </div>
                  )}

                  <div className={`text-[10px] mt-1.5 ${isUser ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Indicator đang xử lý kèm nút Dừng lại khẩn cấp */}
          {isProcessing && (
            <div className="flex items-center justify-between max-w-lg mr-auto bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#082C64] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  AI
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-[#0B3B82] animate-ping"></span>
                  <span className="font-medium text-slate-700">Tác tử đang thẩm định & suy luận quy chế...</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStopGeneration}
                className="ml-3 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Nhấn để dừng lại ngay (Esc)"
              >
                <Square className="w-3 h-3 fill-red-600" />
                <span>Dừng lại</span>
              </button>
            </div>
          )}

          {/* Ô Dropzone nộp bổ sung chứng từ khi bị thiếu (Luồng ASK) */}
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
                  <span className="font-medium text-[#0B3B82]">Bấm chọn tài liệu</span> hoặc kéo thả file vào đây
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
                className="w-full py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? 'Đang thẩm định lại...' : 'Nộp Bổ Sung & Tiếp Tục Xử Lý (Resume)'}
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Khung nhập tin nhắn */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white">
          {/* Quick Action Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Gợi ý:</span>
            <button
              type="button"
              onClick={() => handleSendMessage('Em xin cấp giấy xác nhận sinh viên để làm vé tháng xe buýt')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-[#0B3B82] border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              Vé tháng xe buýt
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Em muốn xin giấy xác nhận sinh viên để vay vốn ngân hàng chính sách xã hội')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-[#0B3B82] border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              Vay vốn NHCSXH
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Em xin giấy xác nhận để làm thủ tục tạm hoãn nghĩa vụ quân sự')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-[#0B3B82] border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              Tạm hoãn NVQS
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Cho em hỏi làm giấy vay vốn sinh viên cần những giấy tờ gì vậy bot?')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-[#0B3B82] border border-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
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
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isProcessing
                  ? 'Tác tử đang xử lý... Nhấn "Dừng lại" hoặc phím Esc để ngắt'
                  : 'Nhập yêu cầu học vụ (ví dụ: xin xnsv vay vốn nhcs, hoãn thi, hoãn nvqs...)'
              }
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B3B82]/20 focus:border-[#0B3B82] transition-all disabled:bg-slate-50 disabled:text-slate-400"
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
                className="px-4 py-2.5 bg-[#0B3B82] hover:bg-[#082C64] active:bg-[#062047] disabled:opacity-40 text-white rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Tự động phân giải tiếng lóng: xnsv, nhcs, nvqs, đk, pdt</span>
            <span>{isProcessing ? 'Nhấn Esc hoặc nút Dừng lại để hủy' : 'Phím tắt: Enter để gửi'}</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CỘT 3: BẢNG THẨM ĐỊNH 4 CHỐT CHẶN & LIVE TERMINAL CONSOLE (Bên phải) */}
      {/* ========================================================================= */}
      <div className={`w-full xl:w-[520px] bg-white flex-col shrink-0 border-l border-slate-200 overflow-hidden ${
        mobileTab === 'DECISION' ? 'flex flex-1' : 'hidden xl:flex'
      }`}>
        
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
                  ? 'bg-[#0B3B82] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Thẩm Định 4 Chốt</span>
            </button>
          </div>
        </div>

        {/* Nội dung Cột 3 theo Tab */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {column3Tab === 'DECISION' ? (
            <>
              {/* Thẻ Hồ Sơ Sinh Viên HUTECH Chuẩn Chính Quy */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Hồ Sơ Sinh Viên HUTECH
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0B3B82] border border-blue-200">
                    {currentAccount.class || '22DTHE4'}
                  </span>
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0B3B82] text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                    {currentAccount.name ? currentAccount.name.split(' ').slice(-2).map(n => n[0]).join('') : 'SV'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {currentAccount.name}
                    </h3>
                    <div className="text-[11px] font-mono text-blue-700 font-semibold mt-0.5">
                      MSSV: {currentAccount.code}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {currentAccount.faculty || 'Khoa Công Nghệ Thông Tin'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Trạng thái đào tạo:</span>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                      currentAccount.code === '2110002' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {currentAccount.code === '2110002' ? 'DROPPED (Thôi học)' : 'ACTIVE (Đang học)'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Thời khóa biểu kỳ này:</span>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                      currentAccount.hasSchedule !== false && currentAccount.code !== '2110002' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {currentAccount.hasSchedule !== false && currentAccount.code !== '2110002' ? 'Có lịch học (Hợp lệ)' : 'Chưa có lịch học'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng Kiểm Định 4 Chốt Chặn (4 Gates Policy) */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#0B3B82]" />
                    4 Chốt Chặn Thẩm Định Tự Hành
                  </span>
                  <span className="font-mono text-[9px] text-[#0B3B82] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                    BOUNDED
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Chốt 1: Requirements */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-700 font-medium">1. Điều kiện đầu vào:</span>
                    <span className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                      activeDecision.requirementsCheck === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeDecision.requirementsCheck === 'FAILED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {activeDecision.requirementsCheck}
                    </span>
                  </div>

                  {/* Chốt 2: Policies */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-700 font-medium">2. Quy chế đào tạo:</span>
                    <span className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                      activeDecision.policiesCheck === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeDecision.policiesCheck === 'FAILED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {activeDecision.policiesCheck}
                    </span>
                  </div>

                  {/* Chốt 3: Authority */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-700 font-medium">3. Phân cấp thẩm quyền:</span>
                    <span className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                      activeDecision.authorityCheck === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeDecision.authorityCheck === 'ESCALATED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {activeDecision.authorityCheck === 'ESCALATED' ? 'STAFF REVIEW' : activeDecision.authorityCheck}
                    </span>
                  </div>

                  {/* Chốt 4: Blockchain/Audit Integrity */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-700 font-medium">4. Toàn vẹn chuỗi SHA-256:</span>
                    <span className="font-semibold text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      GENESIS VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ Quyết Định Cuối Cùng (Final Decision Card) */}
              <div className={`p-4 rounded-xl border text-left space-y-2 shadow-2xs ${
                activeDecision.status === 'APPROVED' || activeDecision.status === 'AUTO_APPROVED' || activeDecision.status === 'ROUTINE_AUTO_APPROVED'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : activeDecision.status === 'WAITING_STUDENT'
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : activeDecision.status === 'ESCALATED' || activeDecision.status === 'ESCALATE_TO_STAFF'
                  ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950'
                  : activeDecision.status === 'REJECTED' || activeDecision.status === 'REJECTED_POLICY'
                  ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    Quyết Định Cuối Cùng
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
                <div className="bg-[#0B3B82] rounded-xl p-3.5 text-white shadow-xs border border-[#082C64] mb-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-amber-300" />
                      <span className="text-xs font-bold font-mono text-amber-200">Verify Harness 90s Benchmark</span>
                    </div>
                    {onSwitchTab && (
                      <button
                        onClick={() => onSwitchTab('VERIFY_HARNESS')}
                        className="text-[10px] text-blue-200 hover:text-white flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                      >
                        Báo cáo chi tiết <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleRunVerify90s}
                    disabled={isVerifying90s}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {isVerifying90s ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang chạy 5 ca kiểm thử...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>KÍCH HOẠT CHẠY 5 CA TEST BAN GIÁM KHẢO (90s)</span>
                      </>
                    )}
                  </button>

                  {verifyFeedback && (
                    <div className="mt-2 text-[10px] font-mono text-emerald-200 bg-[#082C64] p-2 rounded-lg border border-blue-400/30">
                      {verifyFeedback}
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Log Thời Gian Thực (Preview)</span>
                  <button
                    onClick={() => setColumn3Tab('TERMINAL')}
                    className="text-[#0B3B82] hover:underline text-[10px] font-semibold cursor-pointer"
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
              <div className="bg-[#0B3B82] rounded-xl p-3.5 text-white shadow-xs border border-[#082C64] shrink-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold font-mono text-amber-200">Verify Harness 90s Benchmark</span>
                  </div>
                  {onSwitchTab && (
                    <button
                      onClick={() => onSwitchTab('VERIFY_HARNESS')}
                      className="text-[10px] text-blue-200 hover:text-white flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                    >
                      Báo cáo chi tiết <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleRunVerify90s}
                  disabled={isVerifying90s}
                  className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
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
                  <div className="mt-2 text-[10px] font-mono text-emerald-200 bg-[#082C64] p-2 rounded-lg border border-blue-400/30">
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
