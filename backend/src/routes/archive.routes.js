import express from 'express';
import { listReports, deleteReport } from '../controllers/ReportController.js';

const router = express.Router();

router.get('/', listReports);
router.delete('/:id', deleteReport);

export default router;
