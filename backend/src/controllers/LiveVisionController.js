import LiveVisionEngine from '../services/livecamera/LiveVisionEngine.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class LiveVisionController {
  async processFrame(req, res, next) {
    try {
      const { imageDataUrl, image, imageFrame, frameData, timestamp, frameIndex, cameraFacing } = req.body;
      const imgPayload = imageDataUrl || image || imageFrame || frameData?.imageDataUrl || frameData?.imageFrame;

      if (!imgPayload) {
        throw new APIError('imageDataUrl or frame image payload is required', 400);
      }

      const result = await LiveVisionEngine.processFrame({
        imageDataUrl: imgPayload,
        timestamp,
        frameIndex,
        cameraFacing
      });

      return sendSuccess(res, result, 'Live frame analyzed');
    } catch (err) {
      next(err);
    }
  }
}

export default new LiveVisionController();
