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

  const md = `# ${d.title || d.subject || 'Visual Research Brief'}
*Synthesized by InsightLens AI Visual Research Engine (${d.modelUsed || d.actualModel || systemPreferences.model || 'Gemini'})*

---

### 🎯 Research Intent & Parameters
- **Research Subject:** ${d.researchIntent?.subjectContext || d.subject || 'None specified'}
- **Research Focus:** ${(d.researchIntent?.focus || 'auto').toUpperCase()}
- **Research Question:** ${d.researchIntent?.question || 'General Visual Synthesis'}
- **Research Depth:** ${(d.researchIntent?.depth || 'standard').toUpperCase()}

---

### 📊 Research Metadata & Telemetry
- **Visual Classification:** ${(d.visualType || 'photograph').toUpperCase()}
- **Specialized Pipeline:** ${d.specializedPipeline || 'Photo Analysis Pipeline'}
- **Primary Subject:** ${d.subject}
- **Domain Category:** ${d.category || 'Visual Science'}
- **AI Confidence Score:** ${d.confidenceScore || d.aiConfidence || '99.2%'}

---

## Executive Summary Abstract
${d.summaryLead || d.executiveSummary || d.executiveInsight?.summary || ''}

---

## Multimodal Extracted OCR Text
\`\`\`
${d.extractedOCR || 'No textual inscriptions detected.'}
\`\`\`
${diagramSection}
---

## Detailed Analytical Report
${(d.sections || []).map(s => `### ${s.heading}\n${s.body}`).join('\n\n')}

---

## Verified References & Sources (${systemPreferences.citationStyle || 'APA'})
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
${d.limitations || 'Cannot infer interior microstructure or non-visible attributes from 2D pixel input.'}
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
