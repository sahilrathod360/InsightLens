import express from 'express';
import ComparisonController from '../controllers/ComparisonController.js';

const router = express.Router();

router.post('/compare', ComparisonController.compareVisuals);

export default router;
