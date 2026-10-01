import { Router } from 'express';
import LiveVisionController from '../controllers/LiveVisionController.js';

const router = Router();

router.post('/frame', LiveVisionController.processFrame);

export default router;
