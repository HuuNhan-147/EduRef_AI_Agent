// src/App.jsx
// Shell giao diện trung tâm EduRef AI kết nối toàn bộ hệ thống Học vụ Tự hành

import React, { useState, useEffect } from 'react';
import TopNavbar from './components/common/TopNavbar';
import AppSidebar from './components/common/AppSidebar';
import StudentWorkspacePage from './pages/StudentWorkspacePage';
import StaffEscalationPage from './pages/StaffEscalationPage';
import VerifyHarnessPage from './pages/VerifyHarnessPage';
import AuditExplorerPage from './pages/AuditExplorerPage';
import MyPetitionsPage from './pages/MyPetitionsPage';
import DynamicPetitionModal from './components/forms/DynamicPetitionModal';
import api, { switchRoleAuth, DEMO_ACCOUNTS } from './services/api';
import getSocket from './services/socket';

export default function App() {
  // Tài khoản hiện tại được chọn (mặc định sinh viên ACTIVE Cao Hữu Nhân)
  const [currentAccountKey, setCurrentAccountKey] = useState('STUDENT_ACTIVE');
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState('');

  // Tab đang hoạt động
  const [activeTab, setActiveTab] = useState('STUDENT_ASSISTANT');

  // Trạng thái Socket.IO
  const [socketConnected, setSocketConnected] = useState(false);

  // Số lượng đơn chờ cán bộ xử lý (ESCALATED) để hiển thị trên Sidebar
  const [pendingCount, setPendingCount] = useState(0);

  // Dynamic Petition Form Modal state
  const [dynamicModal, setDynamicModal] = useState({
    isOpen: false,
    petitionType: null,
  });

  // Prompt tự động truyền vào Student Workspace Chat khi nộp từ Modal
  const [externalPrompt, setExternalPrompt] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const initializeDemoSession = async () => {
    setAuthStatus('loading');
    setAuthError('');
    const user = await switchRoleAuth('STUDENT_ACTIVE');
    if (!user) {
      setAuthStatus('error');
      setAuthError('Không thể khởi tạo phiên demo. Kiểm tra backend và ALLOW_DEMO_ROLE_SWITCH.');
      return;
    }
    setCurrentAccountKey('STUDENT_ACTIVE');
    setAuthStatus('ready');
  };

  // Chỉ render ứng dụng sau khi phiên JWT demo đã sẵn sàng. Điều này ngăn
  // các component con gọi API bằng một phiên chưa xác thực khi trang vừa mở.
  useEffect(() => {
    initializeDemoSession();
  }, []);

  // Lắng nghe Socket.IO
  useEffect(() => {
    if (authStatus !== 'ready') return undefined;
    const socket = getSocket();

    const onConnect = () => {
      setSocketConnected(true);
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onEscalated = (data) => {
      setPendingCount((prev) => prev + 1);
      showToast(`Đơn ${data.requestCode || ''} đã được AI chuyển tiếp lên Cán bộ PĐT thẩm định!`, 'warning');
    };

    const onStatusUpdated = (data) => {
      showToast(`Hồ sơ ${data.requestCode || ''} vừa được cập nhật trạng thái: ${data.status}`, 'success');
      fetchPendingCount();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('petition_escalated', onEscalated);
    socket.on('petition_status_updated', onStatusUpdated);

    if (socket.connected) {
      setSocketConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('petition_escalated', onEscalated);
      socket.off('petition_status_updated', onStatusUpdated);
    };
  }, [authStatus]);

  // Lấy số lượng đơn ESCALATED
  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/petitions?status=ESCALATED');
      if (res.data?.success) {
        setPendingCount((res.data.data || []).length);
      }
    } catch {
      // Bỏ qua nếu lỗi mạng
    }
  };

  useEffect(() => {
    if (authStatus === 'ready') fetchPendingCount();
  }, [currentAccountKey, authStatus]);

  // Xử lý đổi vai trò
  const handleRoleChange = async (newAccountKey) => {
    const authenticatedUser = await switchRoleAuth(newAccountKey);
    if (!authenticatedUser) {
      showToast('Không thể chuyển vai trò demo. Vui lòng kiểm tra cấu hình backend.', 'warning');
      return;
    }
    setCurrentAccountKey(newAccountKey);

    const account = DEMO_ACCOUNTS[newAccountKey];
    if (account) {
      if (account.type === 'STAFF' || account.type === 'DEAN') {
        setActiveTab('STAFF_ESCALATION');
        showToast(`Đã chuyển sang vai trò: ${account.name} (${account.role})`, 'info');
      } else {
        setActiveTab('STUDENT_ASSISTANT');
        showToast(`Đã chuyển sang góc nhìn Sinh viên: ${account.name} (${account.code})`, 'info');
      }
    }
  };

  if (authStatus !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-lg bg-blue-600" />
          <h1 className="text-lg font-bold">EduRef AI · VNG Đề A</h1>
          {authStatus === 'loading' ? (
            <p className="mt-2 text-sm text-slate-400">Đang khởi tạo phiên kiểm thử an toàn…</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-rose-300">{authError}</p>
              <button onClick={initializeDemoSession} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Thử kết nối lại
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Mở modal biểu mẫu động
  const handleOpenDynamicForm = (type) => {
    setDynamicModal({
      isOpen: true,
      petitionType: type,
    });
  };

  // Nộp nội dung từ modal vào khung chat của AI kèm dữ liệu/ảnh đính kèm
  const handleSubmitToChat = (promptText, extraData = {}) => {
    setActiveTab('STUDENT_ASSISTANT');
    setExternalPrompt(typeof promptText === 'string' ? { text: promptText, ...extraData } : promptText);
  };

  // Nộp đơn trực tiếp thành công từ modal
  const handlePetitionCreated = (petition) => {
    showToast(`Đã tạo hồ sơ ${petition.requestCode} thành công!`, 'success');
    setActiveTab('MY_PETITIONS');
    fetchPendingCount();
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden font-sans select-none text-slate-800">
      
      {/* 1. Header trên cùng: Brand EduRef AI + Top Navigation Tabs + 1-Click Role Switcher */}
      <TopNavbar
        currentAccountKey={currentAccountKey}
        onRoleChange={handleRoleChange}
        socketConnected={socketConnected}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
      />

      {/* 2. Phần thân: Toàn bộ 100% chiều rộng màn hình cho nội dung chính */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Màn hình chính */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
          
          {/* Toast Notification Floating */}
          {toast && (
            <div
              className={`absolute top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 animate-slide-in transition-all ${
                toast.type === 'warning'
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : toast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-blue-50 text-blue-900 border-blue-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current"></span>
              <span>{toast.message}</span>
            </div>
          )}

          {/* 1. Trang Trợ lý AI Sinh viên: Giữ nguyên trạng thái (Keep-Alive) để không bị mất chat/terminal khi đổi vai trò hoặc chuyển tab */}
          <div className={`flex-1 h-full overflow-hidden ${activeTab === 'STUDENT_ASSISTANT' ? 'flex' : 'hidden'}`}>
            <StudentWorkspacePage
              currentAccountKey={currentAccountKey}
              onOpenDynamicForm={handleOpenDynamicForm}
              externalPrompt={externalPrompt}
              onClearExternalPrompt={() => setExternalPrompt(null)}
              onSwitchTab={setActiveTab}
            />
          </div>

          {activeTab === 'MY_PETITIONS' && (
            <MyPetitionsPage
              currentAccountKey={currentAccountKey}
              onSwitchTab={setActiveTab}
            />
          )}

          {activeTab === 'STAFF_ESCALATION' && (
            <StaffEscalationPage
              currentAccountKey={currentAccountKey}
            />
          )}

          {activeTab === 'VERIFY_HARNESS' && (
            <VerifyHarnessPage />
          )}

          {activeTab === 'AUDIT_EXPLORER' && (
            <AuditExplorerPage />
          )}
        </main>
      </div>

      {/* 3. Modal nộp đơn học vụ sinh động */}
      <DynamicPetitionModal
        isOpen={dynamicModal.isOpen}
        onClose={() => setDynamicModal({ isOpen: false, petitionType: null })}
        petitionType={dynamicModal.petitionType}
        currentAccountKey={currentAccountKey}
        onSubmitToChat={handleSubmitToChat}
        onPetitionCreated={handlePetitionCreated}
      />
    </div>
  );
}
