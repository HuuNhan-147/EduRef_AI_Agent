import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Box, Tag, Check, X } from 'lucide-react';

export default function InventoryManager({
  catalog,
  categories,
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    modelCode: '',
    name: '',
    brand: '',
    categoryId: '',
    estimatedValue: 1000000,
    initialQuantity: 2,
    imageUrl: '',
    description: ''
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      modelCode: `MOD-${Date.now().toString().slice(-4)}`,
      name: '',
      brand: '',
      categoryId: categories[0]?._id || '',
      estimatedValue: 2000000,
      initialQuantity: 2,
      imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80',
      description: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      modelCode: item.modelCode,
      name: item.name,
      brand: item.brand,
      categoryId: item.category?._id || item.category,
      estimatedValue: item.estimatedValue,
      initialQuantity: item.totalStock,
      imageUrl: item.imageUrl,
      description: item.description
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateEquipment(editingItem._id, formData);
    } else {
      onAddEquipment(formData);
    }
    setIsModalOpen(false);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-400" />
            <span>Quản Trị Kho Thiết Bị (CRUD)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Thêm mới, điều chỉnh thông tin hoặc thanh lý tài sản trong kho
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Thiết Bị Mới</span>
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
            <tr>
              <th className="p-4">Hình ảnh</th>
              <th className="p-4">Mã & Tên thiết bị</th>
              <th className="p-4">Hãng & Danh mục</th>
              <th className="p-4 text-center">Tồn kho / Khả dụng</th>
              <th className="p-4">Giá trị định giá</th>
              <th className="p-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {catalog?.map((item) => (
              <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 w-16">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover bg-slate-950"
                  />
                </td>
                <td className="p-4 font-medium">
                  <div className="font-mono text-blue-400 text-[11px]">{item.modelCode}</div>
                  <div className="font-bold text-white text-sm mt-0.5">{item.name}</div>
                </td>
                <td className="p-4">
                  <div className="text-slate-200 font-semibold">{item.brand}</div>
                  <div className="text-slate-400 text-[11px]">{item.category?.name}</div>
                </td>
                <td className="p-4 text-center">
                  <span className="font-bold text-white">{item.availableStock}</span>
                  <span className="text-slate-500"> / {item.totalStock}</span>
                </td>
                <td className="p-4 font-bold text-white font-mono">
                  {formatCurrency(item.estimatedValue)}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteEquipment(item._id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CRUD Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {editingItem ? 'Chỉnh Sửa Thiết Bị' : 'Thêm Thiết Bị Mới Vào Kho'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mã Model:</label>
                  <input
                    type="text"
                    required
                    value={formData.modelCode}
                    onChange={(e) => setFormData({ ...formData, modelCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hãng sản xuất:</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tên thiết bị:</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Laptop Dell Latitude 5420..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Danh mục:</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Định giá (VNĐ):</label>
                  <input
                    type="number"
                    required
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {!editingItem && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Số lượng máy nhập kho ban đầu:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.initialQuantity}
                    onChange={(e) => setFormData({ ...formData, initialQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Link ảnh thiết bị (URL):</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Mô tả / Thông số kỹ thuật:</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả tóm tắt cấu hình..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
                >
                  {editingItem ? 'Lưu Thay Đổi' : 'Thêm Thiết Bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
