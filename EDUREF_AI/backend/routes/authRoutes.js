// backend/routes/authRoutes.js
// Định tuyến xác thực và tài khoản demo

import express from 'express';
import { login, demoLogin, getDemoAccounts, getMe, registerCustomStudent } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/demo-login', demoLogin);
router.post('/custom-student', registerCustomStudent);
router.get('/demo-accounts', getDemoAccounts);
router.get('/me', getMe);

export default router;
