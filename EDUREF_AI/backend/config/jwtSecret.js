// backend/config/jwtSecret.js
// Phát hiện JWT_SECRET yếu/đã lộ công khai. Không chặn khởi động (tránh làm sập bản demo
// đang chạy), nhưng ghi cảnh báo rất rõ để người vận hành xoay khóa.

// Các giá trị này đã nằm trong repo công khai (.env.example, docker-compose, mã nguồn)
// nên bất kỳ ai cũng có thể ký token DEAN/STAFF nếu máy chủ còn dùng chúng.
export const KNOWN_PUBLIC_JWT_SECRETS = Object.freeze([
  'eduref_jwt_secret_hackathon_2026_super_secure_key',
  'eduref_local_demo_secret_change_me',
]);

export function isInsecureJwtSecret(secret) {
  if (!secret) return true;
  return KNOWN_PUBLIC_JWT_SECRETS.includes(secret) || String(secret).length < 32;
}

export function warnIfInsecureJwtSecret(env = process.env) {
  const secret = env.JWT_SECRET;
  if (!isInsecureJwtSecret(secret)) return false;

  const reason = !secret
    ? 'JWT_SECRET chưa được cấu hình (đang dùng khóa mặc định trong mã nguồn)'
    : KNOWN_PUBLIC_JWT_SECRETS.includes(secret)
    ? 'JWT_SECRET trùng với giá trị mẫu đã công khai trong repo'
    : 'JWT_SECRET ngắn hơn 32 ký tự';
  const severity = env.NODE_ENV === 'production' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO';
  console.error(
    `🚨 [${severity}] ${reason}: bất kỳ ai cũng có thể giả mạo token STAFF/DEAN. ` +
      'Hãy tạo khóa ngẫu nhiên (vd: openssl rand -hex 32), đặt vào biến môi trường của máy chủ và đăng nhập lại.'
  );
  return true;
}

export default { KNOWN_PUBLIC_JWT_SECRETS, isInsecureJwtSecret, warnIfInsecureJwtSecret };
