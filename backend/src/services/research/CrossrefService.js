// Crossref API Service for InsightLens
// Retrieves and verifies official DOI metadata and publication records across 150M+ scholarly works.

import cacheManager from '../../utils/cacheManager.js';

const CROSSREF_USER_AGENT = 'InsightLens/2.2 (https://insight-lens.vercel.app; mailto:research@insightlens.edu)';
const CROSSREF_API_BASE = 'https://api.crossref.org';
const DOI_REGEX = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;

export class CrossrefService {
  /**
   * Cleans and extracts a valid DOI string from a raw string or URL.
   */
  static cleanDoi(rawDoi) {
    if (!rawDoi || typeof rawDoi !== 'string') return null;
    let clean = rawDoi.trim();
    clean = clean.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    clean = clean.replace(/^doi:\s*/i, '');
    clean = clean.replace(/[.,;)]+$/, '').trim();
    if (DOI_REGEX.test(clean)) {
      return clean;
    }
    return null;
  }

  /**
   * Verify a DOI against Crossref and retrieve official publication metadata.
   * @param {string} rawDoi - DOI string or DOI URL
   * @param {object} options - Timeout options
   */
  static async verifyDoi(rawDoi, { timeoutMs = 3500 } = {}) {
    const doi = this.cleanDoi(rawDoi);
    if (!doi) {
      return {
        verified: false,
        status: 'INVALID_DOI_FORMAT',
        doi: rawDoi || null,
        message: 'Supplied string is not a valid DOI syntax.'
      };
    }

    const cacheKey = `crossref_${doi.toLowerCase()}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `${CROSSREF_API_BASE}/works/${encodeURIComponent(doi)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': CROSSREF_USER_AGENT,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (response.status === 404) {
        const notFoundResult = {
          verified: false,
          status: 'DOI_NOT_FOUND',
          doi: doi,
          message: 'DOI is not registered with Crossref.'
        };
        cacheManager.set(cacheKey, notFoundResult);
        return notFoundResult;
      }

      if (!response.ok) {
        console.warn(`[CrossrefService] HTTP ${response.status} for DOI "${doi}"`);
        return {
          verified: false,
          status: `HTTP_${response.status}`,
          doi: doi,
          message: `Crossref responded with status ${response.status}`
        };
      }

      const json = await response.json();
      const item = json.message || {};

      const rawTitle = Array.isArray(item.title) ? (item.title[0] || '') : (item.title || '');
      const title = String(rawTitle).replace(/<[^>]*>/g, '').trim();
      const publisher = String(item.publisher || '');
      const containerTitle = Array.isArray(item['container-title']) ? (item['container-title'][0] || '') : (item['container-title'] || '');
      
      let year = null;
      if (item.issued?.['date-parts']?.[0]?.[0]) {
        year = item.issued['date-parts'][0][0];
      } else if (item.created?.['date-parts']?.[0]?.[0]) {
        year = item.created['date-parts'][0][0];
      }

      const authors = [];
      if (Array.isArray(item.author)) {
        for (const a of item.author.slice(0, 3)) {
          if (a.family) {
            authors.push(a.given ? `${a.given} ${a.family}` : a.family);
          } else if (a.name) {
            authors.push(a.name);
          }
        }
        if (item.author.length > 3) {
          authors.push('et al.');
        }
      }

      const result = {
        verified: true,
        status: 'DOI_VERIFIED',
        doi: doi,
        doiUrl: `https://doi.org/${doi}`,
        title: String(title || '').trim(),
        publisher: String(publisher || '').trim(),
        journal: String(containerTitle || '').trim(),
        year: year,
        authors: authors.length > 0 ? authors.join(', ') : '',
        type: item.type || 'journal-article',
        issn: Array.isArray(item.ISSN) ? item.ISSN : [],
        retrievedAt: new Date().toISOString()
      };

      cacheManager.set(cacheKey, result);
      return result;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.warn(`[CrossrefService] DOI "${doi}" timed out after ${timeoutMs}ms`);
        return {
          verified: false,
          status: 'TIMEOUT',
          doi: doi,
          message: `Request timed out after ${timeoutMs}ms`
        };
      }
      console.warn(`[CrossrefService] DOI "${doi}" failed: ${err.message}`);
      return {
        verified: false,
        status: 'LOOKUP_FAILED',
        doi: doi,
        message: err.message
      };
    }
  }
}

export default CrossrefService;
