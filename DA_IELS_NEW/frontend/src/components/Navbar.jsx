import React from 'react';
import { Shield, Home, FileText, Settings, UserCheck, AlertTriangle, Box, Terminal, Wrench, ShieldCheck, Bot, Sparkles, Building2 } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  currentMode,
  setCurrentMode,
}) {
  const roles = [
    { role: 'EMPLOYEE', label: 'Nhân viên', icon: UserCheck, color: 'text-blue-400' },
    { role: 'MANAGER', label: 'Quản lý', icon: AlertTriangle, color: 'text-amber-400' },
    { role: 'STOREKEEPER', label: 'Thủ kho', icon: Box, color: 'text-emerald-400' },
    { role: 'ADMIN', label: 'Quản trị viên', icon: Terminal, color: 'text-purple-400' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner Mode Switcher */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Không Gian Làm Việc:
          </span>
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setCurrentMode('MANUAL')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                currentMode === 'MANUAL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>🏢 Vận Hành Thủ Công (CRUD)</span>
            </button>
            <button
              onClick={() => setCurrentMode('AI_ARENA')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                currentMode === 'AI_ARENA'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold shadow-sm shadow-amber-500/30'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>🤖 Đấu Trường AI Hackathon</span>
              <span className="text-[9px] bg-slate-950 text-amber-300 px-1 py-0.2 rounded font-mono border border-amber-400/40">
                12đ Verify
              </span>
            </button>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px]">
          <span>MLAI Hackathon 2026</span>
          <span>•</span>
          <span className="text-indigo-300 font-semibold">The Escalation Referee (Bảng 1 - Đề A)</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => {
            if (currentMode === 'AI_ARENA') setCurrentMode('MANUAL');
            setActiveTab('HOME');
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/10">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">EquipAgent IELS</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                {currentMode === 'AI_ARENA' ? 'AI Arena' : 'Enterprise'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentMode === 'AI_ARENA'
                ? 'The Escalation Referee • Phê Duyệt & Cấp Phát Tự Hành'
                : 'Hệ Thống Mượn Trả Thiết Bị Nội Bộ (Quy Trình Thủ Công)'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Khi ở chế độ Vận Hành Thủ Công) */}
        {currentMode === 'MANUAL' ? (
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('HOME')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'HOME'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Kho Thiết Bị</span>
            </button>

            <button
              onClick={() => setActiveTab('LOANS')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'LOANS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Phiếu Mượn</span>
            </button>

            {(activeRole === 'ADMIN' || activeRole === 'STOREKEEPER') && (
              <button
                onClick={() => setActiveTab('INVENTORY')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'INVENTORY'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Nhập/Sửa Kho</span>
              </button>
            )}

            {(activeRole === 'ADMIN' || activeRole === 'STOREKEEPER' || activeRole === 'MANAGER') && (
              <button
                onClick={() => setActiveTab('MAINTENANCE')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'MAINTENANCE'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Bảo Trì</span>
              </button>
            )}

            {(activeRole === 'ADMIN' || activeRole === 'MANAGER' || activeRole === 'STOREKEEPER') && (
              <button
                onClick={() => setActiveTab('AUDIT')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'AUDIT'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Sổ Kiểm Toán</span>
              </button>
            )}
          </nav>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Chế độ thi đấu MLAI Bảng 1 Đề A
            </span>
          </div>
        )}

        {/* Role Switcher Toolbar */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 pl-2 pr-1 hidden lg:inline">
            Đang đóng vai:
          </span>
          <div className="flex items-center gap-1">
            {roles.map(({ role, label, icon: Icon, color }) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                title={`Chuyển sang góc nhìn: ${label}`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeRole === role
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

