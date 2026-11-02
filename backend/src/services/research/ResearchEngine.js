// Unified Research Engine for InsightLens
// Orchestrates multi-source external research retrieval, Crossref DOI verification,
// evidentiary tier ranking, deduplication, and ground-truth dossier compilation.

import WikipediaService from './WikipediaService.js';
import OpenAlexService from './OpenAlexService.js';
import CrossrefService from './CrossrefService.js';

export class ResearchEngine {
  /**
   * Orchestrates multi-source external research retrieval for a given subject and concepts.
   * @param {object} params - { subject, concepts, category, visualType, maxAcademicSources }
   * @returns {Promise<object>} Grounding evidence dossier
   */
  static async retrieveGroundingDossier({
    subject = '',
    searchQuery = '',
    concepts = [],
    category = '',
    visualType = 'photograph',
    maxAcademicSources = 4
  } = {}) {
    const startTime = Date.now();
    const cleanSubject = (typeof subject === 'string' ? subject : '').trim();
    const cleanSearchQuery = (typeof searchQuery === 'string' ? searchQuery : '').trim();
    const cleanConcepts = Array.isArray(concepts) ? concepts.filter(c => typeof c === 'string' && c.trim().length > 1) : [];

    console.log(`\n[ResearchEngine] Initiating multi-source grounding retrieval for: "${cleanSubject || 'Autonomous Subject'}" [Category: ${category || 'General'}]`);

    const primaryQuery = cleanSubject || cleanConcepts.join(' ') || category || '';
    if (!primaryQuery || primaryQuery.length < 2) {
      console.log('[ResearchEngine] Insufficient subject query; skipping external retrieval.');
      return this.buildEmptyDossier();
    }

    // Build optimized academic query using searchQuery or cleanSubject + category hint
    let academicQuery = cleanSearchQuery || cleanSubject;
    const categoryHint = category ? category.split('&')[0].trim() : '';
    if (academicQuery && categoryHint && !academicQuery.toLowerCase().includes(categoryHint.toLowerCase().split(' ')[0])) {
      academicQuery = `${academicQuery} ${categoryHint}`;
    }

    // 1. Parallel Retrieval: Wikipedia + OpenAlex concurrently
    const [wikiResult, openAlexResult] = await Promise.allSettled([
      WikipediaService.getEntitySummary(cleanSubject || primaryQuery, { timeoutMs: 3500, concepts: cleanConcepts, category }),
      OpenAlexService.searchWorks(academicQuery || primaryQuery, { limit: maxAcademicSources + 4, timeoutMs: 3500 })
    ]);

    const wikiData = wikiResult.status === 'fulfilled' ? wikiResult.value : null;
    const rawScholarlyWorks = openAlexResult.status === 'fulfilled' && Array.isArray(openAlexResult.value) ? openAlexResult.value : [];

    // Transparent Relevance Scoring and Domain Evaluation
    const isOrdinaryVisual = visualType === 'photograph' && (
      ['landscape', 'scenic', 'general', 'nature', 'recreational', 'everyday', 'snapshot'].some(k => 
        (category || '').toLowerCase().includes(k) || (cleanSubject || '').toLowerCase().includes(k)
      ) || (category || '').toLowerCase() === 'geography'
    );

    const relevanceStopwords = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'about', 'background', 'wallpaper',
      'digital', 'abstract', 'photo', 'image', 'mesh', 'wireframe', 'recent', 'analysis', 'study',
      'system', 'systems', 'structure', 'concept', 'theory', 'architecture', 'landscape',
      'geography', 'planning', 'environment', 'condition', 'conditions', 'nocturnal', 'diurnal',
      'setting', 'view', 'modern', 'historical', 'general', 'high', 'large', 'area', 'city',
      'character', 'characters', 'television', 'fictional', 'fiction', 'series', 'drama',
      'actor', 'actress', 'movie', 'movies', 'film', 'films', 'media', 'popular', 'culture',
      'man', 'men', 'white', 'black', 'red', 'blue', 'green', 'sky', 'light', 'lighting',
      'face', 'human', 'home', 'family', 'music', 'making', 'time', 'world', 'life', 'day',
      'night', 'dark', 'portrait', 'shadow', 'shadows', 'approach', 'pilot', 'paper', 'journal'
    ]);

    const getCoreTokens = (str) => (str || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !relevanceStopwords.has(w));
    const subjectCoreTokens = getCoreTokens(cleanSubject);
    const conceptsCoreTokens = cleanConcepts.map(getCoreTokens).flat();
    const allDomainTokens = [...new Set([
      ...subjectCoreTokens,
      ...conceptsCoreTokens,
      ...(categoryHint ? getCoreTokens(categoryHint) : [])
    ])];

    const isNamedEntityOrCharacter = /\b(character|person|actor|actress|fictional|biography|figure|hero|superhero)\b/i.test(`${cleanSubject} ${cleanConcepts.join(' ')} ${category}`);

    const scoredScholarlyWorks = [];
    const rejectedScholarlyWorks = [];

    for (const work of rawScholarlyWorks) {
      const titleLower = (work.title || '').toLowerCase();
      const abstractLower = (work.abstract || '').toLowerCase();
      const workConceptNames = (work.concepts || []).map(c => String(c).toLowerCase());
      const allWorkText = `${titleLower} ${workConceptNames.join(' ')} ${abstractLower}`;

      // Strict Entity Anchor Check:
      // If we are evaluating a specific named entity or character, the paper MUST mention the actual subject
      // in either its title, abstract, or concept tags. Generic concepts like "lighting" or "portrait" are NOT enough!
      const normSubject = cleanSubject.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normWorkText = allWorkText.replace(/[^a-z0-9]/g, '');
      const mentionsSubjectDirectly = normSubject.length > 3 && normWorkText.includes(normSubject);
      const mentionsCoreSubjectTokens = subjectCoreTokens.length > 0 && subjectCoreTokens.some(tok => allWorkText.includes(tok));

      if ((isNamedEntityOrCharacter || subjectCoreTokens.length > 0) && !mentionsSubjectDirectly && !mentionsCoreSubjectTokens) {
        rejectedScholarlyWorks.push({
          ...work,
          relevanceScore: 0.0,
          relevanceTier: 'IRRELEVANT',
          relevanceRationale: `Paper does not mention core entity "${cleanSubject}"; rejected as unrelated domain literature.`
        });
        continue;
      }

      let score = 0.0;
      const matchedKeywords = [];

      // 1. Direct core term matches in title
      for (const tok of subjectCoreTokens) {
        if (titleLower.includes(tok)) {
          score += 0.40;
          matchedKeywords.push(`title:${tok}`);
        }
      }

      // 2. Exact match of subject phrase
      if (mentionsSubjectDirectly) {
        score += 0.45;
        matchedKeywords.push(`exact_subject:${cleanSubject}`);
      }

      // 3. Domain concept alignment
      for (const tok of conceptsCoreTokens) {
        if (workConceptNames.some(c => c.includes(tok))) {
          score += 0.15;
          matchedKeywords.push(`concept:${tok}`);
        }
      }

      // 4. Abstract body correlation
      for (const tok of subjectCoreTokens) {
        if (abstractLower.includes(tok) && !matchedKeywords.includes(`title:${tok}`)) {
          score += 0.15;
          matchedKeywords.push(`abstract:${tok}`);
        }
      }

      // 6. Explicit domain preservation: dark skies, light pollution, astronomy, environmental monitoring
      const isDarkSkiesOrEnviro = /dark sk(y|ies)|light pollution|astrophotography|nocturnal environment|sky glow/i.test(allWorkText);
      const isSubjectNocturnal = cleanSubject.toLowerCase().includes('night') || cleanSubject.toLowerCase().includes('nocturnal') || cleanConcepts.some(c => /night|dark|star|sky/i.test(c));
      if (isDarkSkiesOrEnviro && isSubjectNocturnal) {
        score += 0.35;
        matchedKeywords.push('domain:dark_skies_environmental');
      }

      // 7. Divergent domain penalties (Reject homonyms / totally unrelated academic fields)
      const isUnrelatedPedagogy = /\b(pedagogical|pedagogy|curriculum|k-12|elementary students?|teaching math)\b/i.test(allWorkText);
      const isUnrelatedArchaeology = /\b(archaeological excavation|indigenous medicine wheel|pottery sherds?|ancient tomb)\b/i.test(allWorkText);
      const isUnrelatedMedicine = /\b(fetal|fetuses|brachial plexus|carcinoma|biopsy|clinical trial|syndrome)\b/i.test(allWorkText);

      if (isUnrelatedPedagogy && !cleanSubject.toLowerCase().includes('education')) score -= 0.40;
      if (isUnrelatedArchaeology && !cleanSubject.toLowerCase().includes('archaeology')) score -= 0.50;
      if (isUnrelatedMedicine && !cleanSubject.toLowerCase().includes('medicine') && !cleanSubject.toLowerCase().includes('anatomy')) score -= 0.60;

      const finalScore = Math.max(0.0, Math.min(1.0, Math.round(score * 100) / 100));

      let relevanceTier = 'IRRELEVANT';
      let relevanceRationale = 'Insufficient domain overlap; rejected from grounding dossier.';

      if (finalScore >= 0.50) {
        relevanceTier = 'DIRECTLY_RELEVANT';
        relevanceRationale = `Direct conceptual match on core subject markers (${matchedKeywords.slice(0, 3).join(', ')}).`;
      } else if (finalScore >= 0.35) {
        relevanceTier = 'TANGENTIALLY_RELATED';
        relevanceRationale = `Tangential domain relation; broad secondary overlap on (${matchedKeywords.slice(0, 2).join(', ')}).`;
      }

      const enrichedWork = {
        ...work,
        relevanceScore: finalScore,
        relevanceTier,
        relevanceRationale,
        relevanceMatchKeywords: matchedKeywords
      };

      // Admission Rule:
      // If ordinary visual or named character/entity: admit ONLY DIRECTLY_RELEVANT (finalScore >= 0.50). Do not force papers!
      // If technical / scholarly subject: admit DIRECTLY_RELEVANT, and TANGENTIALLY_RELATED only if needed.
      const isAdmissible = (isOrdinaryVisual || isNamedEntityOrCharacter)
        ? (relevanceTier === 'DIRECTLY_RELEVANT')
        : (finalScore >= 0.35);

      if (isAdmissible) {
        scoredScholarlyWorks.push(enrichedWork);
      } else {
        rejectedScholarlyWorks.push(enrichedWork);
      }
    }

    console.log(`[ResearchEngine] Wikipedia: ${wikiData ? 'FOUND (' + wikiData.title + ')' : 'NONE/SKIPPED'} | OpenAlex: ${rawScholarlyWorks.length} retrieved (${scoredScholarlyWorks.length} admissible, ${rejectedScholarlyWorks.length} rejected)`);

    // 2. Crossref DOI Verification for discovered academic works
    const verifiedAcademicWorks = [];
    const seenDois = new Set();
    const seenTitles = new Set();

    // Verify DOIs concurrently with limit of maxAcademicSources
    const doiVerifyTasks = scoredScholarlyWorks.slice(0, maxAcademicSources).map(async (work) => {
      let crossrefMeta = null;
      if (work.doi) {
        crossrefMeta = await CrossrefService.verifyDoi(work.doi, { timeoutMs: 2000 });
      }

      const isDoiVerified = crossrefMeta && crossrefMeta.verified;
      const finalTitle = isDoiVerified && crossrefMeta.title ? crossrefMeta.title : work.title;
      const finalPublisher = isDoiVerified && crossrefMeta.publisher ? crossrefMeta.publisher : work.journal;
      const finalYear = isDoiVerified && crossrefMeta.publishedYear ? crossrefMeta.publishedYear : work.year;

      return {
        ...work,
        title: finalTitle,
        journal: finalPublisher,
        year: finalYear,
        doiVerified: isDoiVerified,
        crossrefStatus: crossrefMeta?.status || (work.doi ? 'UNVERIFIED_DOI' : 'NO_DOI'),
        verificationBadge: isDoiVerified ? 'DOI_VERIFIED' : (work.doi ? 'DOI_UNCONFIRMED' : 'SCHOLARLY_RECORD'),
        tier: 1 // Tier 1: Peer-Reviewed / Academic Literature
      };
    });

    const settledDoiTasks = await Promise.allSettled(doiVerifyTasks);
    for (const settled of settledDoiTasks) {
      if (settled.status === 'fulfilled' && settled.value) {
        const item = settled.value;
        const normDoi = (item.doi || '').toLowerCase();
        const normTitle = (item.title || '').toLowerCase();

        if (normDoi && seenDois.has(normDoi)) continue;
        if (normDoi) seenDois.add(normDoi);

        if (seenTitles.has(normTitle)) continue;
        seenTitles.add(normTitle);

        verifiedAcademicWorks.push(item);
      }
    }

    // 3. Assemble Consolidated Evidentiary Hierarchy
    const allRetrievedSources = [];

    // Tier 1: Academic Sources First
    for (const work of verifiedAcademicWorks) {
      allRetrievedSources.push({
        tier: 1,
        tierLabel: 'Tier 1: Academic / Scholarly Literature',
        type: 'academic',
        sourceName: work.journal || 'Academic Repository',
        title: work.title,
        authors: work.authors,
        year: work.year,
        doi: work.doi,
        url: work.doiUrl || work.landingPageUrl,
        abstract: work.abstract,
        doiVerified: work.doiVerified,
        isPeerReviewed: work.isPeerReviewed,
        citationCount: work.citationCount,
        openAccess: work.isOpenAccess,
        relevanceScore: work.relevanceScore,
        relevanceTier: work.relevanceTier,
        relevanceRationale: work.relevanceRationale
      });
    }

    // Tier 2: Encyclopedic Context
    if (wikiData && wikiData.extract) {
      allRetrievedSources.push({
        tier: 2,
        tierLabel: 'Tier 2: Encyclopedic Background Context',
        type: 'encyclopedic',
        sourceName: 'Wikipedia',
        title: wikiData.title,
        authors: 'Wikipedia Contributors',
        year: new Date().getFullYear(),
        doi: null,
        url: wikiData.url,
        abstract: wikiData.extract,
        doiVerified: false,
        isPeerReviewed: false,
        wikidataId: wikiData.wikidataId
      });
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`[ResearchEngine] Consolidated ${allRetrievedSources.length} external sources (${verifiedAcademicWorks.length} academic, ${wikiData ? 1 : 0} encyclopedic) in ${elapsedMs}ms`);

    // 4. Generate Structured Prompt Grounding Text
    const groundingPromptText = this.formatGroundingPrompt({
      subject: cleanSubject,
      academicSources: verifiedAcademicWorks,
      wikiData
    });

    return {
      retrievedCount: allRetrievedSources.length,
      retrievalLatencyMs: elapsedMs,
      hasAcademicSources: verifiedAcademicWorks.length > 0,
      hasEncyclopedicSources: !!wikiData,
      academicSources: verifiedAcademicWorks,
      encyclopedicSource: wikiData,
      allSources: allRetrievedSources,
      rejectedSources: rejectedScholarlyWorks,
      groundingPromptText
    };
  }

  static buildEmptyDossier() {
    return {
      retrievedCount: 0,
      retrievalLatencyMs: 0,
      hasAcademicSources: false,
      hasEncyclopedicSources: false,
      academicSources: [],
      encyclopedicSource: null,
      allSources: [],
      groundingPromptText: ''
    };
  }

  /**
   * Formats the retrieved evidence into a strict, unambiguous grounding block for the AI prompt.
   */
  static formatGroundingPrompt({ subject, academicSources = [], wikiData = null }) {
    if (academicSources.length === 0 && !wikiData) {
      return '';
    }

    let text = `
==================================================
GROUNDING EVIDENCE DOSSIER (RETRIEVED FROM REAL EXTERNAL SOURCES):
==================================================
The following authentic external publications and encyclopedic records have been retrieved for this research subject.
You MUST prioritize and cite these verified sources. DO NOT invent fake DOIs, nonexistent authors, or phantom papers.

`;

    if (wikiData && wikiData.extract) {
      text += `--- [ENCYCLOPEDIC BACKGROUND CONTEXT (Wikipedia - Tier 2)] ---
Title: ${wikiData.title}
URL: ${wikiData.url}
Verified Extract: "${wikiData.extract}"
* Note: Use Wikipedia strictly for entity background, historical timeline, and naming context. Do NOT cite Wikipedia as primary scientific or medical proof.

`;
    }

    if (academicSources.length > 0) {
      text += `--- [SCHOLARLY & ACADEMIC PUBLICATIONS (OpenAlex & Crossref - Tier 1)] ---
`;
      academicSources.forEach((work, idx) => {
        text += `${idx + 1}. Title: "${work.title}"
   - Authors: ${work.authors || 'Scholarly Authors'} (${work.year || 'Recent'})
   - Journal / Venue: ${work.journal || 'Academic Literature'}
   - DOI: ${work.doi ? `https://doi.org/${work.doi}` : 'N/A (Indexed Scholarly Work)'} [${work.doiVerified ? 'Crossref DOI Verified' : 'Scholarly Index'}]
   ${work.abstract ? `- Verified Excerpt: "${work.abstract.slice(0, 300)}..."` : ''}

`;
      });
    }

    text += `CITATION & EVIDENCE GROUNDING INSTRUCTIONS:
1. In the "references" JSON array, include the above retrieved external sources. Keep their exact titles, DOIs, and URLs.
2. For each claim in "evidenceLedger" and "claims", link it to the exact "sourceTitle" and "sourceUrl" ONLY if that source's excerpt actually documents that specific fact.
3. For biographical, character identity, casting, and premiere facts, link to the verified Wikipedia encyclopedic background (Tier 2). DO NOT link biographical facts to theoretical academic papers unless their excerpt explicitly documents them.
4. Distinguish directly observed visual features ("OBSERVED") from facts sourced from external literature ("INFERRED").
5. If a claim is not supported by the retrieved evidence or direct visual cues, explicitly indicate uncertainty ("UNDETERMINABLE").
==================================================
`;

    return text;
  }
}

export default ResearchEngine;
