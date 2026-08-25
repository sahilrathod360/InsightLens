import express from 'express';
const router = express.Router();

router.post('/register', (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

router.post('/login', (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

router.post('/logout', (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

router.get('/me', (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

export default router;
