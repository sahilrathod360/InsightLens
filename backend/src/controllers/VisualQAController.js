import VisualQAEngine from '../services/visualqa/VisualQAEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class VisualQAController {
  async askQuestion(req, res, next) {
    try {
      const visualArtifact = req.body.visualArtifact || req.body.visualData || req.body.artifact || req.body;
      const query = req.body.query || req.body.question;

      if (!visualArtifact || !query) {
        throw new APIError('Both visualArtifact (or visualData) and query (or question) are required for visual Q&A', 400);
      }

      const result = VisualQAEngine.answerQuery(visualArtifact, query);
      return sendSuccess(res, result, 'Visual Q&A answer computed');
    } catch (err) {
      next(err);
    }
  }
}

export default new VisualQAController();
