import CrossVisualConsistencyEngine from '../services/consistency/CrossVisualConsistencyEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class ConsistencyController {
  async evaluateConsistency(req, res, next) {
    try {
      const { artifacts } = req.body;
      if (!Array.isArray(artifacts) || artifacts.length < 2) {
        throw new APIError('At least two visual artifacts are required for cross-visual consistency analysis', 400);
      }

      const result = CrossVisualConsistencyEngine.evaluateConsistency(artifacts);
      return sendSuccess(res, result, 'Cross-visual consistency evaluation completed');
    } catch (err) {
      next(err);
    }
  }
}

export default new ConsistencyController();
