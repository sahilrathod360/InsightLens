import AIManager from '../services/ai/AIManager.js';

export const analyzeArtifact = async (req, res, next) => {
  try {
    console.log(`[Backend] Request received`);
    const { dataUrl, promptObj, preferredProvider } = req.body;
    
    if (!dataUrl) {
      return res.status(400).json({
        success: false,
        message: 'dataUrl is required for analysis.',
        data: null,
        errors: [],
        timestamp: new Date().toISOString()
      });
    }

    const report = await AIManager.generateReport(dataUrl, promptObj, preferredProvider);

    console.log(`[Backend] Returned report`);
    return res.status(200).json({
      success: true,
      message: 'Analysis complete',
      data: report,
      errors: [],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};
