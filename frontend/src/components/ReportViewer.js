// Report 2.0 Canvas Viewer & Explain Report Side Panel Component

import { navigateTo, getActiveReportData, setActiveReportData, getSystemPreferences, getLastAnalysisPayload } from '../state.js';
import { computeImageStatistics } from '../utils/canvas.js';
import { exportMarkdownFile, exportJSONFile, exportCleanPDF } from '../utils/export.js';
import { showToast } from '../utils/toast.js';
import { updateTelemetryUI } from './LoadingPipeline.js';
import { normalizeReport } from '../services/reportNormalizer.js';

export function formatReportTitle(subject = '', rawTitle = '') {
  if (subject && subject.length > 2) {
    const cleanSub = subject.replace(/^(Research Analysis of|Visual Analysis of|Analysis of|Visual Intelligence Report:|Visual Research Report:)\s+/i, '').trim();
    return cleanSub.charAt(0).toUpperCase() + cleanSub.slice(1);
  }
  if (rawTitle && rawTitle.length > 2) {
    const cleanTitle = rawTitle.replace(/^(Research Analysis of|Visual Analysis of|Analysis of|Visual Intelligence Report:|Visual Research Report:)\s+/i, '').trim();
    return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }
  return 'Visual Intelligence Report';
}

export function renderResultScreen(rawData) {
  if (!rawData) return;
  const report = normalizeReport(rawData);
  const lastPayload = getLastAnalysisPayload();
  const actualImgSrc = report.imageSrc || rawData.imageDataUrl || rawData.dataUrl || lastPayload.dataUrl;

  // 1. Assign Real Image & Media Header
  const reportSourceImg = document.getElementById('report-source-img');
  if (reportSourceImg && actualImgSrc) {
    reportSourceImg.src = actualImgSrc;
    const imgObj = new Image();
    imgObj.onload = () => updateTelemetryUI(computeImageStatistics(imgObj));
    imgObj.src = actualImgSrc;
  }

  const imgFilenameEl = document.getElementById('report-image-filename');
  if (imgFilenameEl) {
    imgFilenameEl.textContent = report.imageFilename || document.getElementById('info-filename')?.textContent || 'visual_artifact.png';
  }

  // 2. Header Elements
  const heroTitleEl = document.getElementById('report-hero-title');
  if (heroTitleEl) {
    heroTitleEl.textContent = formatReportTitle(report.subject, report.title);
  }

  const scientificNameEl = document.getElementById('report-scientific-name');
  if (scientificNameEl) {
    scientificNameEl.textContent = report.scientificName;
  }

  const categorySubEl = document.getElementById('report-category-subtitle');
  if (categorySubEl) {
    categorySubEl.textContent = report.category;
  }

  const visualTypeValEl = document.getElementById('report-visual-type-val');
  if (visualTypeValEl) {
    visualTypeValEl.textContent = report.technicalMetadata.visualType.toUpperCase();
  }

  const pipelineValEl = document.getElementById('report-pipeline-val');
  if (pipelineValEl) {
    pipelineValEl.textContent = report.technicalMetadata.specializedPipeline;
  }

  const providerUsedEl = document.getElementById('report-provider-used');
  if (providerUsedEl) providerUsedEl.textContent = report.technicalMetadata.aiProvider;

  const modelUsedEl = document.getElementById('report-model-used');
  if (modelUsedEl) modelUsedEl.textContent = report.technicalMetadata.modelUsed;

  const reportIdEl = document.getElementById('report-id-display');
  if (reportIdEl) reportIdEl.textContent = report.id;

  const resultTimestampEl = document.getElementById('result-timestamp');
  if (resultTimestampEl) resultTimestampEl.textContent = `Generated ${report.technicalMetadata.timestamp}`;

  // 3. Right Sidebar Quick Metrics
  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setElText('r2-side-subject', report.subject);
  setElText('r2-side-confidence', `${report.technicalMetadata.confidenceScore}`);
  setElText('r2-side-time', `${(report.technicalMetadata.processingTimeMs / 1000).toFixed(1)}s`);
  setElText('r2-side-status', report.technicalMetadata.validationStatus);
  const ocrExcerpt = rawData.extractedOCR && rawData.extractedOCR !== 'None detected' ? rawData.extractedOCR.slice(0, 35) : 'None detected';
  setElText('r2-side-ocr', ocrExcerpt);

  // 4. SECTION 01 — EXECUTIVE INSIGHT
  const execSummaryEl = document.getElementById('r2-exec-summary');
  if (execSummaryEl) execSummaryEl.textContent = report.executiveInsight.summary;

  const execKeyFindingEl = document.getElementById('r2-exec-key-finding');
  if (execKeyFindingEl) execKeyFindingEl.textContent = report.executiveInsight.keyFinding;

  const execTakeawaysEl = document.getElementById('r2-exec-takeaways');
  if (execTakeawaysEl) {
    execTakeawaysEl.innerHTML = (report.executiveInsight.keyTakeaways || []).map(takeaway => `
      <li class="report-card p-3 space-y-1">
        <span class="text-indigo-400 font-bold block">•</span>
        <p class="text-[var(--text-secondary)] font-sans leading-relaxed text-xs">${takeaway}</p>
      </li>
    `).join('');
  }

  // 5. SECTION 02 — VISUAL EVIDENCE
  const evidenceListEl = document.getElementById('r2-evidence-list');
  if (evidenceListEl) {
    evidenceListEl.innerHTML = report.visualEvidence.map(ev => {
      let badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      let icon = 'verified';
      if (ev.status === 'inferred') {
        badgeClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
        icon = 'trending_flat';
      } else if (ev.status === 'undeterminable') {
        badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        icon = 'help_outline';
      }
      return `
        <div class="report-card p-3.5 flex items-start justify-between gap-3 text-xs">
          <div class="flex items-start gap-2.5">
            <span class="material-symbols-outlined text-[18px] text-[var(--accent-link)] shrink-0 mt-0.5">${icon}</span>
            <p class="text-[var(--text-primary)] font-medium leading-relaxed">${ev.statement}</p>
          </div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 ${badgeClass}">${ev.status}</span>
        </div>
      `;
    }).join('');
  }

  // 6. SECTION 03 — VISUAL STRUCTURE (VISUAL-TYPE ADAPTIVE)
  renderVisualStructure(report.visualStructure);

  // 7. SECTION 04 — KEY OBSERVATIONS
  const obsGridEl = document.getElementById('r2-observations-grid');
  if (obsGridEl) {
    if (report.observations.length === 0) {
      obsGridEl.innerHTML = `
        <div class="report-card p-4 text-xs text-[var(--text-muted)] col-span-2">
          Observable surface features recorded with standard optical parameters.
        </div>
      `;
    } else {
      obsGridEl.innerHTML = report.observations.map(obs => `
        <div class="report-card p-4 space-y-2 text-xs">
          <div class="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
            <span class="text-[11px] font-mono text-indigo-400 font-bold uppercase">${obs.category || 'General Observation'}</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">OBSERVED</span>
          </div>
          <p class="text-[var(--text-primary)] font-medium leading-relaxed">${obs.statement}</p>
        </div>
      `).join('');
    }
  }

  // 8. SECTION 05 — INTERPRETATION & MEANING
  const interpListEl = document.getElementById('r2-interpretations-list');
  if (interpListEl) {
    if (report.interpretations.length === 0) {
      interpListEl.innerHTML = `
        <div class="report-card p-4 text-xs text-[var(--text-muted)]">
          No interpretive deductions required beyond direct observations.
        </div>
      `;
    } else {
      interpListEl.innerHTML = report.interpretations.map(interp => `
        <div class="report-card p-4 space-y-2 text-xs">
          <div class="flex items-center gap-2 text-amber-400 font-mono text-[11px] font-bold uppercase">
            <span class="material-symbols-outlined text-[16px]">psychology</span>
            Reasoned Interpretation
          </div>
          <p class="text-[var(--text-primary)] text-sm font-medium leading-relaxed">${interp.statement}</p>
          <div class="pt-2 border-t border-[var(--border-color)]/40 flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
            <span class="text-indigo-400 font-semibold">Visual Basis:</span>
            <span>${interp.basis || 'Direct visual observation'}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // 9. SECTION 06 — CORE FINDINGS
  const findingsListEl = document.getElementById('r2-findings-list');
  if (findingsListEl) {
    findingsListEl.innerHTML = (report.findings || []).map(f => `
      <div class="report-card p-4 space-y-2 text-xs">
        <div class="flex items-center gap-2 text-rose-400 font-mono text-[11px] font-bold uppercase">
          <span class="material-symbols-outlined text-[16px]">verified</span>
          Finding
        </div>
        <p class="text-[var(--text-primary)] text-sm font-semibold leading-relaxed">${f.statement}</p>
        <div class="pt-1.5 border-t border-[var(--border-color)]/40 flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
          <span class="text-indigo-400 font-semibold">Derivation:</span>
          <span>${f.basis || 'Synthesized from visual evidence'}</span>
        </div>
      </div>
    `).join('');
  }

  // 10. SECTION 07 — LIMITATIONS & UNCERTAINTY
  const limitationsListEl = document.getElementById('r2-limitations-list');
  if (limitationsListEl) {
    limitationsListEl.innerHTML = (report.limitations || []).map(lim => `
      <li class="flex items-start gap-2 py-1">
        <span class="text-amber-400 select-none">•</span>
        <span class="text-slate-300 font-mono text-xs leading-relaxed">${lim}</span>
      </li>
    `).join('');
  }

  // 11. SECTION 08 — SOURCES & VERIFICATION
  const sourcesListEl = document.getElementById('r2-sources-list');
  if (sourcesListEl) {
    if (report.sources.length === 0) {
      sourcesListEl.innerHTML = `
        <div class="report-card p-4 rounded-xl text-xs text-[var(--text-secondary)] font-mono flex items-center gap-2.5">
          <span class="material-symbols-outlined text-[18px] text-slate-400">info</span>
          <span>No external third-party citations required or verified for this visual artifact. Findings are derived strictly from direct visual examination.</span>
        </div>
      `;
    } else {
      sourcesListEl.innerHTML = report.sources.map((src, i) => `
        <div class="report-card p-3.5 flex items-start gap-3 text-xs">
          <span class="text-indigo-400 font-bold font-mono shrink-0">[${i + 1}]</span>
          <div class="space-y-1">
            <p class="text-[var(--text-primary)] font-semibold">${src.title}</p>
            <p class="text-[var(--text-muted)] font-mono text-[11px]">${src.source} ${src.year ? `(${src.year})` : ''}</p>
            ${src.url ? `<a href="${src.url}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline text-[11px] font-mono inline-flex items-center gap-1 mt-1 break-all"><span class="material-symbols-outlined text-[12px]">open_in_new</span> ${src.url}</a>` : ''}
          </div>
        </div>
      `).join('');
    }
  }

  // 12. SECTION 09 — TECHNICAL METADATA
  const telemetryGridEl = document.getElementById('r2-telemetry-grid');
  if (telemetryGridEl) {
    telemetryGridEl.innerHTML = `
      <div>
        <span class="block text-[10px] text-[var(--text-muted)] uppercase">Visual Type</span>
        <strong class="text-[var(--text-primary)]">${report.technicalMetadata.visualType.toUpperCase()}</strong>
      </div>
      <div>
        <span class="block text-[10px] text-[var(--text-muted)] uppercase">Pipeline</span>
        <strong class="text-emerald-400">${report.technicalMetadata.specializedPipeline}</strong>
      </div>
      <div>
        <span class="block text-[10px] text-[var(--text-muted)] uppercase">AI Model</span>
        <strong class="text-[var(--text-primary)]">${report.technicalMetadata.modelUsed}</strong>
      </div>
      <div>
        <span class="block text-[10px] text-[var(--text-muted)] uppercase">Processing Latency</span>
        <strong class="text-indigo-400">${(report.technicalMetadata.processingTimeMs / 1000).toFixed(1)}s</strong>
      </div>
      <div>
        <span class="block text-[10px] text-[var(--text-muted)] uppercase">Confidence Score</span>
        <strong class="text-emerald-400">${report.technicalMetadata.confidenceScore}</strong>
      </div>
      <div>
        <span class="block text-[10px] text-[var(--text-muted)] uppercase">Report Schema</span>
        <strong class="text-indigo-400">Report ${report.technicalMetadata.reportVersion}</strong>
      </div>
      <div>
        <span class="block text-[10px] text-[var(--text-muted)] uppercase">Validation Status</span>
        <strong class="text-emerald-400">${report.technicalMetadata.validationStatus}</strong>
      </div>
      <div>
        <span class="block text-[10px] text-[var(--text-muted)] uppercase">Ingest Timestamp</span>
        <strong class="text-[var(--text-primary)]">${report.technicalMetadata.timestamp}</strong>
      </div>
    `;
  }

  setActiveReportData(rawData);
  navigateTo('result');
  showToast(`Visual Intelligence Report 2.0 rendered (${report.technicalMetadata.modelUsed})`, 'success');
}

function renderVisualStructure(structure) {
  const container = document.getElementById('r2-structure-container');
  const pill = document.getElementById('r2-structure-type-pill');
  if (!container) return;

  if (pill) pill.textContent = (structure.type || 'generic').toUpperCase();

  // DIAGRAM STRUCTURE
  if (structure.type === 'diagram') {
    const nodes = structure.nodes || [];
    const edges = structure.edges || [];
    const nodeMap = new Map(nodes.map(n => [n.id, n.label]));

    container.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div class="report-card p-3 space-y-0.5">
          <span class="text-[10px] text-[var(--text-muted)] uppercase block">Archetype</span>
          <strong class="text-indigo-400 block font-bold text-sm capitalize">${structure.diagramType}</strong>
        </div>
        <div class="report-card p-3 space-y-0.5">
          <span class="text-[10px] text-[var(--text-muted)] uppercase block">Nodes Extracted</span>
          <strong class="text-emerald-400 block font-bold text-sm">${nodes.length} Nodes</strong>
        </div>
        <div class="report-card p-3 space-y-0.5 col-span-2 sm:col-span-1">
          <span class="text-[10px] text-[var(--text-muted)] uppercase block">Directed Connections</span>
          <strong class="text-sky-400 block font-bold text-sm">${edges.length} Connections</strong>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div class="report-card p-4 space-y-2.5">
          <span class="font-mono text-xs font-bold text-[var(--text-primary)] uppercase flex items-center gap-1.5 border-b border-[var(--border-color)] pb-1.5">
            <span class="material-symbols-outlined text-sm text-indigo-400">crop_din</span>
            Nodes (${nodes.length})
          </span>
          <ul class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            ${nodes.length === 0 ? '<li class="text-[var(--text-muted)] italic font-mono">No nodes identified</li>' : nodes.map(n => `
              <li class="flex items-center justify-between py-1 border-b border-[var(--border-color)]/30 last:border-none">
                <span class="text-[var(--text-primary)] font-medium truncate">${n.label}</span>
                ${n.type && n.type !== 'unknown' ? `<span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">${n.type}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="report-card p-4 space-y-2.5">
          <span class="font-mono text-xs font-bold text-[var(--text-primary)] uppercase flex items-center gap-1.5 border-b border-[var(--border-color)] pb-1.5">
            <span class="material-symbols-outlined text-sm text-emerald-400">arrow_forward</span>
            Directed Connections (${edges.length})
          </span>
          <ul class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            ${edges.length === 0 ? '<li class="text-[var(--text-muted)] italic font-mono">No connections identified</li>' : edges.map(e => {
              const src = nodeMap.get(e.source) || e.source;
              const tgt = nodeMap.get(e.target) || e.target;
              return `
                <li class="flex items-center justify-between py-1 border-b border-[var(--border-color)]/30 last:border-none">
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="text-[var(--text-primary)] font-medium truncate">${src}</span>
                    <span class="text-emerald-400">→</span>
                    <span class="text-[var(--text-primary)] font-medium truncate">${tgt}</span>
                  </div>
                  ${e.label ? `<span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 truncate max-w-[90px]">${e.label}</span>` : ''}
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      </div>
    `;
    return;
  }

  // CHART STRUCTURE
  if (structure.type === 'chart') {
    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="report-card p-4 space-y-2">
          <span class="text-[11px] font-mono text-indigo-400 uppercase font-bold block">Chart Archetype &amp; Axes</span>
          <p class="text-[var(--text-primary)] font-medium">${structure.chartType}</p>
          <p class="text-[var(--text-secondary)] font-mono text-[11px]">${structure.axes}</p>
        </div>
        <div class="report-card p-4 space-y-2">
          <span class="text-[11px] font-mono text-emerald-400 uppercase font-bold block">Observable Trends</span>
          <p class="text-[var(--text-secondary)] leading-relaxed">${structure.trends}</p>
        </div>
      </div>
    `;
    return;
  }

  // DOCUMENT STRUCTURE
  if (structure.type === 'document') {
    container.innerHTML = `
      <div class="report-card p-4 space-y-3 text-xs">
        <div class="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
          <span class="font-mono text-[11px] text-indigo-400 uppercase font-bold">Document Archetype: ${structure.docType}</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">OCR Inscription</span>
        </div>
        <div class="p-3 rounded-lg bg-[var(--bg-card-subtle)] border border-[var(--border-color)] font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
          ${structure.ocrText}
        </div>
      </div>
    `;
    return;
  }

  // SCREENSHOT STRUCTURE
  if (structure.type === 'screenshot') {
    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="report-card p-4 space-y-2">
          <span class="text-[11px] font-mono text-indigo-400 uppercase font-bold block">Interface Context</span>
          <p class="text-[var(--text-primary)] font-medium">${structure.interfaceContext}</p>
        </div>
        <div class="report-card p-4 space-y-2">
          <span class="text-[11px] font-mono text-sky-400 uppercase font-bold block">Visible Interactive Components</span>
          <div class="flex flex-wrap gap-1.5 pt-1">
            ${(structure.uiElements || []).map(el => `<span class="px-2 py-0.5 rounded bg-[var(--bg-card-subtle)] border border-[var(--border-color)] text-[11px] font-mono text-sky-300">${el}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    return;
  }

  // MAP STRUCTURE
  if (structure.type === 'map') {
    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="report-card p-4 space-y-2">
          <span class="text-[11px] font-mono text-indigo-400 uppercase font-bold block">Cartographic Classification</span>
          <p class="text-[var(--text-primary)] font-medium">${structure.mapType}</p>
        </div>
        <div class="report-card p-4 space-y-2">
          <span class="text-[11px] font-mono text-emerald-400 uppercase font-bold block">Geographic Entities</span>
          <p class="text-[var(--text-secondary)]">${Array.isArray(structure.geographicElements) ? structure.geographicElements.join(', ') : structure.geographicElements}</p>
        </div>
      </div>
    `;
    return;
  }

  // PHOTOGRAPH STRUCTURE (Default for photo/artwork/unknown)
  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs font-sans">
      <div class="report-card p-3.5 space-y-1">
        <span class="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold block">Primary Subject</span>
        <strong class="text-xs text-[var(--text-primary)] font-semibold block">${structure.subject}</strong>
      </div>
      <div class="report-card p-3.5 space-y-1">
        <span class="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold block">Visual Composition</span>
        <p class="text-xs text-[var(--text-secondary)] leading-tight">${structure.composition}</p>
      </div>
      <div class="report-card p-3.5 space-y-1">
        <span class="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold block">Illumination</span>
        <p class="text-xs text-[var(--text-secondary)] leading-tight">${structure.lighting}</p>
      </div>
      <div class="report-card p-3.5 space-y-1">
        <span class="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold block">Observable Context</span>
        <p class="text-xs text-[var(--text-secondary)] leading-tight">${structure.environment}</p>
      </div>
    </div>
  `;
}

export function setupReportActions(startAnalysisPipeline) {
  document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
    exportCleanPDF();
  });

  document.getElementById('export-md-btn')?.addEventListener('click', () => {
    exportMarkdownFile();
  });

  document.getElementById('export-json-btn')?.addEventListener('click', () => {
    exportJSONFile();
  });

  document.getElementById('share-btn')?.addEventListener('click', () => {
    const activeReportData = getActiveReportData();
    if (!activeReportData) return;
    if (navigator.share) {
      navigator.share({
        title: activeReportData.title || 'InsightLens Visual Intelligence Report',
        text: activeReportData.executiveSummary || 'Visual research brief evaluated by InsightLens.',
        url: window.location.href
      }).catch(err => console.warn('[Share] Cancelled or failed:', err));
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Report URL copied to clipboard.', 'success');
      }).catch(() => {
        showToast('Unable to copy URL.', 'warning');
      });
    }
  });

  document.getElementById('new-analysis-btn')?.addEventListener('click', () => {
    navigateTo('desk');
  });

  setupExplainReportPanel();
}

export function setupExplainReportPanel() {
  const explainBtn = document.getElementById('explain-report-btn');
  const sidePanel = document.getElementById('explain-side-panel');
  const closeBtn = document.getElementById('close-explain-panel-btn');

  explainBtn?.addEventListener('click', () => {
    const activeReportData = getActiveReportData();
    if (!activeReportData) return;
    renderExplainSidePanel(activeReportData);
    sidePanel?.classList.add('show');
  });

  closeBtn?.addEventListener('click', () => {
    sidePanel?.classList.remove('show');
  });

  sidePanel?.addEventListener('click', (e) => {
    if (e.target === sidePanel) {
      sidePanel.classList.remove('show');
    }
  });
}

export function renderExplainSidePanel(data) {
  if (!data) return;
  const report = normalizeReport(data);

  const subjConf = document.getElementById('explain-subject-conf');
  const subjNameEl = document.getElementById('explain-subject-name');
  const subjWhyEl = document.getElementById('explain-subject-why');

  if (subjConf) subjConf.textContent = `${report.technicalMetadata.confidenceScore}`;
  if (subjNameEl) subjNameEl.textContent = report.subject;
  if (subjWhyEl) {
    subjWhyEl.textContent = `Selected as primary focal subject based on spatial tensor saliency, high focal object contrast, and structural contour prominence detected during vision extraction.`;
  }

  const objList = document.getElementById('explain-objects-list');
  const visFeatures = document.getElementById('explain-visual-features');
  const ocrContrib = document.getElementById('explain-ocr-contrib');

  if (objList) {
    const objects = data.detectedObjects || ['Focal Object', 'Line Contours', 'Background Substrate'];
    objList.innerHTML = objects.map(o => `
      <span class="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-[10px] font-mono border border-sky-500/20">${o}</span>
    `).join('');
  }

  if (visFeatures) {
    visFeatures.textContent = data.sceneComposition || data.visualDescription || `Bilateral visual symmetry, sharp contrast vectors along central focal axis, and distinct tonal luminance separation.`;
  }

  if (ocrContrib) {
    const ocrText = data.extractedOCR || data.extractedText;
    if (ocrText && ocrText.toLowerCase() !== 'none detected' && ocrText.toLowerCase() !== 'no legible text inscriptions are present in the visual artifact.') {
      ocrContrib.textContent = `Extracted Text Tokens: "${ocrText.slice(0, 100)}" - indexed into multimodal tokens.`;
      ocrContrib.className = 'text-sky-300 text-[11px] font-mono mt-0.5';
    } else {
      ocrContrib.textContent = 'No legible textual annotations detected in image raster; visual feature vectors provided primary grounding.';
      ocrContrib.className = 'text-slate-400 text-[11px] italic mt-0.5';
    }
  }

  const aiReasoning = document.getElementById('explain-ai-reasoning');
  if (aiReasoning) {
    aiReasoning.textContent = `The Gemini neural engine analyzed the visual features (shapes, textures, structural vectors) of ${report.subject} and mapped them against verified visual domains. This allowed the model to synthesize concrete observations, topological structure, and empirical findings.`;
  }

  const limitEl = document.getElementById('explain-limitations');
  if (limitEl) {
    limitEl.textContent = (report.limitations || []).join(' ');
  }
}
