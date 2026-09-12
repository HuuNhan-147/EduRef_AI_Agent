import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Tự động đính kèm JWT Bearer Token vào mọi Request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('iels_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Bản đồ tài khoản kiểm thử seed sẵn trong Database
export const DEMO_CREDENTIALS = {
  EMPLOYEE: { email: 'employee@iels.vn', password: 'password123', label: 'Nhân viên (Hoàng Anh)' },
  MANAGER: { email: 'manager.it@iels.vn', password: 'password123', label: 'Quản lý IT (Trần Thị Quản Lý)' },
  STOREKEEPER: { email: 'storekeeper@iels.vn', password: 'password123', label: 'Thủ kho (Phạm Văn Thủ Kho)' },
  ADMIN: { email: 'admin@iels.vn', password: 'password123', label: 'Tổng Quản Trị (Nguyễn Văn Admin)' }
};

// Hàm đăng nhập nhanh khi chuyển vai trò (giữ trải nghiệm demo 1 chạm nhưng bảo mật token 100%)
export const switchRoleAuth = async (role) => {
  const creds = DEMO_CREDENTIALS[role] || DEMO_CREDENTIALS.EMPLOYEE;
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: creds.email,
      password: creds.password
    });
    if (res.data.success && res.data.token) {
      localStorage.setItem('iels_token', res.data.token);
      localStorage.setItem('iels_user', JSON.stringify(res.data.user));
      localStorage.setItem('iels_role', role);
      return res.data.user;
    }
  } catch (error) {
    console.error('Lỗi tự động đăng nhập khi đổi vai trò:', error);
  }
  return null;
};

export default api;
