import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class DocumentAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('document', 'DocumentAnalysisStrategy', 'Document Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED DOCUMENT PIPELINE GUIDELINES:
- Identify the specific document type (e.g., academic paper, technical report, invoice, certificate, official letter, receipt, manuscript, form).
- Extract and cite visible titles, headers, subheadings, and section blocks.
- Transcribe legible text into the extractedOCR field and analyze structural layout (columns, paragraphs, margins, headers/footers).
- Document structured tabular data, rows, columns, and numeric tables if present.
- Identify key metadata fields (dates, reference numbers, issuing authority, signatories if visually legible).
- CRITICAL RULE: Explicitly distinguish VISIBLE TEXT from ANALYTICAL INTERPRETATION.
- STRICT PROHIBITION: Do NOT hallucinate or guess blurred, degraded, unreadable, or truncated text. State clearly where text is illegible.`;
  }
}

export default DocumentAnalysisStrategy;
