import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  GraduationCap,
  MessageSquare,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../services/api';
import { cn } from '../../lib/ui';

const STUDENT_NAV = [
  { id: 'STUDENT_ASSISTANT', label: 'Trợ lý AI', icon: MessageSquare },
  { id: 'MY_PETITIONS', label: 'Hồ sơ của tôi', icon: FileText },
];

const STAFF_NAV = [
  { id: 'STAFF_ESCALATION', label: 'Hàng đợi của tôi', icon: AlertTriangle, hasCount: true },
  { id: 'MY_PETITIONS', label: 'Hồ sơ phụ trách', icon: FileText },
  { id: 'AUDIT_EXPLORER', label: 'Nhật ký xử lý', icon: ShieldCheck },
];

const DEAN_NAV = [
  { id: 'STAFF_ESCALATION', label: 'Trung tâm điều phối', icon: AlertTriangle, hasCount: true },
  { id: 'MY_PETITIONS', label: 'Toàn bộ hồ sơ', icon: FileText },
  { id: 'AUDIT_EXPLORER', label: 'Giám sát & nhật ký', icon: ShieldCheck },
  { id: 'VERIFY_HARNESS', label: 'Kiểm thử', icon: FileCheck2 },
];

export default function TopNavbar({
  currentAccountKey,
  onRoleChange,
  socketConnected,
  activeTab,
  setActiveTab,
  pendingCount = 0,
  theme,
  onToggleTheme,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const currentAccount = DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  const isStaff = ['STAFF', 'DEAN'].includes(currentAccount.type);
  const navItems = currentAccount.type === 'DEAN' ? DEAN_NAV : isStaff ? STAFF_NAV : STUDENT_NAV;

  useEffect(() => {
    if (!dropdownOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setDropdownOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [dropdownOpen]);

  return (
    <header className="z-40 shrink-0 border-b border-border bg-canvas/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:px-7">
        <button
          type="button"
          onClick={() => setActiveTab(isStaff ? 'STAFF_ESCALATION' : 'STUDENT_ASSISTANT')}
          className="flex shrink-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label={isStaff ? 'Mở không gian Phòng Đào tạo' : 'Mở Trợ lý AI'}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white shadow-lg shadow-blue-950/40">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:block">
            <span className="block text-sm font-semibold tracking-tight">EduRef AI</span>
            <span className="block text-[11px] text-text-muted">{isStaff ? 'Không gian Phòng Đào tạo' : 'Không gian sinh viên'}</span>
          </span>
        </button>

        <nav className="min-w-0 flex-1 overflow-x-auto" aria-label="Điều hướng chính">
          <div className="mx-auto flex w-max items-center gap-1 rounded-xl bg-surface-muted p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={cn(
                    'flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-surface-elevated text-text-primary shadow-sm'
                      : 'text-text-muted hover:bg-surface hover:text-text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden md:inline">{item.label}</span>
                  {item.hasCount && pendingCount > 0 && (
                    <span className="min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onToggleTheme} className="ui-icon-button" aria-label={theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'} title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}>
            {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>
          <span
            className="hidden items-center gap-2 rounded-full border border-border px-2.5 py-1.5 text-[11px] text-text-muted lg:flex"
            title={socketConnected ? 'Kênh cập nhật thời gian thực đang hoạt động' : 'Mất kết nối thời gian thực'}
          >
            <span className={cn('h-2 w-2 rounded-full', socketConnected ? 'bg-success' : 'bg-danger')} />
            {socketConnected ? 'Trực tuyến' : 'Ngoại tuyến'}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              aria-label={`Đổi tài khoản. Hiện tại: ${currentAccount.name}`}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-2.5 text-left transition-colors hover:bg-surface-elevated"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-[11px] font-semibold text-blue-200">
                {currentAccount.type === 'STUDENT' ? 'SV' : 'CB'}
              </span>
              <span className="hidden max-w-36 xl:block">
                <span className="block truncate text-xs font-medium">{currentAccount.name}</span>
                <span className="block truncate text-[10px] text-text-muted">{currentAccount.tag}</span>
              </span>
              <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', dropdownOpen && 'rotate-180')} />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                aria-label="Chọn tài khoản demo"
                className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-surface-elevated p-2 shadow-panel animate-fade-up"
              >
                <p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-text-subtle">
                  Tài khoản kiểm thử
                </p>
                <div className="max-h-[min(28rem,70vh)] space-y-1 overflow-y-auto">
                  {Object.entries(DEMO_ACCOUNTS).map(([key, account]) => {
                    const isSelected = key === currentAccountKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        onClick={() => {
                          onRoleChange(key);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          isSelected ? 'bg-accent/15' : 'hover:bg-surface-muted',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {account.name} <span className="font-mono text-xs text-text-subtle">· {account.code}</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-text-muted">
                            {account.role || account.class} · {account.faculty || 'Phòng Đào tạo'}
                          </span>
                          <span className="mt-1 block text-[11px] text-blue-300">{account.tag}</span>
                        </span>
                        {isSelected && <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
