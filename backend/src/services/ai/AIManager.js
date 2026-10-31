import { config } from '../../config/env.js';
import GeminiService from './GeminiService.js';
import OpenRouterService from './OpenRouterService.js';
import ModelRegistry from './ModelRegistry.js';
import ModelHealthTracker from './ModelHealthTracker.js';
import { APIError } from '../../utils/apiUtils.js';
import { optimizeImage } from '../../utils/imageOptimizer.js';
import cacheManager from '../../utils/cacheManager.js';
import { verifyAndCleanCitations, validateClaimsTraceability } from './CitationVerifier.js';
import ResearchEngine from '../research/ResearchEngine.js';

class AIManager {
  async generateReport(rawInputDataUrl, promptObj = {}, preferredProvider = null) {
    const startTime = Date.now();
    console.log('\n==================================================');
    console.log('[AIManager] Starting Parallel Multimodal Model Race');

    // Step 1: Server-Side Image Optimization (Resize 1024px, JPEG 82%, EXIF strip, SHA-256)
    const optResult = await optimizeImage(rawInputDataUrl);
    console.log(`[ImageOptimizer] Original: ${optResult.originalSizeKb} KB | Compressed: ${optResult.compressedSizeKb} KB | Ratio: -${optResult.compressionRatioPct}% | Time: ${optResult.optimizationTimeMs} ms`);

    // Step 2: 30-Minute In-Memory Cache Lookup (Composite key ensuring context safety)
    const cacheKey = `${optResult.imageHash}_${(promptObj?.subjectContext || '').trim().toLowerCase()}_${promptObj?.language || 'en'}_${promptObj?.researchLength || 'long'}`;
    const cachedResult = cacheManager.get(cacheKey);
    if (cachedResult) {
      const totalDuration = Date.now() - startTime;
      console.log(`[AIManager] Returning CACHED report instantly in ${totalDuration} ms`);
      console.log('==================================================\n');
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
      console.warn('[AIManager] 60-second global safety ceiling reached. Terminating all active analysis candidates.');
      globalAbortController.abort();
    }, 60000);

    // Step 4: Multi-Model Candidate Selection from Registry (Up to 6 healthy candidates)
    const hasGeminiKey = !!config.apiKeys?.gemini;
    const hasOpenRouterKey = !!config.apiKeys?.openrouter;

    const candidates = ModelRegistry.getVisionCandidates({
      maxCandidates: 6,
      hasGeminiKey,
      hasOpenRouterKey,
      allowedProviders: config.aiProviders,
      preferredProvider,
      preferredModel: promptObj?.model || null
    });

    if (candidates.length === 0) {
      clearTimeout(globalTimeoutId);
      throw new APIError('No vision-capable AI models configured with valid credentials.', 500, 'AIManager', 'NO_MODELS_AVAILABLE');
    }

    // Step 5: Multi-Source Research Retrieval (OpenAlex, Crossref, Wikipedia)
    let groundingDossier = null;
    const groundingStartTime = Date.now();
    try {
      let candidateSubject = (promptObj?.subjectContext || promptObj?.topic || '').trim();
      let candidateSearchQuery = '';
      let candidateConcepts = Array.isArray(promptObj?.concepts) ? promptObj.concepts : [];
      let candidateCategory = promptObj?.category || promptObj?.domain || '';

      // If no subjectContext was provided by the user, perform fast entity identification from image
      if (!candidateSubject && hasGeminiKey && !globalAbortController.signal.aborted) {
        console.log('[AIManager] No subject context provided. Running fast visual entity extraction...');
        const identified = await GeminiService.identifySubject(optResult.dataUrl, globalAbortController.signal);
        if (identified && identified.subject) {
          candidateSubject = identified.subject;
          if (identified.searchQuery) candidateSearchQuery = identified.searchQuery;
          if (Array.isArray(identified.concepts)) candidateConcepts = identified.concepts;
          if (identified.category) candidateCategory = identified.category;
          console.log(`[AIManager] Visual entity identified: "${candidateSubject}" [Category: ${candidateCategory}]`);
        }
      }

      if (candidateSubject || candidateConcepts.length > 0) {
        groundingDossier = await ResearchEngine.retrieveGroundingDossier({
          subject: candidateSubject,
          searchQuery: candidateSearchQuery,
          concepts: candidateConcepts,
          category: candidateCategory,
          visualType: promptObj?.visualType || 'photograph',
          maxAcademicSources: 4
        });
        console.log(`[AIManager] Grounding dossier assembled in ${Date.now() - groundingStartTime} ms with ${groundingDossier.retrievedCount} sources.`);
      }
    } catch (groundErr) {
      console.warn('[AIManager] Research grounding failed (continuing without external sources):', groundErr.message);
    }

    // Attach grounding dossier to prompt object for multimodal models
    promptObj = {
      ...promptObj,
      groundingDossier: groundingDossier || ResearchEngine.buildEmptyDossier()
    };

    // Step 6: Execute Adaptive Parallel Multimodal Racing Pool
    // Up to 2 concurrent models race simultaneously; failed slots immediately promote next healthy candidates from queue.
    const maxConcurrent = 2;
    const providerDiagnostics = [];
    const activeControllers = new Map();
    let raceWinner = null;

    const onGlobalAbort = () => {
      for (const [id, ctrl] of activeControllers.entries()) {
        try { ctrl.abort(); } catch (e) {}
      }
      activeControllers.clear();
    };
    globalAbortController.signal.addEventListener('abort', onGlobalAbort);

    try {
      console.log(`[AIManager] Initializing Adaptive Racing Pool with ${candidates.length} candidates (concurrency: ${maxConcurrent}): ${candidates.map(t => `${t.provider}/${t.id}`).join(', ')}`);

      raceWinner = await new Promise((resolve) => {
        let isResolved = false;
        let queueIndex = 0;
        let activeCount = 0;

        const tryLaunchNext = () => {
          if (isResolved || globalAbortController.signal.aborted) return;

          while (activeCount < maxConcurrent && queueIndex < candidates.length) {
            const modelConfig = candidates[queueIndex++];
            const modelId = modelConfig.id;
            const controller = new AbortController();
            activeControllers.set(modelId, controller);
            activeCount++;

            const service = modelConfig.provider === 'gemini' ? GeminiService : OpenRouterService;
            const taskStart = Date.now();
            console.log(`[RACE] Launching candidate [${activeCount}/${maxConcurrent} active, queue pos ${queueIndex}/${candidates.length}]: ${modelConfig.provider}/${modelId}`);

            service.generateWithModel(modelConfig, optResult.dataUrl, promptObj, controller.signal)
              .then(result => {
                activeControllers.delete(modelId);
                activeCount--;

                if (isResolved) return; // Race already won

                // Validate that the returned object contains real, complete research fields
                if (result && result.subject && (result.executiveSummary || result.summaryLead || result.sections || result.structuredSections)) {
                  isResolved = true;
                  const elapsedMs = Date.now() - taskStart;
                  console.log(`\n==================================================`);
                  console.log(`>>> [RACE WINNER]`);
                  console.log(`Provider: ${result.aiProvider || modelConfig.provider}`);
                  console.log(`Model:    ${modelId}`);
                  console.log(`TTFB:     ${result.timeToFirstByteMs || 0} ms`);
                  console.log(`Inference:${result.totalInferenceTimeMs || 0} ms`);
                  console.log(`Total:    ${elapsedMs} ms (${(elapsedMs / 1000).toFixed(2)}s)`);
                  console.log(`==================================================\n`);

                  // Immediately abort all losing candidates
                  for (const [otherId, otherCtrl] of activeControllers.entries()) {
                    console.log(`[RACE] Aborting losing candidate: ${otherId}`);
                    try { otherCtrl.abort(); } catch (e) {}
                  }
                  activeControllers.clear();

                  resolve({
                    provider: result.aiProvider || (modelConfig.provider === 'gemini' ? 'Google Gemini AI' : 'OpenRouter'),
                    modelId: modelId,
                    result
                  });
                } else {
                  providerDiagnostics.push({
                    model: modelId,
                    error: 'Incomplete schema in response'
                  });
                  if (!isResolved) {
                    tryLaunchNext();
                    if (activeCount === 0 && queueIndex >= candidates.length) {
                      isResolved = true;
                      resolve(null);
                    }
                  }
                }
              })
              .catch(err => {
                activeControllers.delete(modelId);
                activeCount--;

                if (isResolved) return; // If race concluded, ignore errors from aborted losers

                const errMsg = err.message || `${modelId} failed`;
                const elapsedMs = Date.now() - taskStart;
                providerDiagnostics.push({
                  model: modelId,
                  error: errMsg,
                  elapsedMs
                });

                if (!isResolved) {
                  // Promote next candidate in queue immediately
                  tryLaunchNext();
                  if (activeCount === 0 && queueIndex >= candidates.length) {
                    isResolved = true;
                    resolve(null);
                  }
                }
              });
          }
        };

        // Start initial batch
        tryLaunchNext();

        if (activeCount === 0) {
          isResolved = true;
          resolve(null);
        }
      });

      clearTimeout(globalTimeoutId);
      globalAbortController.signal.removeEventListener('abort', onGlobalAbort);

      if (!raceWinner || !raceWinner.result) {
        const failureSummary = providerDiagnostics.map(d => `${d.model}: ${d.error}`).join(' | ');
        console.error(`[AIManager] All parallel vision models failed: ${failureSummary}`);
        throw new APIError('All AI providers failed to generate a valid research report within timeout bounds.', 502, 'AIManager', 'AI_PROVIDERS_FAILED');
      }

      // Step 7: Citation & Claim Verification against Live Endpoints
      const citStart = Date.now();
      const validatedReferences = await verifyAndCleanCitations(
        raceWinner.result.references,
        raceWinner.result.subject,
        raceWinner.result.category,
        promptObj.groundingDossier
      );

      const claimsValidation = validateClaimsTraceability(
        raceWinner.result.claims,
        raceWinner.result.evidenceLedger,
        promptObj.groundingDossier
      );
      const citationDurationMs = Date.now() - citStart;

      const totalDurationMs = Date.now() - startTime;

      const finalReport = {
        ...raceWinner.result,
        references: validatedReferences,
        claims: claimsValidation.claims,
        evidenceLedger: claimsValidation.evidenceLedger,
        retrievedSources: promptObj.groundingDossier?.allSources || [],
        groundingTelemetry: {
          retrievedCount: promptObj.groundingDossier?.retrievedCount || 0,
          retrievalLatencyMs: promptObj.groundingDossier?.retrievalLatencyMs || 0,
          hasAcademicSources: promptObj.groundingDossier?.hasAcademicSources || false,
          hasEncyclopedicSources: promptObj.groundingDossier?.hasEncyclopedicSources || false,
          academicCount: promptObj.groundingDossier?.academicSources?.length || 0,
          verificationTimeMs: citationDurationMs
        },
        validationStatus: promptObj.groundingDossier?.retrievedCount > 0
          ? `Grounded in ${promptObj.groundingDossier.retrievedCount} verified external sources (OpenAlex, Crossref, Wikipedia). Citations validated.`
          : (raceWinner.result.validationStatus || 'Empirically analyzed and citation validated.'),
        aiProvider: raceWinner.provider,
        actualModel: raceWinner.modelId,
        processingTimeMs: totalDurationMs,
        totalRequestDurationMs: totalDurationMs
      };

      // Step 8: Store in Cache
      cacheManager.set(cacheKey, finalReport);

      // Step 9: Structured Production Telemetry
      console.log('\n--- PRODUCTION METRICS LOG ---');
      console.log(`Image Size:             ${optResult.originalSizeKb} KB`);
      console.log(`Compressed Size:        ${optResult.compressedSizeKb} KB`);
      console.log(`Compression Ratio:      -${optResult.compressionRatioPct}%`);
      console.log(`Provider Selected:      ${finalReport.aiProvider}`);
      console.log(`Model Selected:         ${finalReport.actualModel}`);
      console.log(`Time to First Byte:     ${finalReport.timeToFirstByteMs || 0} ms`);
      console.log(`Total Inference Time:   ${finalReport.totalInferenceTimeMs || 0} ms`);
      console.log(`Research Retrieval:     ${promptObj.groundingDossier?.retrievalLatencyMs || 0} ms (${promptObj.groundingDossier?.retrievedCount || 0} sources)`);
      console.log(`JSON Parsing Time:      ${finalReport.jsonParsingTimeMs || 0} ms`);
      console.log(`Schema Validation Time: ${finalReport.schemaValidationTimeMs || 0} ms`);
      console.log(`Citation Verification:  ${citationDurationMs} ms`);
      console.log(`Total Request Duration: ${totalDurationMs} ms (${(totalDurationMs / 1000).toFixed(2)}s)`);
      console.log('==================================================\n');

      // Transport-only image fields are intentionally not part of the report
      // JSON saved in full_data; persistence stores them in dedicated columns.
      return {
        ...finalReport,
        processedImageDataUrl: optResult.dataUrl,
        thumbnailDataUrl: optResult.thumbnailDataUrl
      };

    } catch (finalErr) {
      clearTimeout(globalTimeoutId);
      globalAbortController.signal.removeEventListener('abort', onGlobalAbort);
      const totalDurationMs = Date.now() - startTime;
      console.log(`[AIManager] Parallel race failed after ${totalDurationMs} ms:`, finalErr.message);
      console.log('==================================================\n');
      if (finalErr instanceof APIError) throw finalErr;
      throw new APIError('All AI providers failed to generate a valid research report within timeout bounds.', 502, 'AIManager', 'AI_PROVIDERS_FAILED');
    }
  }
}

export default new AIManager();
