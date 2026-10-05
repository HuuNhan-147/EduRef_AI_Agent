import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Check,
  Wifi,
  WifiOff,
  School,
  MessageSquare,
  FileText,
  AlertOctagon,
  CheckCircle,
  Zap,
  HelpCircle,
  UserPlus
} from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../services/api';

export default function TopNavbar({
  currentAccountKey,
  onRoleChange,
  socketConnected,
  activeTab = 'STUDENT_ASSISTANT',
  setActiveTab,
  pendingCount = 0,
  customProfile = null,
  onOpenCustomProfile,
  onOpenOnboarding,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const currentAccount = currentAccountKey === 'CUSTOM_STUDENT' && customProfile
    ? customProfile
    : DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  const isStaff = ['STAFF', 'DEAN'].includes(currentAccount.type);

  // Danh mục Navigation Tabs theo vai trò (Được rút gọn tinh tế để vừa khít 1 hàng, không bị scroll)
  const studentNavItems = [
    {
      id: 'STUDENT_ASSISTANT',
      label: 'Trợ lý AI',
      icon: MessageSquare,
    },
    {
      id: 'MY_PETITIONS',
      label: 'Đơn của tôi',
      icon: FileText,
    },
    {
      id: 'VERIFY_HARNESS',
      label: 'Verify Đề A',
      icon: Zap,
    },
    {
      id: 'AUDIT_EXPLORER',
      label: 'Kiểm toán',
      icon: ShieldCheck,
    },
  ];

  const staffNavItems = [
    {
      id: 'VERIFY_HARNESS',
      label: 'Verify Đề A',
      icon: Zap,
    },
    {
      id: 'STAFF_ESCALATION',
      label: 'Duyệt đơn',
      icon: AlertOctagon,
      count: pendingCount,
    },
    {
      id: 'STUDENT_ASSISTANT',
      label: 'Góc sinh viên',
      icon: MessageSquare,
    },
    {
      id: 'MY_PETITIONS',
      label: 'Quản lý đơn',
      icon: FileText,
    },
    {
      id: 'AUDIT_EXPLORER',
      label: 'Kiểm toán',
      icon: ShieldCheck,
    },
  ];

  const navItems = isStaff ? staffNavItems : studentNavItems;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md select-none">
      <div className="w-full px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between gap-3">
        
        {/* Khối Nhận Diện Thương Hiệu Hành Chính Chuẩn Chính Quy */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Logo HUTECH đại diện trường */}
          <div className="h-9 px-2 py-0.5 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-700/60 shrink-0">
            <img src="/hutech_logo.png" alt="HUTECH University" className="h-full w-auto object-contain" />
          </div>

          {/* Vạch phân cách tinh tế */}
          <div className="h-7 w-px bg-slate-800 hidden sm:block shrink-0" />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">EduRef AI</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                VNG · Đề A
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal hidden lg:block">
              Cổng Dịch Vụ Học Vụ Tự Hành
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* KHỐI NAVIGATION TABS NGANG (Gọn gàng, vừa khít 1 hàng, không hiện scroll) */}
        {/* ========================================================================= */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab && setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>

                {/* Badge số lượng đơn chờ nếu có */}
                {item.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Khối Trạng Thái Kết Nối & 1-Click Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Nút Hướng Dẫn Trải Nghiệm 30 Giây */}
          <button
            onClick={() => onOpenOnboarding && onOpenOnboarding()}
            title="Xem lại hướng dẫn trải nghiệm 30 giây"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-blue-300 hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Hướng dẫn test</span>
          </button>

          {/* Socket.IO Connection Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono">
            {socketConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300">Live Socket</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span className="text-slate-400">Disconnected</span>
              </>
            )}
          </div>

          {/* 1-Click Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-blue-400 border border-slate-600">
                {currentAccount.type === 'STUDENT' ? (currentAccountKey === 'CUSTOM_STUDENT' ? '⭐' : 'SV') : 'CB'}
              </div>
              <div className="hidden xl:block">
                <div className="text-xs font-medium text-white flex items-center gap-1.5">
                  {currentAccount.name}
                  <span className="text-[10px] text-slate-400 font-mono">({currentAccount.code})</span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal truncate max-w-[150px]">
                  {currentAccount.tag}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-76 sm:w-84 max-w-[92vw] rounded-xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Hồ sơ riêng của sinh viên (Nếu đã tạo) */}
                {customProfile && (
                  <div className="p-2.5 bg-blue-50/80 border-b border-blue-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1.5">
                      <span className="flex items-center gap-1">
                        ⭐ Hồ sơ của bạn (Cục bộ)
                      </span>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenCustomProfile) onOpenCustomProfile();
                        }}
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Chỉnh sửa
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        onRoleChange('CUSTOM_STUDENT');
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        currentAccountKey === 'CUSTOM_STUDENT'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                          : 'bg-white text-slate-900 border-blue-200 hover:border-blue-400'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{customProfile.name}</div>
                        <div className={`text-[10px] font-mono ${currentAccountKey === 'CUSTOM_STUDENT' ? 'text-blue-100' : 'text-slate-500'}`}>
                          MSSV: {customProfile.code} · {customProfile.tag}
                        </div>
                      </div>
                      {currentAccountKey === 'CUSTOM_STUDENT' && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                )}

                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50">
                  Tài khoản mẫu thử nghiệm
                </div>
                
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                  {Object.entries(DEMO_ACCOUNTS).map(([key, acc]) => {
                    const isSelected = key === currentAccountKey;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          onRoleChange(key);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-blue-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/70' : ''
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{acc.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({acc.code})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {acc.role || acc.class} — {acc.faculty || 'Phòng Đào Tạo'}
                          </div>
                          <div className="text-[10px] text-blue-600 font-medium">
                            {acc.tag}
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Nút Tạo Hồ Sơ Riêng */}
                <div className="p-2 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onOpenCustomProfile) onOpenCustomProfile();
                    }}
                    className="w-full py-2 px-3 rounded-lg border border-dashed border-blue-400 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{customProfile ? '+ Đổi hồ sơ sinh viên khác' : '+ Tạo hồ sơ sinh viên của bạn'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
