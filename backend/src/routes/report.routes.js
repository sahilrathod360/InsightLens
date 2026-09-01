import express from 'express';
import { getReportById, saveReport, toggleFavorite } from '../controllers/ReportController.js';

const router = express.Router();

router.get('/:id', getReportById);
router.post('/save', saveReport);
router.put('/:id/favorite', toggleFavorite);

export default router;
