import { config } from '../../config/env.js';
import GeminiService from './GeminiService.js';
import OpenRouterService from './OpenRouterService.js';
import { APIError } from '../../utils/apiUtils.js';
import { optimizeImage } from '../../utils/imageOptimizer.js';
import cacheManager from '../../utils/cacheManager.js';
import { verifyAndCleanCitations } from './CitationVerifier.js';

class AIManager {
  async generateReport(rawInputDataUrl, promptObj = {}) {
    const startTime = Date.now();
    console.log('\n==================================================');
    console.log('[AIManager] Starting Production AI Analysis Pipeline');

    // Step 1: Server-Side Image Optimization (Resize 1024px, JPEG 82%, EXIF strip, SHA-256)
    const optResult = await optimizeImage(rawInputDataUrl);
    console.log(`[ImageOptimizer] Original: ${optResult.originalSizeKb} KB | Compressed: ${optResult.compressedSizeKb} KB | Ratio: -${optResult.compressionRatioPct}% | Time: ${optResult.optimizationTimeMs} ms`);

    // Step 2: 30-Minute In-Memory Cache Lookup
    const cachedResult = cacheManager.get(optResult.imageHash);
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

    // Step 3: Hard 80-second global timeout ceiling
    const globalAbortController = new AbortController();
    const globalTimeoutId = setTimeout(() => {
      console.warn('[AIManager] 80-second global safety ceiling reached. Terminating analysis pipeline.');
      globalAbortController.abort();
    }, 80000);

    let winner = null;
    const providerDiagnostics = [];

    try {
      // -------------------------------------------------------------
      // PRIMARY ATTEMPT: Provider A (Direct Gemini Multimodal API)
      // -------------------------------------------------------------
      console.log('[AIManager] Executing Provider A: Google Gemini API...');
      const geminiController = new AbortController();
      const geminiTimeoutId = setTimeout(() => {
        console.warn('[AIManager] Gemini 60-second bounded ceiling triggered.');
        geminiController.abort();
      }, 60000);

      const onGlobalAbortGemini = () => geminiController.abort();
      globalAbortController.signal.addEventListener('abort', onGlobalAbortGemini);

      try {
        const geminiResult = await GeminiService.generate(optResult.dataUrl, promptObj, geminiController.signal);
        clearTimeout(geminiTimeoutId);
        globalAbortController.signal.removeEventListener('abort', onGlobalAbortGemini);
        winner = { name: 'Gemini', result: geminiResult };
        console.log('[AIManager] Provider A (Gemini) generated valid report successfully.');
      } catch (geminiErr) {
        clearTimeout(geminiTimeoutId);
        globalAbortController.signal.removeEventListener('abort', onGlobalAbortGemini);
        const errMsg = geminiErr.message || 'Gemini request failed';
        console.warn(`[AIManager] Provider A (Gemini) failed: ${errMsg}`);
        providerDiagnostics.push({ provider: 'Gemini', error: errMsg });
      }

      // -------------------------------------------------------------
      // FALLBACK ATTEMPT: Provider B (OpenRouter API)
      // -------------------------------------------------------------
      if (!winner && !globalAbortController.signal.aborted) {
        console.log('[AIManager] Executing Provider B: OpenRouter API Fallback...');
        const openrouterController = new AbortController();
        const openrouterTimeoutId = setTimeout(() => {
          console.warn('[AIManager] OpenRouter 12-second bounded ceiling triggered.');
          openrouterController.abort();
        }, 12000);

        const onGlobalAbortOR = () => openrouterController.abort();
        globalAbortController.signal.addEventListener('abort', onGlobalAbortOR);

        try {
          const openrouterResult = await OpenRouterService.generate(optResult.dataUrl, promptObj, openrouterController.signal);
          clearTimeout(openrouterTimeoutId);
          globalAbortController.signal.removeEventListener('abort', onGlobalAbortOR);
          winner = { name: 'OpenRouter', result: openrouterResult };
          console.log('[AIManager] Provider B (OpenRouter) generated valid report successfully.');
        } catch (openrouterErr) {
          clearTimeout(openrouterTimeoutId);
          globalAbortController.signal.removeEventListener('abort', onGlobalAbortOR);
          const errMsg = openrouterErr.message || 'OpenRouter request failed';
          console.warn(`[AIManager] Provider B (OpenRouter) failed: ${errMsg}`);
          providerDiagnostics.push({ provider: 'OpenRouter', error: errMsg });
        }
      }

      clearTimeout(globalTimeoutId);

      // If no provider generated a report, raise controlled failure
      if (!winner) {
        const failureSummary = providerDiagnostics.map(d => `${d.provider}: ${d.error}`).join(' | ');
        console.error(`[AIManager] Controlled Failure — All AI providers exhausted: ${failureSummary}`);
        throw new APIError('All AI providers failed to generate a valid research report within timeout bounds.', 502, 'AIManager', 'AI_PROVIDERS_FAILED');
      }

      // Clean and verify all citation references against live endpoints
      const citStart = Date.now();
      const validatedReferences = await verifyAndCleanCitations(
        winner.result.references,
        winner.result.subject,
        winner.result.category
      );
      const citationDurationMs = Date.now() - citStart;

      const totalDurationMs = Date.now() - startTime;

      const finalReport = {
        ...winner.result,
        references: validatedReferences,
        aiProvider: winner.name,
        processingTimeMs: totalDurationMs,
        totalRequestDurationMs: totalDurationMs
      };

      // Step 4: Store validated report in 30-minute in-memory cache
      cacheManager.set(optResult.imageHash, finalReport);

      // Step 5: Structured Production Logging
      console.log('\n--- PRODUCTION METRICS LOG ---');
      console.log(`Image Size:             ${optResult.originalSizeKb} KB`);
      console.log(`Compressed Size:        ${optResult.compressedSizeKb} KB`);
      console.log(`Compression Ratio:      -${optResult.compressionRatioPct}%`);
      console.log(`Provider Selected:      ${winner.name}`);
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
      const totalDurationMs = Date.now() - startTime;
      console.log(`[AIManager] Pipeline ended in ${totalDurationMs} ms:`, finalErr.message);
      console.log('==================================================\n');
      if (finalErr instanceof APIError) throw finalErr;
      throw new APIError('All AI providers failed to generate a valid research report within timeout bounds.', 502, 'AIManager', 'AI_PROVIDERS_FAILED');
    }
  }
}

export default new AIManager();
