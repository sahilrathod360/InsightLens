import { config } from '../../config/env.js';
import { APIError } from '../../utils/apiUtils.js';
import { parseAIResponse } from '../../utils/aiParser.js';
import ModelHealthTracker from './ModelHealthTracker.js';

/**
 * Builds a compact, high-density prompt tailored specifically for Groq's
 * free-tier token budgets (7,000 ITPM / 1,000 OTPM) while enforcing the
 * strict InsightLens research JSON schema.
 */
function buildGroqPrompt(promptObj = {}) {
  const {
    language = 'en',
    subjectContext = '',
    category = '',
    groundingDossier = null
  } = promptObj;

  let groundingText = '';
  if (groundingDossier && Array.isArray(groundingDossier.sources) && groundingDossier.sources.length > 0) {
    groundingText = '\nVERIFIED GROUNDING SOURCES:\n' + groundingDossier.sources.slice(0, 3).map((s, i) => 
      `[Source ${i + 1}] "${s.title}" (${s.year || 'n.d.'}) - ${s.url}`
    ).join('\n') + '\nStrictly cite and ground your claims in these sources.\n';
  }

  const subjectStr = subjectContext ? `Subject: "${subjectContext}"` : 'Identify the primary subject accurately from visible optical features.';

  return `You are InsightLens's premier research scientist. Conduct an exhaustive scholarly visual analysis of this image.
Language: ${language}
${subjectStr}
${category ? `Category: "${category}"` : ''}
${groundingText}
CRITICAL FACTUAL GROUNDING DIRECTIVE:
- NEVER invent or fabricate false character names, actor names, or fictional movie titles (e.g., do NOT invent names like "Michael Collings in Patriot").
- If the subject's exact identity is not 100% established by visual cues, state that the identity is undetermined and describe the visual scene and attire objectively.
- Maintain strict evidentiary separation: visual observations describe observable scene/clothing only.
- Keep text fields concise, high-density, and direct (1-2 sentences per field) to maintain structured brevity.

Return valid JSON matching this schema:
{
  "title": "Exhaustive scholarly title",
  "subject": "Precise canonical entity name",
  "domain": "Academic domain",
  "category": "Taxonomic category",
  "detectionSummary": "Empirical visual observations of optics, lighting, morphology, and composition.",
  "summaryLead": "Executive research thesis statement.",
  "executiveSummary": "In-depth academic synthesis of visual presentation, historical context, and broader significance.",
  "detailedAnalysis": "Exhaustive visual analysis of spatial composition, focal vectors, lighting, and palette.",
  "identification": "Classification within domain taxonomy based on physical attributes and visual markers.",
  "scientificTechnicalInfo": "Technical benchmarks, material properties, and domain parameters.",
  "visualEvidence": [
    { "statement": "Primary optical attribute and observation in frame", "status": "observed" }
  ],
  "observations": [
    { "statement": "Specific optical or morphological observation", "status": "observed" }
  ],
  "keyTakeaways": [
    "Key finding 1",
    "Key finding 2"
  ],
  "methodology": "Multimodal visual decomposition and cross-referential analysis.",
  "structuredSections": [
    {
      "heading": "Visual Composition and Semiotics",
      "content": "Deep scholarly analysis examining composition, optics, and thematic execution."
    },
    {
      "heading": "Historical and Theoretical Context",
      "content": "Comprehensive domain context, narrative significance, and scholarly implications."
    }
  ],
  "timeline": [
    { "year": "Key Year", "title": "Milestone Title", "desc": "Significant historical or contextual milestone" }
  ],
  "references": [
    { "title": "Authoritative Reference Title", "authors": ["Author Name"], "year": 2020, "url": "https://doi.org/..." }
  ]
}`;
}

class GroqService {
  /**
   * Generates a structured visual research report using Groq LPU multimodal inference.
   * @param {object} modelConfig - Configuration object from ModelRegistry
   * @param {string} dataUrl - Base64 image data URL
   * @param {object} promptObj - Research options, preferences, and grounding dossier
   * @param {AbortSignal} parentSignal - Upstream cancellation signal
   */
  async generateWithModel(modelConfig, dataUrl, promptObj = {}, parentSignal = null) {
    const apiKey = config.apiKeys.groq;
    if (!apiKey) {
      throw new APIError('Groq API key is missing or not configured.', 401, 'Groq', 'INVALID_KEY');
    }

    const modelId = modelConfig.id || 'qwen/qwen3.8-27b';
    const timeoutMs = modelConfig.timeoutMs || 25000;

    const startTime = Date.now();
    console.log(`[RACE] Groq / ${modelId} START (timeout: ${timeoutMs}ms)`);

    const {
      researchLength = 'long',
      language = 'en',
      subjectContext = '',
      writingStyle = 'classic',
      citationStyle = 'APA',
      userPreferences = {},
      groundingDossier = null
    } = promptObj;

    // Ensure dataUrl has valid data: scheme
    let imageUrl = dataUrl;
    if (typeof dataUrl === 'string' && !dataUrl.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${dataUrl}`;
    }

    const promptText = buildGroqPrompt(promptObj);
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Note: Groq on-demand tier enforces a 1,000 OTPM ceiling; cap to 1000 to prevent 429 pre-flight rejections
    const tokenLimit = Math.min(modelConfig.maxOutputTokens || 1000, 1000);

    const body = {
      model: modelId,
      max_tokens: tokenLimit,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[RACE] Groq / ${modelId} TIMEOUT after ${timeoutMs}ms`);
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
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const timeToFirstByteMs = Date.now() - reqStart;
      clearTimeout(timeoutId);

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        const status = response.status;
        const errType = status === 429 ? 'HTTP_429' : (status === 401 ? 'AUTH_ERROR' : `HTTP_${status}`);

        console.warn(`[RACE] Groq / ${modelId} FAILED ${status} in ${timeToFirstByteMs}ms: ${responseText.slice(0, 120)}`);
        ModelHealthTracker.recordFailure(modelId, errType, timeToFirstByteMs, responseText.slice(0, 100));
        throw new APIError(`Groq model ${modelId} status ${status}: ${responseText}`, status, 'Groq');
      }

      const responseText = await response.text();
      const totalInferenceTimeMs = Date.now() - reqStart;

      let resJson;
      try {
        resJson = JSON.parse(responseText);
      } catch (e) {
        console.warn(`[RACE] Groq / ${modelId} JSON parse error in ${totalInferenceTimeMs}ms`);
        ModelHealthTracker.recordFailure(modelId, 'INVALID_JSON', totalInferenceTimeMs, 'Malformed response JSON');
        throw new APIError('Failed to parse Groq JSON response', 500, 'Groq');
      }

      const rawText = resJson.choices?.[0]?.message?.content || '';
      if (!rawText.trim()) {
        console.warn(`[RACE] Groq / ${modelId} returned empty response in ${totalInferenceTimeMs}ms`);
        ModelHealthTracker.recordFailure(modelId, 'EMPTY_RESPONSE', totalInferenceTimeMs, 'Empty response content');
        throw new APIError(`Groq model ${modelId} returned an empty response.`, 500, 'Groq');
      }

      console.log(`[RACE] Groq / ${modelId} returned valid JSON in ${(totalInferenceTimeMs / 1000).toFixed(2)}s`);
      ModelHealthTracker.recordSuccess(modelId, totalInferenceTimeMs);

      const parsedReport = parseAIResponse(rawText, 'Groq', modelId);
      return {
        ...parsedReport,
        provider: 'Groq',
        modelUsed: modelId,
        actualModel: modelId,
        timeToFirstByteMs,
        inferenceTimeMs: totalInferenceTimeMs,
        totalModelLatencyMs: Date.now() - startTime
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
      if (err.name === 'AbortError') {
        ModelHealthTracker.recordFailure(modelId, 'TIMEOUT', Date.now() - reqStart, 'Request aborted or timed out');
        throw new APIError(`Groq model ${modelId} request timed out after ${timeoutMs}ms.`, 504, 'Groq');
      }
      throw err;
    } finally {
      if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
    }
  }

  /**
   * Fast visual entity identification using Groq LPU Vision (Llama 3.2 Vision).
   * @param {string} dataUrl - Base64 image
   * @param {AbortSignal} signal - Optional abort signal
   * @param {number} timeoutMs - Max execution time
   * @returns {Promise<object|null>} Extracted { subject, searchQuery, concepts, category }
   */
  async identifySubject(dataUrl, signal = null, timeoutMs = 8000) {
    const apiKey = config.apiKeys.groq;
    if (!apiKey) return null;

    let imageUrl = dataUrl;
    if (typeof dataUrl === 'string' && !dataUrl.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${dataUrl}`;
    }

    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onParentAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onParentAbort);
    }

    const promptText = 'Analyze the visual features of this image carefully and identify its primary subject for scholarly and academic research. Do NOT invent fictional character names, actors, or non-existent movie titles (e.g. never guess fictional names if uncertain). For well-known cultural figures or fictional characters, identify their exact canonical name (e.g. "Saul Goodman / Jimmy McGill", "Walter White", "Spider-Man", "Albert Einstein"). For geographic locations, landmarks, or monuments, identify the specific canonical entity name (e.g. "Empire State Building, New York City", "Manhattan Skyline"). For abstract visuals or diagrams, identify the canonical scientific or technical subject. If uncertain of exact identity, describe the visible profession, setting, and visual attributes accurately without fabricating identities. Return JSON ONLY with keys: subject, searchQuery, concepts, category.';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          max_tokens: 250,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn(`[GroqService] identifySubject HTTP ${res.status}: ${await res.text().catch(() => '')}`);
        return null;
      }

      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) return null;
      return JSON.parse(rawText);
    } catch (e) {
      clearTimeout(timeoutId);
      if (!signal?.aborted) {
        console.warn(`[GroqService] identifySubject failed: ${e.message}`);
      }
      return null;
    } finally {
      if (signal) signal.removeEventListener('abort', onParentAbort);
    }
  }

  /**
   * Health probe / credentials test for Groq API.
   * @param {string} customApiKey - Optional custom API key to test
   */
  async testConnection(customApiKey = null) {
    const key = customApiKey || config.apiKeys.groq;
    if (!key) {
      return { success: false, message: 'Groq API key is not configured.' };
    }

    const startTime = Date.now();
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        const visionModels = (data.data || []).filter(m => m.id.includes('vision') || m.id.includes('qwen'));
        return {
          success: true,
          provider: 'Groq',
          latencyMs,
          message: `Connected to Groq LPU Cloud (${data.data?.length || 0} models available, ${visionModels.length} vision models).`
        };
      } else {
        const errText = await res.text().catch(() => '');
        return {
          success: false,
          provider: 'Groq',
          status: res.status,
          message: `Groq authentication rejected (HTTP ${res.status}): ${errText.slice(0, 100)}`
        };
      }
    } catch (e) {
      return {
        success: false,
        provider: 'Groq',
        message: `Groq connection failed: ${e.message}`
      };
    }
  }
}

export default new GroqService();
