import express from 'express';
import { getReportById, saveReport, toggleFavorite, trackExportMetric } from '../controllers/ReportController.js';

const router = express.Router();

router.get('/:id', getReportById);
router.post('/save', saveReport);
router.post('/export-metric', trackExportMetric);
router.put('/:id/favorite', toggleFavorite);

export default router;
