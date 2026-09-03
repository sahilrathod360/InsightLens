import { config } from '../../config/env.js';
import { buildAiPrompt, buildJsonSchemaPrompt } from '../../utils/aiPrompts.js';
import { APIError } from '../../utils/apiUtils.js';
import { parseAIResponse } from '../../utils/aiParser.js';

class OpenRouterService {
  async generate(dataUrl, promptObj = {}, parentSignal = null) {
    const apiKey = config.apiKeys.openrouter;
    if (!apiKey) {
      console.log('[OpenRouter] Failed: API key missing');
      throw new APIError('OpenRouter API key is missing.', 401, 'OpenRouter', 'INVALID_KEY');
    }

    const startTime = Date.now();
    console.log('[AIManager] OpenRouter started');

    const { researchLength = 'long', language = 'en' } = promptObj;
    
    let imageUrl = dataUrl;
    if (typeof dataUrl === 'string' && !dataUrl.startsWith('data:')) {
       imageUrl = `data:image/jpeg;base64,${dataUrl}`;
    }

    const promptText = buildAiPrompt(language, researchLength);
    const schemaText = buildJsonSchemaPrompt();
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

    const models = [
      'google/gemini-3.5-flash-lite',
      'google/gemini-3.7-flash'
    ];

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': config.clientUrl,
      'X-Title': 'InsightLens Backend',
      'Content-Type': 'application/json'
    };

    let lastError = null;

    for (const model of models) {
      if (parentSignal && parentSignal.aborted) {
        console.log('[OpenRouter] Aborted before trying model ' + model);
        break;
      }

      console.log(`[OpenRouter] Trying model ${model}...`);

      const body = {
        model: model,
        max_tokens: 280,
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
        console.warn(`[OpenRouter] 10-second per-model timeout triggered for ${model}`);
        controller.abort();
      }, 10000);

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
          console.warn(`[OpenRouter] Model ${model} status ${response.status}: ${responseText.slice(0, 100)}`);
          lastError = new APIError(`OpenRouter status ${response.status}: ${responseText}`, response.status, 'OpenRouter');
          
          if (response.status === 402 || response.status === 401) {
            console.warn(`[OpenRouter] HTTP ${response.status} (billing/credit exhaustion). Terminating OpenRouter fallback immediately.`);
            break;
          }
          continue;
        }

        const responseText = await response.text();
        const totalInferenceTimeMs = Date.now() - reqStart;

        let resJson;
        try {
          resJson = JSON.parse(responseText);
        } catch (e) {
          console.log(`[OpenRouter] JSON parse error on ${model}. Trying next fallback model...`);
          lastError = new APIError('Failed to parse OpenRouter JSON response', 500, 'OpenRouter');
          continue;
        }

        const rawText = resJson.choices?.[0]?.message?.content || '';
        if (!rawText.trim()) {
          console.log(`[OpenRouter] Model ${model} returned empty response. Trying next fallback model...`);
          lastError = new APIError(`OpenRouter model ${model} returned empty response.`, 500, 'OpenRouter');
          continue;
        }

        const duration = Date.now() - startTime;
        console.log(`[AIManager] OpenRouter finished (${model}) in ${duration} ms (TTFB: ${timeToFirstByteMs}ms, Inference: ${totalInferenceTimeMs}ms)`);

        const parsedResult = parseAIResponse(rawText, 'OpenRouter', model);
        parsedResult.timeToFirstByteMs = timeToFirstByteMs;
        parsedResult.totalInferenceTimeMs = totalInferenceTimeMs;
        return parsedResult;

      } catch (error) {
        clearTimeout(timeoutId);
        if (parentSignal && parentSignal.aborted) {
          console.log(`[OpenRouter] Parent signal aborted pipeline.`);
          lastError = error;
          break;
        } else {
          console.log(`[OpenRouter] Model ${model} failed/timed out: ${error.message}. Trying next fallback model...`);
          lastError = error;
        }
      } finally {
        clearTimeout(timeoutId);
        if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[OpenRouter] All fallback models failed after ${duration} ms`);
    throw lastError || new APIError('All OpenRouter models failed', 500, 'OpenRouter');
  }
}

export default new OpenRouterService();
