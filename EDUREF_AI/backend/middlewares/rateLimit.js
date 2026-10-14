// backend/middlewares/rateLimit.js
// Bộ giới hạn tần suất cửa sổ cố định, lưu trong bộ nhớ (đủ cho 1 instance Render).
// Mục đích: chặn lạm dụng chi phí Gemini (chat, OCR), brute-force đăng nhập và spam ghi DB.

const buckets = new Map();

export function checkRateLimit(key, { max, windowMs }) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= max,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

// Dọn bucket hết hạn để Map không phình mãi; unref để không giữ tiến trình sống.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

/**
 * Express middleware. Đặt SAU authenticateToken để khóa theo người dùng;
 * nếu chưa xác thực thì khóa theo IP (cần app.set('trust proxy') đúng sau reverse proxy).
 */
export function rateLimit({ name, max, windowMs = 60_000 }) {
  return (req, res, next) => {
    const who = req.user?.id || req.user?.studentCode || req.ip || 'anonymous';
    const result = checkRateLimit(`${name}:${who}`, { max, windowMs });
    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfterSec));
      return res.status(429).json({
        success: false,
        message: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${result.retryAfterSec} giây.`,
      });
    }
    return next();
  };
}

export default { checkRateLimit, rateLimit };
