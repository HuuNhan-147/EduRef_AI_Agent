// backend/routes/authRoutes.js
// Định tuyến xác thực và tài khoản demo

import express from 'express';
import { rateLimit } from '../middlewares/rateLimit.js';
import { login, demoLogin, getDemoAccounts, getMe, registerCustomStudent } from '../controllers/authController.js';

const router = express.Router();

// Chưa xác thực nên khóa theo IP. 60 lần/phút đủ cho nhiều giám khảo dùng chung một mạng.
const authLimiter = rateLimit({ name: 'auth', max: 60, windowMs: 60_000 });

router.post('/login', authLimiter, login);
router.post('/demo-login', authLimiter, demoLogin);
router.post('/custom-student', authLimiter, registerCustomStudent);
router.get('/demo-accounts', getDemoAccounts);
router.get('/me', getMe);

export default router;
