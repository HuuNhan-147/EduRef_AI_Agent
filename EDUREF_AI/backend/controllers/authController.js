// backend/controllers/authController.js
// Xác thực và quản lý tài khoản demo cho 1-Click Role Switcher

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET bắt buộc phải được cấu hình trong môi trường production.');
  }
  return 'eduref_local_demo_secret_change_me';
}

export const DEMO_ACCOUNT_TARGETS = Object.freeze({
  STUDENT_ACTIVE: { type: 'STUDENT', code: '2280602154' },
  STUDENT_DROPPED: { type: 'STUDENT', code: '2110002' },
  STUDENT_DEBT: { type: 'STUDENT', code: '2110003' },
  STAFF_DAOTAO: { type: 'STAFF', code: 'staff_daotao' },
  DEAN_DAOTAO: { type: 'STAFF', code: 'dean_daotao' },
});

export function isDemoRoleSwitchEnabled(env = process.env) {
  if (env.ALLOW_DEMO_ROLE_SWITCH !== undefined) {
    return String(env.ALLOW_DEMO_ROLE_SWITCH).toLowerCase() === 'true';
  }
  return env.NODE_ENV !== 'production';
}

function buildStudentSession(student, jwtSecret) {
  const token = jwt.sign(
    {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      role: 'STUDENT',
      department: student.department?.name,
    },
    jwtSecret,
    { expiresIn: '7d' }
  );

  return {
    success: true,
    token,
    user: {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      role: 'STUDENT',
      status: student.status,
      tuitionDebt: Number(student.tuitionDebt),
      gpa: Number(student.gpa),
      department: student.department?.name,
    },
  };
}

function buildStaffSession(user, jwtSecret) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: '7d' }
  );

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}

export const login = async (req, res) => {
  try {
    const { studentCode, username, password } = req.body;
    const jwtSecret = getJwtSecret();

    // 1. Luồng đăng nhập cho Sinh viên (bằng MSSV)
    if (studentCode) {
      const student = await prisma.student.findUnique({
        where: { studentCode: String(studentCode).trim() },
        include: { department: true },
      });

      if (!student) {
        return res.status(404).json({ success: false, message: `Không tìm thấy sinh viên có MSSV: ${studentCode}` });
      }

      return res.json(buildStudentSession(student, jwtSecret));
    }

    // 2. Luồng đăng nhập cho Cán bộ PĐT / Trưởng phòng (bằng Username + Password)
    if (username) {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu.' });
      }
      const user = await prisma.user.findUnique({
        where: { username: String(username).trim() },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
      }
      if (!user.active) {
        return res.status(403).json({ success: false, message: 'Tài khoản cán bộ đã bị vô hiệu hóa.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
      }

      return res.json(buildStaffSession(user, jwtSecret));
    }

    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp MSSV hoặc tên đăng nhập.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/auth/demo-login
 * Role switch công khai chỉ dành cho môi trường demo được bật rõ ràng.
 * Endpoint dùng allowlist cố định nên frontend không cần chứa mật khẩu cán bộ.
 */
export const demoLogin = async (req, res) => {
  try {
    if (!isDemoRoleSwitchEnabled()) {
      return res.status(403).json({
        success: false,
        message: 'Chức năng chuyển vai trò demo đang bị tắt.',
      });
    }

    const target = DEMO_ACCOUNT_TARGETS[req.body?.accountKey];
    if (!target) {
      return res.status(400).json({ success: false, message: 'Tài khoản demo không hợp lệ.' });
    }

    const jwtSecret = getJwtSecret();
    if (target.type === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { studentCode: target.code },
        include: { department: true },
      });
      if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên demo.' });
      return res.json(buildStudentSession(student, jwtSecret));
    }

    const user = await prisma.user.findUnique({ where: { username: target.code } });
    if (!user || !user.active) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản cán bộ demo đang hoạt động.' });
    }
    return res.json(buildStaffSession(user, jwtSecret));
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/auth/demo-accounts: Trả về danh sách tài khoản demo cho 1-Click Role Switcher
 */
export const getDemoAccounts = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: { department: true },
      orderBy: { studentCode: 'asc' },
    });

    const staffUsers = await prisma.user.findMany({
      where: { active: true },
      orderBy: { role: 'asc' },
    });

    const accounts = [
      ...students.map((s) => ({
        type: 'STUDENT',
        id: s.id,
        code: s.studentCode,
        name: s.fullName,
        role: 'STUDENT',
        department: s.department?.name,
        status: s.status,
        tuitionDebt: Number(s.tuitionDebt),
        tag:
          s.status === 'ACTIVE' && Number(s.tuitionDebt) === 0
            ? 'Sinh viên tiêu chuẩn (Hợp lệ)'
            : s.status === 'DROPPED'
            ? 'Sinh viên thôi học (Test Case Sai Quy Chế)'
            : 'Sinh viên nợ học phí (Test Case Chặn Nợ Phí)',
      })),
      ...staffUsers.map((u) => ({
        type: 'STAFF',
        id: u.id,
        code: u.username,
        name: u.fullName,
        role: u.role,
        department: 'Phòng Đào Tạo',
        tag: u.role === 'DEAN' ? 'Trưởng phòng Đào tạo (DEAN Approval)' : 'Chuyên viên PĐT (STAFF Review)',
      })),
    ];

    res.json({ success: true, total: accounts.length, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/auth/me: Lấy thông tin user hiện tại qua JWT
 */
export const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());

    res.json({ success: true, user: decoded });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

export default { login, demoLogin, getDemoAccounts, getMe };
