import express from 'express';
import { getPreferences, updatePreferences, testProviderConnection, getAuditInventory } from '../controllers/SettingsController.js';

const router = express.Router();

router.get('/', getPreferences);
router.put('/', updatePreferences);
router.post('/test-provider', testProviderConnection);
router.get('/audit-inventory', getAuditInventory);

export default router;
