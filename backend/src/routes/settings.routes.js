import express from 'express';
import { testProviderConnection } from '../controllers/SettingsController.js';

const router = express.Router();

router.post('/test-provider', testProviderConnection);

router.get('/', (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

router.put('/', (req, res) => {
  res.status(501).json({ success: false, message: 'Not Implemented', data: null, timestamp: new Date().toISOString() });
});

export default router;
