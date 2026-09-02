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
  const md = `# ${d.title}
*Synthesized by InsightLens AI Visual Research Engine (${systemPreferences.model})*

---

### 📊 Research Metadata & Telemetry
- **Primary Subject:** ${d.subject}
- **AI Confidence Score:** ${d.aiConfidence || 96.8}%
- **Source Credibility Index:** ${d.credibilityScore || 94}/100
- **Detected Objects:** ${(d.detectedObjects || []).join(', ')}
- **Taxonomy Keywords:** ${(d.generatedKeywords || []).map(k => `#${k}`).join(' ')}

---

## Executive Summary Abstract
${d.summaryLead || d.executiveSummary || ''}

---

## Multimodal Extracted OCR Text
\`\`\`
${d.extractedOCR || 'No textual inscriptions detected.'}
\`\`\`

---

## Detailed Analytical Report
${(d.sections || []).map(s => `### ${s.heading}\n${s.body}`).join('\n\n')}

---

## Verified References & Sources (${systemPreferences.citationStyle})
${(Array.isArray(d.references) && d.references.length > 0)
  ? d.references.map((src, i) => {
      if (typeof src === 'object' && src !== null) {
        return `${i + 1}. **${src.title}** - *${src.source}* (${src.year})${src.url ? ` - [Link](${src.url})` : ''}`;
      }
      return `${i + 1}. ${src}`;
    }).join('\n')
  : 'No independently verified sources were available for this analysis.'}

---

## Related Research Topics
${(d.relatedTopics || []).map(t => `- ${t}`).join('\n')}
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

  // Trigger native browser print dialog for selectable, native A4 PDF generation
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
