import VisualComparisonEngine from '../services/comparison/VisualComparisonEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class ComparisonController {
  async compareVisuals(req, res, next) {
    try {
      const sourceA = req.body.sourceA || req.body.before;
      const sourceB = req.body.sourceB || req.body.after;
      const intent = req.body.intent || req.body.analysisIntent;

      if (!sourceA || !sourceB) {
        throw new APIError('sourceA (before) and sourceB (after) artifacts are required for comparison', 400);
      }

      const result = VisualComparisonEngine.compareVisuals(sourceA, sourceB, { intent });
      return sendSuccess(res, result, 'Visual comparison completed successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default new ComparisonController();
