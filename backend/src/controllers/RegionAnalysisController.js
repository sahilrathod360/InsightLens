import RegionAnalysisEngine from '../services/region/RegionAnalysisEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class RegionAnalysisController {
  async analyzeRegion(req, res, next) {
    try {
      const { regionId, coordinates, label, visualType, parentContext } = req.body;

      if (!coordinates) {
        throw new APIError('Region coordinates are required', 400);
      }

      const result = RegionAnalysisEngine.analyzeRegion({
        regionId,
        coordinates,
        label,
        visualType,
        parentContext
      });

      return sendSuccess(res, result, 'Region analyzed successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default new RegionAnalysisController();
