import express from 'express';
import ConsistencyController from '../controllers/ConsistencyController.js';

const router = express.Router();

router.post('/evaluate', ConsistencyController.evaluateConsistency);

export default router;
