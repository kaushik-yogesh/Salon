import express from 'express';
import { 
  checkUser,
  loginWithPassword,
  requestOtp, 
  requestEmailOtp,
  verifyOtp, 
  register, 
  registerDirect,
  updateEmail,
  refresh, 
  logout, 
  getMe 
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Strict rate limiter for auth routes to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many login attempts, please try again after 15 minutes' } }
});

router.post('/check', authLimiter, checkUser);
router.post('/login', authLimiter, loginWithPassword);
router.post('/request-otp', authLimiter, requestOtp);
router.post('/request-email-otp', authLimiter, requestEmailOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/register', authLimiter, register);
router.post('/register-direct', authLimiter, registerDirect);
router.post('/update-email', requireAuth, updateEmail);
router.post('/refresh-token', refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);

export default router;
