import { useEffect, useRef, useState } from 'react';
import { AlertOctagon, Check, CheckCircle2, ChevronDown, FileText, HelpCircle, Menu, MessageSquare, ShieldCheck, UserPlus, Wifi, WifiOff, X } from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../services/api';
import Brand from './Brand';

const STUDENT_NAV = [
  { id: 'STUDENT_ASSISTANT', query: 'chat', label: 'Trợ lý AI', icon: MessageSquare },
  { id: 'MY_PETITIONS', query: 'petitions', label: 'Đơn của tôi', icon: FileText },
  { id: 'VERIFY_HARNESS', query: 'verify', label: 'Verify Track A', icon: CheckCircle2 },
  { id: 'AUDIT_EXPLORER', query: 'audit', label: 'Dấu vết xử lý', icon: ShieldCheck },
];

export default function TopNavbar({
  currentAccountKey,
  onRoleChange,
  socketConnected,
  activeTab,
  setActiveTab,
  pendingCount = 0,
  customProfile = null,
  onOpenCustomProfile,
  onOpenOnboarding,
  sessionReady = true,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);
  const accountButtonRef = useRef(null);
  const menuButtonRef = useRef(null);
  const currentAccount = currentAccountKey === 'CUSTOM_STUDENT' && customProfile
    ? customProfile
    : DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  const isStaff = ['STAFF', 'DEAN'].includes(currentAccount.type);
  const isLanding = activeTab === 'LANDING';
  const navItems = isStaff
    ? [STUDENT_NAV[0], { id: 'STAFF_ESCALATION', query: 'staff', label: 'Đơn cần xử lý', icon: AlertOctagon, count: pendingCount }, ...STUDENT_NAV.slice(1)]
    : STUDENT_NAV;

  useEffect(() => {
    if (!dropdownOpen && !menuOpen) return undefined;
    const dismiss = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        if (dropdownOpen) accountButtonRef.current?.focus();
        else menuButtonRef.current?.focus();
        setDropdownOpen(false);
        setMenuOpen(false);
      }
      if (event.type === 'pointerdown' && !accountRef.current?.contains(event.target)) setDropdownOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [dropdownOpen, menuOpen]);

  const navigate = (event, tab) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setMenuOpen(false);
    setDropdownOpen(false);
    setActiveTab(tab);
  };

  const selectAccount = (key) => {
    onRoleChange(key);
    setDropdownOpen(false);
  };

  return (
    <header className={'site-header' + (isLanding ? ' is-floating' : '')}>
      <div className="site-header-inner">
        <div className="header-brand">
          <a className="brand-link" href="?" onClick={(event) => navigate(event, 'LANDING')} aria-label="EduRef AI — Trang chủ"><Brand /></a>
          <span className="header-competition-badge">VNG · Track A</span>
        </div>
        <nav id="primary-navigation" aria-label="Điều hướng chính" className={'site-nav' + (menuOpen ? ' is-open' : '')}>
          {isLanding ? (
            <>
              <a className="site-nav-link" href="#dich-vu" onClick={() => setMenuOpen(false)}>Dịch vụ học vụ</a>
              <a className="site-nav-link" href="#cach-hoat-dong" onClick={() => setMenuOpen(false)}>Cách hoạt động</a>
              <a className="site-nav-link" href="?tab=chat" onClick={(event) => navigate(event, 'STUDENT_ASSISTANT')}>Không gian làm việc</a>
            </>
          ) : navItems.map(({ id, query, label, icon: Icon, count }) => (
            <a key={id} href={'?tab=' + query} className="site-nav-link" aria-current={activeTab === id ? 'page' : undefined} onClick={(event) => navigate(event, id)}>
              <Icon size={15} aria-hidden="true" /><span>{label}</span>
              {count > 0 && <span className="nav-count" aria-label={count + ' đơn đang chờ'}>{count}</span>}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          {isLanding ? (
            <a className="ui-button ui-button-secondary header-verify" href="?tab=verify" onClick={(event) => navigate(event, 'VERIFY_HARNESS')}><CheckCircle2 size={16} aria-hidden="true" /><span>Verify<span className="header-verify-track"> Track A</span></span></a>
          ) : (
            <span className="connection-status" data-connected={socketConnected} title={socketConnected ? 'Socket.IO đã kết nối' : 'Socket.IO chưa kết nối; chat có HTTP fallback'}>
              {socketConnected ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
              {socketConnected ? 'Trực tiếp' : 'Socket chưa kết nối'}
            </span>
          )}
          <button type="button" className="icon-button header-help" onClick={onOpenOnboarding} aria-label="Mở hướng dẫn sử dụng" title="Hướng dẫn sử dụng"><HelpCircle size={18} aria-hidden="true" /></button>
          <div className="account-switcher" ref={accountRef}>
            <button ref={accountButtonRef} type="button" className="account-trigger" disabled={!sessionReady} onClick={() => setDropdownOpen(!dropdownOpen)} aria-expanded={dropdownOpen} aria-controls="account-options" aria-label={'Chọn tài khoản demo, hiện tại ' + currentAccount.name}>
              <span className="account-avatar">{currentAccount.type === 'STUDENT' ? 'SV' : 'CB'}</span>
              <span><strong>{currentAccount.name}</strong><small>Phiên demo · {currentAccount.code}</small></span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {dropdownOpen && (
              <div className="account-menu" id="account-options" role="group" aria-label="Tài khoản demo">
                <p className="account-menu-title">Tài khoản mẫu để trải nghiệm các tình huống</p>
                <div className="account-menu-list">
                  {customProfile && (
                    <button type="button" className="account-option" aria-pressed={currentAccountKey === 'CUSTOM_STUDENT'} onClick={() => selectAccount('CUSTOM_STUDENT')}>
                      <span><strong>{customProfile.name}</strong><small>Hồ sơ của bạn · {customProfile.code}</small></span>
                      {currentAccountKey === 'CUSTOM_STUDENT' && <Check size={16} aria-hidden="true" />}
                    </button>
                  )}
                  {Object.entries(DEMO_ACCOUNTS).map(([key, account]) => (
                    <button key={key} type="button" className="account-option" aria-pressed={key === currentAccountKey} onClick={() => selectAccount(key)}>
                      <span><strong>{account.name}</strong><small>{account.code} · {account.role || account.class}<br />{account.tag}</small></span>
                      {key === currentAccountKey && <Check size={16} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                <button type="button" className="ui-button ui-button-secondary" onClick={() => { setDropdownOpen(false); onOpenCustomProfile?.(); }}><UserPlus size={16} aria-hidden="true" /> {customProfile ? 'Chỉnh sửa hồ sơ của bạn' : 'Tạo hồ sơ sinh viên'}</button>
              </div>
            )}
          </div>
          <button ref={menuButtonRef} type="button" className="icon-button mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="primary-navigation" aria-label={menuOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}>
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
