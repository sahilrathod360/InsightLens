import { config } from '../../config/env.js';
import { buildAiPrompt, buildJsonSchemaPrompt } from '../../utils/aiPrompts.js';
import { APIError } from '../../utils/apiUtils.js';
import { parseAIResponse } from '../../utils/aiParser.js';

class GeminiService {
  async generate(dataUrl, promptObj = {}, parentSignal = null) {
    const apiKey = config.apiKeys.gemini;
    if (!apiKey) {
      throw new APIError('Gemini API key is missing.', 401, 'Gemini', 'INVALID_KEY');
    }

    const startTime = Date.now();
    console.log('[AIManager] Gemini started');

    const { researchLength = 'long', language = 'en' } = promptObj;
    
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

    const promptText = buildAiPrompt(language, researchLength);
    const schemaText = buildJsonSchemaPrompt();
    const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    let lastError = null;

    for (const model of models) {
      if (parentSignal && parentSignal.aborted) break;

      console.log(`[Gemini] Trying model ${model}...`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const body = {
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: `${promptText}\n\n${schemaText}` }
            ]
          }
        ],
        generationConfig: { response_mime_type: "application/json", maxOutputTokens: 2500 }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`[Gemini] 30-second timeout triggered for model ${model}`);
        controller.abort();
      }, 30000);

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
          console.log(`[Gemini] Model ${model} status ${response.status}. ${response.status === 429 ? 'Quota exhausted.' : ''}`);
          lastError = new APIError(`Gemini status ${response.status}: ${errorText}`, response.status, 'Gemini');
          
          if (response.status === 429) {
            // Stop trying Gemini models on 429 Quota Exhausted!
            console.log('[Gemini] Quota exhausted (429). Fast-failover to OpenRouter immediately.');
            throw lastError;
          }
          continue;
        }

        const resJson = await response.json();
        const totalInferenceTimeMs = Date.now() - reqStart;

        const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!rawText.trim()) {
          console.log(`[Gemini] Model ${model} returned empty response.`);
          lastError = new APIError(`Gemini model ${model} returned empty response.`, 500, 'Gemini');
          continue;
        }
        
        const duration = Date.now() - startTime;
        console.log(`[AIManager] Gemini finished (${model}) in ${duration} ms (TTFB: ${timeToFirstByteMs}ms, Inference: ${totalInferenceTimeMs}ms)`);

        const parsedResult = parseAIResponse(rawText, 'Google Gemini AI', model);
        parsedResult.timeToFirstByteMs = timeToFirstByteMs;
        parsedResult.totalInferenceTimeMs = totalInferenceTimeMs;
        return parsedResult;

      } catch (error) {
        clearTimeout(timeoutId);
        if (parentSignal && parentSignal.aborted) {
          console.log(`[Gemini] Parent aborted pipeline execution.`);
          lastError = error;
          break;
        } else if (error.status === 429) {
          throw error;
        } else {
          console.log(`[Gemini] Model ${model} failed/timed out: ${error.message}. Proceeding to fallback candidate...`);
          lastError = error;
        }
      } finally {
        clearTimeout(timeoutId);
        if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Gemini] All models failed after ${duration} ms`);
    throw lastError || new APIError('All Gemini models failed', 500, 'Gemini');
  }
}

export default new GeminiService();
