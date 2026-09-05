import { config } from '../../config/env.js';
import { buildAiPrompt, buildJsonSchemaPrompt } from '../../utils/aiPrompts.js';
import { APIError } from '../../utils/apiUtils.js';
import { parseAIResponse } from '../../utils/aiParser.js';
import ModelHealthTracker from './ModelHealthTracker.js';

class GeminiService {
  async generateWithModel(modelConfig, dataUrl, promptObj = {}, parentSignal = null) {
    const apiKey = config.apiKeys.gemini;
    if (!apiKey) {
      throw new APIError('Gemini API key is missing.', 401, 'Gemini', 'INVALID_KEY');
    }

    const modelId = modelConfig.id || modelConfig;
    const timeoutMs = modelConfig.timeoutMs || 15000;
    const thinkingConfig = modelConfig.thinkingConfig;

    const startTime = Date.now();
    console.log(`[RACE] Gemini / ${modelId} START (timeout: ${timeoutMs}ms)`);

    const { researchLength = 'long', language = 'en', subjectContext = '', writingStyle = 'classic', citationStyle = 'APA' } = promptObj;

    // Extract base64 and mimetype
    let mimeType = 'image/jpeg';
    let base64Data = dataUrl;
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      if (parts.length >= 2) {
        mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
        base64Data = parts[1];
      }
    }

    const promptText = buildAiPrompt(language, researchLength, subjectContext, writingStyle, citationStyle);
    const schemaText = buildJsonSchemaPrompt();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const genConfig = {
      response_mime_type: "application/json",
      maxOutputTokens: modelConfig.maxOutputTokens || 6000
    };

    if (thinkingConfig) {
      genConfig.thinking_config = thinkingConfig;
    }

    const body = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: `${promptText}\n\n${schemaText}` }
          ]
        }
      ],
      generationConfig: genConfig
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[RACE] Gemini / ${modelId} TIMEOUT after ${timeoutMs}ms`);
      controller.abort();
    }, timeoutMs);

    const onParentAbort = () => controller.abort();
    if (parentSignal) {
      if (parentSignal.aborted) controller.abort();
      else parentSignal.addEventListener('abort', onParentAbort);
    }

    const reqStart = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const timeToFirstByteMs = Date.now() - reqStart;
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const status = response.status;
        const errType = status === 429 ? 'HTTP_429' : (status === 401 || status === 403 ? 'AUTH_ERROR' : `HTTP_${status}`);
        
        console.warn(`[RACE] Gemini / ${modelId} FAILED ${status} in ${timeToFirstByteMs}ms: ${errorText.slice(0, 120)}`);
        ModelHealthTracker.recordFailure(modelId, errType, timeToFirstByteMs, errorText.slice(0, 100));
        throw new APIError(`Gemini model ${modelId} status ${status}: ${errorText}`, status, 'Gemini');
      }

      const resJson = await response.json();
      const totalInferenceTimeMs = Date.now() - reqStart;

      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!rawText.trim()) {
        console.warn(`[RACE] Gemini / ${modelId} returned empty response in ${totalInferenceTimeMs}ms`);
        ModelHealthTracker.recordFailure(modelId, 'EMPTY_RESPONSE', totalInferenceTimeMs, 'Empty response text');
        throw new APIError(`Gemini model ${modelId} returned empty response.`, 500, 'Gemini');
      }

      const parsedResult = parseAIResponse(rawText, 'Google Gemini AI', modelId);
      parsedResult.timeToFirstByteMs = timeToFirstByteMs;
      parsedResult.totalInferenceTimeMs = totalInferenceTimeMs;

      ModelHealthTracker.recordSuccess(modelId, totalInferenceTimeMs);
      console.log(`[RACE] Gemini / ${modelId} returned valid JSON in ${(totalInferenceTimeMs / 1000).toFixed(2)}s`);
      return parsedResult;

    } catch (error) {
      clearTimeout(timeoutId);
      const elapsedMs = Date.now() - reqStart;
      if (controller.signal.aborted && !parentSignal?.aborted) {
        ModelHealthTracker.recordFailure(modelId, 'TIMEOUT', elapsedMs, 'Request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
    }
  }

  async generate(dataUrl, promptObj = {}, parentSignal = null) {
    const defaultModels = [
      { id: 'gemini-3.7-flash', timeoutMs: 14000, thinkingConfig: { thinking_budget: 0 } },
      { id: 'gemini-3.5-flash-lite', timeoutMs: 15000 },
      { id: 'gemini-3.6-flash', timeoutMs: 16000, thinkingConfig: { thinking_budget: 0 } }
    ];

    let lastError = null;
    for (const m of defaultModels) {
      if (parentSignal && parentSignal.aborted) break;
      if (!ModelHealthTracker.isAvailable(m.id)) continue;
      try {
        return await this.generateWithModel(m, dataUrl, promptObj, parentSignal);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new APIError('All Gemini candidate models failed', 500, 'Gemini');
  }
}

export default new GeminiService();
