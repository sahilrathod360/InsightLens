import express from 'express';
import KnowledgeController from '../controllers/KnowledgeController.js';

const router = express.Router();

// 1. Overview
router.get('/overview', KnowledgeController.getOverview);

// 2. Time Machine (Evolution)
router.post('/evolution', KnowledgeController.analyzeEvolution);
router.get('/evolution', KnowledgeController.listEvolution);
router.get('/evolution/:id', KnowledgeController.getEvolutionById);
router.delete('/evolution/:id', KnowledgeController.deleteEvolution);
router.post('/impact', KnowledgeController.analyzeImpact);

// 3. Knowledge Gaps
router.post('/gaps/analyze', KnowledgeController.analyzeGaps);
router.get('/gaps', KnowledgeController.listGaps);
router.post('/gaps', KnowledgeController.createGap);
router.patch('/gaps/:id', KnowledgeController.updateGap);
router.delete('/gaps/:id', KnowledgeController.deleteGap);

// 4. Decision Memory
router.get('/decisions', KnowledgeController.listDecisions);
router.post('/decisions', KnowledgeController.createDecision);
router.put('/decisions/:id', KnowledgeController.updateDecision);
router.post('/decisions/:id/validate', KnowledgeController.validateDecision);

// 5. Claim Domino Graph & What-If
router.get('/graph', KnowledgeController.getGraph);
router.post('/graph/nodes', KnowledgeController.saveGraphNode);
router.post('/graph/edges', KnowledgeController.saveGraphEdge);
router.post('/graph/what-if', KnowledgeController.simulateWhatIf);
router.post('/graph/generate', KnowledgeController.generateRelationshipGraph);

// 6. Project Autopsy
router.post('/autopsy', KnowledgeController.createAutopsy);
router.get('/autopsy', KnowledgeController.listAutopsies);
router.get('/autopsy/:id', KnowledgeController.getAutopsyById);

// 7. Assumption Stress Testing & Devil's Advocate
router.post('/assumptions', KnowledgeController.stressTestAssumptions);
router.post('/adversarial', KnowledgeController.runAdversarialReview);

export default router;
