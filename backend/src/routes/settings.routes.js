import express from 'express';
import { getPreferences, updatePreferences, testProviderConnection } from '../controllers/SettingsController.js';

const router = express.Router();

router.get('/', getPreferences);
router.put('/', updatePreferences);
router.post('/test-provider', testProviderConnection);

export default router;
