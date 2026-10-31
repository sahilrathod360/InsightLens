// Wikipedia REST API Service for InsightLens
// Retrieves authoritative entity summaries and background knowledge without treating Wikipedia as primary scientific evidence.

import cacheManager from '../../utils/cacheManager.js';

const WIKI_USER_AGENT = 'InsightLens/2.2 (https://insight-lens.vercel.app; mailto:research@insightlens.edu)';
const WIKI_REST_BASE = 'https://en.wikipedia.org/api/rest_v1';
const WIKI_SEARCH_BASE = 'https://en.wikipedia.org/w/rest.php/v1';

// Generic academic, photographic, or structural filler words that must NEVER be used alone to justify an entity match
const GENERIC_FILTER_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'about', 'background', 'wallpaper',
  'digital', 'abstract', 'photo', 'image', 'picture', 'frame', 'visual', 'composition',
  'urban', 'rural', 'metropolitan', 'regional', 'analysis', 'study', 'overview', 'density',
  'system', 'systems', 'structure', 'concept', 'theory', 'architecture', 'landscape',
  'geography', 'planning', 'environment', 'condition', 'conditions', 'nocturnal', 'diurnal',
  'setting', 'view', 'modern', 'historical', 'general', 'high', 'large', 'area',
  'city', 'capital', 'region', 'state', 'country', 'place', 'location', 'site', 'sites'
]);

// Known geographic regional contradiction pairings to prevent cross-continent false matches
const GEO_REGIONS = [
  { keywords: ['new york', 'manhattan', 'nyc', 'brooklyn', 'queens', 'bronx', 'empire state', 'hudson'], exclude: ['philippines', 'manila', 'indonesia', 'jakarta', 'africa', 'asia', 'europe', 'bangladesh', 'india'] },
  { keywords: ['alps', 'austrian', 'austria', 'swiss', 'switzerland', 'obertauern', 'tyrol', 'bavaria'], exclude: ['philippines', 'asia', 'africa', 'south america', 'california', 'australia', 'siberia'] }
];

function isGeographicMismatch(contextText, candidateDesc) {
  const cText = (contextText || '').toLowerCase();
  const dText = (candidateDesc || '').toLowerCase();
  for (const reg of GEO_REGIONS) {
    const hasContextMatch = reg.keywords.some(k => cText.includes(k));
    if (hasContextMatch) {
      const hasContradiction = reg.exclude.some(ex => dText.includes(ex));
      if (hasContradiction) return true;
    }
  }
  return false;
}

function getCoreTokens(str) {
  return (str || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !GENERIC_FILTER_WORDS.has(w));
}

export class WikipediaService {
  /**
   * Search Wikipedia and retrieve the canonical summary for an entity.
   * @param {string} rawQuery - Entity or subject name
   * @param {object} options - Options including timeout, concepts, category
   */
  static async getEntitySummary(rawQuery, { timeoutMs = 5500, concepts = [], category = '' } = {}) {
    if (!rawQuery || typeof rawQuery !== 'string') return null;
    const cleanQuery = rawQuery.trim().replace(/[_\s]+/g, ' ');
    if (cleanQuery.length < 2) return null;

    // Reject generic/dummy image filenames or numbers
    if (/^(image|photo|img|screenshot|asset|file)[\s_-]*\d*$/i.test(cleanQuery) || /^\d+$/.test(cleanQuery)) {
      return null;
    }

    const contextText = `${cleanQuery} ${(concepts || []).join(' ')} ${category || ''}`.trim();
    const contextSignature = concepts?.length ? `_${concepts.slice(0, 3).join('_').toLowerCase()}` : '';
    const cacheKey = `wiki_sum_${cleanQuery.toLowerCase()}${contextSignature}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // 1. Attempt direct summary lookup first on clean query
      const normalizedTitle = cleanQuery.replace(/\s+/g, '_');
      const directUrl = `${WIKI_REST_BASE}/page/summary/${encodeURIComponent(normalizedTitle)}`;
      
      let summaryData = null;
      try {
        const directRes = await fetch(directUrl, {
          headers: { 'User-Agent': WIKI_USER_AGENT, 'Accept': 'application/json' },
          signal: controller.signal
        });
        if (directRes.ok) {
          const directJson = await directRes.json();
          // Verify it's not a disambiguation or geographic mismatch
          if (directJson && directJson.type !== 'disambiguation' && directJson.extract) {
            if (!isGeographicMismatch(contextText, `${directJson.title} ${directJson.description || ''}`)) {
              summaryData = directJson;
            }
          }
        }
      } catch (directErr) {
        // Fall back to entity root or search
      }

      // If direct query was a compound phrase (e.g. "Manhattan Skyline") and direct lookup failed/disambiguated,
      // try primary entity root (e.g. "Manhattan" or "Empire State Building")
      if (!summaryData) {
        const queryWords = cleanQuery.split(' ');
        if (queryWords.length > 1) {
          const candidateRoots = [];
          if (cleanQuery.toLowerCase().includes('manhattan')) candidateRoots.push('Manhattan');
          if (cleanQuery.toLowerCase().includes('empire state')) candidateRoots.push('Empire_State_Building');

          const coreTokens = getCoreTokens(cleanQuery);
          for (const token of coreTokens) {
            const capitalized = token.charAt(0).toUpperCase() + token.slice(1);
            if (!candidateRoots.includes(capitalized)) candidateRoots.push(capitalized);
          }
          
          for (const root of candidateRoots) {
            try {
              const rootRes = await fetch(`${WIKI_REST_BASE}/page/summary/${encodeURIComponent(root)}`, {
                headers: { 'User-Agent': WIKI_USER_AGENT, 'Accept': 'application/json' },
                signal: controller.signal
              });
              if (rootRes.ok) {
                const rootJson = await rootRes.json();
                if (rootJson && rootJson.type !== 'disambiguation' && rootJson.extract) {
                  if (!isGeographicMismatch(contextText, `${rootJson.title} ${rootJson.description || ''}`)) {
                    summaryData = rootJson;
                    break;
                  }
                }
              }
            } catch (e) {}
          }
        }
      }

      // 2. Search Fallback with strict relevance and geographic validation
      if (!summaryData) {
        const searchUrl = `${WIKI_SEARCH_BASE}/search/page?q=${encodeURIComponent(cleanQuery)}&limit=5`;
        const searchRes = await fetch(searchUrl, {
          headers: { 'User-Agent': WIKI_USER_AGENT, 'Accept': 'application/json' },
          signal: controller.signal
        });

        if (searchRes.ok) {
          const searchJson = await searchRes.json();
          const queryCoreTokens = getCoreTokens(cleanQuery);
          const allCoreTokens = new Set([
            ...queryCoreTokens,
            ...(concepts || []).map(getCoreTokens).flat()
          ]);

          const cleanQueryNorm = cleanQuery.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
          const isEntertainmentContext = /\b(film|movie|actor|actress|character|comic|fictional|superhero|song|album|band|game|art|painting|music)\b/i.test(contextText);

          for (const page of searchJson.pages || []) {
            if (!page || !page.key) continue;
            const desc = (page.description || '').toLowerCase();

            // Deprioritize generic directory/list pages
            if (/^(list of|index of|outline of|timeline of)\b/i.test(page.title)) {
              continue;
            }

            // Reject pop-culture / entertainment media records (songs, albums, films) unless searching entertainment
            if (!isEntertainmentContext && /\b(song|album|film|soundtrack|single|band|video game)\b/i.test(desc)) {
              continue;
            }

            // Reject geographically contradictory records (e.g. Metro Manila when studying NYC)
            if (isGeographicMismatch(contextText, `${page.title} ${desc}`)) {
              continue;
            }

            // Evaluate non-generic entity overlap
            const pageTitleTokens = getCoreTokens(page.title);
            const pageTitleNorm = (page.title || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();

            const isSubstring = (cleanQueryNorm.includes(pageTitleNorm) || pageTitleNorm.includes(cleanQueryNorm)) && pageTitleNorm.length > 3;
            const sharesCoreToken = pageTitleTokens.some(t => allCoreTokens.has(t));

            // Must share an explicit core non-generic entity token or be an exact title substring
            if (!isSubstring && !sharesCoreToken) {
              continue;
            }

            // Fetch summary to ensure it's a standard article
            const pageUrl = `${WIKI_REST_BASE}/page/summary/${encodeURIComponent(page.key)}`;
            const pageRes = await fetch(pageUrl, {
              headers: { 'User-Agent': WIKI_USER_AGENT, 'Accept': 'application/json' },
              signal: controller.signal
            });

            if (pageRes.ok) {
              const candidateSummary = await pageRes.json();
              if (candidateSummary && candidateSummary.type !== 'disambiguation' && candidateSummary.extract) {
                if (!isGeographicMismatch(contextText, `${candidateSummary.title} ${candidateSummary.description || ''}`)) {
                  summaryData = candidateSummary;
                  break;
                }
              }
            }
          }
        }
      }

      clearTimeout(timer);

      // If no sufficiently relevant page was found, return null
      if (!summaryData || !summaryData.extract) {
        console.log(`[WikipediaService] No sufficiently relevant, geographically compatible Wikipedia page found for "${cleanQuery}". Returning null.`);
        return null;
      }

      const result = {
        source: 'Wikipedia',
        sourceType: 'ENCYCLOPEDIC_BACKGROUND',
        tier: 2, // Tier 2: Authoritative Tertiary Context (never primary clinical/scientific proof)
        title: summaryData.title || cleanQuery,
        description: summaryData.description || 'Encyclopedic entity overview',
        extract: summaryData.extract.trim(),
        url: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(summaryData.title || cleanQuery)}`,
        thumbnail: summaryData.thumbnail?.source || null,
        wikidataId: summaryData.wikibase_item || null,
        language: summaryData.lang || 'en',
        retrievedAt: new Date().toISOString()
      };

      cacheManager.set(cacheKey, result);
      return result;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.warn(`[WikipediaService] Query "${cleanQuery}" timed out after ${timeoutMs}ms`);
      } else {
        console.warn(`[WikipediaService] Query "${cleanQuery}" failed: ${err.message}`);
      }
      return null;
    }
  }
}

export default WikipediaService;
