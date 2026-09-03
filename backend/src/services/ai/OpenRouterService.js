import { config } from '../../config/env.js';
import { buildAiPrompt, buildJsonSchemaPrompt } from '../../utils/aiPrompts.js';
import { APIError } from '../../utils/apiUtils.js';
import { parseAIResponse } from '../../utils/aiParser.js';
import ModelHealthTracker from './ModelHealthTracker.js';

class OpenRouterService {
  async generateWithModel(modelConfig, dataUrl, promptObj = {}, parentSignal = null) {
    const apiKey = config.apiKeys.openrouter;
    if (!apiKey) {
      throw new APIError('OpenRouter API key is missing.', 401, 'OpenRouter', 'INVALID_KEY');
    }

    const modelId = modelConfig.id || modelConfig;
    const timeoutMs = modelConfig.timeoutMs || 12000;

    const startTime = Date.now();
    console.log(`[RACE] OpenRouter / ${modelId} START (timeout: ${timeoutMs}ms)`);

    const { researchLength = 'long', language = 'en', subjectContext = '' } = promptObj;

    let imageUrl = dataUrl;
    if (typeof dataUrl === 'string' && !dataUrl.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${dataUrl}`;
    }

    const promptText = buildAiPrompt(language, researchLength, subjectContext);
    const schemaText = buildJsonSchemaPrompt();
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': config.clientUrl,
      'X-Title': 'InsightLens Backend',
      'Content-Type': 'application/json'
    };

    const body = {
      model: modelId,
      max_tokens: modelConfig.maxOutputTokens || 6000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `${promptText}\n\n${schemaText}` },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[RACE] OpenRouter / ${modelId} TIMEOUT after ${timeoutMs}ms`);
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
        headers: headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const timeToFirstByteMs = Date.now() - reqStart;
      clearTimeout(timeoutId);

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        const status = response.status;
        const errType = status === 402 ? 'HTTP_402' : (status === 429 ? 'HTTP_429' : `HTTP_${status}`);

        console.warn(`[RACE] OpenRouter / ${modelId} FAILED ${status} in ${timeToFirstByteMs}ms: ${responseText.slice(0, 120)}`);
        ModelHealthTracker.recordFailure(modelId, errType, timeToFirstByteMs, responseText.slice(0, 100));
        throw new APIError(`OpenRouter model ${modelId} status ${status}: ${responseText}`, status, 'OpenRouter');
      }

      const responseText = await response.text();
      const totalInferenceTimeMs = Date.now() - reqStart;

      let resJson;
      try {
        resJson = JSON.parse(responseText);
      } catch (e) {
        console.warn(`[RACE] OpenRouter / ${modelId} JSON parse error in ${totalInferenceTimeMs}ms`);
        ModelHealthTracker.recordFailure(modelId, 'INVALID_JSON', totalInferenceTimeMs, 'Malformed response JSON');
        throw new APIError('Failed to parse OpenRouter JSON response', 500, 'OpenRouter');
      }

      const rawText = resJson.choices?.[0]?.message?.content || '';
      if (!rawText.trim()) {
        console.warn(`[RACE] OpenRouter / ${modelId} returned empty response in ${totalInferenceTimeMs}ms`);
        ModelHealthTracker.recordFailure(modelId, 'EMPTY_RESPONSE', totalInferenceTimeMs, 'Empty choices text');
        throw new APIError(`OpenRouter model ${modelId} returned empty response.`, 500, 'OpenRouter');
      }

      const parsedResult = parseAIResponse(rawText, 'OpenRouter', modelId);
      parsedResult.timeToFirstByteMs = timeToFirstByteMs;
      parsedResult.totalInferenceTimeMs = totalInferenceTimeMs;

      ModelHealthTracker.recordSuccess(modelId, totalInferenceTimeMs);
      console.log(`[RACE] OpenRouter / ${modelId} returned valid JSON in ${(totalInferenceTimeMs / 1000).toFixed(2)}s`);
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
      { id: 'google/gemini-3.8-flash', timeoutMs: 12000 },
      { id: 'google/gemini-3.5-flash-lite', timeoutMs: 12000 },
      { id: 'qwen/qwen3.8-flash', timeoutMs: 14000 }
    ];

    let lastError = null;
    for (const m of defaultModels) {
      if (parentSignal && parentSignal.aborted) break;
      if (!ModelHealthTracker.isAvailable(m.id)) continue;
      try {
        return await this.generateWithModel(m, dataUrl, promptObj, parentSignal);
      } catch (err) {
        lastError = err;
        if (err.status === 402 || err.status === 401) break; // Don't retry if account has no credits
      }
    }
    throw lastError || new APIError('All OpenRouter candidate models failed', 500, 'OpenRouter');
  }
}

export default new OpenRouterService();
