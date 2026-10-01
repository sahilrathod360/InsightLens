import express from 'express';
import VisualQAController from '../controllers/VisualQAController.js';

const router = express.Router();

router.post('/ask', VisualQAController.askQuestion);

export default router;
