import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsHeader from './components/StatsHeader';
import CategoryFilter from './components/CategoryFilter';
import EquipmentCard from './components/EquipmentCard';
import BorrowModal from './components/BorrowModal';
import LoanListView from './components/LoanListView';
import InventoryManager from './components/InventoryManager';
import MaintenanceManager from './components/MaintenanceManager';
import AuditTrailView from './components/AuditTrailView';
import AIAgentArena from './components/AIAgentArena';
import api, { switchRoleAuth } from './api';
import { Bot, Sparkles } from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState('MANUAL'); // 'MANUAL' | 'AI_ARENA'
  const [activeTab, setActiveTab] = useState('HOME');
  const [activeRole, setActiveRole] = useState('EMPLOYEE');


  // Master Data & Catalog States
  const [stats, setStats] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Loans State
  const [loans, setLoans] = useState([]);

  // Modals & Submitting States
  const [selectedBorrowItem, setSelectedBorrowItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Helper hiển thị toast thông báo
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch dữ liệu khởi tạo
  const fetchData = async () => {
    try {
      // 1. Thống kê kho
      const statsRes = await api.get('/equipment/stats');
      if (statsRes.data.success) setStats(statsRes.data.stats);

      // 2. Master Data (Categories)
      const masterRes = await api.get('/equipment/master');
      if (masterRes.data.success) setCategories(masterRes.data.categories);

      // 3. Catalog Thiết bị
      const catalogRes = await api.get('/equipment/catalog');
      if (catalogRes.data.success) setCatalog(catalogRes.data.data);

      // 4. Danh sach phieu muon (public-list — khong can auth)
      try {
        const loansRes = await api.get('/loans/public-list');
        if (loansRes.data.success) setLoans(loansRes.data.data);
      } catch (lErr) {
        console.warn('Khong load duoc public-list, thu /loans/list:', lErr.message);
        try {
          const loansRes2 = await api.get('/loans/list');
          if (loansRes2.data.success) setLoans(loansRes2.data.data);
        } catch (_) {}
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Ham fetch rieng chi de refresh phieu muon (dung sau khi AI tao phieu)
  const fetchLoans = async () => {
    try {
      const res = await api.get('/loans/public-list');
      if (res.data.success) setLoans(res.data.data);
    } catch (e) {
      try {
        const res2 = await api.get('/loans/list');
        if (res2.data.success) setLoans(res2.data.data);
      } catch (_) {}
    }
  };

  // Khởi tạo đăng nhập và nạp dữ liệu ban đầu
  useEffect(() => {
    const initAuth = async () => {
      await switchRoleAuth(activeRole);
      fetchData();
    };
    initAuth();
  }, []);

  // Xử lý đổi vai trò trên Navbar (Tự động nạp JWT Token tương ứng của tài khoản demo)
  const handleRoleChange = async (newRole) => {
    setActiveRole(newRole);
    const user = await switchRoleAuth(newRole);
    if (user) {
      showToast(`Đã chuyển góc nhìn vai trò: ${user.fullName} (${user.role})`, 'success');
      fetchData();
    }
  };

  // Lọc catalog theo category và search term
  const filteredCatalog = catalog.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category?._id === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.modelCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // 1. Xử lý Tạo phiếu mượn (Nhân viên)
  const handleBorrowSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/loans/request', formData);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setSelectedBorrowItem(null);
        fetchData(); // Cập nhật lại tồn kho & danh sách phiếu
        setActiveTab('LOANS'); // Chuyển ngay sang tab xem phiếu
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi gửi phiếu mượn', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Xử lý Phê duyệt / Từ chối (Quản lý)
  const handleApproveLoan = async (loanId) => {
    try {
      const res = await api.put(`/loans/${loanId}/review`, { decision: 'APPROVE' });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi duyệt phiếu', 'error');
    }
  };

  const handleRejectLoan = async (loanId) => {
    const reason = prompt('Nhập lý do từ chối phiếu mượn:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Bắt buộc phải nhập lý do từ chối!');
      return;
    }
    try {
      const res = await api.put(`/loans/${loanId}/review`, {
        decision: 'REJECT',
        reviewReason: reason
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi từ chối phiếu', 'error');
    }
  };

  // 3. Xử lý Bàn giao xuất kho (Thủ kho đối soát mã PIN)
  const handleCheckoutLoan = async (loanId, verificationCode) => {
    try {
      const res = await api.put(`/loans/${loanId}/checkout`, { verificationCode });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi xuất kho bàn giao', 'error');
    }
  };

  // 4. Xử lý Thu hồi hoàn kho (Thủ kho kiểm định)
  const handleCheckinLoan = async (loanId) => {
    const isDamaged = window.confirm('Kiểm định ngoại quan thiết bị:\n- Bấm OK: Thiết bị có hư hại/trầy xước (Chuyển sang BẢO TRÌ)\n- Bấm Cancel: Thiết bị bình thường, hoạt động tốt (Hoàn kho khả dụng)');
    let damageNotes = '';
    let fee = 0;
    if (isDamaged) {
      damageNotes = prompt('Nhập chi tiết lỗi / hư hại của thiết bị:') || 'Trầy xước vỏ và liệt phím sau khi hoàn trả';
      fee = prompt('Ước tính chi phí bồi thường (VNĐ):', '500000') || 500000;
    }

    try {
      const res = await api.put(`/loans/${loanId}/checkin`, {
        condition: isDamaged ? 'DAMAGED' : 'GOOD',
        hasDamage: isDamaged,
        damageNotes,
        estimatedDamageFee: Number(fee)
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi thu hồi thiết bị', 'error');
    }
  };

  // 5. Xử lý Hoàn tác / Hủy phiếu
  const handleRollbackLoan = async (loanId) => {
    const reason = prompt('Nhập lý do can thiệp hoàn tác / hủy phiếu:');
    if (reason === null) return;
    try {
      const res = await api.put(`/loans/${loanId}/rollback`, {
        rollbackReason: reason || 'Quản lý can thiệp dừng cấp phát'
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi hoàn tác phiếu', 'error');
    }
  };

  // 6. CRUD Thêm / Sửa / Xóa thiết bị
  const handleAddEquipment = async (formData) => {
    try {
      const res = await api.post('/equipment/model', formData);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi thêm thiết bị', 'error');
    }
  };

  const handleUpdateEquipment = async (id, formData) => {
    try {
      const res = await api.put(`/equipment/model/${id}`, formData);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi cập nhật thiết bị', 'error');
    }
  };

  const handleDeleteEquipment = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị này khỏi kho?')) return;
    try {
      const res = await api.delete(`/equipment/model/${id}`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi xóa thiết bị', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border ${
            notification.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRole={activeRole}
        setActiveRole={handleRoleChange}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        {/* KHONG GIAN 1: DAU TRUONG AI HACKATHON BANG 1 DE A */}
        <div className={currentMode === 'AI_ARENA' ? 'block' : 'hidden'}>
          <AIAgentArena currentRole={activeRole} onLoanCreated={fetchLoans} />
        </div>

        {/* KHÔNG GIAN 2: VẬN HÀNH THỦ CÔNG (CRUD & MANUAL WORKFLOWS) */}
        <div className={currentMode === 'MANUAL' ? 'block' : 'hidden'}>
          {/* TAB 1: TRANG CHỦ & KHO THIẾT BỊ */}
          {activeTab === 'HOME' && (

              <div className="space-y-6">
                {/* KPI Stats */}
                <StatsHeader stats={stats} />

                {/* Category Filter & Search Bar */}
                <CategoryFilter
                  categories={categories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />

                {/* Equipment Grid */}
                {filteredCatalog.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <p className="text-slate-400 text-sm">Không tìm thấy thiết bị nào phù hợp</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCatalog.map((item) => (
                      <EquipmentCard
                        key={item._id}
                        item={item}
                        activeRole={activeRole}
                        onBorrow={(target) => setSelectedBorrowItem(target)}
                        onEdit={(target) => {
                          setActiveTab('INVENTORY');
                        }}
                        onDelete={handleDeleteEquipment}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DANH SÁCH PHIẾU MƯỢN */}
            {activeTab === 'LOANS' && (
              <LoanListView
                loans={loans}
                activeRole={activeRole}
                onApprove={handleApproveLoan}
                onReject={handleRejectLoan}
                onCheckout={handleCheckoutLoan}
                onCheckin={handleCheckinLoan}
                onRollback={handleRollbackLoan}
              />
            )}

            {/* TAB 3: QUẢN LÝ KHO (CRUD) */}
            {activeTab === 'INVENTORY' && (
              <InventoryManager
                catalog={catalog}
                categories={categories}
                onAddEquipment={handleAddEquipment}
                onUpdateEquipment={handleUpdateEquipment}
                onDeleteEquipment={handleDeleteEquipment}
              />
            )}

            {/* TAB 4: QUẢN LÝ BẢO TRÌ */}
            {activeTab === 'MAINTENANCE' && (
              <MaintenanceManager
                activeRole={activeRole}
                onRefreshStats={fetchData}
              />
            )}

            {/* TAB 5: SỔ CÁI KIỂM TOÁN */}
            {activeTab === 'AUDIT' && (
              <AuditTrailView />
            )}
        </div>
      </main>


      {/* Floating Action Button mở Đấu Trường AI khi ở trang Thủ Công */}
      {currentMode === 'MANUAL' && (
        <button
          onClick={() => setCurrentMode('AI_ARENA')}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 cursor-pointer border border-amber-400/40 group"
          title="Mở Đấu Trường The Escalation Referee AI"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs leading-none">The Escalation Referee</p>
            <p className="text-[10px] text-slate-900 font-semibold mt-0.5">⚡ Mở Đấu Trường AI</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping ml-1" />
        </button>
      )}

      {/* Borrow Modal Popup */}
      {selectedBorrowItem && (
        <BorrowModal
          item={selectedBorrowItem}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedBorrowItem(null)}
          onSubmit={handleBorrowSubmit}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-6 mt-12 text-center text-xs text-slate-500">
        <p>
          EquipAgent IELS • Hệ Thống Quản Lý Mượn Trả Thiết Bị Nội Bộ Doanh Nghiệp (Bảng 1 Đề A Hackathon 2026)
        </p>
      </footer>
    </div>
  );
}

