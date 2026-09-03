// Document Export Services (PDF, Markdown, JSON) - Report 2.0 Architecture

import { getActiveReportData, getSystemPreferences } from '../state.js';
import { saveAppMetrics, logUserActivity, getAppMetrics } from '../services/storage.js';
import { showToast } from './toast.js';
import { API_BASE, getAuthHeaders } from './api.js';
import { normalizeReport } from '../services/reportNormalizer.js';

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
  if (!activeReportData) {
    showToast('No active report available to export.', 'warning');
    return;
  }

  const report = normalizeReport(activeReportData);

  // 1. Visual Structure Section based on Visual Type
  let structureMd = '';
  const s = report.visualStructure;
  if (s.type === 'diagram') {
    const nodesList = (s.nodes || []).map(n => `- **${n.label}**${n.type && n.type !== 'unknown' ? ` \`(${n.type})\`` : ''}`).join('\n') || '- No explicit nodes detected.';
    const nodeMap = new Map((s.nodes || []).map(n => [n.id, n.label]));
    const edgesList = (s.edges || []).map(e => {
      const src = nodeMap.get(e.source) || e.source;
      const tgt = nodeMap.get(e.target) || e.target;
      return `- ${src} → ${tgt}${e.label ? ` \`[${e.label}]\`` : ''}`;
    }).join('\n') || '- No directed connections detected.';

    structureMd = `**Archetype:** ${(s.diagramType || 'diagram').toUpperCase()}\n**Nodes Extracted:** ${(s.nodes || []).length}\n**Connections:** ${(s.edges || []).length}\n\n### Nodes\n${nodesList}\n\n### Directed Connections\n${edgesList}`;
  } else if (s.type === 'chart') {
    structureMd = `**Chart Type:** ${s.chartType}\n**Axes:** ${s.axes}\n**Observable Trends:** ${s.trends}`;
  } else if (s.type === 'document') {
    structureMd = `**Document Archetype:** ${s.docType}\n\n### Extracted Text (OCR)\n\`\`\`\n${s.ocrText}\n\`\`\``;
  } else if (s.type === 'screenshot') {
    structureMd = `**Interface Context:** ${s.interfaceContext}\n**Interactive UI Elements:** ${(s.uiElements || []).join(', ')}`;
  } else if (s.type === 'map') {
    structureMd = `**Map Classification:** ${s.mapType}\n**Geographic Elements:** ${Array.isArray(s.geographicElements) ? s.geographicElements.join(', ') : s.geographicElements}`;
  } else {
    structureMd = `**Subject Framing:** ${s.subject}\n**Composition:** ${s.composition}\n**Illumination:** ${s.lighting}\n**Environment:** ${s.environment}`;
  }

  // 2. Observations Grouped by Category
  const obsByCategory = {};
  for (const obs of report.observations) {
    const cat = obs.category || 'General';
    if (!obsByCategory[cat]) obsByCategory[cat] = [];
    obsByCategory[cat].push(obs.statement);
  }
  const observationsMd = Object.keys(obsByCategory).length > 0
    ? Object.entries(obsByCategory).map(([cat, list]) => `### ${cat}\n${list.map(item => `- ${item}`).join('\n')}`).join('\n\n')
    : '- Observable surface features recorded with standard optical parameters.';

  // 3. Evidence Status Badges
  const evidenceMd = report.visualEvidence.map(ev => `- [${ev.status.toUpperCase()}] ${ev.statement}`).join('\n') || '- Visual inspection recorded directly from optical sensors.';

  // 4. Interpretations
  const interpretationsMd = (report.interpretations || []).map(item => `- **${item.statement}**\n  *Visual Basis:* ${item.basis}`).join('\n\n') || '- Interpretations aligned directly with observable evidence.';

  // 5. Findings
  const findingsMd = (report.findings || []).map(f => `- **${f.statement}**\n  *Derivation:* ${f.basis}`).join('\n\n') || '- Focal subject resolved with high structural definition.';

  // 6. Limitations
  const limitationsMd = (report.limitations || []).map(lim => `- ${lim}`).join('\n') || '- Standard 2D visual extraction boundaries apply.';

  // 7. Sources
  const sourcesMd = report.sources.length > 0
    ? report.sources.map((src, i) => `${i + 1}. **${src.title}** — *${src.source}* (${src.year || 'n.d.'})${src.url ? ` <${src.url}>` : ''}`).join('\n')
    : 'No external third-party citations required or verified for this visual artifact. Findings are derived strictly from direct visual examination.';

  // 8. Markdown Document Assembly (Strict Report 2.0 Hierarchy)
  const md = `# InsightLens — Visual Intelligence Report

**Title:** ${report.title}  
**Subject:** ${report.subject}  
**Category:** ${report.category}  
**Report ID:** ${report.id}  
**Timestamp:** ${report.technicalMetadata.timestamp}  

---

## Executive Insight

${report.executiveInsight.summary}

### Core Critical Finding
> ${report.executiveInsight.keyFinding}

### Key Takeaways
${(report.executiveInsight.keyTakeaways || []).map(t => `- ${t}`).join('\n')}

---

## Visual Evidence

${evidenceMd}

---

## Visual Structure

${structureMd}

---

## Key Observations

${observationsMd}

---

## Interpretation

${interpretationsMd}

---

## Findings

${findingsMd}

---

## Limitations & Uncertainty

${limitationsMd}

---

## Sources & Verification

${sourcesMd}

---

## Technical Metadata

- **Visual Classification:** ${report.technicalMetadata.visualType.toUpperCase()}
- **Specialized Pipeline:** ${report.technicalMetadata.specializedPipeline}
- **AI Model Engine:** ${report.technicalMetadata.modelUsed}
- **Provider:** ${report.technicalMetadata.aiProvider}
- **Processing Latency:** ${(report.technicalMetadata.processingTimeMs / 1000).toFixed(1)}s
- **Confidence Score:** ${report.technicalMetadata.confidenceScore}
- **Validation Status:** ${report.technicalMetadata.validationStatus}
- **Report Schema:** Version ${report.technicalMetadata.reportVersion}
`;

  const filename = `InsightLens_Intelligence_Report_${Date.now()}.md`;
  downloadBlob(md, filename, 'text/markdown');
  saveAppMetrics({ markdownExportsCount: (getAppMetrics().markdownExportsCount || 0) + 1 });
  logUserActivity('markdown', `Markdown Exported: ${report.title}`);
  recordExportMetricToBackend('markdown');
  showToast('Downloaded Report 2.0 Markdown brief (.md)', 'success');
}

export function exportJSONFile() {
  const activeReportData = getActiveReportData();
  if (!activeReportData) {
    showToast('No active report available to export.', 'warning');
    return;
  }
  const report = normalizeReport(activeReportData);
  const jsonStr = JSON.stringify(report, null, 2);
  downloadBlob(jsonStr, `InsightLens_Report_${Date.now()}.json`, 'application/json');
  showToast('Exported Report 2.0 JSON data (.json)', 'success');
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

  const report = normalizeReport(activeReportData);
  const cleanSubject = report.subject || 'Visual Artifact';

  saveAppMetrics({ pdfExportsCount: (getAppMetrics().pdfExportsCount || 0) + 1 });
  logUserActivity('pdf', `PDF Export Triggered: ${cleanSubject}`);
  recordExportMetricToBackend('pdf');

  showToast('Preparing standalone print report for PDF generation...', 'info');

  // Set descriptive document title for the PDF file name
  const originalTitle = document.title;
  document.title = `InsightLens - ${report.title} (Visual Intelligence Report)`;

  // Trigger browser print dialog with dedicated @media print stylesheet
  setTimeout(() => {
    window.print();
    // Restore title after dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }, 150);
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
