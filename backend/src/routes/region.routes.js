import { Router } from 'express';
import RegionAnalysisController from '../controllers/RegionAnalysisController.js';

const router = Router();

router.post('/analyze', RegionAnalysisController.analyzeRegion);

export default router;
