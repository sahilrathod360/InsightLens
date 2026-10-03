import express from 'express';
import { register, login, logout, getMe, updateProfile, changePassword, saveOnboarding, getUserStats } from '../controllers/AuthController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.get('/profile', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.post('/onboarding', requireAuth, saveOnboarding);
router.get('/stats', requireAuth, getUserStats);
router.put('/password', requireAuth, changePassword);

export default router;
