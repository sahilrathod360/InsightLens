import VisualComparisonEngine from '../services/comparison/VisualComparisonEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class ComparisonController {
  async compareVisuals(req, res, next) {
    try {
      const { sourceA, sourceB, intent } = req.body;
      if (!sourceA || !sourceB) {
        throw new APIError('sourceA and sourceB artifacts are required for comparison', 400);
      }

      const result = VisualComparisonEngine.compareVisuals(sourceA, sourceB, { intent });
      return sendSuccess(res, result, 'Visual comparison completed successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default new ComparisonController();
