import express from 'express';
import { register, login, logout, getMe, updateProfile, changePassword } from '../controllers/AuthController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.put('/password', requireAuth, changePassword);

export default router;
