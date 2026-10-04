import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import TopNavbar from './components/common/TopNavbar';
import DynamicPetitionModal from './components/forms/DynamicPetitionModal';
import StudentWorkspacePage from './pages/StudentWorkspacePage';
import api, { DEMO_ACCOUNTS, switchRoleAuth, UI_PREVIEW_MODE } from './services/api';
import getSocket from './services/socket';

const MyPetitionsPage = lazy(() => import('./pages/MyPetitionsPage'));
const StaffEscalationPage = lazy(() => import('./pages/StaffEscalationPage'));
const VerifyHarnessPage = lazy(() => import('./pages/VerifyHarnessPage'));
const AuditExplorerPage = lazy(() => import('./pages/AuditExplorerPage'));

const INITIAL_ACCOUNT = 'STUDENT_ACTIVE';

function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status">
      <div className="flex items-center gap-3 text-sm text-text-muted">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
        Đang mở không gian làm việc…
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('eduref_theme') === 'light' ? 'light' : 'dark');
  const [currentAccountKey, setCurrentAccountKey] = useState(INITIAL_ACCOUNT);
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('STUDENT_ASSISTANT');
  const [socketConnected, setSocketConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [dynamicModal, setDynamicModal] = useState({ isOpen: false, petitionType: null });
  const [externalPrompt, setExternalPrompt] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f7f9fc' : '#070a12');
    localStorage.setItem('eduref_theme', theme);
  }, [theme]);

  const showToast = useCallback((message, type = 'info') => {
    window.clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const initializeDemoSession = useCallback(async () => {
    setAuthStatus('loading');
    setAuthError('');
    const user = await switchRoleAuth(INITIAL_ACCOUNT);

    if (!user) {
      setAuthStatus('error');
      setAuthError('Không thể khởi tạo phiên demo. Hãy kiểm tra backend và cấu hình ALLOW_DEMO_ROLE_SWITCH.');
      return;
    }

    setCurrentAccountKey(INITIAL_ACCOUNT);
    setAuthStatus('ready');
  }, []);

  useEffect(() => {
    initializeDemoSession();
  }, [initializeDemoSession]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await api.get('/petitions?status=ESCALATED');
      if (response.data?.success) setPendingCount((response.data.data || []).length);
    } catch {
      // Badge này chỉ là thông tin phụ; lỗi sẽ không chặn tác vụ chính.
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'ready') fetchPendingCount();
  }, [authStatus, currentAccountKey, fetchPendingCount]);

  useEffect(() => {
    if (authStatus !== 'ready') return undefined;
    const socket = getSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onEscalated = (data) => {
      setPendingCount((count) => count + 1);
      showToast(`Hồ sơ ${data.requestCode || ''} cần cán bộ thẩm định.`, 'warning');
    };
    const onStatusUpdated = (data) => {
      showToast(`Hồ sơ ${data.requestCode || ''} đã chuyển sang ${data.status}.`, 'success');
      fetchPendingCount();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('petition_escalated', onEscalated);
    socket.on('petition_status_updated', onStatusUpdated);
    setSocketConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('petition_escalated', onEscalated);
      socket.off('petition_status_updated', onStatusUpdated);
    };
  }, [authStatus, fetchPendingCount, showToast]);

  const handleRoleChange = async (newAccountKey) => {
    const authenticatedUser = await switchRoleAuth(newAccountKey);
    if (!authenticatedUser) {
      showToast('Không thể chuyển tài khoản demo. Hãy kiểm tra cấu hình backend.', 'warning');
      return;
    }

    const account = DEMO_ACCOUNTS[newAccountKey];
    setCurrentAccountKey(newAccountKey);
    setActiveTab(['STAFF', 'DEAN'].includes(account?.type) ? 'STAFF_ESCALATION' : 'STUDENT_ASSISTANT');
    showToast(`Đang sử dụng tài khoản ${account?.name || newAccountKey}.`);
  };

  const handleSubmitToChat = (promptText, extraData = {}) => {
    setActiveTab('STUDENT_ASSISTANT');
    setExternalPrompt(typeof promptText === 'string' ? { text: promptText, ...extraData } : promptText);
  };

  if (authStatus !== 'ready') {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-4 text-text-primary">
        <section className="ui-panel w-full max-w-md p-6 text-center" aria-live="polite">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-accent/15">
            <span className="h-3 w-3 animate-pulse rounded-full bg-accent" />
          </div>
          <h1 className="text-lg font-semibold">EduRef AI</h1>
          {authStatus === 'loading' ? (
            <p className="mt-2 text-sm text-text-muted">Đang khởi tạo phiên làm việc an toàn…</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-danger">{authError}</p>
              <button type="button" onClick={initializeDemoSession} className="ui-button-primary mt-5">
                Thử kết nối lại
              </button>
            </>
          )}
        </section>
      </div>
    );
  }

  const currentAccount = DEMO_ACCOUNTS[currentAccountKey];

  return (
    <div className="app-shell flex h-dvh min-h-[640px] flex-col overflow-hidden bg-canvas text-text-primary">
      <TopNavbar
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        currentAccountKey={currentAccountKey}
        onRoleChange={handleRoleChange}
        socketConnected={socketConnected}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
      />

      {UI_PREVIEW_MODE && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-[90] max-w-[calc(100vw-1.5rem)] rounded-lg border border-warning/30 bg-[#241c0f]/95 px-3 py-2 text-[11px] text-amber-100 shadow-panel backdrop-blur sm:bottom-4 sm:left-4" role="status">
          UI Preview · Dữ liệu mô phỏng, không phải kết quả backend thật.
        </div>
      )}

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`absolute right-4 top-4 z-50 flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-panel animate-fade-up ${
              toast.type === 'warning'
                ? 'border-warning/30 bg-[#241c0f] text-amber-100'
                : toast.type === 'success'
                  ? 'border-success/30 bg-[#10221c] text-emerald-100'
                  : 'border-accent/30 bg-[#101c35] text-blue-100'
            }`}
          >
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-current" />
            {toast.message}
          </div>
        )}

        {currentAccount?.type === 'STUDENT' && (
          <div className={activeTab === 'STUDENT_ASSISTANT' ? 'h-full' : 'hidden'}>
            <StudentWorkspacePage
              key={currentAccountKey}
              currentAccountKey={currentAccountKey}
              onOpenDynamicForm={(petitionType) => setDynamicModal({ isOpen: true, petitionType })}
              externalPrompt={externalPrompt}
              onClearExternalPrompt={() => setExternalPrompt(null)}
            />
          </div>
        )}

        <Suspense fallback={<PageLoader />}>
          {activeTab === 'MY_PETITIONS' && (
            <div className="h-full overflow-y-auto">
              <MyPetitionsPage userRole={currentAccount?.type} onSwitchTab={setActiveTab} />
            </div>
          )}
          {activeTab === 'STAFF_ESCALATION' && (
            <div className="h-full overflow-y-auto">
              <StaffEscalationPage currentAccountKey={currentAccountKey} />
            </div>
          )}
          {activeTab === 'VERIFY_HARNESS' && (
            <div className="h-full overflow-y-auto">
              <VerifyHarnessPage userRole={currentAccount?.type} />
            </div>
          )}
          {activeTab === 'AUDIT_EXPLORER' && (
            <div className="h-full overflow-y-auto">
              <AuditExplorerPage userRole={currentAccount?.type} />
            </div>
          )}
        </Suspense>
      </main>

      {currentAccount?.type === 'STUDENT' && (
        <DynamicPetitionModal
          isOpen={dynamicModal.isOpen}
          onClose={() => setDynamicModal({ isOpen: false, petitionType: null })}
          petitionType={dynamicModal.petitionType}
          currentAccountKey={currentAccountKey}
          onSubmitToChat={handleSubmitToChat}
        />
      )}
    </div>
  );
}
