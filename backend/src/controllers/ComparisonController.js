import VisualComparisonEngine from '../services/comparison/VisualComparisonEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class ComparisonController {
  async compareVisuals(req, res, next) {
    try {
      const sources = req.body.sources || [req.body.sourceA, req.body.sourceB, req.body.sourceC].filter(Boolean);
      const intent = req.body.intent || req.body.analysisIntent || 'Comparison';

      if (!sources || !Array.isArray(sources) || sources.length < 2) {
        throw new APIError('At least 2 visual artifacts/images are required for comparison', 400);
      }

      const result = await VisualComparisonEngine.compareVisuals(sources, { intent });
      return sendSuccess(res, result, 'Visual comparison completed successfully');
    } catch (err) {
      console.error('[ComparisonController] Error during visual comparison:', err.message);
      return sendError(res, 'AI visual analysis unavailable.', err.statusCode || 500, [err.message]);
    }
  }
}

export default new ComparisonController();
