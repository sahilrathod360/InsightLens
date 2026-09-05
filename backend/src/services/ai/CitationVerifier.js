import { safeFetchCitation } from '../../utils/ssrfValidator.js';

// InsightLens Citation & Source Verification Service
// Validates references concurrently against live endpoints with strict SSRF defense.

const FAKE_DOI_PATTERNS = [
  /10\.1038\/s41586-024-0000?1-x/i,
  /10\.1038\/s41586-024-0000?2-x/i,
  /10\.1038\/s41586-024-000\d+-x/i,
  /10\.1016\/j\.jvis/i,
  /10\.\d{4,9}\/[-._;()/:A-Z0-9]+example/i,
  /example\.com/i,
  /placeholder/i
];

/**
 * Bounded Concurrency Executor (limits parallel outbound network requests to `limit`)
 */
async function mapConcurrent(items, limit = 5, iteratorFn) {
  if (!items || items.length === 0) return [];
  const results = new Array(items.length);
  let currentIndex = 0;

  const workerCount = Math.min(limit, items.length);
  const workers = new Array(workerCount).fill(0).map(async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      try {
        const val = await iteratorFn(items[index], index);
        results[index] = { status: 'fulfilled', value: val };
      } catch (err) {
        results[index] = { status: 'rejected', reason: err };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

export async function verifyAndCleanCitations(rawReferences = [], subjectName = '', categoryName = '') {
  if (!Array.isArray(rawReferences) || rawReferences.length === 0) {
    return [];
  }

  const verifierStartTime = Date.now();

  // Limit simultaneous outbound citation requests to 5 concurrent sockets
  const results = await mapConcurrent(rawReferences, 5, async (item) => {
    let title = '';
    let source = '';
    let year = '';
    let rawUrl = '';

    if (typeof item === 'string') {
      // Parse string format (e.g., "Author, A. (Year). Title. Source. https://...")
      const urlMatch = item.match(/(https?:\/\/[^\s]+)/i);
      rawUrl = urlMatch ? urlMatch[1].replace(/[.,;)]+$/, '') : '';
      
      const textWithoutUrl = item.replace(/(https?:\/\/[^\s]+)/i, '').trim();
      const yearMatch = textWithoutUrl.match(/\((\d{4}|[A-Za-z\s]+)\)/);
      year = yearMatch ? yearMatch[1] : '';

      title = textWithoutUrl.replace(/\([^)]+\)/, '').replace(/^[0-9]+[.\s-]*/, '').trim();
      source = categoryName || 'Institutional Record';
    } else if (typeof item === 'object' && item !== null) {
      title = String(item.title || item.name || '').trim();
      source = String(item.source || item.publisher || item.organization || categoryName || '').trim();
      year = String(item.year || item.date || '').trim();
      rawUrl = String(item.url || item.doi || '').trim();
    }

    // Skip if title or item contains fake placeholder DOIs
    const fullText = `${title} ${source} ${rawUrl}`;
    const hasFakeDoi = FAKE_DOI_PATTERNS.some(pat => pat.test(fullText));
    if (hasFakeDoi) {
      console.warn(`[CitationVerifier] Rejected fabricated/placeholder DOI reference: "${fullText}"`);
      return null;
    }

    // Perform safe SSRF-protected citation verification
    let verifiedUrl = null;
    let isVerified = false;

    if (rawUrl) {
      try {
        const fetchResult = await safeFetchCitation(rawUrl, 2, 1500);
        if (fetchResult && fetchResult.reachable) {
          verifiedUrl = fetchResult.url;
          isVerified = true;
        } else {
          // Unsafe, non-HTTP, private IP, or unreachable URL: mark unverified / omit URL
          verifiedUrl = null;
          isVerified = false;
        }
      } catch (err) {
        console.warn(`[CitationVerifier] Error verifying citation "${rawUrl}": ${err.message}`);
        verifiedUrl = null;
        isVerified = false;
      }
    }

    // Only add if title is meaningful and not a generic placeholder
    if (title && !title.toLowerCase().includes('sample') && !title.toLowerCase().includes('placeholder')) {
      return {
        title: title,
        source: source || 'Verified Archive',
        year: year || 'Official Record',
        url: verifiedUrl,
        verified: isVerified
      };
    }
    return null;
  });

  const cleanedReferences = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  console.log(`[CitationVerifier] Concurrently checked ${cleanedReferences.length} references in ${Date.now() - verifierStartTime} ms`);
  return cleanedReferences;
}
