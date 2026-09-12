import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Layers, Briefcase, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function BorrowModal({ item, onClose, onSubmit, isSubmitting }) {
  const today = new Date().toISOString().split('T')[0];
  const next2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState(today);
  const [pickupTime, setPickupTime] = useState('08:30');
  const [expectedReturnDate, setExpectedReturnDate] = useState(next2Days);
  const [returnTime, setReturnTime] = useState('17:30');
  const [locationOfUse, setLocationOfUse] = useState('Phòng Lab R&D Tầng 3');
  const [purposeCategory, setPurposeCategory] = useState('PROJECT_TASK');
  const [purpose, setPurpose] = useState('');
  const [project, setProject] = useState('Nhiệm vụ nội bộ');

  // Tính số ngày mượn
  const calculateDays = () => {
    const start = new Date(startDate);
    const end = new Date(expectedReturnDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  };

  const loanDays = calculateDays();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!purpose.trim()) {
      alert('Vui lòng nhập mục đích mượn thiết bị!');
      return;
    }
    onSubmit({
      modelId: item._id,
      quantity: Number(quantity),
      startDate,
      pickupTime,
      expectedReturnDate,
      returnTime,
      locationOfUse,
      purposeCategory,
      purpose,
      project
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Đăng Ký Mượn Thiết Bị</h2>
            <p className="text-xs text-slate-400">Thiết lập chi tiết số lượng, thời gian và địa điểm sử dụng thực tế</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Equipment Summary */}
        <div className="p-4 mx-5 mt-5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-16 h-16 rounded-lg object-cover bg-slate-900 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-blue-400 font-mono font-medium">{item.modelCode} • {item.brand}</div>
            <div className="text-sm font-bold text-white truncate">{item.name}</div>
            <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
              <span>Định giá: <strong className="text-white">{formatCurrency(item.estimatedValue)}</strong>/máy</span>
              <span className="text-emerald-400 font-semibold">Khả dụng trong kho: {item.availableStock} chiếc</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Số lượng mượn & Phân loại mục đích */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Số lượng mượn (tối đa {item.availableStock}):</span>
              </label>
              <input
                type="number"
                min="1"
                max={item.availableStock}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(item.availableStock, Math.max(1, Number(e.target.value))))}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>Phân loại mục đích:</span>
              </label>
              <select
                value={purposeCategory}
                onChange={(e) => setPurposeCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="PROJECT_TASK">Công vụ / Nhiệm vụ dự án</option>
                <option value="TEACHING_STUDY">Giảng dạy / Nghiên cứu Lab</option>
                <option value="EVENT_CONFERENCE">Sự kiện / Hội thảo trường</option>
                <option value="PERSONAL_OTHER">Cá nhân / Khác</option>
              </select>
            </div>
          </div>

          {/* Thời gian nhận (Ngày & Giờ) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Ngày & Giờ nhận máy:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-24 px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Ngày & Giờ dự kiến trả:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  min={startDate}
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-24 px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Địa điểm / Phòng sử dụng */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Địa điểm / Phòng sử dụng thiết bị:</span>
            </label>
            <input
              type="text"
              required
              value={locationOfUse}
              onChange={(e) => setLocationOfUse(e.target.value)}
              placeholder="VD: Phòng Lab A201, Hội trường B, Studio Media Tầng 3..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dự án & Mục đích chi tiết */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <span>Dự án / Nhiệm vụ:</span>
            </label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="VD: Triển khai dự án AI Hackathon, Thi tốt nghiệp..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Lý do / Mục đích mượn chi tiết:</span>
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Mô tả lý do bạn cần mượn thiết bị này..."
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Tóm tắt tổng giá trị và thời gian */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs text-blue-300">
            <div>
              Thời lượng mượn: <strong>{loanDays} ngày</strong> (từ {pickupTime} đến {returnTime})
            </div>
            <div>
              Tổng giá trị: <strong className="text-white">{formatCurrency(item.estimatedValue * quantity)}</strong>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang gửi phiếu...' : 'Xác nhận gửi phiếu mượn'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
