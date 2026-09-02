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

    const geminiController = new AbortController();
    const openrouterController = new AbortController();

    // Step 3: Hard 20-second global timeout ceiling (Max 30s ceiling requirement)
    const globalTimeoutId = setTimeout(() => {
      console.warn('[AIManager] 20-second global ceiling triggered. Aborting all pending requests.');
      geminiController.abort();
      openrouterController.abort();
    }, 20000);

    const tasks = [
      {
        name: 'Gemini',
        controller: geminiController,
        promise: GeminiService.generate(optResult.dataUrl, promptObj, geminiController.signal)
      },
      {
        name: 'OpenRouter',
        controller: openrouterController,
        promise: OpenRouterService.generate(optResult.dataUrl, promptObj, openrouterController.signal)
      }
    ];

    try {
      const winner = await new Promise((resolve, reject) => {
        let rejectedCount = 0;
        const errors = [];

        tasks.forEach(task => {
          task.promise
            .then(result => {
              resolve({ name: task.name, result });
            })
            .catch(err => {
              errors.push({ name: task.name, error: err.message });
              rejectedCount++;
              if (rejectedCount === tasks.length) {
                reject(errors);
              }
            });
        });
      });

      clearTimeout(globalTimeoutId);

      // Abort the losing request immediately!
      tasks.forEach(task => {
        if (task.name !== winner.name) {
          task.controller.abort();
        }
      });

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

    } catch (allErrors) {
      clearTimeout(globalTimeoutId);
      const totalDurationMs = Date.now() - startTime;
      console.log(`[AIManager] All AI providers failed in ${totalDurationMs} ms:`, allErrors);
      console.log('==================================================\n');
      throw new APIError('All AI providers failed to generate a valid research report within timeout bounds.', 502, 'AIManager', 'AI_PROVIDERS_FAILED');
    }
  }
}

export default new AIManager();
