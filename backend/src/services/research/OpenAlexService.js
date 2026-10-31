// OpenAlex API Service for InsightLens
// Retrieves scholarly publications, metadata, abstracts, and DOIs across 250M+ multidisciplinary research works.

import cacheManager from '../../utils/cacheManager.js';

const OPENALEX_USER_AGENT = 'InsightLens/2.2 (https://insight-lens.vercel.app; mailto:research@insightlens.edu)';
const OPENALEX_API_BASE = 'https://api.openalex.org';

/**
 * Reconstruct readable abstract text from OpenAlex inverted index structure.
 * OpenAlex stores abstracts as: { "word": [pos1, pos2], ... }
 */
export function reconstructAbstract(invertedIndex, maxWords = 150) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  try {
    const entries = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      if (Array.isArray(positions)) {
        for (const pos of positions) {
          if (typeof pos === 'number') {
            entries.push({ word, pos });
          }
        }
      }
    }
    if (entries.length === 0) return '';
    entries.sort((a, b) => a.pos - b.pos);
    const words = entries.slice(0, maxWords).map(e => e.word);
    let text = words.join(' ');
    if (entries.length > maxWords) text += '...';
    return text.trim();
  } catch (err) {
    return '';
  }
}

export class OpenAlexService {
  /**
   * Search OpenAlex for scholarly works matching research query or concepts.
   * @param {string} query - Subject search query or concept combination
   * @param {object} options - Search options (limit, timeoutMs)
   */
  static async searchWorks(query, { limit = 5, timeoutMs = 4000 } = {}) {
    if (!query || typeof query !== 'string') return [];
    const cleanQuery = query.trim().replace(/[_\s]+/g, ' ');
    if (cleanQuery.length < 2) return [];

    const cacheKey = `openalex_w_${cleanQuery.toLowerCase()}_${limit}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Query OpenAlex works endpoint with relevance sorting
      const url = `${OPENALEX_API_BASE}/works?search=${encodeURIComponent(cleanQuery)}&per-page=${limit}&sort=relevance_score:desc`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': OPENALEX_USER_AGENT,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        console.warn(`[OpenAlexService] HTTP ${response.status} for query "${cleanQuery}"`);
        return [];
      }

      const json = await response.json();
      const rawResults = json.results || [];

      const works = [];
      const seenDois = new Set();
      const seenTitles = new Set();

      for (const item of rawResults) {
        if (!item || !item.title) continue;

        // Clean & normalize DOI
        const rawDoi = item.doi || '';
        const cleanDoi = rawDoi.replace(/^https?:\/\/doi\.org\//i, '').trim();

        // Deduplication
        if (cleanDoi && seenDois.has(cleanDoi.toLowerCase())) continue;
        if (cleanDoi) seenDois.add(cleanDoi.toLowerCase());

        const normalizedTitle = item.title.trim().toLowerCase();
        if (seenTitles.has(normalizedTitle)) continue;
        seenTitles.add(normalizedTitle);

        // Extract primary authors
        const authors = [];
        if (Array.isArray(item.authorships)) {
          for (const a of item.authorships.slice(0, 3)) {
            if (a?.author?.display_name) {
              authors.push(a.author.display_name.trim());
            }
          }
          if (item.authorships.length > 3) {
            authors.push('et al.');
          }
        }

        // Venue / Journal information
        const primaryLocation = item.primary_location || {};
        const sourceObj = primaryLocation.source || {};
        const journalName = sourceObj.display_name || item.host_venue?.name || '';
        const isPeerReviewed = (item.type === 'article' || item.type === 'book-chapter') && !!journalName;

        // Abstract snippet
        const abstract = reconstructAbstract(item.abstract_inverted_index, 100);

        const cleanTitle = (item.title || '').replace(/<[^>]*>/g, '').trim();

        works.push({
          source: 'OpenAlex',
          sourceType: 'openalex',
          type: 'scholarly_work',
          tier: 1, // Tier 1: Primary / Peer-Reviewed Literature
          id: item.id,
          title: cleanTitle,
          doi: cleanDoi || null,
          doiUrl: cleanDoi ? `https://doi.org/${cleanDoi}` : null,
          authors: authors.length > 0 ? authors.join(', ') : 'Scholarly Authors',
          year: item.publication_year || null,
          journal: journalName || 'Academic Repository',
          abstract: abstract || null,
          citationCount: item.cited_by_count || 0,
          isOpenAccess: !!item.open_access?.is_oa,
          pdfUrl: item.open_access?.oa_url || null,
          isPeerReviewed,
          landingPageUrl: item.primary_location?.landing_page_url || (cleanDoi ? `https://doi.org/${cleanDoi}` : item.id),
          concepts: (item.concepts || []).slice(0, 4).map(c => c.display_name).filter(Boolean),
          retrievedAt: new Date().toISOString()
        });
      }

      cacheManager.set(cacheKey, works);
      return works;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.warn(`[OpenAlexService] Query "${cleanQuery}" timed out after ${timeoutMs}ms`);
      } else {
        console.warn(`[OpenAlexService] Query "${cleanQuery}" failed: ${err.message}`);
      }
      return [];
    }
  }
}

export default OpenAlexService;
