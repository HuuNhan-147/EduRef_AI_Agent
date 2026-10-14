import { fileURLToPath } from 'node:url';

// backend/testSupport/securityTestEnv.js
// PHẢI là import đầu tiên của mọi test security-*.test.js.
//
// Vì sao: GeminiStreamClient chạy `import 'dotenv/config'`, nên chỉ cần import routes/agent là
// .env của máy (trỏ thẳng vào DB Render dùng chung với bản demo công khai) bị nạp vào tiến trình.
// dotenv KHÔNG ghi đè biến đã tồn tại, nên đặt trước ở đây thì mọi truy vấn Prisma lỡ không được
// stub sẽ lỗi kết nối ngay (cổng 1) thay vì ghi vào DB thật. Nhờ vậy các test security-* an toàn
// để chạy trên bất kỳ máy nào, kể cả máy có .env production.

const BLACKHOLE_DB = 'postgresql://eduref_test:none@127.0.0.1:1/eduref_test_blackhole?connect_timeout=1';

process.env.DATABASE_URL = BLACKHOLE_DB;
process.env.DIRECT_URL = BLACKHOLE_DB;
process.env.JWT_SECRET = 'security-test-secret-0123456789abcdef0123456789abcdef';
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('./.no-app-env', import.meta.url));
process.env.GEMINI_API_KEY = 'test-key-not-real';
process.env.GEMINI_API_KEYS = 'test-key-not-real';
process.env.NODE_ENV = 'test';
process.env.ALLOW_DEMO_ROLE_SWITCH = 'true';

export const TEST_JWT_SECRET = process.env.JWT_SECRET;
export const BLACKHOLE_DATABASE_URL = BLACKHOLE_DB;

/** Thay thế tạm một phương thức và trả hàm khôi phục. */
export function stub(target, key, impl) {
  const original = target[key];
  target[key] = impl;
  return () => {
    target[key] = original;
  };
}

/** Gom nhiều hàm khôi phục để gọi một lần trong after(). */
export function restorer() {
  const restores = [];
  return {
    stub(target, key, impl) {
      restores.push(stub(target, key, impl));
    },
    restoreAll() {
      while (restores.length) restores.pop()();
    },
  };
}
