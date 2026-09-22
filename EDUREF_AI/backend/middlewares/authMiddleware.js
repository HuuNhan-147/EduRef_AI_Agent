// backend/middlewares/authMiddleware.js
// Middleware xác thực danh tính JWT và bảo vệ ranh giới thẩm quyền (Security Boundary)

import jwt from 'jsonwebtoken';

/**
 * Trích xuất và xác thực Token JWT từ Header
 * Hỗ trợ Graceful Demo Fallback cho môi trường kiểm thử Hackathon 90s
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'eduref_local_demo_secret_change_me');

  if (!jwtSecret) {
    return res.status(500).json({ success: false, message: 'Máy chủ chưa cấu hình JWT_SECRET.' });
  }

  // 1. Trường hợp có Bearer Token chính thức
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded; // { id, role, studentCode, username, fullName }
      return next();
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
        error: err.message,
      });
    }
  }

  // Thiếu token xác thực
  return res.status(401).json({
    success: false,
    message: 'Yêu cầu xác thực: Vui lòng đăng nhập và cung cấp Bearer Token hợp lệ.',
  });
};

/**
 * Rào chắn phân quyền: Chỉ cho phép các roles được chỉ định
 */
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const currentRole = req.user?.role || 'ANONYMOUS';
      console.warn(`🚨 [SecurityBoundary] Chặn truy cập trái phép: Role [${currentRole}] cố gắng thực hiện hành động yêu cầu [${allowedRoles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: `Từ chối truy cập: Thao tác này yêu cầu quyền [${allowedRoles.join(', ')}]. Vai trò hiện tại của bạn là [${currentRole}].`,
        requiredRoles: allowedRoles,
        currentRole,
      });
    }
    next();
  };
};

/**
 * Chốt chặn dành riêng cho Cán bộ Phòng Đào tạo và Lãnh đạo
 */
export const requireStaffOrDean = requireRoles('STAFF', 'DEAN', 'ADMIN');

export default {
  authenticateToken,
  requireRoles,
  requireStaffOrDean,
};
