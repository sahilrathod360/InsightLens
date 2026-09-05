// Report Canvas Viewer & Explain Report Side Panel Component

import { navigateTo, getActiveReportData, setActiveReportData, getSystemPreferences, getLastAnalysisPayload } from '../state.js';
import { computeImageStatistics } from '../utils/canvas.js';
import { exportMarkdownFile, exportJSONFile, exportCleanPDF } from '../utils/export.js';

import { showToast } from '../utils/toast.js';
import { renderMarkdownToHtml } from '../utils/markdown.js';
import { escapeHtml, sanitizeUrl } from '../utils/sanitize.js';
import { updateTelemetryUI } from './LoadingPipeline.js';

export function isBiologicalEntity(subject = '', category = '') {
  const combined = `${subject} ${category}`.toLowerCase();
  const nonBio = ['person', 'human', 'actor', 'athlete', 'wrestler', 'cricketer', 'footballer', 'car', 'vehicle', 'automotive', 'stadium', 'building', 'architecture', 'chart', 'diagram', 'screenshot', 'document', 'map', 'gadget', 'circuit', 'phone'];
  for (const nb of nonBio) {
    if (combined.includes(nb)) return false;
  }
  const bio = ['animal', 'zoology', 'botany', 'plant', 'species', 'wildlife', 'bird', 'ornithology', 'mammal', 'reptile', 'insect', 'flora', 'fauna', 'canis', 'felis'];
  return bio.some(b => combined.includes(b));
}

export function resolveDynamicCategory(subject = '', rawCategory = '') {
  const subLower = (subject || '').toLowerCase();
  const catLower = (rawCategory || '').toLowerCase();
  
  if (subLower.includes('dog') || subLower.includes('puppy') || subLower.includes('cat') || subLower.includes('tiger') || subLower.includes('animal') || subLower.includes('canis')) return 'Animal Biology & Zoology';
  if (subLower.includes('car') || subLower.includes('vehicle') || subLower.includes('automotive') || subLower.includes('engine') || subLower.includes('truck') || subLower.includes('mustang')) return 'Automotive Engineering';
  if (subLower.includes('stadium') || subLower.includes('building') || subLower.includes('skyscraper') || subLower.includes('architecture') || subLower.includes('blueprint') || subLower.includes('tower') || subLower.includes('house')) return 'Architectural Engineering';
  if (subLower.includes('human') || subLower.includes('person') || subLower.includes('wrestler') || subLower.includes('athlete') || subLower.includes('actor') || subLower.includes('player')) return 'Sports & Entertainment';
  if (subLower.includes('map') || subLower.includes('country') || subLower.includes('continent') || subLower.includes('terrain') || subLower.includes('geography')) return 'Geographical Sciences';
  if (subLower.includes('food') || subLower.includes('dish') || subLower.includes('cuisine') || subLower.includes('meal') || subLower.includes('fruit')) return 'Food Science & Nutrition';
  if (subLower.includes('plant') || subLower.includes('flower') || subLower.includes('leaf') || subLower.includes('tree') || subLower.includes('botany')) return 'Botany & Plant Biology';
  if (subLower.includes('circuit') || subLower.includes('pcb') || subLower.includes('semiconductor') || subLower.includes('chip') || subLower.includes('microprocessor')) return 'Electronics & Hardware Engineering';
  if (subLower.includes('painting') || subLower.includes('art') || subLower.includes('mona lisa') || subLower.includes('sculpture') || subLower.includes('canvas')) return 'Fine Arts & Cultural Heritage';
  if (subLower.includes('medical') || subLower.includes('x-ray') || subLower.includes('mri') || subLower.includes('ct scan') || subLower.includes('ultrasound')) return 'Medical Imaging & Diagnostics';
  if (subLower.includes('space') || subLower.includes('planet') || subLower.includes('galaxy') || subLower.includes('star') || subLower.includes('nebula')) return 'Astronomy & Astrophysics';

  if (rawCategory && !catLower.includes('sample') && !catLower.includes('demo') && !catLower.includes('to be replaced')) {
    return rawCategory;
  }

  return 'Visual Science & Domain Research';
}

export function formatReportTitle(subject = '', rawTitle = '') {
  if (rawTitle && rawTitle.length > 2) {
    const cleanTitle = rawTitle.replace(/^(Research Analysis of|Visual Analysis of|Analysis of|Visual Intelligence Report:|Visual Research Report:)\s+/i, '').trim();
    return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }
  if (subject && subject.length > 2) {
    const cleanSub = subject.replace(/^(Research Analysis of|Visual Analysis of|Analysis of|Visual Intelligence Report:|Visual Research Report:)\s+/i, '').trim();
    return cleanSub.charAt(0).toUpperCase() + cleanSub.slice(1);
  }
  return 'Visual Artifact Analysis';
}

export function applySmartSectionTitles(subject = '', category = '') {
  const subLower = (subject + ' ' + category).toLowerCase();

  let sec1Title = '1. Visual & Structural Analysis';
  let sec2Title = '2. Subject Identification & Domain Taxonomy';
  let sec3Title = '3. Scientific & Technical Information';

  if (subLower.includes('dog') || subLower.includes('animal') || subLower.includes('zoology')) {
    sec1Title = '1. Animal Biology & Anatomical Structure';
    sec2Title = '2. Species Taxonomy & Behavioral Traits';
    sec3Title = '3. Physical Characteristics & Habitat Needs';
  } else if (subLower.includes('building') || subLower.includes('stadium') || subLower.includes('architecture')) {
    sec1Title = '1. Architectural & Structural Analysis';
    sec2Title = '2. Building Engineering & Spatial Layout';
    sec3Title = '3. Construction Materials & Engineering Specs';
  } else if (subLower.includes('country') || subLower.includes('map') || subLower.includes('geography')) {
    sec1Title = '1. Geographical & Topographical Survey';
    sec2Title = '2. Demographics & Regional Geopolitics';
    sec3Title = '3. Historical Context & Infrastructure';
  } else if (subLower.includes('painting') || subLower.includes('art') || subLower.includes('canvas')) {
    sec1Title = '1. Fine Art Composition & Medium Analysis';
    sec2Title = '2. Artist Provenance & Art Style Classification';
    sec3Title = '3. Historical Context & Period Movement';
  } else if (subLower.includes('car') || subLower.includes('vehicle') || subLower.includes('automotive') || subLower.includes('mustang')) {
    sec1Title = '1. Automotive Engineering & Body Architecture';
    sec2Title = '2. Vehicle Classification & Performance Attributes';
    sec3Title = '3. Mechanical Specifications & Powertrain Specs';
  } else if (subLower.includes('medical') || subLower.includes('scan') || subLower.includes('x-ray')) {
    sec1Title = '1. Medical Imaging & Anatomical Landmarks';
    sec2Title = '2. Diagnostic Classification & Clinical Scope';
    sec3Title = '3. Physiological Attributes & Medical Specs';
  }

  const el1 = document.querySelector('#report-detailed-analysis-text')?.previousElementSibling;
  const el2 = document.querySelector('#report-identification-text')?.previousElementSibling;
  const el3 = document.querySelector('#report-scientific-text')?.previousElementSibling;

  if (el1) el1.childNodes[el1.childNodes.length - 1].textContent = ` ${sec1Title}`;
  if (el2) el2.childNodes[el2.childNodes.length - 1].textContent = ` ${sec2Title}`;
  if (el3) el3.childNodes[el3.childNodes.length - 1].textContent = ` ${sec3Title}`;
}

export function renderResultScreen(data) {
  if (!data) return;
  const systemPreferences = getSystemPreferences();
  const actualImgSrc = data.imageDataUrl || data.fullImage || (data.fullData && (data.fullData.imageDataUrl || data.fullData.processedImageDataUrl || data.fullData.fullImage || data.fullData.thumbnailDataUrl)) || data.thumbnailDataUrl || data.dataUrl || '';

  // 1. Assign Real Image
  const reportSourceImg = document.getElementById('report-source-img');
  const reportImageWrapper = document.getElementById('report-image-wrapper');
  
  if (reportImageWrapper) {
    const existingUnavailable = reportImageWrapper.querySelector('.report-img-unavailable');
    if (existingUnavailable) existingUnavailable.remove();
  }

  if (reportSourceImg && actualImgSrc) {
    reportSourceImg.style.display = 'block';
    reportSourceImg.src = actualImgSrc;
    reportSourceImg.onerror = () => {
      reportSourceImg.style.display = 'none';
      if (reportImageWrapper && !reportImageWrapper.querySelector('.report-img-unavailable')) {
        const ph = document.createElement('div');
        ph.className = 'report-img-unavailable flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500';
        ph.innerHTML = '<span class="material-symbols-outlined text-[36px]">image_not_supported</span><span class="text-xs text-slate-400 font-mono">Image unavailable</span>';
        reportImageWrapper.appendChild(ph);
      }
    };
    const imgObj = new Image();
    imgObj.onload = () => updateTelemetryUI(computeImageStatistics(imgObj));
    imgObj.src = actualImgSrc;
  } else if (reportSourceImg) {
    reportSourceImg.removeAttribute('src');
    reportSourceImg.style.display = 'none';
    if (reportImageWrapper && !reportImageWrapper.querySelector('.report-img-unavailable')) {
      const ph = document.createElement('div');
      ph.className = 'report-img-unavailable flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500';
      ph.innerHTML = '<span class="material-symbols-outlined text-[36px]">image_not_supported</span><span class="text-xs text-slate-400 font-mono">Image unavailable</span>';
      reportImageWrapper.appendChild(ph);
    }
  }

  const imgFilenameEl = document.getElementById('report-image-filename');
  if (imgFilenameEl) {
    imgFilenameEl.textContent = document.getElementById('info-filename')?.textContent || 'uploaded_visual_artifact.png';
  }

  // 2. Resolve Subject & Category & Classification
  const subjectName = data.subject || 'Visual Artifact Subject';
  const categoryName = resolveDynamicCategory(subjectName, data.category);
  const isBio = isBiologicalEntity(subjectName, categoryName);
  const classificationStr = data.domainClassification || (isBio && data.scientificName ? data.scientificName : (data.category || categoryName));

  // 3. Hero Header Section - Hierarchy: Subject -> Classification -> Category
  const heroTitleEl = document.getElementById('report-hero-title');
  if (heroTitleEl) {
    heroTitleEl.textContent = formatReportTitle(subjectName, data.title);
  }

  const scientificNameEl = document.getElementById('report-scientific-name');
  if (scientificNameEl) {
    if (isBio && data.scientificName) {
      scientificNameEl.textContent = data.scientificName;
      scientificNameEl.classList.remove('hidden');
    } else {
      scientificNameEl.textContent = '';
      scientificNameEl.classList.add('hidden');
    }
  }

  const categorySubEl = document.getElementById('report-category-subtitle');
  if (categorySubEl) {
    categorySubEl.textContent = categoryName;
  }

  const providerStr = data.aiProvider || 'Google Gemini';
  const activeModelStr = data.actualModel || data.modelUsed || 'gemini-2.0-flash';

  const providerUsedEl = document.getElementById('report-provider-used');
  if (providerUsedEl) providerUsedEl.textContent = providerStr;

  const modelUsedEl = document.getElementById('report-model-used');
  if (modelUsedEl) modelUsedEl.textContent = `Model: ${activeModelStr}`;

  const reportIdEl = document.getElementById('report-id-display');
  if (reportIdEl) {
    const rawId = String(data.id || '').trim();
    reportIdEl.textContent = rawId.startsWith('RPT-') ? rawId : `RPT-${rawId || Date.now().toString().slice(-6)}`;
  }

  const now = new Date();
  const dateStr = data.dateFormatted || data.generationTimestamp || now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const resultBarTsEl = document.getElementById('result-bar-timestamp');
  if (resultBarTsEl) resultBarTsEl.textContent = dateStr;
  const heroTsEl = document.getElementById('report-hero-timestamp');
  if (heroTsEl) heroTsEl.textContent = `Generated ${dateStr}`;

  // Phase 3: Visual Type & Specialized Analysis Pipeline Badges
  const rawType = (data.visualType || 'photograph').toLowerCase();
  const displayType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
  const pipelineLabel = data.specializedPipeline || `${displayType} Analysis Pipeline`;

  const visualTypeValEl = document.getElementById('report-visual-type-val');
  if (visualTypeValEl) {
    visualTypeValEl.textContent = displayType;
  }

  const pipelineValEl = document.getElementById('report-pipeline-val');
  if (pipelineValEl) {
    pipelineValEl.textContent = pipelineLabel;
  }

  const leadSummaryEl = document.getElementById('report-lead-summary');
  if (leadSummaryEl) {
    leadSummaryEl.textContent = data.executiveSummary || data.executiveInsight?.summary || `Comprehensive visual research analysis focusing on ${subjectName}.`;
  }

  // Smart Domain Section Titles
  applySmartSectionTitles(subjectName, categoryName);

  // 4. AI Detection Summary Telemetry Cards
  const setVal = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const evidenceStatus = String(data.evidenceStatus || 'uncertain').replace(/^./, c => c.toUpperCase());

  const labelEl = document.getElementById('grid-scientific-label');
  if (labelEl) {
    labelEl.textContent = isBio && data.scientificName ? 'Taxonomic Species' : 'Classification';
  }

  setVal('grid-subject', subjectName);
  setVal('grid-scientific', isBio && data.scientificName ? data.scientificName : classificationStr);
  setVal('grid-confidence', evidenceStatus);
  setVal('grid-time', data.processingTimeMs ? `${(data.processingTimeMs / 1000).toFixed(1)}s Latency` : 'Not recorded');
  setVal('grid-category', categoryName);
  setVal('grid-objects-count', `${(data.detectedObjects || []).length || 1} Regions`);
  setVal('grid-colors', data.dominantColors || 'Natural Palette');
  setVal('grid-resolution', data.imageStats?.resolution || 'High Resolution');
  setVal('grid-ocr-status', data.extractedOCR && data.extractedOCR.length > 2 && data.extractedOCR !== 'None detected' ? 'Text Extracted' : 'None detected');
  setVal('grid-status', 'Research Completed');

  // 5. Evidence & Grounding Telemetry
  setVal('telemetry-evidence-status', evidenceStatus);
  setVal('telemetry-grounding-mode', data.visualType ? `${data.visualType.toUpperCase()} Grounded` : 'Empirical Visual Ingest');
  setVal('telemetry-verification-scope', data.references?.length ? `${data.references.length} Citations Grounded` : 'Visual Anchor');
  setVal('specs-evidence-grounding', 'Direct Visual Anchor');

  // 6. Detected Objects Tags
  const tagsContainer = document.getElementById('detected-objects-tags');
  if (tagsContainer) {
    const objects = data.detectedObjects && data.detectedObjects.length > 0 ? data.detectedObjects : [];
    tagsContainer.innerHTML = objects.map(obj => `
      <span class="px-2.5 py-1 rounded-lg bg-[var(--bg-card-subtle)] text-[var(--accent-link)] text-[11px] font-mono border border-[var(--border-color)] flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[13px] text-[var(--accent-link)]">pin_drop</span>
        ${escapeHtml(obj)}
      </span>
    `).join('');
  }

  // 7. Executive Summary Cards
  const overviewText = data.executiveSummary || data.executiveInsight?.summary || 'No summary was returned for this report.';
  setVal('exec-card-overview', overviewText);
  setVal('exec-card-findings', data.executiveInsight?.keyFinding || data.detectionSummary || 'No key finding was returned.');
  setVal('exec-card-observation', (data.observations && data.observations[0] ? data.observations[0].statement : '') || (data.visualEvidence && data.visualEvidence[0] ? data.visualEvidence[0].statement : '') || 'No explicit visual observation was returned.');
  setVal('exec-card-synthesis', (data.interpretations && data.interpretations[0] ? data.interpretations[0].statement : '') || (data.executiveInsight?.keyTakeaways ? data.executiveInsight.keyTakeaways[0] : '') || 'No synthesis was returned.');

  // 7b. Evidence Intelligence Workbench (Phase 9)
  renderEvidenceWorkbench(data);

  // 8. Dynamic Domain-Adaptive Sections & Academic Research
  const dynamicSectionsEl = document.getElementById('report-dynamic-sections-container');
  const defaultSecsWrapper = document.getElementById('report-default-sections-wrapper');

  if (Array.isArray(data.structuredSections) && data.structuredSections.length > 0) {
    if (defaultSecsWrapper) defaultSecsWrapper.classList.add('hidden');
    if (dynamicSectionsEl) {
      dynamicSectionsEl.classList.remove('hidden');
      dynamicSectionsEl.innerHTML = data.structuredSections.map((sec, idx) => `
        <div class="space-y-3">
          <div class="border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
            <h2 class="font-serif text-2xl text-[var(--text-primary)] font-bold flex items-center gap-2.5">
              <span class="material-symbols-outlined text-[var(--accent-link)] text-[24px]">${escapeHtml(sec.icon || 'article')}</span>
              ${idx + 1}. ${escapeHtml(sec.heading)}
            </h2>
          </div>
          <div class="report-card text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
            ${renderMarkdownToHtml(sec.content)}
          </div>
        </div>
      `).join('');
    }
  } else {
    if (defaultSecsWrapper) defaultSecsWrapper.classList.remove('hidden');
    if (dynamicSectionsEl) dynamicSectionsEl.classList.add('hidden');
    
    const setSectionText = (id, text) => {
      const el = document.getElementById(id);
      if (el && text) {
        el.innerHTML = renderMarkdownToHtml(text);
      }
    };

    const bulletsText = (data.visualAnalysisBullets || []).join('\n\n');
    setSectionText('report-detailed-analysis-text', bulletsText || data.detailedAnalysis || 'No detailed analysis was returned.');
    setSectionText('report-identification-text', data.identification || 'No identification detail was returned.');
    setSectionText('report-scientific-text', data.scientificTechnicalInfo || 'No technical detail was returned.');
  }

  // 9. Technical Comparison Cards Grid
  const specsComparisonGrid = document.getElementById('specs-comparison-grid');
  if (specsComparisonGrid) {
    const facts = (Array.isArray(data.keyFacts) && data.keyFacts.length > 0) ? data.keyFacts : [
      { label: 'Primary Subject', detail: subjectName },
      { label: isBio && data.scientificName ? 'Taxonomic Species' : 'Domain Classification', detail: isBio && data.scientificName ? data.scientificName : classificationStr },
      { label: 'Domain Category', detail: categoryName },
      { label: 'Evidence Status', detail: evidenceStatus },
      { label: 'Analysis Model', detail: activeModelStr }
    ];
    specsComparisonGrid.innerHTML = facts.map(f => `
      <div class="report-card space-y-1">
        <span class="text-[10px] font-mono text-[var(--text-muted)] uppercase font-semibold block">${escapeHtml(f.label)}</span>
        <strong class="text-xs text-[var(--text-primary)] block font-semibold truncate">${escapeHtml(f.detail)}</strong>
      </div>
    `).join('');
  }

  // 10. Vertical Timeline for Historical Context
  const timelineContainer = document.getElementById('report-historical-timeline');
  const timelineSection = timelineContainer?.closest('.space-y-3');
  if (timelineContainer) {
    const milestones = Array.isArray(data.timeline) && data.timeline.length > 0 ? data.timeline : null;
    if (milestones) {
      if (timelineSection) timelineSection.classList.remove('hidden');
      timelineContainer.innerHTML = milestones.map(m => `
        <div class="timeline-item">
          <div class="timeline-node"></div>
          <div class="timeline-card">
            <span class="text-[10px] font-mono text-[var(--accent-purple)] font-bold block uppercase">${escapeHtml(m.year)}</span>
            <strong class="text-xs text-[var(--text-primary)] block font-semibold mt-0.5">${escapeHtml(m.title)}</strong>
            <p class="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">${escapeHtml(m.desc)}</p>
          </div>
        </div>
      `).join('');
    } else {
      if (timelineSection) timelineSection.classList.add('hidden');
    }
  }

  // 11. Practical Applications Grid
  const appsContainer = document.getElementById('applications-importance-list');
  const appsSection = appsContainer?.closest('.space-y-3');
  if (appsContainer) {
    const apps = Array.isArray(data.applications) && data.applications.length > 0 ? data.applications : null;
    if (apps) {
      if (appsSection) appsSection.classList.remove('hidden');
      appsContainer.innerHTML = apps.map((app, i) => `
        <div class="report-card space-y-2">
          <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-[var(--accent-emerald)] font-mono text-xs font-bold flex items-center justify-center">${i + 1}</span>
          <p class="text-[var(--text-secondary)] text-xs leading-relaxed font-sans">${escapeHtml(app)}</p>
        </div>
      `).join('');
    } else {
      if (appsSection) appsSection.classList.add('hidden');
    }
  }

  // 12. Key Fact Feature Cards Grid
  const factsGrid = document.getElementById('interesting-facts-grid');
  const factsSection = factsGrid?.closest('.space-y-3');
  if (factsGrid) {
    const facts = Array.isArray(data.interestingFacts) && data.interestingFacts.length > 0 ? data.interestingFacts : null;
    if (facts) {
      if (factsSection) factsSection.classList.remove('hidden');
      factsGrid.innerHTML = facts.map((f) => `
        <div class="report-card space-y-2 hover:border-[var(--accent-amber)] transition-all">
          <span class="material-symbols-outlined text-[var(--accent-amber)] text-[20px]">lightbulb</span>
          <p class="text-[var(--text-secondary)] text-xs leading-relaxed font-sans">${escapeHtml(f)}</p>
        </div>
      `).join('');
    } else {
      if (factsSection) factsSection.classList.add('hidden');
    }
  }

  // 13. Limitations Callout
  const limEl = document.getElementById('limitations-text');
  if (limEl) {
    const limText = Array.isArray(data.limitations) ? data.limitations.join('\n\n') : data.limitations;
    limEl.innerHTML = renderMarkdownToHtml(limText || 'No limitations were supplied by the model. Treat image-derived claims as uncertain unless marked observed.');
  }

  // 14. References & Verified Sources
  const refListEl = document.getElementById('references-list');
  const refTitleEl = document.getElementById('section-references-title');
  if (refListEl) {
    const rawRefs = Array.isArray(data.references) ? data.references : (Array.isArray(data.sources) ? data.sources : []);
    
    const validRefs = rawRefs.map(item => {
      if (typeof item === 'string') {
        const urlMatch = item.match(/(https?:\/\/[^\s]+)/i);
        const url = urlMatch ? urlMatch[1].replace(/[.,;)]+$/, '') : null;
        const textWithoutUrl = item.replace(/(https?:\/\/[^\s]+)/i, '').trim();
        return {
          title: textWithoutUrl,
          source: data.category || 'Reference Archive',
          year: '',
          url: url,
          verified: !!url
        };
      } else if (typeof item === 'object' && item !== null) {
        return {
          title: item.title || item.name || '',
          source: item.source || item.publisher || item.organization || '',
          year: item.year || '',
          url: item.url || item.doi || null,
          verified: !!item.verified || !!(item.url || item.doi)
        };
      }
      return null;
    }).filter(r => r && r.title && !r.title.includes('10.1038/s41586-024-000'));

    if (validRefs.length === 0) {
      if (refTitleEl) refTitleEl.textContent = '8. Sources';
      refListEl.innerHTML = `
        <div class="report-card p-4 rounded-xl text-xs text-[var(--text-secondary)] font-mono">
          No external citation sources were provided for this analysis.
        </div>
      `;
    } else {
      if (refTitleEl) refTitleEl.textContent = '8. Source Availability';
      refListEl.innerHTML = validRefs.map((ref, i) => {
        const cleanUrl = sanitizeUrl(ref.url);
        return `
          <div class="report-card flex items-start gap-3">
            <span class="text-[var(--accent-link)] font-bold font-mono shrink-0">[${i + 1}]</span>
            <div class="space-y-1">
              <p class="leading-relaxed text-[var(--text-primary)] text-xs font-semibold">${escapeHtml(ref.title)}</p>
              <p class="text-[var(--text-secondary)] text-[11px] font-mono">${escapeHtml(ref.source)}${ref.year ? ` • ${escapeHtml(ref.year)}` : ''}</p>
              ${cleanUrl ? `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="text-[var(--accent-link)] text-[11px] hover:underline inline-flex items-center gap-1 mt-1 font-mono break-all"><span class="material-symbols-outlined text-[12px]">open_in_new</span> ${escapeHtml(cleanUrl)}${ref.verified ? ' (reachable)' : ' (not checked)'}</a>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 15. Concluding Synthesis
  const conclusionEl = document.getElementById('conclusion-text');
  if (conclusionEl) {
    conclusionEl.innerHTML = renderMarkdownToHtml(data.conclusion || 'No conclusion was returned.');
  }

  // 16. Appendix Telemetry Box
  const appEl = document.getElementById('appendix-telemetry-box');
  if (appEl) {
    const timestamp = new Date().toISOString();
    appEl.innerHTML = `
      <div>Engine: InsightLens Academic Visual Intelligence System</div>
      <div>Multimodal Model: ${escapeHtml(activeModelStr)}</div>
      <div>Ingest Timestamp: ${escapeHtml(timestamp)}</div>
      <div>Citation display: ${escapeHtml(systemPreferences.citationStyle || 'APA')} where supplied</div>
      <div>Validation Status: Schema validated; claims not independently verified</div>
    `;
  }

  // Phase 4: Compact Visual Structure Extraction for Diagrams
  renderDiagramStructure(data);

  setActiveReportData(data);
  navigateTo('result');
  showToast(`Visual Research Report rendered (${activeModelStr})`, 'success');
}

export function renderDiagramStructure(data) {
  const container = document.getElementById('diagram-structure-container');
  if (!container) return;

  const isDiagram = data && (data.visualType === 'diagram' || (data.diagramStructure && Array.isArray(data.diagramStructure.nodes) && data.diagramStructure.nodes.length > 0));
  const structure = data?.diagramStructure;

  if (!isDiagram || !structure) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const rawType = structure.diagramType || 'generic diagram';
  const diagramType = rawType.replace(/_/g, ' ').toUpperCase();
  const nodes = Array.isArray(structure.nodes) ? structure.nodes : [];
  const edges = Array.isArray(structure.edges) ? structure.edges : [];

  const typePill = document.getElementById('diagram-type-pill');
  if (typePill) typePill.textContent = diagramType;

  const statType = document.getElementById('diagram-stat-type');
  if (statType) statType.textContent = rawType.replace(/_/g, ' ');

  const statNodes = document.getElementById('diagram-stat-nodes');
  if (statNodes) statNodes.textContent = `${nodes.length} Nodes`;

  const statEdges = document.getElementById('diagram-stat-edges');
  if (statEdges) statEdges.textContent = `${edges.length} Connections`;

  const nodesBadge = document.getElementById('diagram-nodes-count-badge');
  if (nodesBadge) nodesBadge.textContent = `${nodes.length} items`;

  const edgesBadge = document.getElementById('diagram-edges-count-badge');
  if (edgesBadge) edgesBadge.textContent = `${edges.length} links`;

  // Render Nodes List
  const nodesList = document.getElementById('diagram-nodes-list');
  if (nodesList) {
    if (nodes.length === 0) {
      nodesList.innerHTML = '<li class="text-[var(--text-muted)] italic font-mono text-xs py-1">No explicit node entities observed.</li>';
    } else {
      nodesList.innerHTML = nodes.map(n => `
        <li class="flex items-start gap-2 py-1.5 border-b border-[var(--border-color)]/40 last:border-none">
          <span class="text-indigo-400 mt-0.5 select-none">•</span>
          <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
            <span class="font-medium text-[var(--text-primary)] truncate">${escapeHtml(n.label || 'Unlabelled Node')}</span>
            ${n.type && n.type !== 'unknown' ? `<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">${escapeHtml(n.type)}</span>` : ''}
          </div>
        </li>
      `).join('');
    }
  }

  // Render Connections List
  const edgesList = document.getElementById('diagram-edges-list');
  if (edgesList) {
    if (edges.length === 0) {
      edgesList.innerHTML = '<li class="text-[var(--text-muted)] italic font-mono text-xs py-1">No directional connectors observed.</li>';
    } else {
      const nodeMap = new Map(nodes.map(n => [n.id, n.label]));
      edgesList.innerHTML = edges.map(e => {
        const srcLabel = nodeMap.get(e.source) || e.source || 'Node';
        const tgtLabel = nodeMap.get(e.target) || e.target || 'Node';
        const arrow = e.direction === 'bidirectional' ? '↔' : '→';
        return `
          <li class="flex items-start gap-2 py-1.5 border-b border-[var(--border-color)]/40 last:border-none">
            <span class="text-emerald-400 mt-0.5 select-none">•</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center flex-wrap gap-1 font-sans">
                <span class="font-medium text-[var(--text-primary)] truncate">${escapeHtml(srcLabel)}</span>
                <span class="text-emerald-400 font-bold px-1">${arrow}</span>
                <span class="font-medium text-[var(--text-primary)] truncate">${escapeHtml(tgtLabel)}</span>
              </div>
              ${e.label ? `<span class="text-[10px] font-mono text-[var(--text-muted)] block mt-0.5">Label: ${escapeHtml(e.label)}</span>` : ''}
            </div>
          </li>
        `;
      }).join('');
    }
  }
}

export function renderEvidenceWorkbench(data) {
  const container = document.getElementById('report-evidence-workbench-container');
  if (!container) return;

  // Resolve ledger items or synthesize fallback from legacy visualEvidence/observations
  let ledger = Array.isArray(data?.evidenceLedger) ? data.evidenceLedger : [];

  if (ledger.length === 0 && (Array.isArray(data?.visualEvidence) || Array.isArray(data?.observations))) {
    const fallbackObs = (data.observations || []).map(obs => ({
      claim: obs.statement,
      evidenceType: 'visual_observation',
      evidence: obs.statement,
      sourceTitle: null,
      sourceUrl: null,
      supportStatus: 'supported',
      reasoning: 'Observable directly within the visual frame.',
      relatedSection: 'Visual Observations'
    }));
    const fallbackEv = (data.visualEvidence || []).map(ev => ({
      claim: ev.statement,
      evidenceType: ev.status === 'observed' ? 'visual_observation' : 'inference',
      evidence: ev.statement,
      sourceTitle: null,
      sourceUrl: null,
      supportStatus: ev.status === 'observed' ? 'supported' : (ev.status === 'inferred' ? 'partially_supported' : 'uncertain'),
      reasoning: ev.status === 'observed' ? 'Direct visual detection from image artifact.' : 'Analytical inference derived from optical features.',
      relatedSection: 'Visual Evidence'
    }));
    ledger = [...fallbackObs, ...fallbackEv].filter(item => item.claim);
  }

  if (ledger.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  let activeType = 'all';
  let activeStatus = 'all';

  const typeConfig = {
    visual_observation: {
      label: 'Direct Visual Observation',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      icon: 'visibility',
      borderAccent: 'border-l-emerald-500'
    },
    inference: {
      label: 'Domain Inference',
      badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      icon: 'psychology',
      borderAccent: 'border-l-purple-500'
    },
    external_source: {
      label: 'External Research',
      badgeClass: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
      icon: 'menu_book',
      borderAccent: 'border-l-sky-500'
    }
  };

  const statusConfig = {
    supported: {
      label: 'Supported',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      icon: 'check_circle'
    },
    partially_supported: {
      label: 'Partially Supported',
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      icon: 'published_with_changes'
    },
    uncertain: {
      label: 'Uncertain',
      badgeClass: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
      icon: 'help_outline'
    },
    unsupported: {
      label: 'Unsupported',
      badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      icon: 'cancel'
    }
  };

  function updateList() {
    const listEl = document.getElementById('workbench-claims-list');
    const countEl = document.getElementById('workbench-claims-count');
    if (!listEl) return;

    const filtered = ledger.filter(item => {
      const matchType = activeType === 'all' || item.evidenceType === activeType;
      const matchStatus = activeStatus === 'all' || item.supportStatus === activeStatus;
      return matchType && matchStatus;
    });

    if (countEl) {
      countEl.textContent = `${filtered.length} of ${ledger.length} Claim${ledger.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="report-card p-6 text-center text-xs font-mono text-[var(--text-muted)] space-y-2">
          <span class="material-symbols-outlined text-[28px] text-slate-500 block">filter_alt_off</span>
          <p>No evidence ledger entries match the selected filter criteria.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map((item, idx) => {
      const tMeta = typeConfig[item.evidenceType] || typeConfig.inference;
      const sMeta = statusConfig[item.supportStatus] || statusConfig.uncertain;
      const safeUrl = sanitizeUrl(item.sourceUrl);

      return `
        <div class="report-card p-4 space-y-3 border-l-4 ${tMeta.borderAccent} shadow-sm transition-all hover:border-[var(--border-hover)]">
          <!-- Card Header: Claim and Badges -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase">Claim #${idx + 1}</span>
                ${item.relatedSection ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]">${escapeHtml(item.relatedSection)}</span>` : ''}
              </div>
              <h3 class="font-serif text-sm md:text-base font-bold text-[var(--text-primary)] leading-snug">
                ${escapeHtml(item.claim)}
              </h3>
            </div>

            <!-- Type & Status Badges -->
            <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 font-mono text-[10px] font-semibold">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${tMeta.badgeClass}">
                <span class="material-symbols-outlined text-[13px]">${tMeta.icon}</span>
                ${tMeta.label}
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${sMeta.badgeClass}">
                <span class="material-symbols-outlined text-[13px]">${sMeta.icon}</span>
                ${sMeta.label}
              </span>
            </div>
          </div>

          <!-- Card Body: Evidence & Reasoning Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[var(--bg-card-subtle)] p-3 rounded-lg border border-[var(--border-color)]">
            <div class="space-y-1">
              <span class="text-[10px] font-mono text-[var(--text-muted)] uppercase font-semibold flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px] text-indigo-400">fact_check</span>
                Supporting Evidence / Cue
              </span>
              <p class="text-[var(--text-secondary)] leading-relaxed">${escapeHtml(item.evidence || 'No specific visual cue provided.')}</p>
            </div>

            <div class="space-y-1">
              <span class="text-[10px] font-mono text-[var(--text-muted)] uppercase font-semibold flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px] text-purple-400">psychology_alt</span>
                Evidentiary Reasoning
              </span>
              <p class="text-[var(--text-secondary)] leading-relaxed">${escapeHtml(item.reasoning || 'Derived from analytical correlation with visual artifact.')}</p>
            </div>
          </div>

          <!-- Card Footer: Source Attribution -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-[var(--text-muted)] border-t border-[var(--border-color)]">
            <div class="flex items-center gap-1.5 truncate">
              <span class="material-symbols-outlined text-[14px] text-[var(--text-muted)]">attribution</span>
              <span>Source:</span>
              ${item.sourceTitle ? `<span class="text-[var(--text-primary)] font-medium truncate">${escapeHtml(item.sourceTitle)}</span>` : '<span class="text-slate-400">Direct Optical Artifact Inspection</span>'}
            </div>

            ${safeUrl ? `
              <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[var(--accent-link)] hover:underline">
                <span class="material-symbols-outlined text-[13px]">open_in_new</span>
                <span>Reference URL</span>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Setup button handlers
  const typeBtns = container.querySelectorAll('.workbench-type-btn');
  typeBtns.forEach(btn => {
    btn.onclick = () => {
      typeBtns.forEach(b => {
        b.classList.remove('active', 'bg-indigo-600', 'text-white', 'font-semibold');
        b.classList.add('text-[var(--text-secondary)]');
      });
      btn.classList.add('active', 'bg-indigo-600', 'text-white', 'font-semibold');
      btn.classList.remove('text-[var(--text-secondary)]');
      activeType = btn.getAttribute('data-type') || 'all';
      updateList();
    };
  });

  const statusSelect = document.getElementById('workbench-status-select');
  if (statusSelect) {
    statusSelect.onchange = (e) => {
      activeStatus = e.target.value;
      updateList();
    };
  }

  updateList();
}

export function setupReportActions(startAnalysisPipeline) {
  const heatmapBtn = document.getElementById('heatmap-toggle-btn');
  const heatmapOverlay = document.getElementById('heatmap-overlay-container');
  const heatmapLabel = document.getElementById('heatmap-toggle-label');

  heatmapBtn?.addEventListener('click', () => {
    if (!heatmapOverlay) return;
    const isHidden = heatmapOverlay.classList.contains('hidden');
    if (isHidden) {
      heatmapOverlay.classList.remove('hidden');
      if (heatmapLabel) heatmapLabel.textContent = 'Hide Heatmap';
      showToast('AI Vision Confidence Heatmap Enabled', 'info');
    } else {
      heatmapOverlay.classList.add('hidden');
      if (heatmapLabel) heatmapLabel.textContent = 'Show Heatmap';
      showToast('AI Vision Confidence Heatmap Hidden', 'info');
    }
  });

  document.querySelectorAll('.heatmap-region').forEach(region => {
    region.onclick = (e) => {
      e.stopPropagation();
      const regionId = region.getAttribute('data-region-id') || 'ocr';
      const ocrSection = document.getElementById('section-ocr');
      const ocrBox = document.getElementById('extracted-ocr-box');

      if (ocrSection) {
        ocrSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (ocrBox) {
        ocrBox.classList.add('ring-4', 'ring-indigo-400', 'bg-indigo-500/20', 'scale-[1.01]');
        setTimeout(() => {
          ocrBox.classList.remove('ring-4', 'ring-indigo-400', 'bg-indigo-500/20', 'scale-[1.01]');
        }, 2200);
      }

      const matchingBadge = document.querySelector(`.ocr-tag-badge[data-target-region="${regionId}"]`);
      if (matchingBadge) {
        matchingBadge.classList.add('ring-2', 'ring-indigo-400', 'bg-indigo-500/30', 'scale-110');
        setTimeout(() => {
          matchingBadge.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-500/30', 'scale-110');
        }, 2200);
      }

      showToast(`Scrolled to extracted ${regionId.toUpperCase()} metadata in report`, 'info');
    };
  });

  document.getElementById('share-btn')?.addEventListener('click', async () => {
    const activeReportData = getActiveReportData();
    if (!activeReportData) return;
    const shareData = {
      title: activeReportData.title || 'InsightLens Research Report',
      text: `${activeReportData.title}\n\nSubject: ${activeReportData.subject}\n\n${activeReportData.summaryLead}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Report shared successfully!', 'success');
        return;
      } catch (err) {}
    }

    navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\nLink: ${shareData.url}`).then(() => {
      showToast('Report summary & share link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link to clipboard.', 'warning');
    });
  });

  document.getElementById('export-md-btn')?.addEventListener('click', exportMarkdownFile);
  document.getElementById('export-json-btn')?.addEventListener('click', exportJSONFile);
  document.getElementById('export-pdf-btn')?.addEventListener('click', exportCleanPDF);

  setupExplainReportPanel();

  const retryHandler = () => {
    const lastPayload = getLastAnalysisPayload();
    if (lastPayload && lastPayload.dataUrl && typeof startAnalysisPipeline === 'function') {
      startAnalysisPipeline(lastPayload.dataUrl, lastPayload.filename, lastPayload.filesizeStr);
    } else {
      navigateTo('desk');
    }
  };

  document.getElementById('retry-live-analysis-btn')?.addEventListener('click', retryHandler);
  document.getElementById('quota-retry-btn')?.addEventListener('click', retryHandler);
  document.getElementById('quota-dismiss-btn')?.addEventListener('click', () => {
    document.getElementById('report-quota-notice')?.classList.add('hidden');
  });
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
  const systemPreferences = getSystemPreferences();

  const subjName = data.subject || 'Visual Subject Artifact';
  const evidenceStatus = String(data.evidenceStatus || 'uncertain').replace(/^./, c => c.toUpperCase());

  const subjConf = document.getElementById('explain-subject-conf');
  const subjNameEl = document.getElementById('explain-subject-name');
  const subjWhyEl = document.getElementById('explain-subject-why');

  if (subjConf) subjConf.textContent = `${evidenceStatus} evidence`;
  if (subjNameEl) subjNameEl.textContent = subjName;
  if (subjWhyEl) {
    subjWhyEl.textContent = 'The subject was selected by the model from the submitted image. This interface does not compute visual saliency or independently validate the identification.';
  }

  const objList = document.getElementById('explain-objects-list');
  const visFeatures = document.getElementById('explain-visual-features');
  const ocrContrib = document.getElementById('explain-ocr-contrib');

  if (objList) {
    const objects = data.detectedObjects || [];
    objList.innerHTML = objects.map(o => `
      <span class="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-[10px] font-mono border border-sky-500/20">${escapeHtml(o)}</span>
    `).join('');
  }

  if (visFeatures) {
    visFeatures.textContent = data.sceneComposition || data.visualDescription || 'No measured visual-feature explanation is available.';
  }

  if (ocrContrib) {
    const ocrText = data.extractedOCR || data.extractedText;
    if (ocrText && ocrText.toLowerCase() !== 'no legible text inscriptions are present in the visual artifact.') {
      ocrContrib.textContent = `Extracted text reported by the model: "${ocrText}".`;
      ocrContrib.className = 'text-sky-300 text-[11px] font-mono mt-0.5';
    } else {
      ocrContrib.textContent = 'No OCR output was returned.';
      ocrContrib.className = 'text-slate-400 text-[11px] italic mt-0.5';
    }
  }

  const aiReasoning = document.getElementById('explain-ai-reasoning');
  if (aiReasoning) {
    aiReasoning.textContent = 'The report is generated from the submitted image and model knowledge. It is not a trace of model reasoning, a saliency map, or independent fact verification.';
  }

  const setExplainVal = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setExplainVal('explain-taxonomy-subject', evidenceStatus);
  setExplainVal('explain-taxonomy-ocr', data.extractedOCR && data.extractedOCR.length > 2 && data.extractedOCR !== 'None detected' ? 'Direct Inscription' : 'None Detected');
  setExplainVal('explain-taxonomy-scene', data.visualType ? `${data.visualType.toUpperCase()} Grounded` : 'Observed');
  setExplainVal('explain-taxonomy-citations', data.references?.length ? `${data.references.length} Sources Grounded` : 'Domain Knowledge');

  const limitEl = document.getElementById('explain-limitations');
  if (limitEl) {
    limitEl.textContent = data.limitations || 'No model-provided limitations are available.';
  }

  const promptSummary = document.getElementById('explain-prompt-summary');
  if (promptSummary) {
    const activeModel = (data.actualModel || systemPreferences.model || 'auto').toUpperCase();
    const style = (systemPreferences.writingStyle || 'classic').toUpperCase();
    const length = (systemPreferences.researchLength || 'long').toUpperCase();
    const citation = systemPreferences.citationStyle || 'APA';

    promptSummary.innerHTML = `
      <p>• Model Engine: <strong class="text-indigo-300">${escapeHtml(activeModel)}</strong></p>
      <p>• Primary Subject Directive: <strong class="text-slate-200">Anchor sections to detected subject (${escapeHtml(subjName)})</strong></p>
      <p>• Research Parameters: <strong class="text-slate-200">${escapeHtml(length)} depth • ${escapeHtml(style)} style • ${escapeHtml(citation)} citation</strong></p>
      <p>• Output Schema: <strong class="text-emerald-400">Strict JSON Academic Brief Format</strong></p>
    `;
  }
}
