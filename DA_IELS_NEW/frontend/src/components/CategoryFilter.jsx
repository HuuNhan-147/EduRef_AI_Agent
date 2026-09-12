import React from 'react';
import { Search, Laptop, Monitor, Camera, Projector, Keyboard, LayoutGrid } from 'lucide-react';

export default function CategoryFilter({ categories, selectedCategory, setSelectedCategory, searchTerm, setSearchTerm }) {
  const getIcon = (iconName) => {
    switch (iconName?.toLowerCase()) {
      case 'laptop': return Laptop;
      case 'monitor': return Monitor;
      case 'camera': return Camera;
      case 'projector': return Projector;
      case 'keyboard': return Keyboard;
      default: return LayoutGrid;
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
      {/* Search Input Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm theo tên máy, hãng sản xuất, mã thiết bị..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'ALL'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Tất cả</span>
        </button>

        {categories?.map((cat) => {
          const Icon = getIcon(cat.icon);
          return (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat._id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
