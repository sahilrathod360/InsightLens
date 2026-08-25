import express from 'express';
import { upload } from '../middleware/upload.js';
const router = express.Router();

router.post('/', upload.single('file'), (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

export default router;
