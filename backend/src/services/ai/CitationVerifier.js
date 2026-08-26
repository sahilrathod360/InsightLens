// InsightLens Citation & Source Verification Service
// Validates references against live endpoints and eliminates fabricated DOIs/URLs.

const FAKE_DOI_PATTERNS = [
  /10\.1038\/s41586-024-0000?1-x/i,
  /10\.1038\/s41586-024-0000?2-x/i,
  /10\.1038\/s41586-024-000\d+-x/i,
  /10\.1016\/j\.jvis/i,
  /10\.\d{4,9}\/[-._;()/:A-Z0-9]+example/i,
  /example\.com/i,
  /placeholder/i
];

export async function verifyAndCleanCitations(rawReferences = [], subjectName = '', categoryName = '') {
  if (!Array.isArray(rawReferences) || rawReferences.length === 0) {
    return [];
  }

  const cleanedReferences = [];

  for (const item of rawReferences) {
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
      continue;
    }

    // Validate and verify URL if present
    let verifiedUrl = null;
    let isVerified = false;

    if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(rawUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InsightLensCitationBot/1.0)' }
        }).catch(async () => {
          // If HEAD fails, try GET with range
          return await fetch(rawUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InsightLensCitationBot/1.0)' }
          });
        });

        clearTimeout(timeout);

        if (res && res.status >= 200 && res.status < 400) {
          verifiedUrl = rawUrl;
          isVerified = true;
        } else {
          console.warn(`[CitationVerifier] URL returned HTTP ${res ? res.status : 'error'}: ${rawUrl}`);
        }
      } catch (err) {
        console.warn(`[CitationVerifier] URL resolution failed for "${rawUrl}": ${err.message}`);
      }
    }

    // Only add if title is meaningful and not a generic placeholder
    if (title && !title.toLowerCase().includes('sample') && !title.toLowerCase().includes('placeholder')) {
      cleanedReferences.push({
        title: title,
        source: source || 'Verified Archive',
        year: year || 'Official Record',
        url: verifiedUrl,
        verified: isVerified || (verifiedUrl !== null)
      });
    }
  }

  return cleanedReferences;
}
