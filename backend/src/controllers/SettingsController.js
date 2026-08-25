import { config } from '../config/env.js';

export const testProviderConnection = async (req, res, next) => {
  const { provider, apiKey } = req.body;
  const startMs = Date.now();

  try {
    if (provider === 'openrouter') {
      const keyToUse = apiKey || config.apiKeys.openrouter;
      if (!keyToUse) {
        return res.status(200).json({
          success: false,
          message: 'Please enter or configure an OpenRouter API key to test connection.',
          data: { status: 'Missing Key', latency: 0 }
        });
      }

      const openrouterRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${keyToUse}` }
      });
      const elapsed = Date.now() - startMs;

      if (openrouterRes.ok) {
        return res.status(200).json({
          success: true,
          message: `OpenRouter API Connection Successful (${elapsed}ms latency)`,
          data: { status: 'HTTP 200 OK', latency: elapsed }
        });
      } else {
        return res.status(200).json({
          success: false,
          message: `OpenRouter API key error (HTTP ${openrouterRes.status})`,
          data: { status: `HTTP ${openrouterRes.status}`, latency: elapsed }
        });
      }
    } else {
      // Default: Gemini
      const keyToUse = apiKey || config.apiKeys.gemini;
      if (!keyToUse) {
        return res.status(200).json({
          success: false,
          message: 'Please enter or configure a Google Gemini API key to test connection.',
          data: { status: 'Missing Key', latency: 0 }
        });
      }

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`);
      const elapsed = Date.now() - startMs;

      if (geminiRes.ok) {
        return res.status(200).json({
          success: true,
          message: `Google Gemini API Connection Successful (${elapsed}ms latency)`,
          data: { status: 'HTTP 200 OK', latency: elapsed }
        });
      } else if (geminiRes.status === 429) {
        return res.status(200).json({
          success: true,
          message: `Gemini API Quota Limit Reached (HTTP 429). Auto Model Fallback active.`,
          data: { status: 'HTTP 429 Quota', latency: elapsed }
        });
      } else {
        return res.status(200).json({
          success: false,
          message: `Gemini API Key Error (HTTP ${geminiRes.status})`,
          data: { status: `HTTP ${geminiRes.status}`, latency: elapsed }
        });
      }
    }
  } catch (err) {
    const elapsed = Date.now() - startMs;
    return res.status(200).json({
      success: false,
      message: `Failed to reach ${provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini'} provider server.`,
      data: { status: 'Network Error', latency: elapsed }
    });
  }
};
