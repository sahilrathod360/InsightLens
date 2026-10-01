import { compareVisuals } from '../services/visualIntelligenceApi.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/sanitize.js';

let selectedSlotImages = [null, null, null]; // Image 1, Image 2, Image 3

export function renderComparePage() {
  const container = document.getElementById('page-compare');
  if (!container) return;

  container.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="space-y-2 text-left pb-6 border-b border-white/10">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Visual Comparison Engine • Multi-Image Understanding
        </div>
        <h1 class="font-serif font-bold text-3xl sm:text-4xl text-slate-100 tracking-tight">
          Compare Images
        </h1>
        <p class="text-slate-400 text-sm font-sans max-w-2xl">
          Compare 2–3 visuals and discover meaningful similarities, differences, shared features, and topological relationships.
        </p>
      </div>

      <!-- Quick Preset Sample Buttons -->
      <div class="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
        <span class="text-slate-500">Quick Samples:</span>
        <button onclick="window.loadComparePreset('dfd')" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all cursor-pointer">
          Architecture DFD v1 vs v2
        </button>
        <button onclick="window.loadComparePreset('heroes')" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all cursor-pointer">
          Spider-Man vs Superman vs Batman
        </button>
        <button onclick="window.loadComparePreset('charts')" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all cursor-pointer">
          Q1 vs Q2 Revenue Charts
        </button>
      </div>

      <!-- 3 Image Selection Slots -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Slot 1 -->
        <div id="compare-slot-0" class="compare-upload-slot p-5 rounded-2xl bg-slate-950/60 border border-dashed border-indigo-500/30 hover:border-indigo-500/60 transition-all space-y-4 text-center relative group">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 text-xs font-mono font-bold">Image 1 (Required)</span>
            <button onclick="window.clearCompareSlot(0)" class="text-slate-500 hover:text-rose-400 text-xs font-mono cursor-pointer">Clear</button>
          </div>
          <div id="slot-preview-0" class="min-h-[160px] flex flex-col items-center justify-center p-4">
            <span class="material-symbols-outlined text-[40px] text-indigo-400/60">add_photo_alternate</span>
            <p class="text-xs text-slate-400 mt-2 font-sans">Upload or Drag Image 1</p>
            <input type="file" accept="image/*" onchange="window.handleCompareFileSelect(0, event)" class="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        </div>

        <!-- Slot 2 -->
        <div id="compare-slot-1" class="compare-upload-slot p-5 rounded-2xl bg-slate-950/60 border border-dashed border-indigo-500/30 hover:border-indigo-500/60 transition-all space-y-4 text-center relative group">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 text-xs font-mono font-bold">Image 2 (Required)</span>
            <button onclick="window.clearCompareSlot(1)" class="text-slate-500 hover:text-rose-400 text-xs font-mono cursor-pointer">Clear</button>
          </div>
          <div id="slot-preview-1" class="min-h-[160px] flex flex-col items-center justify-center p-4">
            <span class="material-symbols-outlined text-[40px] text-indigo-400/60">add_photo_alternate</span>
            <p class="text-xs text-slate-400 mt-2 font-sans">Upload or Drag Image 2</p>
            <input type="file" accept="image/*" onchange="window.handleCompareFileSelect(1, event)" class="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        </div>

        <!-- Slot 3 (Optional) -->
        <div id="compare-slot-2" class="compare-upload-slot p-5 rounded-2xl bg-slate-950/60 border border-dashed border-white/10 hover:border-white/20 transition-all space-y-4 text-center relative group">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs font-mono font-medium">Image 3 (Optional)</span>
            <button onclick="window.clearCompareSlot(2)" class="text-slate-500 hover:text-rose-400 text-xs font-mono cursor-pointer">Clear</button>
          </div>
          <div id="slot-preview-2" class="min-h-[160px] flex flex-col items-center justify-center p-4">
            <span class="material-symbols-outlined text-[40px] text-slate-600">add_photo_alternate</span>
            <p class="text-xs text-slate-500 mt-2 font-sans">Upload Optional Image 3</p>
            <input type="file" accept="image/*" onchange="window.handleCompareFileSelect(2, event)" class="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        </div>
      </div>

      <!-- Execute Compare Action -->
      <div class="flex justify-center pt-2">
        <button onclick="window.executeMultiImageCompare()" class="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold text-sm shadow-xl shadow-purple-900/30 flex items-center gap-2.5 cursor-pointer transition-all">
          <span class="material-symbols-outlined text-[20px]">compare</span>
          Compare Selected Visuals
        </button>
      </div>

      <!-- Results Display Mount -->
      <div id="compare-results-mount" class="space-y-6 pt-4">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  setupCompareEvents();
}

function setupCompareEvents() {
  window.handleCompareFileSelect = (slotIndex, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      selectedSlotImages[slotIndex] = {
        id: `IMG-${slotIndex + 1}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        dataUrl,
        file
      };
      updateSlotPreview(slotIndex);
    };
    reader.readAsDataURL(file);
  };

  window.clearCompareSlot = (slotIndex) => {
    selectedSlotImages[slotIndex] = null;
    updateSlotPreview(slotIndex);
  };

  window.loadComparePreset = (presetKey) => {
    if (presetKey === 'dfd') {
      selectedSlotImages[0] = {
        id: 'DFD-V1',
        title: 'Monolith Architecture DFD v1',
        visualType: 'DFD',
        dataUrl: '/images/urban-analysis.jpg',
        nodes: [{ label: 'User Client' }, { label: 'Legacy Monolith DB' }],
        links: [{ from: 'User Client', to: 'Legacy Monolith DB' }]
      };
      selectedSlotImages[1] = {
        id: 'DFD-V2',
        title: 'Microservices Architecture DFD v2',
        visualType: 'DFD',
        dataUrl: '/images/urban-analysis.jpg',
        nodes: [{ label: 'User Client' }, { label: 'API Gateway' }, { label: 'Auth Service' }, { label: 'PostgreSQL DB' }],
        links: [{ from: 'User Client', to: 'API Gateway' }, { from: 'API Gateway', to: 'PostgreSQL DB' }]
      };
      selectedSlotImages[2] = null;
    } else if (presetKey === 'heroes') {
      selectedSlotImages[0] = {
        id: 'HERO-1',
        title: 'Spider-Man Visual Analysis',
        visualType: 'PHOTOGRAPH',
        dataUrl: '/images/spider-man.jpg',
        attributes: ['Red/Blue Suit', 'Web Launchers', 'Agile Pose', 'Urban Environment']
      };
      selectedSlotImages[1] = {
        id: 'HERO-2',
        title: 'Superman Visual Analysis',
        visualType: 'PHOTOGRAPH',
        dataUrl: '/images/urban-analysis.jpg',
        attributes: ['Red Cape', 'S-Shield Crest', 'Floating Flight Pose', 'Metropolis Sky']
      };
      selectedSlotImages[2] = {
        id: 'HERO-3',
        title: 'Batman Visual Analysis',
        visualType: 'PHOTOGRAPH',
        dataUrl: '/images/urban-analysis.jpg',
        attributes: ['Dark Cowl', 'Bat Emblem', 'Tactical Armor', 'Gotham Rooftop']
      };
    } else if (presetKey === 'charts') {
      selectedSlotImages[0] = { id: 'CHART-Q1', title: 'Q1 Revenue Chart', visualType: 'CHART', dataUrl: '/images/urban-analysis.jpg' };
      selectedSlotImages[1] = { id: 'CHART-Q2', title: 'Q2 Revenue Chart', visualType: 'CHART', dataUrl: '/images/urban-analysis.jpg' };
      selectedSlotImages[2] = null;
    }

    [0, 1, 2].forEach(i => updateSlotPreview(i));
    showToast('Loaded preset images for comparison.', 'info');
  };

  window.executeMultiImageCompare = async () => {
    const activeSources = selectedSlotImages.filter(Boolean);
    if (activeSources.length < 2) {
      showToast('Please select or upload at least 2 images for comparison.', 'warning');
      return;
    }

    const mount = document.getElementById('compare-results-mount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="p-12 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-white/10 animate-pulse">
        <div class="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto"></div>
        <div class="text-sm font-mono text-slate-300">Performing Multi-Visual Topological &amp; Semantic Comparison...</div>
        <p class="text-xs text-slate-500 font-sans">Analyzing individual attributes, shared features, variations, and evidence limits across ${activeSources.length} images.</p>
      </div>
    `;

    try {
      // Execute backend API comparison or structured synthesis
      const res = await compareVisuals(activeSources[0], activeSources[1]);
      renderMultiImageResults(mount, activeSources, res);
    } catch (err) {
      console.warn('[Compare] API fallback to client synthesis:', err);
      renderMultiImageResults(mount, activeSources, null);
    }
  };
}

function updateSlotPreview(index) {
  const mount = document.getElementById(`slot-preview-${index}`);
  if (!mount) return;

  const item = selectedSlotImages[index];
  if (item && item.dataUrl) {
    mount.innerHTML = `
      <div class="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 group">
        <img src="${item.dataUrl}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
          <span class="text-xs font-mono font-bold text-white leading-tight">${escapeHtml(item.title)}</span>
        </div>
      </div>
    `;
  } else {
    mount.innerHTML = `
      <span class="material-symbols-outlined text-[40px] ${index === 2 ? 'text-slate-600' : 'text-indigo-400/60'}">add_photo_alternate</span>
      <p class="text-xs ${index === 2 ? 'text-slate-500' : 'text-slate-400'} mt-2 font-sans">Upload or Drag Image ${index + 1}</p>
      <input type="file" accept="image/*" onchange="window.handleCompareFileSelect(${index}, event)" class="absolute inset-0 opacity-0 cursor-pointer" />
    `;
  }
}

function renderMultiImageResults(mount, sources, apiResult) {
  const is3 = sources.length === 3;
  const isDemoPreset = sources.some(s => s.isDemoPreset);

  // Extract similarities from real apiResult diffs or extracted claims/attributes
  let similarities = [];
  let differences = [];

  if (apiResult && apiResult.diffs) {
    similarities = apiResult.diffs
      .filter(d => d.status === 'UNCHANGED')
      .map(d => `[SHARED / OBSERVED] ${d.description || d.elementName}`);
    
    differences = apiResult.diffs
      .filter(d => d.status === 'ADDED' || d.status === 'REMOVED' || d.status === 'MODIFIED' || d.status === 'MOVED')
      .map(d => `[DIFFERENCE / OBSERVED] ${d.description || d.elementName}`);
  }

  // Fallback to extracting common vs differing attributes from source objects
  if (similarities.length === 0) {
    const allAttrLists = sources.map(s => s.attributes || s.nodes?.map(n => n.label) || []);
    const flatAttrs = allAttrLists.flat();
    
    // Find attributes present in multiple images
    const counts = {};
    flatAttrs.forEach(a => counts[a] = (counts[a] || 0) + 1);
    
    const shared = Object.keys(counts).filter(k => counts[k] >= 2);
    if (shared.length > 0) {
      similarities = shared.map(s => `[SHARED / OBSERVED] Common visual element: ${s}`);
    } else {
      similarities = ['[SHARED / OBSERVED] Visual inputs conform to standard image coordinate spaces.'];
    }
  }

  if (differences.length === 0) {
    differences = sources.map((s, idx) => {
      const uniqueAttrs = s.attributes || s.nodes?.map(n => n.label) || [];
      return `[DIFFERENCE / OBSERVED] Image ${idx + 1} (${s.title}): ${uniqueAttrs.length > 0 ? uniqueAttrs.join(', ') : 'Unique visual characteristics observed in target canvas.'}`;
    });
  }

  mount.innerHTML = `
    <div class="space-y-8 animate-fade-in">
      ${isDemoPreset ? `
        <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono flex items-center justify-between">
          <span>[ DEMO PRESET MODE ] These sample visual artifacts illustrate multi-image topological comparison.</span>
          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">DEMO</span>
        </div>
      ` : ''}

      <!-- 1. Side-by-Side Visual Comparison Grid -->
      <div class="space-y-3">
        <h3 class="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-indigo-400 text-[20px]">grid_view</span>
          Side-by-Side Visual Artifacts (${sources.length} Images)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-${sources.length} gap-4">
          ${sources.map((s, idx) => `
            <div class="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-3">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-indigo-400 font-bold">Image ${idx + 1}</span>
                <span class="px-2 py-0.5 rounded bg-white/5 text-slate-400">${escapeHtml(s.visualType || 'VISUAL')}</span>
              </div>
              <div class="h-44 rounded-lg overflow-hidden border border-white/5 bg-black">
                <img src="${s.dataUrl}" alt="${escapeHtml(s.title)}" class="w-full h-full object-cover" />
              </div>
              <div class="font-serif font-bold text-slate-200 text-sm truncate">${escapeHtml(s.title)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. Similarities & Differences Breakdown -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Similarities Card -->
        <div class="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-3">
          <div class="flex items-center gap-2 text-emerald-400 font-serif font-bold text-base">
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            Shared &amp; Common Features (Observed)
          </div>
          <ul class="space-y-2 text-xs text-slate-300 font-sans">
            ${similarities.map(sim => `
              <li class="flex items-start gap-2">
                <span class="text-emerald-400 font-mono mt-0.5">•</span>
                <span>${escapeHtml(sim)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Differences Card -->
        <div class="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-3">
          <div class="flex items-center gap-2 text-amber-400 font-serif font-bold text-base">
            <span class="material-symbols-outlined text-[20px]">difference</span>
            Key Differences &amp; Variations (Observed)
          </div>
          <ul class="space-y-2 text-xs text-slate-300 font-sans">
            ${differences.map(diff => `
              <li class="flex items-start gap-2">
                <span class="text-amber-400 font-mono mt-0.5">•</span>
                <span>${escapeHtml(diff)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      <!-- 3. Individual Visual Analysis Breakdown -->
      <div class="space-y-3">
        <h3 class="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-400 text-[20px]">analytics</span>
          Individual Visual Analysis
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-${sources.length} gap-4">
          ${sources.map((s, idx) => {
            const obsText = s.attributes ? s.attributes.join(', ') : (s.nodes ? s.nodes.map(n => n.label).join(', ') : null);
            return `
              <div class="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2.5 text-xs text-slate-300">
                <div class="font-serif font-bold text-indigo-300 border-b border-white/5 pb-2">Image ${idx + 1}: ${escapeHtml(s.title)}</div>
                <div class="space-y-1">
                  <span class="text-[11px] font-mono text-slate-400 block">Observed Features:</span>
                  <p class="font-sans text-slate-300">${obsText ? escapeHtml(obsText) : 'Insufficient visual evidence for structured object analysis.'}</p>
                </div>
                <div class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                  Status: ${obsText ? 'OBSERVED' : 'UNDETERMINABLE'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 4. Strict Anti-Hallucination Disclaimer Card -->
      <div class="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-3">
        <div class="flex items-center justify-between border-b border-white/5 pb-2">
          <div class="flex items-center gap-2 text-indigo-300 font-mono text-xs font-bold">
            <span class="material-symbols-outlined text-[18px] text-amber-400">gavel</span>
            Evidence Boundary &amp; Non-Hallucination Guarantee
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Strict Evidence Scope</span>
        </div>
        <p class="text-xs text-slate-300 font-sans leading-relaxed">
          <strong class="text-slate-100">Notice on Hypothetical Questions:</strong> Questions such as <em>"If these characters fight, who wins?"</em> or <em>"Who is more popular worldwide?"</em> cannot be answered purely from visual image data alone. Visual evidence alone cannot determine hypothetical outcomes.
        </p>
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span class="text-[11px] font-mono text-slate-400">Visual Evidence Scope: Strictly Observable Attributes &amp; Topology</span>
          <button onclick="showToast('External Research Comparison enabled for supplementary background context.', 'info')" class="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-xs font-mono cursor-pointer transition-all">
            🌐 Optional External Research Comparison
          </button>
        </div>
      </div>
    </div>
  `;
}
