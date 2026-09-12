import React from 'react';
import { Tag, Check, XCircle, ArrowRight, Edit3, Trash2, Cpu } from 'lucide-react';

export default function EquipmentCard({ item, onBorrow, onEdit, onDelete, activeRole }) {
  const isAvailable = item.availableStock > 0;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="group rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 flex flex-col overflow-hidden">
      {/* Product Image Header */}
      <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
        <img
          src={item.imageUrl || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80'}
          alt={item.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80';
          }}
        />
        
        {/* Availability Badge */}
        <div className="absolute top-3 left-3">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
              <Check className="w-3 h-3" />
              <span>Sẵn sàng ({item.availableStock}/{item.totalStock})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 backdrop-blur-md">
              <XCircle className="w-3 h-3" />
              <span>Hết máy</span>
            </span>
          )}
        </div>

        {/* Category Tag */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-md">
            <Tag className="w-2.5 h-2.5" />
            <span>{item.category?.name || 'Thiết bị'}</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Model Code */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span className="font-semibold text-blue-400">{item.brand}</span>
            <span>{item.modelCode}</span>
          </div>

          {/* Equipment Name */}
          <h3 className="font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors">
            {item.name}
          </h3>

          {/* Description / Specs */}
          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {item.description || 'Thiết bị phục vụ vận hành, làm việc nội bộ doanh nghiệp.'}
          </p>

          {/* Condition & Spec Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <Cpu className="w-2.5 h-2.5 text-slate-400" />
              <span>Tình trạng: {item.sampleCondition || 'GOOD'}</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-950/40 text-blue-300 border border-blue-900/50">
              Mượn tối đa 7 ngày
            </span>
          </div>
        </div>

        {/* Card Footer: Price & Action */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Định giá tài sản</div>
            <div className="text-sm font-extrabold text-white tracking-tight">
              {formatCurrency(item.estimatedValue)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {activeRole === 'ADMIN' && (
              <>
                <button
                  onClick={() => onEdit(item)}
                  title="Sửa thông tin thiết bị"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(item._id)}
                  title="Xóa thiết bị khỏi kho"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              disabled={!isAvailable}
              onClick={() => onBorrow(item)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
                isAvailable
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Mượn ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
