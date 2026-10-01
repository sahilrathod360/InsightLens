import VisualWorkspaceService from '../services/workspace/VisualWorkspaceService.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class WorkspaceController {
  async createWorkspace(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const result = await VisualWorkspaceService.createWorkspace(userEmail, req.body);
      return sendSuccess(res, result, 'Visual workspace created successfully');
    } catch (err) {
      next(err);
    }
  }

  async getWorkspace(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const { id } = req.params;
      const result = await VisualWorkspaceService.getWorkspaceIntelligence(id, userEmail);
      return sendSuccess(res, result, 'Workspace intelligence retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export default new WorkspaceController();
