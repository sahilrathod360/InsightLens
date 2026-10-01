import GuessEngine from '../services/guess/GuessEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class GuessController {
  async evaluateGuess(req, res, next) {
    try {
      const { guess, visualArtifact, visualData } = req.body;
      const artifact = visualArtifact || visualData || {};

      if (!guess) {
        throw new APIError('User guess string is required', 400);
      }

      const result = GuessEngine.evaluateGuess({ guess, visualArtifact: artifact });
      return sendSuccess(res, result, 'Guess evaluated');
    } catch (err) {
      next(err);
    }
  }
}

export default new GuessController();
