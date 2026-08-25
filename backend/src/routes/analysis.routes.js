import express from 'express';
import { analyzeArtifact } from '../controllers/AnalysisController.js';

const router = express.Router();

router.post('/', analyzeArtifact);

export default router;
