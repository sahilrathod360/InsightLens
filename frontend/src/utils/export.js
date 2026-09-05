// Document Export Services (PDF, Markdown, JSON)

import { getActiveReportData, getSystemPreferences, navigateTo } from '../state.js';
import { saveAppMetrics, logUserActivity } from '../services/storage.js';
import { getAppMetrics } from '../services/storage.js';
import { showToast } from './toast.js';
import { API_BASE, getAuthHeaders } from './api.js';

export async function recordExportMetricToBackend(format) {
  try {
    await fetch(`${API_BASE}/api/report/export-metric`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ format })
    });
  } catch (err) {
    console.warn(`[Export Metric] Failed to record ${format} export to PostgreSQL:`, err.message);
  }
}

export function exportMarkdownFile() {
  const activeReportData = getActiveReportData();
  if (!activeReportData) return;
  const d = activeReportData;
  const systemPreferences = getSystemPreferences();

  let diagramSection = '';
  if (d.visualType === 'diagram' && d.diagramStructure) {
    const s = d.diagramStructure;
    const nodeMap = new Map((s.nodes || []).map(n => [n.id, n.label]));
    const nodesList = (s.nodes || []).map(n => `- ${n.label || 'Unlabelled Node'}${n.type && n.type !== 'unknown' ? ` (${n.type})` : ''}`).join('\n');
    const edgesList = (s.edges || []).map(e => {
      const src = nodeMap.get(e.source) || e.source || 'Node';
      const tgt = nodeMap.get(e.target) || e.target || 'Node';
      const arrow = e.direction === 'bidirectional' ? '↔' : '→';
      return `- ${src} ${arrow} ${tgt}${e.label ? ` (${e.label})` : ''}`;
    }).join('\n');

    diagramSection = `\n---\n\n## Visual Structure & Topology\n\nDiagram Type: ${(s.diagramType || 'diagram').replace(/_/g, ' ').toUpperCase()}\n\n### Nodes\n${nodesList || '- No explicit nodes detected.'}\n\n### Connections\n${edgesList || '- No explicit connections detected.'}\n`;
  }

  let bodySections = '';
  if (Array.isArray(d.structuredSections) && d.structuredSections.length > 0) {
    bodySections = d.structuredSections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n---\n\n');
  } else if (Array.isArray(d.sections) && d.sections.length > 0) {
    bodySections = d.sections.map(s => `## ${s.heading}\n\n${s.body}`).join('\n\n---\n\n');
  } else {
    bodySections = `## Detailed Analysis\n\n${d.detailedAnalysis || ''}\n\n---\n\n## Identification & Taxonomy\n\n${d.identification || ''}\n\n---\n\n## Scientific & Technical Attributes\n\n${d.scientificTechnicalInfo || ''}`;
  }

  let keyFactsSection = '';
  if (Array.isArray(d.keyFacts) && d.keyFacts.length > 0) {
    const factsRows = d.keyFacts.map(f => `| ${f.label} | ${f.detail} |`).join('\n');
    keyFactsSection = `\n---\n\n## Key Fact Attributes\n\n| Attribute | Detail |\n|---|---|\n${factsRows}\n`;
  }

  let timelineSection = '';
  if (Array.isArray(d.timeline) && d.timeline.length > 0) {
    const timelineRows = d.timeline.map(t => `- **${t.year} — ${t.title}:** ${t.desc}`).join('\n');
    timelineSection = `\n---\n\n## Historical Timeline & Milestones\n\n${timelineRows}\n`;
  }

  const ocrSection = d.extractedOCR && d.extractedOCR !== 'None detected' ? `\n---\n\n## Extracted Text (OCR)\n\`\`\`\n${d.extractedOCR}\n\`\`\`\n` : '';

  let evidenceSection = '';
  if (Array.isArray(d.evidenceLedger) && d.evidenceLedger.length > 0) {
    const claimsRows = d.evidenceLedger.map((item, idx) => {
      const typeLabel = (item.evidenceType || 'claim').replace(/_/g, ' ').toUpperCase();
      const statusLabel = (item.supportStatus || 'uncertain').replace(/_/g, ' ').toUpperCase();
      const source = item.sourceUrl ? `[${item.sourceTitle || 'Source'}](${item.sourceUrl})` : (item.sourceTitle || 'Visual Observation');
      return `### Claim ${idx + 1}: ${item.claim}\n- **Type:** ${typeLabel}\n- **Support Status:** ${statusLabel}\n- **Grounding Evidence:** ${item.evidence || 'N/A'}\n- **Analytical Reasoning:** ${item.reasoning || 'N/A'}\n- **Citation / Reference:** ${source}\n`;
    }).join('\n');
    evidenceSection = `\n---\n\n## Evidence Intelligence Workbench\n*Traceable empirical claims ledger with source grounding and verification status.*\n\n${claimsRows}`;
  }

  const md = `# ${d.title || d.subject || 'Visual Research Brief'}
*Synthesized by InsightLens AI Visual Research Engine (${d.modelUsed || d.actualModel || systemPreferences.model || 'Gemini'})*

---

### 📊 Research Metadata & Telemetry
- **Visual Classification:** ${(d.visualType || 'photograph').toUpperCase()}
- **Specialized Pipeline:** ${d.specializedPipeline || 'Photo Analysis Pipeline'}
- **Primary Subject:** ${d.subject}
- **Scientific/Technical Name:** ${d.scientificName || 'N/A'}
- **Domain Category:** ${d.category || 'Visual Science'}
- **Evidence Status:** ${d.evidenceStatus || 'Uncertain (not calibrated)'}
- **Detected Objects:** ${(d.detectedObjects || []).join(', ')}

---

## Executive Summary Abstract
${d.executiveSummary || d.summaryLead || d.executiveInsight?.summary || ''}
${diagramSection}${ocrSection}${evidenceSection}
---

${bodySections}
${keyFactsSection}${timelineSection}
---

## Concluding Synthesis
${d.conclusion || 'Empirical visual research assessment concluded successfully.'}

---

## Academic References & Sources (${systemPreferences.citationStyle || 'APA'})
${(Array.isArray(d.references) && d.references.length > 0)
  ? d.references.map((src, i) => {
      if (typeof src === 'object' && src !== null) {
        return `${i + 1}. **${src.title}** - *${src.source}* (${src.year || '2026'})${src.url ? ` - [Link](${src.url})` : ''}`;
      }
      return `${i + 1}. ${src}`;
    }).join('\n')
  : '1. InsightLens Visual Empirical Dataset (2026)'}

---

## Analytical Limitations & Scope
${d.limitations || 'Analysis is grounded in 2D optical evidence and historical domain documentation.'}
`;

  downloadBlob(md, `InsightLens_Research_Report_${Date.now()}.md`, 'text/markdown');
  saveAppMetrics({ markdownExportsCount: (getAppMetrics().markdownExportsCount || 0) + 1 });
  logUserActivity('markdown', `Markdown Exported: ${activeReportData?.title || 'Research Brief'}`);
  recordExportMetricToBackend('markdown');
  showToast('Downloaded Markdown research brief (.md)', 'success');
}

export function exportJSONFile() {
  const activeReportData = getActiveReportData();
  if (!activeReportData) return;
  const jsonStr = JSON.stringify(activeReportData, null, 2);
  downloadBlob(jsonStr, `InsightLens_Report_${Date.now()}.json`, 'application/json');
  showToast('Exported JSON data file (.json)', 'success');
}

export function exportCleanPDF() {
  const activeReportData = getActiveReportData();
  if (!activeReportData) {
    showToast('No active report available to export.', 'warning');
    return;
  }

  const paperCanvas = document.getElementById('paper-canvas');
  if (!paperCanvas) {
    showToast('Report canvas element not found on page.', 'error');
    return;
  }

  showToast('Opening print dialog for PDF export...', 'info');

  const d = activeReportData;
  const cleanSubject = (d.subject || 'Visual Artifact').replace(/^(Research Analysis of|Visual Analysis of|Analysis of)\s+/i, '');

  saveAppMetrics({ pdfExportsCount: (getAppMetrics().pdfExportsCount || 0) + 1 });
  logUserActivity('pdf', `PDF Export Triggered: ${cleanSubject}`);
  recordExportMetricToBackend('pdf');

  window.print();
}

export function downloadBlob(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
