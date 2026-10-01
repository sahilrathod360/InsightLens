import { escapeHtml } from '../../utils/sanitize.js';
import { analyzeSpecificRegion } from '../../services/visualIntelligenceApi.js';
import { showToast } from '../../utils/toast.js';

let currentZoom = 1.0;

export function renderEvidenceViewer(containerId, { imageSrc, evidenceList = [], activeEvidenceId = null, onSelectEvidence = null }) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) return;

  const activeItem = evidenceList.find(e => e.id === activeEvidenceId) || evidenceList[0] || null;

  container.innerHTML = `
    <div class="evidence-viewer-wrapper flex flex-col lg:flex-row gap-6 p-4 rounded-2xl bg-surface-container/40 border border-white/5 animate-fade-in">
      <!-- Left: Visual Canvas & Overlays -->
      <div class="flex-1 flex flex-col space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-indigo-400 text-lg">crop_free</span>
            <h4 class="font-serif font-bold text-slate-200 text-sm">Interactive Region Explorer</h4>
          </div>
          
          <!-- Zoom Controls & Telemetry -->
          <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300">${evidenceList.length} regions</span>
            <div class="flex items-center bg-slate-900 border border-white/10 rounded-lg p-0.5">
              <button onclick="window.zoomEvidenceViewer(-0.2)" class="px-2 py-0.5 text-slate-400 hover:text-white cursor-pointer" title="Zoom Out">-</button>
              <span id="evidence-zoom-level" class="px-1.5 text-[10px] text-indigo-300">100%</span>
              <button onclick="window.zoomEvidenceViewer(0.2)" class="px-2 py-0.5 text-slate-400 hover:text-white cursor-pointer" title="Zoom In">+</button>
              <button onclick="window.resetEvidenceViewerZoom()" class="px-2 py-0.5 text-slate-400 hover:text-white text-[10px] border-l border-white/10 cursor-pointer">Reset</button>
            </div>
          </div>
        </div>

        <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-black/70 border border-white/10 flex items-center justify-center group" id="evidence-canvas-container">
          <div id="evidence-transform-container" class="relative w-full h-full flex items-center justify-center transition-transform duration-200" style="transform: scale(${currentZoom});">
            ${imageSrc ? `
              <img src="${escapeHtml(imageSrc)}" id="evidence-base-image" alt="Source Visual" class="w-full h-full object-contain pointer-events-none select-none" />
              <!-- Bounding Region Overlays -->
              <div id="evidence-overlays-layer" class="absolute inset-0 pointer-events-auto">
                ${evidenceList.map(ev => {
                  const coords = ev.coordinates || { x: 0.1, y: 0.1, width: 0.3, height: 0.2, normalized: true };
                  const isSelected = activeItem && activeItem.id === ev.id;
                  
                  let styleStr = '';
                  if (coords.normalized) {
                    styleStr = `left: ${coords.x * 100}%; top: ${coords.y * 100}%; width: ${coords.width * 100}%; height: ${coords.height * 100}%;`;
                  } else if (coords.pixelBounds) {
                    const pxLeft = (coords.x / coords.pixelBounds.imageWidth) * 100;
                    const pxTop = (coords.y / coords.pixelBounds.imageHeight) * 100;
                    const pxW = (coords.width / coords.pixelBounds.imageWidth) * 100;
                    const pxH = (coords.height / coords.pixelBounds.imageHeight) * 100;
                    styleStr = `left: ${pxLeft}%; top: ${pxTop}%; width: ${pxW}%; height: ${pxH}%;`;
                  } else {
                    styleStr = `left: ${(coords.x || 10)}%; top: ${(coords.y || 10)}%; width: ${(coords.width || 20)}%; height: ${(coords.height || 15)}%;`;
                  }

                  const statusColor = ev.status === 'OBSERVED' ? 'border-emerald-500 bg-emerald-500/15' :
                    (ev.status === 'CONTRADICTED' ? 'border-rose-500 bg-rose-500/15' :
                    (ev.status === 'UNDETERMINABLE' ? 'border-amber-500 bg-amber-500/15' : 'border-indigo-500 bg-indigo-500/15'));

                  return `
                    <div 
                      onclick="window.handleSelectEvidenceRegion('${escapeHtml(ev.id)}')"
                      title="${escapeHtml(ev.region || ev.label || '')}"
                      style="${styleStr}" 
                      class="absolute border-2 rounded-lg cursor-pointer transition-all duration-200 ${statusColor} ${isSelected ? 'ring-2 ring-white scale-[1.02] shadow-2xl z-30' : 'opacity-80 hover:opacity-100 z-10 hover:scale-[1.01]'}">
                      <span class="absolute -top-3 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900/90 border border-white/20 text-white shadow-sm pointer-events-none truncate max-w-[120px]">
                        ${escapeHtml(ev.region || ev.label || ev.id)}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="flex flex-col items-center justify-center text-slate-500 space-y-2 p-6 text-center">
                <span class="material-symbols-outlined text-4xl text-amber-400">image_not_supported</span>
                <span class="text-xs font-mono text-slate-300">Source visual image is unavailable for region overlay.</span>
                <p class="text-[11px] text-slate-500 font-sans max-w-xs">Source-linked bounding region overlays and region coordinates are strictly suppressed when the original image is unavailable.</p>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Right: Evidence Inspector Details -->
      <div class="w-full lg:w-84 flex flex-col space-y-4">
        <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono uppercase tracking-wider text-slate-400">Region Inspector</span>
            ${activeItem ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeItem.status === 'OBSERVED' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                (activeItem.status === 'CONTRADICTED' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' :
                (activeItem.status === 'UNDETERMINABLE' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'))
              }">
                ${escapeHtml(activeItem.status || 'OBSERVED')}
              </span>
            ` : ''}
          </div>

          ${activeItem ? `
            <div class="space-y-2">
              <h5 class="font-serif font-bold text-slate-100 text-sm">${escapeHtml(activeItem.region || activeItem.label || 'Selected Region')}</h5>
              <p class="text-xs text-slate-300 font-sans leading-relaxed">${escapeHtml(activeItem.explanation || 'Visual grounding region.')}</p>
            </div>

            <div class="pt-2 border-t border-white/5 space-y-1.5 text-[11px] font-mono text-slate-400">
              <div class="flex justify-between">
                <span>Evidence ID:</span>
                <span class="text-slate-200">${escapeHtml(activeItem.id)}</span>
              </div>
              <div class="flex justify-between">
                <span>Type:</span>
                <span class="text-indigo-300">${escapeHtml(activeItem.evidenceType || 'REGION')}</span>
              </div>
              <div class="flex justify-between">
                <span>Coordinates:</span>
                <span class="text-slate-300">[${activeItem.coordinates?.x?.toFixed?.(2) || activeItem.coordinates?.x || 0}, ${activeItem.coordinates?.y?.toFixed?.(2) || activeItem.coordinates?.y || 0}]</span>
              </div>
            </div>

            <!-- Focused Region Analysis Trigger -->
            <div class="pt-3 border-t border-white/5">
              <button onclick="window.handleAnalyzeSpecificRegion('${escapeHtml(activeItem.id)}')" class="w-full py-2 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 text-xs font-mono font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-sm">troubleshoot</span>
                Analyze Region Details
              </button>
              <div id="region-deep-analysis-output" class="hidden mt-3 p-3 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs"></div>
            </div>
          ` : `
            <p class="text-xs text-slate-500 font-mono py-4 text-center">Select an evidence region on the visual to inspect.</p>
          `}
        </div>

        <!-- Evidence List Quick Picker -->
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <span class="text-[10px] font-mono uppercase tracking-wider text-slate-500">All Visual Regions (${evidenceList.length})</span>
          ${evidenceList.map(ev => `
            <button 
              onclick="window.handleSelectEvidenceRegion('${escapeHtml(ev.id)}')"
              class="w-full p-2 rounded-lg text-left text-xs font-mono flex items-center justify-between border transition-all ${activeItem && activeItem.id === ev.id ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}">
              <span class="truncate max-w-[180px]">${escapeHtml(ev.region || ev.label || ev.id)}</span>
              <span class="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 ${ev.status === 'OBSERVED' ? 'text-emerald-400' : 'text-slate-400'}">${escapeHtml(ev.status)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Window helper bindings for interactive actions
  window.zoomEvidenceViewer = (delta) => {
    currentZoom = Math.max(0.6, Math.min(3.0, currentZoom + delta));
    const containerEl = document.getElementById('evidence-transform-container');
    const zoomText = document.getElementById('evidence-zoom-level');
    if (containerEl) containerEl.style.transform = `scale(${currentZoom})`;
    if (zoomText) zoomText.innerText = `${Math.round(currentZoom * 100)}%`;
  };

  window.resetEvidenceViewerZoom = () => {
    currentZoom = 1.0;
    const containerEl = document.getElementById('evidence-transform-container');
    const zoomText = document.getElementById('evidence-zoom-level');
    if (containerEl) containerEl.style.transform = 'scale(1.0)';
    if (zoomText) zoomText.innerText = '100%';
  };

  window.handleAnalyzeSpecificRegion = async (eviId) => {
    const outputEl = document.getElementById('region-deep-analysis-output');
    const target = evidenceList.find(e => e.id === eviId);
    if (!outputEl || !target) return;

    outputEl.classList.remove('hidden');
    outputEl.innerHTML = `<div class="text-slate-400 font-mono text-[11px] text-center py-2">Analyzing cropped region context...</div>`;

    try {
      const res = await analyzeSpecificRegion({
        regionId: target.id,
        coordinates: target.coordinates,
        label: target.label || target.region,
        visualType: target.evidenceType || 'DIAGRAM'
      });

      outputEl.innerHTML = `
        <div class="space-y-1.5">
          <div class="font-serif font-bold text-slate-200 text-xs">${escapeHtml(res.structuralRole)}</div>
          <div class="text-[11px] text-emerald-300 font-sans"><span class="font-mono text-[9px] text-emerald-400 uppercase font-bold">OBSERVED:</span> ${escapeHtml(res.findings.observed)}</div>
          <div class="text-[11px] text-indigo-300 font-sans"><span class="font-mono text-[9px] text-indigo-400 uppercase font-bold">INFERRED:</span> ${escapeHtml(res.findings.inferred)}</div>
          <div class="text-[11px] text-amber-300 font-sans"><span class="font-mono text-[9px] text-amber-400 uppercase font-bold">UNDETERMINABLE:</span> ${escapeHtml(res.findings.undeterminable)}</div>
        </div>
      `;
    } catch (err) {
      outputEl.innerHTML = `<div class="text-rose-400 font-mono text-[11px]">${escapeHtml(err.message)}</div>`;
    }
  };
}
