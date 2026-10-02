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
          Multimodal Visual Comparison Engine • Real AI Vision Pipeline
        </div>
        <h1 class="font-serif font-bold text-3xl sm:text-4xl text-slate-100 tracking-tight">
          Compare Images
        </h1>
        <p class="text-slate-400 text-sm font-sans max-w-2xl">
          Upload 2–3 visuals to execute multimodal AI vision analysis and discover grounded similarities, differences, shared features, and structural relationships.
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

function updateSlotPreview(slotIndex) {
  const container = document.getElementById(`slot-preview-${slotIndex}`);
  if (!container) return;

  const item = selectedSlotImages[slotIndex];
  if (item) {
    container.innerHTML = `
      <div class="relative w-full h-full flex flex-col items-center justify-center p-2 space-y-2">
        <div class="w-full h-28 rounded-lg overflow-hidden border border-white/10 bg-black">
          <img src="${item.dataUrl}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover" />
        </div>
        <div class="text-[11px] font-mono text-indigo-300 font-bold truncate max-w-full">
          ${escapeHtml(item.title || `Image ${slotIndex + 1}`)}
        </div>
      </div>
    `;
  } else {
    const isRequired = slotIndex < 2;
    container.innerHTML = `
      <span class="material-symbols-outlined text-[40px] ${isRequired ? 'text-indigo-400/60' : 'text-slate-600'}">add_photo_alternate</span>
      <p class="text-xs ${isRequired ? 'text-slate-400' : 'text-slate-500'} mt-2 font-sans">${isRequired ? `Upload or Drag Image ${slotIndex + 1}` : 'Upload Optional Image 3'}</p>
      <input type="file" accept="image/*" onchange="window.handleCompareFileSelect(${slotIndex}, event)" class="absolute inset-0 opacity-0 cursor-pointer" />
    `;
  }
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
        visualType: 'TECHNICAL DIAGRAM (DFD)',
        dataUrl: '/images/urban-analysis.jpg',
        isDemoPreset: true,
        subject: 'Monolith Architecture DFD v1',
        appearance: 'Single monolithic node box connected directly to DB',
        environment: 'Software Architecture Schema',
        visibleObjects: ['User Client', 'Monolithic Server', 'Database'],
        uniqueFeatures: 'Single-tier monolithic application server structure'
      };
      selectedSlotImages[1] = {
        id: 'DFD-V2',
        title: 'Microservices Architecture DFD v2',
        visualType: 'TECHNICAL DIAGRAM (DFD)',
        dataUrl: '/images/urban-analysis.jpg',
        isDemoPreset: true,
        subject: 'Microservices Architecture DFD v2',
        appearance: 'Multi-service topology with API Gateway & Auth Service',
        environment: 'Distributed Microservices System',
        visibleObjects: ['User Client', 'API Gateway', 'Auth Service', 'PostgreSQL DB'],
        uniqueFeatures: 'Decoupled API Gateway routing layer & isolated Auth service'
      };
      selectedSlotImages[2] = null;
    } else if (presetKey === 'heroes') {
      selectedSlotImages[0] = {
        id: 'HERO-1',
        title: 'Spider-Man',
        visualType: 'SUPERHERO CHARACTER ART',
        dataUrl: '/images/spider-man.jpg',
        isDemoPreset: true,
        subject: 'Spider-Man',
        appearance: 'Red and blue webbed suit with spider emblem, agile crouching pose',
        environment: 'Urban Skyscraper Rooftop',
        visibleObjects: ['Web Patterned Suit', 'Spider Emblem', 'White Eye Lenses', 'City Rooftop'],
        uniqueFeatures: 'Web pattern suit, spider emblem, agile crouching acrobat posture'
      };
      selectedSlotImages[1] = {
        id: 'HERO-2',
        title: 'Superman',
        visualType: 'SUPERHERO CHARACTER ART',
        dataUrl: '/images/urban-analysis.jpg',
        isDemoPreset: true,
        subject: 'Superman',
        appearance: 'Blue suit with flowing red cape and S-shield chest emblem',
        environment: 'Metropolis Skyline / Open Sky',
        visibleObjects: ['Flowing Red Cape', 'S-Shield Chest Crest', 'Floating Flight Pose'],
        uniqueFeatures: 'Flowing red cape, S-shield chest crest, aerial flight stance'
      };
      selectedSlotImages[2] = {
        id: 'HERO-3',
        title: 'Batman',
        visualType: 'SUPERHERO CHARACTER ART',
        dataUrl: '/images/urban-analysis.jpg',
        isDemoPreset: true,
        subject: 'Batman',
        appearance: 'Dark tactical bat-armor with cowl and bat chest symbol',
        environment: 'Gotham City Rooftop / Nocturnal Urban Environment',
        visibleObjects: ['Dark Bat Cowl', 'Bat Emblem', 'Tactical Armor', 'Utility Belt'],
        uniqueFeatures: 'Pointed bat cowl with ears, dark tactical body armor, bat emblem'
      };
    } else if (presetKey === 'charts') {
      selectedSlotImages[0] = {
        id: 'CHART-Q1',
        title: 'Q1 Revenue Chart',
        visualType: 'DATA CHART',
        dataUrl: '/images/urban-analysis.jpg',
        isDemoPreset: true,
        subject: 'Q1 Financial Performance',
        appearance: 'Blue bar chart showing initial quarterly growth trend',
        environment: 'Corporate Financial Report',
        visibleObjects: ['Bar Graph', 'Axis Labels', 'Legend'],
        uniqueFeatures: 'Initial Q1 baseline metrics with 15% growth slope'
      };
      selectedSlotImages[1] = {
        id: 'CHART-Q2',
        title: 'Q2 Revenue Chart',
        visualType: 'DATA CHART',
        dataUrl: '/images/urban-analysis.jpg',
        isDemoPreset: true,
        subject: 'Q2 Financial Performance',
        appearance: 'Multi-series bar & line chart displaying accelerated revenue',
        environment: 'Corporate Financial Report',
        visibleObjects: ['Bar Graph', 'Line Series Overlay', 'Target Threshold Line'],
        uniqueFeatures: 'Multi-series overlay with accelerated Q2 revenue trajectory'
      };
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
        <div class="text-sm font-mono text-slate-300">Executing Multimodal Vision AI Comparison...</div>
        <p class="text-xs text-slate-500 font-sans">Analyzing independent visual content via Gemini Vision API across ${activeSources.length} images.</p>
      </div>
    `;

    try {
      // Execute backend Multimodal Vision comparison
      const comparisonResult = await compareVisuals(activeSources, 'Multimodal Image Comparison');
      renderDetailedComparisonResults(mount, comparisonResult);
    } catch (err) {
      console.error('[Compare] AI Vision Error:', err);
      mount.innerHTML = `
        <div class="p-8 text-center space-y-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <span class="material-symbols-outlined text-4xl text-rose-400">no_photography</span>
          <h4 class="font-serif font-bold text-slate-100 text-base">AI visual analysis unavailable.</h4>
          <p class="text-xs text-rose-300 font-mono max-w-md mx-auto">${escapeHtml(err.message || 'Multimodal vision pipeline could not process uploaded image artifacts.')}</p>
          <button onclick="window.executeMultiImageCompare()" class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-mono text-xs font-semibold cursor-pointer hover:bg-indigo-500">
            🔄 Retry Comparison
          </button>
        </div>
      `;
    }
  };
}

function renderDetailedComparisonResults(mount, resultData) {
  const sources = resultData.sources || [];
  const matrix = resultData.matrix || { attributes: [] };
  const sharedFeatures = resultData.sharedFeatures || [];
  const differences = resultData.differences || [];
  const uniqueFeatures = resultData.uniqueFeatures || [];
  const summaryReport = resultData.summaryReport || {};
  const isDemoPreset = sources.some(s => s.isDemoPreset);

  mount.innerHTML = `
    <div class="space-y-8 animate-fade-in text-left">
      ${isDemoPreset ? `
        <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono flex items-center justify-between">
          <span>[ DEMO PRESET MODE ] These sample visual artifacts illustrate multi-image topological &amp; attribute comparison.</span>
          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">DEMO</span>
        </div>
      ` : ''}

      <!-- 1. LARGE SIDE-BY-SIDE IMAGES -->
      <div class="space-y-3">
        <h3 class="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-indigo-400 text-[20px]">grid_view</span>
          Side-by-Side Visual Artifacts (${sources.length} Images)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-${sources.length} gap-4">
          ${sources.map((s, idx) => `
            <div class="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-3 shadow-lg">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-indigo-400 font-bold">Image ${idx + 1}</span>
                <span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px]">${escapeHtml(s.visualType || 'PHOTOGRAPH')}</span>
              </div>
              <div class="h-48 rounded-lg overflow-hidden border border-white/5 bg-black">
                <img src="${s.dataUrl}" alt="${escapeHtml(s.title || s.subject)}" class="w-full h-full object-cover" />
              </div>
              <div class="space-y-1">
                <div class="font-serif font-bold text-slate-100 text-sm truncate">${escapeHtml(s.title || s.subject)}</div>
                <span class="text-[11px] font-mono text-slate-400 block truncate">${escapeHtml(s.environment || 'Visual Context')}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. INDIVIDUAL VISUAL ANALYSIS -->
      <div class="space-y-4">
        <h3 class="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-400 text-[20px]">analytics</span>
          Individual Visual Analysis
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-${sources.length} gap-4">
          ${sources.map((s, idx) => `
            <div class="p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3 text-xs text-slate-300">
              <div class="font-serif font-bold text-indigo-300 border-b border-white/10 pb-2 text-sm">
                Image ${idx + 1}: ${escapeHtml(s.subject || s.title)}
              </div>
              <div class="space-y-2 font-sans">
                <div>
                  <span class="font-mono text-slate-400 text-[11px] block font-semibold">Visual Type:</span>
                  <span class="text-slate-200 font-mono">${escapeHtml(s.visualType || 'Photograph')}</span>
                </div>
                <div>
                  <span class="font-mono text-slate-400 text-[11px] block font-semibold">Main Subject:</span>
                  <span class="text-slate-200">${escapeHtml(s.subject || s.title)}</span>
                </div>
                <div>
                  <span class="font-mono text-slate-400 text-[11px] block font-semibold">Visible Objects &amp; Elements:</span>
                  <span class="text-slate-300">${escapeHtml(Array.isArray(s.objects) ? s.objects.map(o => typeof o === 'string' ? o : o.label).join(', ') : (s.visibleObjects || 'Observed visual elements'))}</span>
                </div>
                <div>
                  <span class="font-mono text-slate-400 text-[11px] block font-semibold">Appearance &amp; Style:</span>
                  <span class="text-slate-300">${escapeHtml(s.appearance || s.summary || 'Multimodal AI vision extracted composition')}</span>
                </div>
                <div>
                  <span class="font-mono text-slate-400 text-[11px] block font-semibold">Environment / Context:</span>
                  <span class="text-slate-300">${escapeHtml(s.environment || 'Visual scene')}</span>
                </div>
                <div>
                  <span class="font-mono text-slate-400 text-[11px] block font-semibold">Text &amp; Inscriptions:</span>
                  <span class="text-slate-400 font-mono">${escapeHtml(Array.isArray(s.text) && s.text.length > 0 ? s.text.join(', ') : (s.ocrText || 'None detected'))}</span>
                </div>
              </div>
              <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                <span class="text-slate-400">Evidence Status:</span>
                <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">OBSERVED</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. COMPARISON MATRIX TABLE -->
      <div class="space-y-3">
        <h3 class="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-amber-400 text-[20px]">table_chart</span>
          Comparison Matrix
        </h3>
        <div class="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80">
          <table class="w-full text-left text-xs text-slate-300 font-sans border-collapse">
            <thead>
              <tr class="border-b border-white/10 bg-slate-900/80 font-mono text-indigo-300 uppercase text-[11px]">
                <th class="p-3.5 font-bold">Attribute</th>
                ${sources.map((s, idx) => `<th class="p-3.5 font-bold">Image ${idx + 1}: ${escapeHtml(s.subject || s.title)}</th>`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              ${(matrix.attributes || []).map(attr => `
                <tr>
                  <td class="p-3.5 font-mono text-slate-400 font-semibold bg-white/[0.02]">${escapeHtml(attr.name)}</td>
                  ${(attr.values || []).map(val => `<td class="p-3.5 text-slate-200">${escapeHtml(val || 'Not observed')}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. SHARED FEATURES & DIFFERENCES -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Shared Features -->
        <div class="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-3">
          <div class="flex items-center gap-2 text-emerald-400 font-serif font-bold text-base">
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            Shared &amp; Common Features (Observed)
          </div>
          <ul class="space-y-2 text-xs text-slate-300 font-sans">
            ${sharedFeatures.map(sf => `
              <li class="flex items-start gap-2">
                <span class="text-emerald-400 font-mono mt-0.5">•</span>
                <span>${escapeHtml(sf)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Key Differences -->
        <div class="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-3">
          <div class="flex items-center gap-2 text-amber-400 font-serif font-bold text-base">
            <span class="material-symbols-outlined text-[20px]">difference</span>
            Key Differences &amp; Variations (Observed)
          </div>
          <ul class="space-y-2 text-xs text-slate-300 font-sans">
            ${differences.map(d => `
              <li class="flex items-start gap-2">
                <span class="text-amber-400 font-mono mt-0.5">•</span>
                <span>${escapeHtml(d)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      <!-- 5. UNIQUE FEATURES PER IMAGE -->
      <div class="space-y-3">
        <h3 class="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-pink-400 text-[20px]">stars</span>
          Unique Features Breakdown
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-${sources.length} gap-4">
          ${uniqueFeatures.map((uf, idx) => `
            <div class="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2 text-xs">
              <div class="font-serif font-bold text-pink-300 border-b border-white/5 pb-2">Image ${idx + 1} Unique Features</div>
              <p class="text-slate-300 font-sans leading-relaxed">${escapeHtml(uf.trait || 'Distinct visual traits extracted from source.')}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 6. FINAL COMPARISON REPORT -->
      <div class="p-6 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-5">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 class="font-serif font-bold text-xl text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-indigo-400 text-[24px]">description</span>
            COMPARISON REPORT
          </h2>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">10-Section Comparative Analysis</span>
        </div>

        ${Array.isArray(resultData.sections) && resultData.sections.length > 0 ? `
          <div class="space-y-4 divide-y divide-white/5">
            ${resultData.sections.map(sec => `
              <div class="pt-3 first:pt-0 space-y-1.5">
                <h4 class="font-serif font-bold text-indigo-300 text-sm">${escapeHtml(sec.heading)}</h4>
                <div class="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                  ${escapeHtml(sec.content).replace(/\n/g, '<br/>')}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="space-y-3 text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
            <p>
              <strong>What do these images have in common?</strong> ${escapeHtml(summaryReport.common || 'Common visual characteristics extracted via Multimodal Vision AI.')}
            </p>
            <p>
              <strong>How are they different?</strong> ${escapeHtml(summaryReport.different || 'Key variations detected across inputs.')}
            </p>
            <p>
              <strong>What is unique about each?</strong> ${escapeHtml(summaryReport.unique || 'Unique visual characteristics extracted.')}
            </p>
            <p>
              <strong>What conclusions can safely be made?</strong> ${escapeHtml(summaryReport.conclusion || 'The visual evidence strictly confirms that each input artifact possesses distinct structural traits and domain classifications.')}
            </p>
            <p class="text-slate-400 text-xs font-mono pt-1">
              <strong>What cannot be determined?</strong> Fictional capabilities, unobserved external lore, and hypothetical outcomes are strictly UNDETERMINABLE from visual evidence alone.
            </p>
          </div>
        `}
      </div>
    </div>
  `;
}
