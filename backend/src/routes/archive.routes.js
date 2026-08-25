import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

router.delete('/:id', (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

export default router;
