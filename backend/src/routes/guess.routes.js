import { Router } from 'express';
import GuessController from '../controllers/GuessController.js';

const router = Router();

router.post('/evaluate', GuessController.evaluateGuess);

export default router;
