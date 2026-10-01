import express from 'express';
import EvidenceController from '../controllers/EvidenceController.js';

const router = express.Router();

router.post('/extract', EvidenceController.extractEvidence);
router.post('/validate-coordinates', EvidenceController.validateCoordinates);

export default router;
