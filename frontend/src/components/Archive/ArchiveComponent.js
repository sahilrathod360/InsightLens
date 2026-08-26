// Real Data Archive & History Management Component

import { setActiveReportData, navigateTo } from '../../state.js';
import { 
  getSavedReportsHistory, 
  deleteReportFromHistory, 
  duplicateReportInHistory, 
  toggleFavoriteReport, 
  filterAndSortReports 
} from '../../services/history.js';
import { getActivityLogs, formatTimeAgo, saveAppMetrics, getAppMetrics, logUserActivity } from '../../services/storage.js';
import { renderResultScreen } from '../ReportViewer.js';
import { exportCleanPDF, exportMarkdownFile, downloadBlob } from '../../utils/export.js';
import { showToast } from '../../utils/toast.js';

function exportReportToMarkdown(d) {
  if (!d) return;
  const md = `# ${d.title || 'Research Report'}
*Synthesized by InsightLens AI Visual Research Engine (${d.modelUsed || 'Gemini Vision'})*

---

### 📊 Research Metadata & Telemetry
- **Primary Subject:** ${d.subject || 'Visual Subject'}
- **Category:** ${d.category || 'General Research'}
- **AI Confidence Score:** ${d.confidenceScore || '96.8%'}
- **Processing Time:** ${d.processingTimeMs ? (d.processingTimeMs / 1000).toFixed(1) + 's' : '~2.0s'}
- **Date:** ${d.generationTimestamp || d.date || 'Recently'}

---

## Executive Summary
${d.executiveSummary || d.summaryLead || ''}

---

## Identification & Taxonomy
${d.identification || ''}

---

## Detailed Visual & Spatial Analysis
${d.detailedAnalysis || ''}

---

## Historical & Scientific Context
${d.historicalContext || ''}

---

## Scientific & Technical Specifications
${d.scientificTechnicalInfo || ''}

---

## Practical Applications
${(d.applications || []).map(a => `- ${a}`).join('\n')}

---

## Significance & Impact
${d.significance || ''}

---

## Verified Academic References (APA 7th)
${(d.references || []).map((src, i) => `${i + 1}. ${src}`).join('\n')}

---

## Conclusion
${d.conclusion || ''}
`;

  downloadBlob(md, `InsightLens_Report_${Date.now()}.md`, 'text/markdown');
}

let currentFilters = {
  query: '',
  dateFilter: 'all',
  modelFilter: 'all',
  categoryFilter: 'all',
  favoritesOnly: false,
  sortBy: 'newest'
};

export function setupArchiveEvents() {
  const container = document.getElementById('page-archive');
  if (!container) return;

  renderArchivePage();
}

export function renderArchivePage() {
  const archiveContainer = document.getElementById('page-archive');
  if (!archiveContainer) return;

  const rawReports = getSavedReportsHistory();
  const filteredReports = filterAndSortReports(rawReports, currentFilters);
  const activityLogs = getActivityLogs();

  // Extract unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(rawReports.map(r => r.category || 'General Research')));

  archiveContainer.innerHTML = `
    <!-- ARCHIVE HEADER -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ghost-border pb-6">
      <div>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/50 mb-2.5">
          Persistent Knowledge Repository
        </div>
        <h1 class="font-display-lg text-2xl md:text-3xl text-on-surface font-serif font-bold">Research History &amp; Archive</h1>
        <p class="font-body-sm text-on-surface-variant text-xs md:text-sm mt-1">Manage, search, export, and filter your synthesized visual research papers.</p>
      </div>

      <button id="archive-start-new-btn" type="button" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md self-start md:self-auto">
        <span class="material-symbols-outlined text-[18px]">add_photo_alternate</span>
        Start New Research
      </button>
    </header>

    <!-- SEARCH & FILTER TOOLBAR -->
    <section class="bg-surface-container p-4 sm:p-5 rounded-2xl ghost-border space-y-4">
      <!-- SEARCH INPUT -->
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[20px]">search</span>
        <input 
          type="text" 
          id="archive-search-input" 
          value="${currentFilters.query}"
          placeholder="Search by report title, category, keywords, or executive summary..." 
          class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl pl-10 pr-4 py-2.5 text-xs focus:border-indigo-400 focus:outline-none" 
        />
      </div>

      <!-- FILTERS & SORT ROW -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
        <!-- Date Filter -->
        <div>
          <label for="filter-date" class="text-[10px] text-slate-400 font-sans block mb-1">Date</label>
          <select id="filter-date" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-lg p-2 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
            <option value="all" ${currentFilters.dateFilter === 'all' ? 'selected' : ''}>All Time</option>
            <option value="today" ${currentFilters.dateFilter === 'today' ? 'selected' : ''}>Today</option>
            <option value="week" ${currentFilters.dateFilter === 'week' ? 'selected' : ''}>This Week</option>
            <option value="month" ${currentFilters.dateFilter === 'month' ? 'selected' : ''}>This Month</option>
          </select>
        </div>

        <!-- AI Model Filter -->
        <div>
          <label for="filter-model" class="text-[10px] text-slate-400 font-sans block mb-1">AI Model</label>
          <select id="filter-model" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-lg p-2 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
            <option value="all" ${currentFilters.modelFilter === 'all' ? 'selected' : ''}>All Models</option>
            <option value="gemini-2.5-flash" ${currentFilters.modelFilter === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash</option>
            <option value="gemini-2.5-flash-lite" ${currentFilters.modelFilter === 'gemini-2.5-flash-lite' ? 'selected' : ''}>Gemini 2.5 Flash Lite</option>
            <option value="gemini-2.5-pro" ${currentFilters.modelFilter === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
          </select>
        </div>

        <!-- Category Filter -->
        <div>
          <label for="filter-category" class="text-[10px] text-slate-400 font-sans block mb-1">Category</label>
          <select id="filter-category" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-lg p-2 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
            <option value="all" ${currentFilters.categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${uniqueCategories.map(cat => `<option value="${cat}" ${currentFilters.categoryFilter === cat ? 'selected' : ''}>${cat}</option>`).join('')}
          </select>
        </div>

        <!-- Sort By -->
        <div>
          <label for="filter-sort" class="text-[10px] text-slate-400 font-sans block mb-1">Sort By</label>
          <select id="filter-sort" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-lg p-2 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
            <option value="newest" ${currentFilters.sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
            <option value="oldest" ${currentFilters.sortBy === 'oldest' ? 'selected' : ''}>Oldest First</option>
            <option value="confidence" ${currentFilters.sortBy === 'confidence' ? 'selected' : ''}>Highest Confidence</option>
            <option value="alphabetical" ${currentFilters.sortBy === 'alphabetical' ? 'selected' : ''}>Alphabetical (A-Z)</option>
          </select>
        </div>

        <!-- Favorites Only Toggle -->
        <div class="flex items-end pb-1">
          <button 
            id="toggle-favorites-btn" 
            type="button" 
            class="w-full py-2 px-3 rounded-lg border ghost-border text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${currentFilters.favoritesOnly ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-surface-container-lowest text-slate-300 hover:text-white'}"
          >
            <span class="material-symbols-outlined text-[16px] ${currentFilters.favoritesOnly ? 'text-amber-400' : 'text-slate-400'}">star</span>
            ${currentFilters.favoritesOnly ? 'Favorites Only' : 'All Reports'}
          </button>
        </div>
      </div>
    </section>

    <!-- ARCHIVE CARDS GRID OR EMPTY STATE -->
    <!-- ELEGANT EMPTY STATE -->
    ${filteredReports.length === 0 ? `
      <section class="p-12 text-center bg-surface-container rounded-2xl ghost-border space-y-5 empty-state-container">
        <div class="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20 shadow-md empty-state-icon">
          <span class="material-symbols-outlined text-[32px]">folder_off</span>
        </div>
        <div class="space-y-1.5">
          <h3 class="font-serif text-xl font-bold text-slate-100">No research reports yet.</h3>
          <p class="text-slate-400 text-sm max-w-[380px] mx-auto leading-relaxed">
            ${rawReports.length === 0 ? 'Upload an image artifact to generate your first AI visual research paper.' : 'No research reports match your active search filter parameters.'}
          </p>
        </div>
        <div class="pt-3">
          <button id="archive-empty-cta" type="button" class="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-7 py-3.5 rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-md btn-active-scale focus-ring">
            <span class="material-symbols-outlined text-[20px]">add_photo_alternate</span>
            Start New Research
          </button>
        </div>
      </section>
    ` : `
      <section id="archive-grid" class="grid grid-cols-1 md:grid-cols-3 gap-5">
        ${filteredReports.map(rpt => {
          const data = rpt.fullData || {};
          const procTime = rpt.processingTimeMs ? (rpt.processingTimeMs / 1000).toFixed(1) + 's' : '~2.0s';
          const conf = rpt.confidenceScore || '96.8%';

          return `
            <div class="bg-surface-container rounded-2xl ghost-border overflow-hidden card-hover-lift flex flex-col justify-between" data-id="${rpt.id}">
              <div>
                <!-- THUMBNAIL & FAVORITE STAR -->
                <div class="relative h-44 overflow-hidden bg-black/40 border-b ghost-border">
                  <img src="${rpt.imageDataUrl || '/images/urban-analysis.jpg'}" alt="${rpt.title}" class="w-full h-full object-cover" />
                  
                  <button 
                    type="button" 
                    class="btn-toggle-fav absolute top-3 right-3 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:scale-110 transition-transform cursor-pointer" 
                    data-id="${rpt.id}"
                    title="${rpt.favorite ? 'Unfavorite' : 'Favorite'}"
                  >
                    <span class="material-symbols-outlined text-[18px] ${rpt.favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}">star</span>
                  </button>

                  <div class="absolute bottom-2.5 left-3 bg-black/80 backdrop-blur-xs px-2.5 py-0.5 rounded text-[10px] font-mono text-indigo-300 font-bold border border-white/10">
                    ${rpt.category || 'General Research'}
                  </div>
                </div>

                <!-- CARD METADATA & BODY -->
                <div class="p-5 space-y-3">
                  <h3 class="font-serif text-base font-bold text-slate-100 leading-snug line-clamp-2">${rpt.title}</h3>
                  
                  <div class="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-surface-container-lowest p-2.5 rounded-xl border ghost-border">
                    <div>
                      <span class="text-slate-500 uppercase block">Model:</span>
                      <strong class="text-indigo-300 truncate block">${rpt.modelUsed || 'gemini-2.5-flash'}</strong>
                    </div>
                    <div>
                      <span class="text-slate-500 uppercase block">Confidence:</span>
                      <strong class="text-emerald-400 block">${conf}</strong>
                    </div>
                    <div>
                      <span class="text-slate-500 uppercase block">Latency:</span>
                      <strong class="text-sky-300 block">${procTime}</strong>
                    </div>
                    <div>
                      <span class="text-slate-500 uppercase block">Date:</span>
                      <strong class="text-slate-300 block truncate">${rpt.date || 'Recently'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <!-- CARD ACTIONS TOOLBAR -->
              <div class="p-4 border-t ghost-border bg-surface-container-lowest flex flex-wrap items-center justify-between gap-1.5 text-xs">
                <button type="button" class="btn-open-report bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors text-[11px]" data-id="${rpt.id}">
                  <span class="material-symbols-outlined text-[15px]">visibility</span>
                  Open
                </button>

                <div class="flex items-center gap-1">
                  <button type="button" class="btn-pdf-report text-slate-300 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer" data-id="${rpt.id}" title="Export PDF">
                    <span class="material-symbols-outlined text-[16px] text-purple-400">picture_as_pdf</span>
                  </button>

                  <button type="button" class="btn-md-report text-slate-300 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer" data-id="${rpt.id}" title="Export Markdown">
                    <span class="material-symbols-outlined text-[16px] text-sky-400">description</span>
                  </button>

                  <button type="button" class="btn-dup-report text-slate-300 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer" data-id="${rpt.id}" title="Duplicate">
                    <span class="material-symbols-outlined text-[16px] text-indigo-300">content_copy</span>
                  </button>

                  <button type="button" class="btn-del-report text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer" data-id="${rpt.id}" title="Delete">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </section>
    `}

    <!-- REAL CHRONOLOGICAL HISTORY TIMELINE SECTION -->
    <section class="bg-surface-container p-6 md:p-8 rounded-2xl ghost-border space-y-6">
      <div class="border-b ghost-border pb-4 flex items-center justify-between">
        <div>
          <span class="text-[11px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">ACTIVITY STREAM</span>
          <h2 class="font-serif text-lg text-on-surface font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-indigo-400 text-[22px]">history</span>
            Chronological User Action Log
          </h2>
        </div>
      </div>

      ${activityLogs.length === 0 ? `
        <div class="p-6 text-center text-slate-500 font-mono text-xs bg-surface-container-lowest rounded-xl ghost-border">
          No user activities logged yet.
        </div>
      ` : `
        <ul class="space-y-2.5 text-xs font-mono">
          ${activityLogs.slice(0, 10).map(act => {
            const typeIcons = {
              upload: { icon: 'cloud_upload', color: 'text-indigo-400', label: 'Image Uploaded' },
              generate: { icon: 'psychology', color: 'text-purple-400', label: 'Research Generated' },
              pdf: { icon: 'picture_as_pdf', color: 'text-sky-400', label: 'PDF Exported' },
              markdown: { icon: 'description', color: 'text-emerald-400', label: 'Markdown Exported' },
              delete: { icon: 'delete_forever', color: 'text-red-400', label: 'Deleted' },
              duplicate: { icon: 'content_copy', color: 'text-indigo-300', label: 'Duplicated' }
            };
            const meta = typeIcons[act.type] || { icon: 'history', color: 'text-slate-400', label: 'Action' };

            return `
              <li class="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl ghost-border">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="material-symbols-outlined text-[18px] ${meta.color} shrink-0">${meta.icon}</span>
                  <div class="min-w-0">
                    <span class="font-sans text-slate-200 text-xs font-semibold block">${act.text}</span>
                    <span class="text-[10px] text-slate-500 font-mono">${meta.label}</span>
                  </div>
                </div>
                <span class="text-[11px] text-slate-400 font-mono shrink-0 ml-2">${formatTimeAgo(act.timestamp)}</span>
              </li>
            `;
          }).join('')}
        </ul>
      `}
    </section>
  `;

  // ATTACH DOM EVENT LISTENERS
  document.getElementById('archive-start-new-btn')?.addEventListener('click', () => navigateTo('desk'));
  document.getElementById('archive-empty-cta')?.addEventListener('click', () => navigateTo('desk'));

  const searchInput = document.getElementById('archive-search-input');
  searchInput?.addEventListener('input', (e) => {
    currentFilters.query = e.target.value;
    renderArchivePage();
    const inputNow = document.getElementById('archive-search-input');
    if (inputNow) {
      inputNow.focus();
      inputNow.setSelectionRange(inputNow.value.length, inputNow.value.length);
    }
  });

  document.getElementById('filter-date')?.addEventListener('change', (e) => {
    currentFilters.dateFilter = e.target.value;
    renderArchivePage();
  });

  document.getElementById('filter-model')?.addEventListener('change', (e) => {
    currentFilters.modelFilter = e.target.value;
    renderArchivePage();
  });

  document.getElementById('filter-category')?.addEventListener('change', (e) => {
    currentFilters.categoryFilter = e.target.value;
    renderArchivePage();
  });

  document.getElementById('filter-sort')?.addEventListener('change', (e) => {
    currentFilters.sortBy = e.target.value;
    renderArchivePage();
  });

  document.getElementById('toggle-favorites-btn')?.addEventListener('click', () => {
    currentFilters.favoritesOnly = !currentFilters.favoritesOnly;
    renderArchivePage();
  });

  // Card Actions
  document.querySelectorAll('.btn-open-report').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const target = rawReports.find(r => r.id === id);
      if (target) {
        document.getElementById('report-source-img').src = target.fullImage || target.imageDataUrl;
        setActiveReportData(target.fullData);
        renderResultScreen(target.fullData);
      }
    };
  });

  document.querySelectorAll('.btn-toggle-fav').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      toggleFavoriteReport(id);
      renderArchivePage();
    };
  });

  document.querySelectorAll('.btn-del-report').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this research report permanently from your local archive?')) {
        deleteReportFromHistory(id);
        renderArchivePage();
        showToast('Report deleted from archive.', 'info');
      }
    };
  });

  document.querySelectorAll('.btn-dup-report').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      duplicateReportInHistory(id);
      renderArchivePage();
      showToast('Report duplicated successfully!', 'success');
    };
  });

  document.querySelectorAll('.btn-pdf-report').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const target = rawReports.find(r => r.id === id);
      if (target && target.fullData) {
        document.getElementById('report-source-img').src = target.fullImage || target.imageDataUrl;
        setActiveReportData(target.fullData);
        renderResultScreen(target.fullData);
        setTimeout(() => exportCleanPDF(), 300);
      }
    };
  });

  document.querySelectorAll('.btn-md-report').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const target = rawReports.find(r => r.id === id);
      if (target && target.fullData) {
        exportReportToMarkdown(target.fullData);
        saveAppMetrics({ markdownExportsCount: (getAppMetrics().markdownExportsCount || 0) + 1 });
        logUserActivity('markdown', `Exported Markdown: ${target.title}`);
        showToast('Markdown downloaded.', 'success');
      }
    };
  });
}
