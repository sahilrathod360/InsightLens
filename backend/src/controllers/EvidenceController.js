import EvidenceEngine from '../services/evidence/EvidenceEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class EvidenceController {
  async extractEvidence(req, res, next) {
    try {
      const reportData = req.body.reportData || req.body;
      const imageDimensions = req.body.imageDimensions || null;

      if (!reportData) {
        throw new APIError('Report data is required for evidence extraction', 400);
      }

      const result = EvidenceEngine.extractAndLinkEvidence(reportData, imageDimensions);
      return sendSuccess(res, result, 'Evidence extracted and linked successfully');
    } catch (err) {
      next(err);
    }
  }

  async validateCoordinates(req, res, next) {
    try {
      const { coordinates, imageDimensions } = req.body;
      const result = EvidenceEngine.validateAndNormalizeCoordinates(coordinates, imageDimensions);
      return sendSuccess(res, result, 'Coordinates validated');
    } catch (err) {
      next(err);
    }
  }
}

export default new EvidenceController();
