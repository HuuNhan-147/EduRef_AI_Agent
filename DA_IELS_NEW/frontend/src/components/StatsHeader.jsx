import React from 'react';
import { Layers, CheckCircle2, Clock, Wrench } from 'lucide-react';

export default function StatsHeader({ stats }) {
  const cards = [
    {
      title: 'Tổng Chủng Loại',
      value: stats?.totalModels || 0,
      sub: `${stats?.totalItems || 0} máy cá thể`,
      icon: Layers,
      color: 'from-blue-500/20 to-blue-600/5',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400'
    },
    {
      title: 'Đang Sẵn Sàng (Khả dụng)',
      value: stats?.availableItems || 0,
      sub: 'Có thể mượn ngay',
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-emerald-600/5',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-400'
    },
    {
      title: 'Đang Được Mượn',
      value: stats?.borrowedItems || 0,
      sub: 'Đang phục vụ công tác',
      icon: Clock,
      color: 'from-amber-500/20 to-amber-600/5',
      borderColor: 'border-amber-500/20',
      textColor: 'text-amber-400'
    },
    {
      title: 'Đang Bảo Trì / Sửa Chữa',
      value: stats?.maintenanceItems || 0,
      sub: 'Kiểm định chất lượng',
      icon: Wrench,
      color: 'from-rose-500/20 to-rose-600/5',
      borderColor: 'border-rose-500/20',
      textColor: 'text-rose-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-gradient-to-b ${card.color} border ${card.borderColor} backdrop-blur-sm relative overflow-hidden transition-transform hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">{card.title}</span>
              <div className={`p-2 rounded-xl bg-slate-900/60 border border-slate-800 ${card.textColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight">{card.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
