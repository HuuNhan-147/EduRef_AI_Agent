// src/components/common/TopNavbar.jsx
// Thanh tiêu đề chuẩn mực hành chính đại học: Tích hợp Top Navigation Tabs & 1-Click Role Switcher

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
  Zap
} from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../services/api';

export default function TopNavbar({
  currentAccountKey,
  onRoleChange,
  socketConnected,
  activeTab = 'STUDENT_ASSISTANT',
  setActiveTab,
  pendingCount = 0
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const currentAccount = DEMO_ACCOUNTS[currentAccountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  const isStaff = ['STAFF', 'DEAN'].includes(currentAccount.type);

  // Danh mục Navigation Tabs theo vai trò
  const studentNavItems = [
    {
      id: 'VERIFY_HARNESS',
      label: 'Verify Track A',
      icon: Zap,
    },
    {
      id: 'STUDENT_ASSISTANT',
      label: 'Trợ lý Học vụ AI',
      icon: MessageSquare,
    },
    {
      id: 'MY_PETITIONS',
      label: 'Hồ sơ & Đơn của tôi',
      icon: FileText,
    },
    {
      id: 'AUDIT_EXPLORER',
      label: 'Kiểm toán SHA-256',
      icon: ShieldCheck,
    },
  ];

  const staffNavItems = [
    {
      id: 'VERIFY_HARNESS',
      label: 'Verify Track A',
      icon: Zap,
    },
    {
      id: 'STAFF_ESCALATION',
      label: 'Escalation Hub',
      icon: AlertOctagon,
      count: pendingCount,
    },
    {
      id: 'STUDENT_ASSISTANT',
      label: 'Góc nhìn Sinh viên',
      icon: MessageSquare,
    },
    {
      id: 'MY_PETITIONS',
      label: 'Quản lý Đơn toàn trường',
      icon: FileText,
    },
    {
      id: 'AUDIT_EXPLORER',
      label: 'Kiểm toán SHA-256',
      icon: ShieldCheck,
    },
  ];

  const navItems = isStaff ? staffNavItems : studentNavItems;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md select-none">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Khối Nhận Diện Thương Hiệu Hành Chính */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">EduRef AI</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                VNG · Đề A
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal hidden lg:block">
              Trường ĐH HUTECH — Cổng Dịch Vụ Học Vụ Tự Hành
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* KHỐI NAVIGATION TABS NGANG (Đưa 4 mục từ Sidebar lên đây) */}
        {/* ========================================================================= */}
        <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab && setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Socket.IO Connection Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono">
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
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-blue-400 border border-slate-600">
                {currentAccount.type === 'STUDENT' ? 'SV' : 'CB'}
              </div>
              <div className="hidden xl:block">
                <div className="text-xs font-medium text-white flex items-center gap-1.5">
                  {currentAccount.name}
                  <span className="text-[10px] text-slate-400">({currentAccount.code})</span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal">
                  {currentAccount.tag}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white text-slate-900 shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Chuyển vai trò thử nghiệm (1-Click Switch)
                </div>
                
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {Object.entries(DEMO_ACCOUNTS).map(([key, acc]) => {
                    const isSelected = key === currentAccountKey;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          onRoleChange(key);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-blue-50 transition-colors ${
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
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
