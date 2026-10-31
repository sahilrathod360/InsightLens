import { config } from '../../config/env.js';
import GeminiService from './GeminiService.js';
import OpenRouterService from './OpenRouterService.js';
import GroqService from './GroqService.js';
import ModelRegistry from './ModelRegistry.js';
import ModelHealthTracker from './ModelHealthTracker.js';
import { APIError } from '../../utils/apiUtils.js';
import { optimizeImage } from '../../utils/imageOptimizer.js';
import cacheManager from '../../utils/cacheManager.js';
import { verifyAndCleanCitations, validateClaimsTraceability } from './CitationVerifier.js';
import ResearchEngine from '../research/ResearchEngine.js';

class AIManager {
  /**
   * Generates a grounded visual intelligence report following the mandatory sequential policy:
   * 1. Gemini is ALWAYS first-choice primary.
   * 2. Groq is attempted ONLY if Gemini fails (error, rate limit, timeout, invalid response).
   * 3. OpenRouter is attempted ONLY if both Gemini and Groq fail.
   * 4. Providers are NEVER raced in parallel.
   */
  async generateReport(rawInputDataUrl, promptObj = {}, preferredProvider = null, requestId = null) {
    const reqId = requestId || `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const startTime = Date.now();

    console.log(`\n==================================================`);
    console.log(`[InsightLens][${reqId}] Analysis started`);

    // Step 1: Server-Side Image Optimization (Resize 1024px, JPEG 82%, EXIF strip, SHA-256)
    const optResult = await optimizeImage(rawInputDataUrl);
    console.log(`[InsightLens][${reqId}] Image successfully received and validated (Original: ${optResult.originalSizeKb} KB, Compressed: ${optResult.compressedSizeKb} KB)`);

    // Step 2: 30-Minute In-Memory Cache Lookup (Composite key ensuring context safety)
    const cacheKey = `${optResult.imageHash}_${(promptObj?.subjectContext || '').trim().toLowerCase()}_${promptObj?.language || 'en'}_${promptObj?.researchLength || 'long'}`;
    const cachedResult = cacheManager.get(cacheKey);
    if (cachedResult) {
      const totalDuration = Date.now() - startTime;
      console.log(`[InsightLens][${reqId}] Returning CACHED report instantly in ${totalDuration}ms`);
      console.log(`[InsightLens][${reqId}] [Analysis] Total: ${totalDuration}ms`);
      console.log(`[InsightLens][${reqId}] [Analysis] SUCCESS | Provider: ${cachedResult.aiProvider || 'Gemini'} (Cached)`);
      console.log(`==================================================\n`);
      const cloned = JSON.parse(JSON.stringify(cachedResult));
      delete cloned.id;
      return {
        ...cloned,
        cached: true,
        processedImageDataUrl: optResult.dataUrl,
        thumbnailDataUrl: optResult.thumbnailDataUrl,
        processingTimeMs: totalDuration,
        totalRequestDurationMs: totalDuration
      };
    }

    // Step 3: Global Safety Ceiling (60 seconds bounded live-analysis ceiling)
    const globalAbortController = new AbortController();
    const globalTimeoutId = setTimeout(() => {
      console.warn(`[InsightLens][${reqId}] 60-second global safety ceiling reached. Terminating active operations.`);
      globalAbortController.abort();
    }, 60000);

    const hasGeminiKey = !!config.apiKeys?.gemini;
    const hasGroqKey = !!config.apiKeys?.groq;
    const hasOpenRouterKey = !!config.apiKeys?.openrouter;

    if (!hasGeminiKey && !hasGroqKey && !hasOpenRouterKey) {
      clearTimeout(globalTimeoutId);
      console.error(`[InsightLens][${reqId}] [Analysis] FAILED | No AI providers configured`);
      throw new APIError('No vision-capable AI models configured with valid credentials.', 500, 'AIManager', 'NO_MODELS_AVAILABLE');
    }

    try {
      // Step 4: Multi-Source Research Retrieval (OpenAlex, Crossref, Wikipedia)
      let candidateSubject = (promptObj?.subjectContext || promptObj?.topic || '').trim();
      let candidateSearchQuery = '';
      let candidateConcepts = Array.isArray(promptObj?.concepts) ? promptObj.concepts : [];
      let candidateCategory = promptObj?.category || promptObj?.domain || '';

      // If no subjectContext was provided by the user, perform fast entity extraction
      // MANDATORY POLICY: Gemini first. Groq ONLY if Gemini fails.
      if (!candidateSubject && !globalAbortController.signal.aborted) {
        console.log(`[InsightLens][${reqId}] No subject context provided. Running visual entity extraction (Gemini first)...`);
        let identified = null;
        let geminiExtractionError = null;

        if (hasGeminiKey) {
          console.log(`[InsightLens][${reqId}] [AI] Primary entity extraction: Gemini`);
          const t0 = Date.now();
          try {
            identified = await GeminiService.identifySubject(optResult.dataUrl, globalAbortController.signal);
            if (identified?.subject) {
              console.log(`[InsightLens][${reqId}] [AI] Gemini entity extraction completed in ${Date.now() - t0}ms: "${identified.subject}"`);
            }
          } catch (err) {
            geminiExtractionError = err.message;
            console.warn(`[InsightLens][${reqId}] [AI] Gemini entity extraction FAILED | Reason: ${geminiExtractionError}`);
          }
        }

        // Use Groq ONLY if Gemini fails or returns empty subject
        if (!identified?.subject && hasGroqKey && !globalAbortController.signal.aborted) {
          console.log(`[InsightLens][${reqId}] [AI] Fallback entity extraction triggered to Groq (Reason: ${geminiExtractionError || 'Gemini empty/unavailable'})`);
          const t0 = Date.now();
          try {
            identified = await GroqService.identifySubject(optResult.dataUrl, globalAbortController.signal);
            if (identified?.subject) {
              console.log(`[InsightLens][${reqId}] [AI] Groq fallback entity extraction completed in ${Date.now() - t0}ms: "${identified.subject}"`);
            }
          } catch (err) {
            console.warn(`[InsightLens][${reqId}] [AI] Groq entity extraction FAILED | Reason: ${err.message}`);
          }
        }

        if (identified && identified.subject) {
          candidateSubject = identified.subject;
          if (identified.searchQuery) candidateSearchQuery = identified.searchQuery;
          if (Array.isArray(identified.concepts)) candidateConcepts = identified.concepts;
          if (identified.category) candidateCategory = identified.category;
          console.log(`[InsightLens][${reqId}] [AI] Subject resolved: "${candidateSubject}" [Category: ${candidateCategory}]`);
        }
      }

      // Grounding Retrieval
      let groundingDossier = null;
      const groundingStartTime = Date.now();
      if (candidateSubject || candidateConcepts.length > 0) {
        console.log(`[InsightLens][${reqId}] [Research] Started for: "${candidateSubject}"`);
        try {
          groundingDossier = await ResearchEngine.retrieveGroundingDossier({
            subject: candidateSubject,
            searchQuery: candidateSearchQuery,
            concepts: candidateConcepts,
            category: candidateCategory,
            visualType: promptObj?.visualType || 'photograph',
            maxAcademicSources: 4
          });
          const resDuration = Date.now() - groundingStartTime;
          console.log(`[InsightLens][${reqId}] [Research] Completed in ${resDuration}ms (${groundingDossier.retrievedCount} sources)`);
        } catch (groundErr) {
          console.warn(`[InsightLens][${reqId}] [Research] Grounding failed: ${groundErr.message}`);
        }
      }

      promptObj = {
        ...promptObj,
        groundingDossier: groundingDossier || ResearchEngine.buildEmptyDossier()
      };

      // Step 5: Sequential Execution: Gemini -> Groq -> OpenRouter
      // Never run providers in parallel. Stop immediately when a provider succeeds.
      let successfulResult = null;
      let finalProvider = null;
      let finalModelId = null;
      let fallbackTriggered = false;
      let fallbackReason = null;
      let geminiFailReason = null;
      let groqFailReason = null;
      let openRouterFailReason = null;
      const reportGenStart = Date.now();

      // --- STAGE A: PRIMARY PROVIDER — GOOGLE GEMINI (ALWAYS ATTEMPTED FIRST) ---
      const geminiCandidates = hasGeminiKey
        ? ModelRegistry.getGeminiCandidates({ preferredModel: promptObj?.model })
        : [];

      if (!hasGeminiKey || geminiCandidates.length === 0) {
        geminiFailReason = 'Gemini API key is not configured or all Gemini models disabled.';
        console.warn(`[InsightLens][${reqId}] [AI] Gemini unavailable | Reason: ${geminiFailReason}`);
        console.log(`[InsightLens][${reqId}] [AI] Fallback triggered`);
        fallbackTriggered = true;
        fallbackReason = geminiFailReason;
      } else {
        for (const modelConfig of geminiCandidates) {
          console.log(`[InsightLens][${reqId}] [AI] Primary provider: Gemini`);
          console.log(`[InsightLens][${reqId}] [AI] Model: ${modelConfig.id}`);
          console.log(`[InsightLens][${reqId}] [AI] Provider request started: Gemini / ${modelConfig.id}`);
          const callStart = Date.now();
          try {
            const result = await GeminiService.generateWithModel(modelConfig, optResult.dataUrl, promptObj, globalAbortController.signal);
            const latencyMs = Date.now() - callStart;
            if (result && result.subject && (result.executiveSummary || result.summaryLead || result.structuredSections || result.detailedAnalysis)) {
              console.log(`[InsightLens][${reqId}] [AI] Gemini completed in ${latencyMs}ms`);
              successfulResult = result;
              finalProvider = 'Gemini';
              finalModelId = modelConfig.id;
              break; // Gemini SUCCEEDED! DO NOT CALL GROQ OR OPENROUTER!
            } else {
              throw new Error('Gemini response failed structural completeness validation.');
            }
          } catch (err) {
            const latencyMs = Date.now() - callStart;
            geminiFailReason = err.message || 'Gemini error';
            console.warn(`[InsightLens][${reqId}] [AI] Gemini / ${modelConfig.id} FAILED in ${latencyMs}ms | Reason: ${geminiFailReason}`);
          }
        }
        if (!successfulResult) {
          console.warn(`[InsightLens][${reqId}] [AI] Gemini FAILED | Reason: ${geminiFailReason}`);
          console.log(`[InsightLens][${reqId}] [AI] Fallback triggered`);
          fallbackTriggered = true;
          fallbackReason = geminiFailReason;
        }
      }

      // --- STAGE B: FIRST FALLBACK — GROQ (ATTEMPTED ONLY IF GEMINI FAILED) ---
      if (!successfulResult && !globalAbortController.signal.aborted) {
        const groqCandidates = hasGroqKey ? ModelRegistry.getGroqCandidates() : [];
        if (!hasGroqKey || groqCandidates.length === 0) {
          groqFailReason = 'Groq API key is not configured or no Groq models available.';
          console.warn(`[InsightLens][${reqId}] [AI] Groq unavailable | Reason: ${groqFailReason}`);
        } else {
          for (const modelConfig of groqCandidates) {
            console.log(`[InsightLens][${reqId}] [AI] Groq started | Model: ${modelConfig.id}`);
            console.log(`[InsightLens][${reqId}] [AI] Provider request started: Groq / ${modelConfig.id}`);
            const callStart = Date.now();
            try {
              const result = await GroqService.generateWithModel(modelConfig, optResult.dataUrl, promptObj, globalAbortController.signal);
              const latencyMs = Date.now() - callStart;
              if (result && result.subject && (result.executiveSummary || result.summaryLead || result.structuredSections || result.detailedAnalysis)) {
                console.log(`[InsightLens][${reqId}] [AI] Groq completed in ${latencyMs}ms`);
                successfulResult = result;
                finalProvider = 'Groq';
                finalModelId = modelConfig.id;
                break; // Groq SUCCEEDED! DO NOT CALL OPENROUTER!
              } else {
                throw new Error('Groq response failed structural completeness validation.');
              }
            } catch (err) {
              const latencyMs = Date.now() - callStart;
              groqFailReason = err.message || 'Groq error';
              console.warn(`[InsightLens][${reqId}] [AI] Groq / ${modelConfig.id} FAILED in ${latencyMs}ms | Reason: ${groqFailReason}`);
            }
          }
        }
      }

      // --- STAGE C: SECOND FALLBACK — OPENROUTER (ATTEMPTED ONLY IF BOTH GEMINI & GROQ FAILED) ---
      if (!successfulResult && !globalAbortController.signal.aborted) {
        console.log(`[InsightLens][${reqId}] [AI] Fallback triggered to OpenRouter`);
        const orCandidates = hasOpenRouterKey
          ? ModelRegistry.getOpenRouterCandidates({ preferredModel: promptObj?.model })
          : [];
        if (!hasOpenRouterKey || orCandidates.length === 0) {
          openRouterFailReason = 'OpenRouter API key is not configured or no OpenRouter models available.';
          console.warn(`[InsightLens][${reqId}] [AI] OpenRouter unavailable | Reason: ${openRouterFailReason}`);
        } else {
          for (const modelConfig of orCandidates) {
            console.log(`[InsightLens][${reqId}] [AI] OpenRouter started | Model: ${modelConfig.id}`);
            console.log(`[InsightLens][${reqId}] [AI] Provider request started: OpenRouter / ${modelConfig.id}`);
            const callStart = Date.now();
            try {
              const result = await OpenRouterService.generateWithModel(modelConfig, optResult.dataUrl, promptObj, globalAbortController.signal);
              const latencyMs = Date.now() - callStart;
              if (result && result.subject && (result.executiveSummary || result.summaryLead || result.structuredSections || result.detailedAnalysis)) {
                console.log(`[InsightLens][${reqId}] [AI] OpenRouter completed in ${latencyMs}ms`);
                successfulResult = result;
                finalProvider = 'OpenRouter';
                finalModelId = modelConfig.id;
                fallbackTriggered = true;
                fallbackReason = `Gemini (${geminiFailReason}), Groq (${groqFailReason})`;
                break; // OpenRouter SUCCEEDED!
              } else {
                throw new Error('OpenRouter response failed structural completeness validation.');
              }
            } catch (err) {
              const latencyMs = Date.now() - callStart;
              openRouterFailReason = err.message || 'OpenRouter error';
              console.warn(`[InsightLens][${reqId}] [AI] OpenRouter / ${modelConfig.id} FAILED in ${latencyMs}ms | Reason: ${openRouterFailReason}`);
            }
          }
        }
      }

      // --- STAGE D: ALL PROVIDERS FAILED ---
      if (!successfulResult) {
        clearTimeout(globalTimeoutId);
        console.error(`[InsightLens][${reqId}] [Analysis] FAILED | All providers exhausted`);
        throw new APIError(
          `All AI providers failed: Gemini (${geminiFailReason || 'unavailable'}), Groq (${groqFailReason || 'unavailable'}), OpenRouter (${openRouterFailReason || 'unavailable'}).`,
          502,
          'AIManager',
          'ALL_PROVIDERS_FAILED'
        );
      }

      const reportDuration = Date.now() - reportGenStart;
      console.log(`[InsightLens][${reqId}] [Report] Generated in ${reportDuration}ms`);

      clearTimeout(globalTimeoutId);

      // Step 6: Citation & Claim Verification against Live Endpoints
      const citStart = Date.now();
      const validatedReferences = await verifyAndCleanCitations(
        successfulResult.references,
        successfulResult.subject,
        successfulResult.category,
        promptObj.groundingDossier
      );

      const claimsValidation = validateClaimsTraceability(
        successfulResult.claims,
        successfulResult.evidenceLedger,
        promptObj.groundingDossier
      );
      const citationDurationMs = Date.now() - citStart;

      const totalDurationMs = Date.now() - startTime;
      const refCount = validatedReferences.length;

      const finalReport = {
        ...successfulResult,
        references: validatedReferences,
        claims: claimsValidation.claims,
        evidenceLedger: claimsValidation.evidenceLedger,
        retrievedSources: validatedReferences,
        groundingTelemetry: {
          retrievedCount: refCount,
          retrievalLatencyMs: promptObj.groundingDossier?.retrievalLatencyMs || 0,
          hasAcademicSources: validatedReferences.some(r => r.sourceType === 'ACADEMIC_PUBLICATION'),
          hasEncyclopedicSources: validatedReferences.some(r => r.sourceType === 'ENCYCLOPEDIC_CONTEXT'),
          academicCount: validatedReferences.filter(r => r.sourceType === 'ACADEMIC_PUBLICATION').length,
          verificationTimeMs: citationDurationMs
        },
        validationStatus: refCount > 0
          ? `Grounded in ${refCount} verified external source${refCount === 1 ? '' : 's'} (OpenAlex, Crossref, Wikipedia). Citations validated.`
          : (successfulResult.validationStatus || 'Direct visual observation in image artifact.'),
        aiProvider: finalProvider,
        actualModel: finalModelId,
        fallbackTriggered,
        fallbackReason: fallbackTriggered ? fallbackReason : null,
        processingTimeMs: totalDurationMs,
        totalRequestDurationMs: totalDurationMs
      };

      // Step 7: Store in Cache
      cacheManager.set(cacheKey, finalReport);

      // Step 8: Standard Runtime Telemetry
      console.log(`[InsightLens][${reqId}] [Analysis] Total: ${totalDurationMs}ms`);
      if (fallbackTriggered) {
        console.log(`[InsightLens][${reqId}] [Analysis] SUCCESS | Provider: ${finalProvider} | Fallback: ${fallbackReason}`);
      } else {
        console.log(`[InsightLens][${reqId}] [Analysis] SUCCESS | Provider: ${finalProvider}`);
      }
      console.log(`==================================================\n`);

      return {
        ...finalReport,
        processedImageDataUrl: optResult.dataUrl,
        thumbnailDataUrl: optResult.thumbnailDataUrl
      };

    } catch (finalErr) {
      clearTimeout(globalTimeoutId);
      const totalDurationMs = Date.now() - startTime;
      console.error(`[InsightLens][${reqId}] [Analysis] FAILED in ${totalDurationMs}ms:`, finalErr.message);
      console.log(`==================================================\n`);
      if (finalErr instanceof APIError) throw finalErr;
      throw new APIError('All AI providers failed to generate a valid research report within timeout bounds.', 502, 'AIManager', 'AI_PROVIDERS_FAILED');
    }
  }
}

export default new AIManager();
