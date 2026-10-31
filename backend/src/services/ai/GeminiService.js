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

    const { researchLength = 'long', language = 'en', subjectContext = '', writingStyle = 'classic', citationStyle = 'APA', userPreferences = {}, groundingDossier = null } = promptObj;

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

    const promptText = buildAiPrompt(language, researchLength, subjectContext, writingStyle, citationStyle, userPreferences, groundingDossier);
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

  async identifySubject(dataUrl, signal = null, timeoutMs = 15000) {
    const apiKey = config.apiKeys.gemini;
    if (!apiKey) return null;

    let mimeType = 'image/jpeg';
    let base64Data = dataUrl;
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      if (parts.length >= 2) {
        mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
        base64Data = parts[1];
      }
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    const executeCall = async (currentTimeout) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), currentTimeout);
      const onParentAbort = () => controller.abort();
      if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', onParentAbort);
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: 'Analyze this image and identify its primary subject for scholarly and academic research. For people, fictional characters, or cultural figures, identify the exact specific character or person name (e.g. "Walter White", "Spider-Man", "Albert Einstein") rather than just the franchise or media title. For geographic locations, cities, architectural landmarks, or monuments, identify the specific canonical entity name (e.g. "Empire State Building, New York City", "Manhattan Skyline"), never generic textbook phrases (e.g. "Urban Morphology and Metropolitan Analysis"). For abstract visuals, diagrams, network meshes, or digital graphics, identify the canonical scientific, technological, or mathematical subject (e.g. "Artificial Neural Network", "Graph Theory Network Topology", "Digital Mesh Wireframe"), never stock-photo descriptive filler (e.g. "plexus background", "wallpaper"). Return JSON ONLY with keys: subject, searchQuery, concepts, category.' }
              ]
            }],
            generationConfig: {
              response_mime_type: "application/json",
              maxOutputTokens: 250
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          console.warn(`[GeminiService] identifySubject HTTP ${res.status}: ${await res.text().catch(() => '')}`);
          return null;
        }
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return null;
        return JSON.parse(rawText);
      } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onParentAbort);
      }
    };

    try {
      return await executeCall(timeoutMs);
    } catch (e) {
      if (signal?.aborted) return null;
      console.warn(`[GeminiService] identifySubject attempt 1 failed (${e.message}). Retrying once...`);
      try {
        await new Promise(r => setTimeout(r, 600));
        return await executeCall(timeoutMs);
      } catch (retryErr) {
        console.warn(`[GeminiService] identifySubject retry failed: ${retryErr.message}`);
        return null;
      }
    }
  }
}

export default new GeminiService();
