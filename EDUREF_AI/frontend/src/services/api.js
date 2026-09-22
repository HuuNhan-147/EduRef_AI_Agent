// src/services/api.js
// Client giao tiếp HTTP REST API tới Backend EduRef AI.

import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động đính kèm Token JWT vào mọi Request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eduref_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Danh mục tài khoản Demo chuẩn phục vụ 1-Click Role Switcher cho BGK
export const DEMO_ACCOUNTS = {
  STUDENT_ACTIVE: {
    type: 'STUDENT',
    code: '2280602154',
    name: 'Cao Hữu Nhân',
    role: 'STUDENT',
    class: '22DTHE4',
    faculty: 'Khoa Công Nghệ Thông Tin',
    birthDate: '26/07/2003',
    gender: 'Nam',
    major: 'Công nghệ thông tin',
    tag: 'Sinh viên tiêu chuẩn (Hợp lệ)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accountKey: 'STUDENT_ACTIVE',
  },
  STUDENT_DROPPED: {
    type: 'STUDENT',
    code: '2110002',
    name: 'Trần Thị Bình',
    role: 'STUDENT',
    tag: 'Sinh viên thôi học (Test Sai quy chế)',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    accountKey: 'STUDENT_DROPPED',
  },
  STUDENT_DEBT: {
    type: 'STUDENT',
    code: '2110003',
    name: 'Lê Hoàng Cường',
    role: 'STUDENT',
    tag: 'Sinh viên nợ phí 15M (Test Chặn nợ)',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    accountKey: 'STUDENT_DEBT',
  },
  STAFF_DAOTAO: {
    type: 'STAFF',
    code: 'staff_daotao',
    name: 'Thầy Trần Hữu Nghĩa (Chuyên viên PĐT)',
    role: 'STAFF',
    tag: 'Chuyên viên PĐT (STAFF Review)',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accountKey: 'STAFF_DAOTAO',
  },
  DEAN_DAOTAO: {
    type: 'DEAN',
    code: 'dean_daotao',
    name: 'PGS.TS Nguyễn Văn Dũng (Trưởng PĐT)',
    role: 'DEAN',
    tag: 'Trưởng phòng Đào tạo (DEAN Approval)',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    accountKey: 'DEAN_DAOTAO',
  },
};

/**
 * Hàm đăng nhập và đổi vai trò 1-Click
 */
const roleSwitchRequests = new Map();
let latestRoleSwitchRequest = 0;

export const switchRoleAuth = (accountKey) => {
  const acc = DEMO_ACCOUNTS[accountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  const requestId = ++latestRoleSwitchRequest;
  let request = roleSwitchRequests.get(accountKey);

  if (!request) {
    request = axios
      .post(`${API_BASE_URL}/auth/demo-login`, { accountKey: acc.accountKey })
      .finally(() => {
        if (roleSwitchRequests.get(accountKey) === request) roleSwitchRequests.delete(accountKey);
      });
    roleSwitchRequests.set(accountKey, request);
  }

  return request
    .then((res) => {
      // Chỉ yêu cầu đổi vai trò mới nhất được quyền ghi JWT. Một request cũ
      // hoàn tất muộn không thể ghi đè phiên mà người dùng vừa chọn.
      if (requestId !== latestRoleSwitchRequest || !res.data.success || !res.data.token) return null;
      localStorage.setItem('eduref_token', res.data.token);
      localStorage.setItem('eduref_user', JSON.stringify(res.data.user));
      localStorage.setItem('eduref_role_key', accountKey);
      window.dispatchEvent(new Event('eduref-auth-changed'));
      return res.data.user;
    })
    .catch((err) => {
      console.error('❌ Lỗi đăng nhập khi đổi vai trò:', err);
      return null;
    });
};

export default api;
