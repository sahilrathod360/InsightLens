import express from 'express';
import { getDbInventory, exportTableBackup } from '../controllers/AuditController.js';

const router = express.Router();

router.get('/db-inventory', getDbInventory);
router.post('/db-inventory', getDbInventory);
router.post('/db-backup', exportTableBackup);

export default router;
