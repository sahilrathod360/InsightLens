/**
 * Practical Visual Type Classifier for InsightLens Phase 3
 * Visual Type Taxonomy:
 * - photograph
 * - document
 * - diagram
 * - chart
 * - screenshot
 * - artwork
 * - map
 * - unknown
 */

export const VALID_VISUAL_TYPES = [
  'photograph',
  'document',
  'diagram',
  'chart',
  'screenshot',
  'artwork',
  'map',
  'unknown'
];

export class VisualTypeClassifier {
  /**
   * Normalizes a raw string candidate to one of the 8 canonical visual types.
   */
  static normalizeType(candidate) {
    if (!candidate || typeof candidate !== 'string') return 'unknown';
    const clean = candidate.trim().toLowerCase();

    // Direct exact match
    if (VALID_VISUAL_TYPES.includes(clean)) {
      return clean;
    }

    // Maps & cartography (evaluated before graphs to avoid "cartographic" matching "graph")
    if (/\b(maps?|cartograph\w*|atlas|topograph\w*|road\s*map|transit\s*map)\b/i.test(clean) || clean.includes('geographic map')) {
      return 'map';
    }

    // Charts & data plots
    if (/\b(charts?|graphs?|plots?|histograms?|scatter|pie|bar\s*chart|line\s*chart)\b/i.test(clean)) {
      return 'chart';
    }

    // Screenshots & UI captures
    if (/\b(screenshots?|screen\s*capture|ui|gui|interface|webpage|dashboard\s*ui|app\s*screen)\b/i.test(clean)) {
      return 'screenshot';
    }

    // Diagrams & schematics
    if (/\b(diagrams?|flowcharts?|schematics?|circuits?|architecture|uml|block\s*diagram|system\s*flow)\b/i.test(clean)) {
      return 'diagram';
    }

    // Documents & scanned papers
    if (/\b(documents?|papers?|invoices?|receipts?|articles?|reports?|contracts?|forms?|letters?|text\s*page)\b/i.test(clean)) {
      return 'document';
    }

    // Artwork & creative illustration
    if (/\b(artworks?|paintings?|drawings?|sketches?|illustrations?|sculptures?|canvas|oil\s*painting)\b/i.test(clean)) {
      return 'artwork';
    }

    // Photographs & real-world camera captures
    if (/\b(photographs?|photos?|pictures?|portraits?|landscapes?|wildlife|snapshots?)\b/i.test(clean)) {
      return 'photograph';
    }

    return 'unknown';
  }

  /**
   * Extracts or resolves classification metadata from an AI synthesis result.
   */
  static classify(report = {}) {
    const rawType = report.visualType || report.imageType || report.type || 'unknown';
    const visualType = VisualTypeClassifier.normalizeType(rawType);
    
    const reason = report.classificationReason || report.reason || 'No classification rationale was returned.';

    return {
      visualType,
      reason,
      specializedPipeline: visualType,
      classificationEvidenceStatus: ['observed', 'inferred', 'uncertain'].includes(report.evidenceStatus) ? report.evidenceStatus : 'uncertain'
    };
  }
}

export default VisualTypeClassifier;
