import { config } from '../../config/env.js';
import GeminiService from './GeminiService.js';
import OpenRouterService from './OpenRouterService.js';
import { APIError } from '../../utils/apiUtils.js';
import { optimizeImage } from '../../utils/imageOptimizer.js';
import cacheManager from '../../utils/cacheManager.js';
import { verifyAndCleanCitations } from './CitationVerifier.js';
import { PROVIDER_CONFIG } from './providerConfig.js';

class AIManager {
  async generateReport(rawInputDataUrl, promptObj = {}) {
    const startTime = Date.now();
    console.log('\n==================================================');
    console.log('[AIManager] Starting Production AI Parallel Analysis Pipeline');

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
        processingTimeMs: totalDuration,
        totalRequestDurationMs: totalDuration
      };
    }

    // Step 3: Global Safety Timeout Ceiling (45 seconds)
    const globalAbortController = new AbortController();
    const globalTimeoutId = setTimeout(() => {
      console.warn('[AIManager] 45-second global safety ceiling reached. Terminating all active analysis providers.');
      globalAbortController.abort();
    }, 45000);

    // Step 4: True Parallel Provider Orchestration
    // Build active provider runners from extensible configuration
    const activeProviders = [];

    if (PROVIDER_CONFIG.gemini?.enabled && config.apiKeys?.gemini) {
      activeProviders.push({
        id: 'gemini',
        name: 'Google Gemini AI',
        service: GeminiService,
        controller: new AbortController()
      });
    }

    if (PROVIDER_CONFIG.openrouter?.enabled && config.apiKeys?.openrouter) {
      activeProviders.push({
        id: 'openrouter',
        name: 'OpenRouter',
        service: OpenRouterService,
        controller: new AbortController()
      });
    }

    if (activeProviders.length === 0) {
      clearTimeout(globalTimeoutId);
      throw new APIError('No AI providers configured with valid API keys.', 500, 'AIManager', 'NO_PROVIDERS_CONFIGURED');
    }

    // Connect global abort signal to all provider controllers
    const onGlobalAbort = () => {
      activeProviders.forEach(p => {
        try { p.controller.abort(); } catch (e) {}
      });
    };
    globalAbortController.signal.addEventListener('abort', onGlobalAbort);

    const providerDiagnostics = [];
    let raceWinner = null;

    try {
      console.log(`[AIManager] Concurrently launching ${activeProviders.length} AI providers in parallel race: ${activeProviders.map(p => p.name).join(', ')}`);

      // Race all providers concurrently. First VALID report wins; losers are immediately aborted.
      raceWinner = await new Promise((resolve) => {
        let pendingCount = activeProviders.length;
        let isResolved = false;

        activeProviders.forEach(provider => {
          const provStart = Date.now();
          console.log(`[AIManager] [RACE START] Provider ${provider.name} started candidate loop...`);

          provider.service.generate(optResult.dataUrl, promptObj, provider.controller.signal)
            .then(result => {
              if (isResolved) return; // Race already won by another provider

              if (result && result.subject && (result.executiveSummary || result.summaryLead || result.sections || result.structuredSections)) {
                isResolved = true;
                const elapsedMs = Date.now() - provStart;
                console.log(`\n>>> [AIManager] [RACE WINNER] ${provider.name} produced a valid report in ${elapsedMs} ms!`);
                
                // Immediately abort all other losing providers
                activeProviders.forEach(other => {
                  if (other.id !== provider.id) {
                    console.log(`[AIManager] [ABORT LOSER] Aborting active provider: ${other.name}`);
                    try { other.controller.abort(); } catch (e) {}
                  }
                });

                resolve({ name: provider.name, result });
              } else {
                // Incomplete result
                providerDiagnostics.push({ provider: provider.name, error: 'Incomplete schema in response' });
                pendingCount--;
                if (pendingCount === 0 && !isResolved) {
                  isResolved = true;
                  resolve(null);
                }
              }
            })
            .catch(err => {
              if (isResolved) return; // If race already concluded, ignore errors from aborted losers
              
              const errMsg = err.message || `${provider.name} failed`;
              const elapsedMs = Date.now() - provStart;
              console.warn(`[AIManager] [PROVIDER FAILED] ${provider.name} finished with error after ${elapsedMs} ms: ${errMsg}`);
              providerDiagnostics.push({ provider: provider.name, error: errMsg });

              pendingCount--;
              if (pendingCount === 0 && !isResolved) {
                isResolved = true;
                resolve(null);
              }
            });
        });
      });

      // Clean up global abort listeners & timers
      clearTimeout(globalTimeoutId);
      globalAbortController.signal.removeEventListener('abort', onGlobalAbort);

      if (!raceWinner || !raceWinner.result) {
        const failureSummary = providerDiagnostics.map(d => `${d.provider}: ${d.error}`).join(' | ');
        console.error(`[AIManager] Controlled Failure — All parallel AI providers failed: ${failureSummary}`);
        throw new APIError('All AI providers failed to generate a valid research report within timeout bounds.', 502, 'AIManager', 'AI_PROVIDERS_FAILED');
      }

      // Step 5: Citation Verification against Live Endpoints
      const citStart = Date.now();
      const validatedReferences = await verifyAndCleanCitations(
        raceWinner.result.references,
        raceWinner.result.subject,
        raceWinner.result.category
      );
      const citationDurationMs = Date.now() - citStart;

      const totalDurationMs = Date.now() - startTime;

      const finalReport = {
        ...raceWinner.result,
        references: validatedReferences,
        aiProvider: raceWinner.name,
        processingTimeMs: totalDurationMs,
        totalRequestDurationMs: totalDurationMs
      };

      // Step 6: Store in 30-minute in-memory cache
      cacheManager.set(cacheKey, finalReport);

      // Step 7: Structured Production Metrics Log
      console.log('\n--- PRODUCTION METRICS LOG ---');
      console.log(`Image Size:             ${optResult.originalSizeKb} KB`);
      console.log(`Compressed Size:        ${optResult.compressedSizeKb} KB`);
      console.log(`Compression Ratio:      -${optResult.compressionRatioPct}%`);
      console.log(`Provider Selected:      ${raceWinner.name}`);
      console.log(`Model Selected:         ${finalReport.actualModel || finalReport.modelUsed}`);
      console.log(`Time to First Byte:     ${finalReport.timeToFirstByteMs || 0} ms`);
      console.log(`Total Inference Time:   ${finalReport.totalInferenceTimeMs || 0} ms`);
      console.log(`JSON Parsing Time:      ${finalReport.jsonParsingTimeMs || 0} ms`);
      console.log(`Schema Validation Time: ${finalReport.schemaValidationTimeMs || 0} ms`);
      console.log(`Citation Verification:  ${citationDurationMs} ms`);
      console.log(`Total Request Duration: ${totalDurationMs} ms (${(totalDurationMs / 1000).toFixed(2)}s)`);
      console.log('==================================================\n');

      return finalReport;

    } catch (finalErr) {
      clearTimeout(globalTimeoutId);
      globalAbortController.signal.removeEventListener('abort', onGlobalAbort);
      const totalDurationMs = Date.now() - startTime;
      console.log(`[AIManager] Parallel pipeline finished with error in ${totalDurationMs} ms:`, finalErr.message);
      console.log('==================================================\n');
      if (finalErr instanceof APIError) throw finalErr;
      throw new APIError('All AI providers failed to generate a valid research report within timeout bounds.', 502, 'AIManager', 'AI_PROVIDERS_FAILED');
    }
  }
}

export default new AIManager();
