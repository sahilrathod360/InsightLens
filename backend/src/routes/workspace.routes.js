import express from 'express';
import WorkspaceController from '../controllers/WorkspaceController.js';

const router = express.Router();

router.post('/', WorkspaceController.createWorkspace);
router.get('/:id', WorkspaceController.getWorkspace);

export default router;
