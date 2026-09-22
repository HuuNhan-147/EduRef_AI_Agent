// backend/routes/authRoutes.js
// Định tuyến xác thực và tài khoản demo

import express from 'express';
import { login, getDemoAccounts, getMe } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.get('/demo-accounts', getDemoAccounts);
router.get('/me', getMe);

export default router;
