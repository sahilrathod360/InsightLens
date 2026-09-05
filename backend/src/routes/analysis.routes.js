import express from 'express';
import { analyzeArtifact } from '../controllers/AnalysisController.js';
import { admitAnalysis } from '../middleware/analysisAdmission.js';

const router = express.Router();

router.post('/', admitAnalysis, analyzeArtifact);

export default router;
