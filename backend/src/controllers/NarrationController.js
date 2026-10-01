import NarrationEngine from '../services/narration/NarrationEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class NarrationController {
  async generateSequence(req, res, next) {
    try {
      const reportData = req.body.reportData || req.body;
      const result = NarrationEngine.generateNarrationSequence(reportData);
      return sendSuccess(res, result, 'Narration sequence generated');
    } catch (err) {
      next(err);
    }
  }
}

export default new NarrationController();
