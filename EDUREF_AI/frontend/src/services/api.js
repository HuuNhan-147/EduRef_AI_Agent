import axios from 'axios';
import { UI_PREVIEW_MODE } from './previewMode';

export { UI_PREVIEW_MODE } from './previewMode';

const isBrowser = typeof window !== 'undefined';
const isLocal = isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = import.meta.env.VITE_API_URL
  || (isLocal ? 'http://localhost:5000/api' : 'https://eduref-ai-agent-1.onrender.com/api');

const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
};

if (UI_PREVIEW_MODE) {
  const adapterPromise = import('./uiPreview').then(({ createUiPreviewAdapter }) => createUiPreviewAdapter());
  apiConfig.adapter = (config) => adapterPromise.then((adapter) => adapter(config));
}

const api = axios.create(apiConfig);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eduref_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const DEMO_ACCOUNTS = {
  STUDENT_ACTIVE: {
    type: 'STUDENT',
    code: '2280602154',
    name: 'Cao Hữu Nhân',
    role: 'STUDENT',
    class: '22DTHE4',
    faculty: 'Khoa Công nghệ Thông tin',
    birthDate: '26/07/2003',
    gender: 'Nam',
    major: 'Công nghệ thông tin',
    tag: 'Sinh viên tiêu chuẩn · hợp lệ',
    accountKey: 'STUDENT_ACTIVE',
  },
  STUDENT_DROPPED: {
    type: 'STUDENT',
    code: '2110002',
    name: 'Trần Thị Bình',
    role: 'STUDENT',
    tag: 'Sinh viên thôi học · kiểm thử policy',
    accountKey: 'STUDENT_DROPPED',
  },
  STUDENT_DEBT: {
    type: 'STUDENT',
    code: '2110003',
    name: 'Lê Hoàng Cường',
    role: 'STUDENT',
    tag: 'Sinh viên còn công nợ · kiểm thử policy',
    accountKey: 'STUDENT_DEBT',
  },
  STAFF_DAOTAO: {
    type: 'STAFF',
    code: 'staff_daotao',
    name: 'Thầy Trần Hữu Nghĩa',
    role: 'STAFF',
    tag: 'Chuyên viên Phòng Đào tạo',
    accountKey: 'STAFF_DAOTAO',
  },
  DEAN_DAOTAO: {
    type: 'DEAN',
    code: 'dean_daotao',
    name: 'PGS.TS Nguyễn Văn Dũng',
    role: 'DEAN',
    tag: 'Trưởng Phòng Đào tạo',
    accountKey: 'DEAN_DAOTAO',
  },
};

const roleSwitchRequests = new Map();
let latestRoleSwitchRequest = 0;

export const switchRoleAuth = (accountKey) => {
  const account = DEMO_ACCOUNTS[accountKey] || DEMO_ACCOUNTS.STUDENT_ACTIVE;
  if (UI_PREVIEW_MODE) {
    return import('./uiPreview').then(({ setPreviewAccount }) => {
      setPreviewAccount(accountKey);
      return { ...account, preview: true };
    });
  }
  const requestId = ++latestRoleSwitchRequest;
  let request = roleSwitchRequests.get(accountKey);

  if (!request) {
    request = axios
      .post(`${API_BASE_URL}/auth/demo-login`, { accountKey: account.accountKey }, { timeout: 30000 })
      .finally(() => {
        if (roleSwitchRequests.get(accountKey) === request) roleSwitchRequests.delete(accountKey);
      });
    roleSwitchRequests.set(accountKey, request);
  }

  return request
    .then((response) => {
      if (requestId !== latestRoleSwitchRequest || !response.data.success || !response.data.token) return null;
      localStorage.setItem('eduref_token', response.data.token);
      localStorage.setItem('eduref_user', JSON.stringify(response.data.user));
      localStorage.setItem('eduref_role_key', accountKey);
      window.dispatchEvent(new Event('eduref-auth-changed'));
      return response.data.user;
    })
    .catch(() => null);
};

export default api;
