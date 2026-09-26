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

    let issuesText = '';
    if (Array.isArray(s.structuralIssues) && s.structuralIssues.length > 0) {
      issuesText = '\n### Structural Observations\n' + s.structuralIssues.map(issue => `- ${issue}`).join('\n') + '\n';
    }

    diagramSection = `\n---\n\n## Visual Structure & Topology\n\nDiagram Type: ${(s.diagramType || 'diagram').replace(/_/g, ' ').toUpperCase()}\n\n### Nodes\n${nodesList || '- No explicit nodes detected.'}\n\n### Connections\n${edgesList || '- No explicit connections detected.'}\n${issuesText}`;
  }

  let chartSection = '';
  if (d.visualType === 'chart' && d.chartStructure) {
    const cs = d.chartStructure;
    const xAxisStr = cs.xAxis?.label ? `${cs.xAxis.label}${cs.xAxis.unit ? ` (${cs.xAxis.unit})` : ''}` : 'Categories';
    const yAxisStr = cs.yAxis?.label ? `${cs.yAxis.label}${cs.yAxis.unit ? ` (${cs.yAxis.unit})` : ''}` : 'Values';

    let dataPointsTable = '';
    if (Array.isArray(cs.dataPoints) && cs.dataPoints.length > 0) {
      const rows = cs.dataPoints.map(dp => `| ${dp.label || 'Point'} | ${dp.formattedValue || dp.value || 'N/A'} | ${dp.series || 'Primary'} | ${dp.certainty || 'observed'} |`).join('\n');
      dataPointsTable = `\n### Extracted Quantitative Data Points\n| Category / X | Value / Y | Series | Certainty |\n|---|---|---|---|\n${rows}\n`;
    }

    let trendsList = '';
    if (Array.isArray(cs.trends) && cs.trends.length > 0) {
      trendsList = '\n### Analytical Trends\n' + cs.trends.map(t => `- **${(t.direction || 'Trend').toUpperCase()}:** ${t.description || ''}`).join('\n') + '\n';
    }

    let obsList = '';
    if (Array.isArray(cs.observations) && cs.observations.length > 0) {
      obsList = '\n### Key Quantitative Observations\n' + cs.observations.map(o => `- ${o}`).join('\n') + '\n';
    }

    chartSection = `\n---\n\n## Quantitative Chart & Data Structure\n\n- **Chart Type:** ${(cs.chartType || 'chart').replace(/_/g, ' ').toUpperCase()}\n- **X-Axis (Independent):** ${xAxisStr}\n- **Y-Axis (Dependent):** ${yAxisStr}\n${dataPointsTable}${trendsList}${obsList}`;
  }

  let claimsSection = '';
  if (Array.isArray(d.claims) && d.claims.length > 0) {
    const claimsRows = d.claims.map((item, idx) => {
      return `### Claim ${idx + 1}: ${item.statement}\n- **Status:** ${item.status || 'UNDETERMINABLE'}\n- **Grounding Evidence:** ${item.evidence || 'N/A'}\n- **Source:** ${item.source || 'Visual Optical Frame'}\n- **Analytical Reasoning:** ${item.reasoning || 'N/A'}\n`;
    }).join('\n');
    claimsSection = `\n---\n\n## Extracted Empirical Claims\n*Traceable empirical claims ledger with source grounding and verification status.*\n\n${claimsRows}`;
  } else if (Array.isArray(d.evidenceLedger) && d.evidenceLedger.length > 0) {
    const claimsRows = d.evidenceLedger.map((item, idx) => {
      const typeLabel = (item.evidenceType || 'claim').replace(/_/g, ' ').toUpperCase();
      const statusLabel = (item.supportStatus || 'uncertain').replace(/_/g, ' ').toUpperCase();
      const source = item.sourceUrl ? `[${item.sourceTitle || 'Source'}](${item.sourceUrl})` : (item.sourceTitle || 'Visual Observation');
      return `### Claim ${idx + 1}: ${item.claim}\n- **Type:** ${typeLabel}\n- **Support Status:** ${statusLabel}\n- **Grounding Evidence:** ${item.evidence || 'N/A'}\n- **Analytical Reasoning:** ${item.reasoning || 'N/A'}\n- **Citation / Reference:** ${source}\n`;
    }).join('\n');
    claimsSection = `\n---\n\n## Evidence Intelligence Workbench\n*Traceable empirical claims ledger with source grounding and verification status.*\n\n${claimsRows}`;
  }

  const isDemo = d.isDemo || d.isSample || String(d.id || '').startsWith('DEMO-');
  const demoBanner = isDemo ? `> **NOTICE:** SAMPLE DEMONSTRATION — NOT A LIVE AI ANALYSIS. This document is an offline demonstration fixture.\n\n` : '';

  const isBio = Boolean((d.category && (d.category.toLowerCase().includes('animal') || d.category.toLowerCase().includes('zoology') || d.category.toLowerCase().includes('botany') || d.category.toLowerCase().includes('plant') || d.category.toLowerCase().includes('ornithology'))) && d.scientificName && !d.scientificName.includes('Target'));
  const speciesLine = isBio ? `- **Taxonomic Species:** ${d.scientificName}\n` : '';
  const classificationLine = `- **Domain Classification:** ${d.domainClassification || d.classification || d.category || 'Empirical Visual Analysis'}`;

  const md = `# ${d.title || d.subject || 'Visual Research Brief'}
*Synthesized by InsightLens AI Visual Research Engine (${d.modelUsed || d.actualModel || systemPreferences.model || 'Gemini'})*

${demoBanner}---

### 📊 Research Metadata & Telemetry
- **Report ID:** ${d.id || 'N/A'}
- **Visual Classification:** ${(d.visualType || 'photograph').toUpperCase()}
- **Specialized Pipeline:** ${d.specializedPipeline || 'Photo Analysis Pipeline'}
- **Primary Subject:** ${d.subject || 'Visual Artifact'}
${speciesLine}${classificationLine}
- **Domain Category:** ${d.category || 'Visual Science'}
- **Evidence Status:** ${d.evidenceStatus || 'Calibrated'}
- **Validation Status:** ${d.validationStatus || 'Schema Validated'}
- **Detected Objects:** ${(d.detectedObjects || []).join(', ') || 'Visual Target'}

---

## Executive Summary Abstract
${d.executiveSummary || d.summaryLead || d.executiveInsight?.summary || ''}
${diagramSection}${chartSection}${ocrSection}${claimsSection}
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
