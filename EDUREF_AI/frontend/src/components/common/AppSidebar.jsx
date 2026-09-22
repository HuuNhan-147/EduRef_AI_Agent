// src/components/common/AppSidebar.jsx
// Thanh điều hướng chính tự thích ứng theo vai trò người dùng (Sinh viên vs Cán bộ)

import React from 'react';
import {
  MessageSquare,
  FileCheck,
  AlertOctagon,
  ShieldCheck,
  CheckCircle,
  FileText,
  Activity,
  User,
  Sliders,
} from 'lucide-react';

export default function AppSidebar({ activeTab, setActiveTab, userRole = 'STUDENT', pendingCount = 0 }) {
  const isStaff = userRole === 'STAFF' || userRole === 'DEAN' || userRole === 'ADMIN';

  // Danh mục điều hướng cho Sinh viên
  const studentNavItems = [
    {
      id: 'STUDENT_ASSISTANT',
      label: 'Trợ lý Học vụ AI',
      sublabel: 'Nộp đơn & Tra cứu',
      icon: MessageSquare,
      badge: 'Chính',
    },
    {
      id: 'MY_PETITIONS',
      label: 'Hồ sơ & Đơn của tôi',
      sublabel: 'Trạng thái & QR Code',
      icon: FileText,
    },
    {
      id: 'VERIFY_HARNESS',
      label: 'Verify Harness 90s',
      sublabel: 'Chạy Benchmark BGK',
      icon: CheckCircle,
      badge: '5 Tests',
    },
    {
      id: 'AUDIT_EXPLORER',
      label: 'Kiểm toán SHA-256',
      sublabel: 'Chuỗi băm bất biến',
      icon: ShieldCheck,
    },
  ];

  // Danh mục điều hướng cho Cán bộ PĐT / Lãnh đạo
  const staffNavItems = [
    {
      id: 'STAFF_ESCALATION',
      label: 'Escalation Hub',
      sublabel: 'Đơn chờ thẩm định',
      icon: AlertOctagon,
      count: pendingCount,
      countColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'STUDENT_ASSISTANT',
      label: 'Góc nhìn Sinh viên',
      sublabel: 'Mô phỏng nộp đơn',
      icon: MessageSquare,
    },
    {
      id: 'MY_PETITIONS',
      label: 'Quản lý Đơn toàn trường',
      sublabel: 'Tất cả trạng thái',
      icon: FileText,
    },
    {
      id: 'VERIFY_HARNESS',
      label: 'Verify Harness 90s',
      sublabel: 'Kiểm thử tự hành BGK',
      icon: CheckCircle,
      badge: '5 Tests',
    },
    {
      id: 'AUDIT_EXPLORER',
      label: 'Kiểm toán & Hash Chain',
      sublabel: 'Toàn vẹn mật mã học',
      icon: ShieldCheck,
    },
  ];

  const currentNavItems = isStaff ? staffNavItems : studentNavItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
      <div className="p-3 space-y-6">
        
        {/* Nhãn vai trò người dùng */}
        <div className="px-3 pt-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isStaff ? 'Khu vực Cán bộ PĐT' : 'Cổng Dịch vụ Sinh viên'}
          </div>
        </div>

        {/* Danh sách mục điều hướng */}
        <nav className="space-y-1">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                  <div className="truncate">
                    <div className="text-xs leading-none">{item.label}</div>
                    {item.sublabel && (
                      <div className="text-[10px] text-slate-400 mt-1 font-normal truncate">
                        {item.sublabel}
                      </div>
                    )}
                  </div>
                </div>

                {/* Badge hoặc số lượng đơn chờ */}
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.countColor || 'bg-slate-200 text-slate-700'}`}>
                    {item.count}
                  </span>
                )}
                {item.badge && !item.count && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Thông tin phiên bản & Tiêu chuẩn cuộc thi */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        <div className="px-2 py-1 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Bounded Autonomy</span>
          <span className="font-mono text-[10px] text-emerald-600 font-bold">100% ACID</span>
        </div>
        <div className="px-2 text-[10px] text-slate-400 truncate">
          MLAI Hackathon 2026 — Track 2
        </div>
      </div>
    </aside>
  );
}
