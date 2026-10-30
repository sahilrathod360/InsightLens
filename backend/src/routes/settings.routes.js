import express from 'express';
import {
  getPreferences,
  updatePreferences,
  testProviderConnection,
  getAuditInventoryAndBackup,
  executeOptionBCleanup
} from '../controllers/SettingsController.js';

const router = express.Router();

router.get('/', getPreferences);
router.put('/', updatePreferences);
router.post('/test-provider', testProviderConnection);
router.get('/audit-inventory', getAuditInventoryAndBackup);
router.post('/execute-cleanup', executeOptionBCleanup);

export default router;

