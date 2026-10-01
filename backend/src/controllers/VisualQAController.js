import VisualQAEngine from '../services/visualqa/VisualQAEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class VisualQAController {
  async askQuestion(req, res, next) {
    try {
      const { visualArtifact, query } = req.body;
      if (!visualArtifact || !query) {
        throw new APIError('Both visualArtifact and query are required for visual Q&A', 400);
      }

      const result = VisualQAEngine.answerQuery(visualArtifact, query);
      return sendSuccess(res, result, 'Visual Q&A answer computed');
    } catch (err) {
      next(err);
    }
  }
}

export default new VisualQAController();
