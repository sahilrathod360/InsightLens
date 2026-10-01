import { Router } from 'express';
import NarrationController from '../controllers/NarrationController.js';

const router = Router();

router.post('/sequence', NarrationController.generateSequence);
router.post('/generate-sequence', NarrationController.generateSequence);

export default router;
