import React, { lazy, Suspense, useState, useEffect } from 'react';
import TopNavbar from './components/common/TopNavbar';
import StudentWorkspacePage from './pages/StudentWorkspacePage';
import LandingPage from './pages/LandingPage';
import ConnectionPanel from './components/common/ConnectionPanel';
import LoadingSkeleton from './components/common/LoadingSkeleton';
import DynamicPetitionModal from './components/forms/DynamicPetitionModal';
import WelcomeOnboardingModal from './components/common/WelcomeOnboardingModal';
import CustomProfileModal from './components/forms/CustomProfileModal';
import api, { switchRoleAuth, DEMO_ACCOUNTS } from './services/api';
import getSocket from './services/socket';

const StaffEscalationPage = lazy(() => import('./pages/StaffEscalationPage'));
const VerifyHarnessPage = lazy(() => import('./pages/VerifyHarnessPage'));
const AuditExplorerPage = lazy(() => import('./pages/AuditExplorerPage'));
const MyPetitionsPage = lazy(() => import('./pages/MyPetitionsPage'));

const TAB_QUERY = {
  LANDING: '', STUDENT_ASSISTANT: 'chat', MY_PETITIONS: 'petitions',
  STAFF_ESCALATION: 'staff', VERIFY_HARNESS: 'verify', AUDIT_EXPLORER: 'audit',
};

export function getInitialTab(search = '') {
  const query = new URLSearchParams(search).get('tab');
  return Object.keys(TAB_QUERY).find((tab) => TAB_QUERY[tab] === query) || 'LANDING';
}

export default function App() {
  // Tài khoản hiện tại được chọn (mặc định sinh viên ACTIVE Cao Hữu Nhân)
  const [currentAccountKey, setCurrentAccountKey] = useState('STUDENT_ACTIVE');
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState(() => getInitialTab(typeof window === 'undefined' ? '' : window.location.search));
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    const onBack = () => setActiveTab(getInitialTab(window.location.search));
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (TAB_QUERY[activeTab]) url.searchParams.set('tab', TAB_QUERY[activeTab]);
    else url.searchParams.delete('tab');
    window.history.replaceState(null, '', url);
  }, [activeTab]);

  const navigateTo = (tab) => {
    if (tab === activeTab) return;
    const url = new URL(window.location.href);
    url.hash = '';
    if (TAB_QUERY[tab]) url.searchParams.set('tab', TAB_QUERY[tab]);
    else url.searchParams.delete('tab');
    window.history.pushState(null, '', url);
    setActiveTab(tab);
    if (tab === 'LANDING') window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Hồ sơ sinh viên tùy biến (lưu cục bộ trên máy của sinh viên đó)
  const [customProfile, setCustomProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('eduref_custom_student');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [customProfileModalOpen, setCustomProfileModalOpen] = useState(false);

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
    if (newAccountKey === 'CUSTOM_STUDENT') {
      if (customProfile) {
        if (customProfile.token) {
          localStorage.setItem('eduref_token', customProfile.token);
          localStorage.setItem('eduref_role_key', 'CUSTOM_STUDENT');
          window.dispatchEvent(new Event('eduref-auth-changed'));
        }
        setCurrentAccountKey('CUSTOM_STUDENT');
        setActiveTab('STUDENT_ASSISTANT');
        showToast(`Đã chuyển sang hồ sơ của bạn: ${customProfile.name} (${customProfile.code})`, 'info');
      } else {
        setCustomProfileModalOpen(true);
      }
      return;
    }

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

  const isLanding = activeTab === 'LANDING';
  const conversationVisible = isLanding || activeTab === 'STUDENT_ASSISTANT';
  const ready = authStatus === 'ready';

  return (
    <div className={'app-shell ' + (isLanding ? 'landing-shell' : 'workspace-shell')}>
      <a className="skip-link" href="#main-content">Chuyển tới nội dung chính</a>
      <TopNavbar
        currentAccountKey={currentAccountKey}
        onRoleChange={handleRoleChange}
        socketConnected={socketConnected}
        activeTab={activeTab}
        setActiveTab={navigateTo}
        pendingCount={pendingCount}
        customProfile={customProfile}
        sessionReady={ready}
        onOpenCustomProfile={() => setCustomProfileModalOpen(true)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />
      {toast && <div className={'app-toast app-toast-' + toast.type} role="status"><span>{toast.message}</span></div>}
      <main id="main-content" className="app-main" tabIndex={-1}>
        <LandingPage active={isLanding} visible={conversationVisible} onNavigate={navigateTo}>
          {ready ? (
            <StudentWorkspacePage
              currentAccountKey={currentAccountKey}
              customProfile={customProfile}
              onOpenDynamicForm={handleOpenDynamicForm}
              externalPrompt={externalPrompt}
              onClearExternalPrompt={() => setExternalPrompt(null)}
              onSwitchTab={navigateTo}
            />
          ) : <ConnectionPanel status={authStatus} error={authError} onRetry={initializeDemoSession} />}
        </LandingPage>
        {!conversationVisible && (
          ready ? (
            <div className="workspace-page">
              <Suspense fallback={<div className="p-8"><LoadingSkeleton label="Đang mở không gian làm việc…" /></div>}>
                {activeTab === 'MY_PETITIONS' && <MyPetitionsPage currentAccountKey={currentAccountKey} onSwitchTab={navigateTo} />}
                {activeTab === 'STAFF_ESCALATION' && <StaffEscalationPage currentAccountKey={currentAccountKey} />}
                {activeTab === 'VERIFY_HARNESS' && <VerifyHarnessPage />}
                {activeTab === 'AUDIT_EXPLORER' && <AuditExplorerPage />}
              </Suspense>
            </div>
          ) : <div className="workspace-connection"><ConnectionPanel status={authStatus} error={authError} onRetry={initializeDemoSession} /></div>
        )}
      </main>
      {ready && (
        <>
          <DynamicPetitionModal
            isOpen={dynamicModal.isOpen}
            onClose={() => setDynamicModal({ isOpen: false, petitionType: null })}
            petitionType={dynamicModal.petitionType}
            currentAccountKey={currentAccountKey}
            customProfile={customProfile}
            onSubmitToChat={handleSubmitToChat}
            onPetitionCreated={handlePetitionCreated}
          />
          <WelcomeOnboardingModal
            isOpen={onboardingOpen}
            onClose={() => setOnboardingOpen(false)}
            onSelectTestPrompt={(promptText) => handleSubmitToChat(promptText)}
            onOpenCustomProfile={() => { setOnboardingOpen(false); setCustomProfileModalOpen(true); }}
          />
          <CustomProfileModal
            isOpen={customProfileModalOpen}
            onClose={() => setCustomProfileModalOpen(false)}
            currentProfile={customProfile}
            onProfileSaved={(savedProfile) => {
              setCustomProfile(savedProfile);
              setCurrentAccountKey('CUSTOM_STUDENT');
              showToast(`Đã lưu và kích hoạt hồ sơ: ${savedProfile.name}`, 'success');
            }}
          />
        </>
      )}
    </div>
  );
}
