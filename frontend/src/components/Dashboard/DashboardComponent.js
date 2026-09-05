// Real Data Dashboard Component Implementation (Backed by Aiven PostgreSQL)

import { getUserSession, getSystemPreferences, setActiveReportData, navigateTo } from '../../state.js';
import { getReportsHistory, getReportById, computeRealDashboardStats, getLastHistoryError } from '../../services/history.js';
import { formatBytes } from '../../utils/toast.js';
import { renderResultScreen } from '../ReportViewer.js';
import { exportPreferencesFile } from '../../services/preferences.js';
import { API_BASE, getAuthHeaders } from '../../utils/api.js';
import { escapeHtml, sanitizeUrl } from '../../utils/sanitize.js';

export async function renderRealDashboard() {
  const dashboardContainer = document.getElementById('page-dashboard');
  if (!dashboardContainer) return;

  // Render quick loading state while fetching from PostgreSQL
  if (!dashboardContainer.querySelector('#dash-loaded-content')) {
    dashboardContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <div class="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs font-mono text-slate-400">Synchronizing analytics from PostgreSQL database...</p>
      </div>
    `;
  }

  const session = getUserSession();
  const email = session ? session.email : 'guest@insightlens.edu';

  let backendDashboardData = null;
  try {
    const res = await fetch(`${API_BASE}/api/dashboard?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) backendDashboardData = json.data;
    }
  } catch (err) {
    console.warn('[Dashboard] /api/dashboard fetch fallback:', err.message);
  }

  // Fetch reports from PostgreSQL
  const reports = await getReportsHistory();
  const stats = computeRealDashboardStats(reports, backendDashboardData?.metrics || {});
  if (backendDashboardData) {
    stats.totalReports = backendDashboardData.totalReports;
    stats.totalImagesAnalyzed = backendDashboardData.metrics?.totalImagesAnalyzed || backendDashboardData.totalReports;
  }
  const systemPreferences = getSystemPreferences();
  const isOnline = navigator.onLine;

  // Build HTML for Real Dashboard
  dashboardContainer.innerHTML = `
    <!-- DASHBOARD HEADER & QUICK ACTIONS BAR -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ghost-border pb-6">
      <div>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/50 mb-2.5">
          Executive Analytics Portal
        </div>
        <h1 class="font-display-lg text-2xl md:text-3xl text-on-surface font-serif font-bold">Researcher Dashboard</h1>
        <p class="font-body-sm text-on-surface-variant text-xs md:text-sm mt-1">Real-time metrics, saved report archives, model telemetry, and usage analytics.</p>
      </div>

      <!-- QUICK ACTIONS -->
      <div class="flex flex-wrap items-center gap-2 self-start md:self-auto text-xs font-medium">
        <button id="qa-new-research" type="button" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md">
          <span class="material-symbols-outlined text-[16px]">add_photo_alternate</span>
          New Research
        </button>
        
        <button id="qa-open-archive" type="button" class="bg-surface-container hover:bg-surface-variant text-on-surface border ghost-border px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer">
          <span class="material-symbols-outlined text-[16px]">folder_open</span>
          Open Archive
        </button>

        <button id="qa-export-all" type="button" class="bg-surface-container hover:bg-surface-variant text-on-surface border ghost-border px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer">
          <span class="material-symbols-outlined text-[16px]">download</span>
          Export All
        </button>

        <button id="qa-settings" type="button" class="bg-surface-container hover:bg-surface-variant text-on-surface border ghost-border px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer" title="Settings">
          <span class="material-symbols-outlined text-[16px]">settings</span>
          Settings
        </button>
      </div>
    </header>

    <!-- REAL METRICS CARDS (12 METRICS) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4.5 text-xs">
      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Total Research Reports</span>
          <span class="material-symbols-outlined text-indigo-400 text-[20px]">description</span>
        </div>
        <div class="font-display-lg text-2xl md:text-3xl font-serif font-bold text-on-surface">${stats.totalReports}</div>
        <span class="text-[10px] text-on-surface-variant">Saved in local history</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Reports Today</span>
          <span class="material-symbols-outlined text-sky-400 text-[20px]">today</span>
        </div>
        <div class="font-display-lg text-2xl md:text-3xl font-serif font-bold text-sky-400">${stats.reportsToday}</div>
        <span class="text-[10px] text-on-surface-variant">Generated today</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Reports This Week</span>
          <span class="material-symbols-outlined text-purple-400 text-[20px]">date_range</span>
        </div>
        <div class="font-display-lg text-2xl md:text-3xl font-serif font-bold text-purple-300">${stats.reportsThisWeek}</div>
        <span class="text-[10px] text-on-surface-variant">Current 7-day period</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Total Images Analyzed</span>
          <span class="material-symbols-outlined text-emerald-400 text-[20px]">image_search</span>
        </div>
        <div class="font-display-lg text-2xl md:text-3xl font-serif font-bold text-emerald-400">${stats.totalImagesAnalyzed}</div>
        <span class="text-[10px] text-on-surface-variant">Visual payloads ingested</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>PDFs Exported</span>
          <span class="material-symbols-outlined text-purple-400 text-[20px]">picture_as_pdf</span>
        </div>
        <div class="font-display-lg text-2xl md:text-3xl font-serif font-bold text-on-surface">${stats.pdfExports}</div>
        <span class="text-[10px] text-on-surface-variant">PDF downloads</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Markdown Exports</span>
          <span class="material-symbols-outlined text-sky-400 text-[20px]">code</span>
        </div>
        <div class="font-display-lg text-2xl md:text-3xl font-serif font-bold text-on-surface">${stats.markdownExports}</div>
        <span class="text-[10px] text-on-surface-variant">Raw Markdown briefs</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Avg Processing Time</span>
          <span class="material-symbols-outlined text-indigo-400 text-[20px]">timer</span>
        </div>
        <div class="font-display-lg text-2xl md:text-3xl font-serif font-bold text-indigo-300">${stats.avgProcessingTime}</div>
        <span class="text-[10px] text-on-surface-variant">Average latency per report</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Evidence labels</span>
          <span class="material-symbols-outlined text-emerald-400 text-[20px]">verified</span>
        </div>
        <div class="font-display-lg text-2xl md:text-3xl font-serif font-bold text-emerald-400">Not calibrated</div>
        <span class="text-[10px] text-on-surface-variant">Observed / inferred / uncertain per report</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Most Used AI Model</span>
          <span class="material-symbols-outlined text-purple-400 text-[20px]">memory</span>
        </div>
        <div class="font-sans text-sm font-bold text-purple-300 truncate mt-1">${stats.mostUsedModel}</div>
        <span class="text-[10px] text-on-surface-variant">Primary inference engine</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Most Used Category</span>
          <span class="material-symbols-outlined text-indigo-400 text-[20px]">category</span>
        </div>
        <div class="font-sans text-sm font-bold text-indigo-300 truncate mt-1">${stats.mostUsedCategory}</div>
        <span class="text-[10px] text-on-surface-variant">Dominant research domain</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Storage Used</span>
          <span class="material-symbols-outlined text-sky-400 text-[20px]">hard_drive</span>
        </div>
        <div class="font-sans text-sm font-bold text-sky-300 truncate mt-1">PostgreSQL</div>
        <span class="text-[10px] text-on-surface-variant">Cloud Database</span>
      </div>

      <div class="bg-surface-container p-5 rounded-2xl ghost-border space-y-1">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span>Last Analysis Date</span>
          <span class="material-symbols-outlined text-amber-400 text-[20px]">event</span>
        </div>
        <div class="font-sans text-xs font-bold text-amber-300 truncate mt-1">${stats.lastAnalysisDate}</div>
        <span class="text-[10px] text-on-surface-variant">Most recent synthesis</span>
      </div>
    </div>

    <!-- MAIN BODY GRID: RECENT ACTIVITY & SYSTEM STATUS -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- RECENT RESEARCH ACTIVITY (7 COLS) -->
      <section class="lg:col-span-7 bg-surface-container p-6 rounded-2xl ghost-border space-y-4">
        <div class="flex items-center justify-between border-b ghost-border pb-3.5">
          <h2 class="font-serif text-base font-bold text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-indigo-400 text-[20px]">history</span>
            Recent Research Activity
          </h2>
          <span class="text-[10px] font-mono text-on-surface-variant font-bold uppercase">Real App History</span>
        </div>

        ${getLastHistoryError() ? `
          <!-- DATABASE ERROR STATE -->
          <div class="p-8 text-center bg-surface-container-lowest rounded-xl border ghost-border space-y-4 error-state-container">
            <div class="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center border border-red-500/20 shadow-md">
              <span class="material-symbols-outlined text-[28px]">cloud_off</span>
            </div>
            <div class="space-y-1.5">
              <h3 class="font-serif text-lg font-bold text-slate-100">Database Synchronization Failed</h3>
              <p class="text-slate-400 text-xs max-w-[340px] mx-auto leading-relaxed">
                Could not connect to PostgreSQL (${escapeHtml(getLastHistoryError())}).
              </p>
            </div>
            <div class="pt-2">
              <button id="dash-retry-btn" type="button" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-md">
                <span class="material-symbols-outlined text-[16px]">refresh</span>
                Retry Connection
              </button>
            </div>
          </div>
        ` : stats.totalReports === 0 ? `
          <!-- ELEGANT EMPTY STATE -->
          <div class="p-8 text-center bg-surface-container-lowest rounded-xl border ghost-border space-y-4 empty-state-container">
            <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20 shadow-md empty-state-icon">
              <span class="material-symbols-outlined text-[28px]">search_off</span>
            </div>
            <div class="space-y-1.5">
              <h3 class="font-serif text-lg font-bold text-slate-100">No research reports yet.</h3>
              <p class="text-slate-400 text-xs max-w-[340px] mx-auto leading-relaxed">
                Upload your first visual artifact to generate real AI research data.
              </p>
            </div>
            <div class="pt-3">
              <button id="dash-empty-start-btn" type="button" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-md btn-active-scale focus-ring">
                <span class="material-symbols-outlined text-[18px]">cloud_upload</span>
                Upload First Image
              </button>
            </div>
          </div>
        ` : `
          <div class="space-y-3">
            ${stats.reportsList.slice(0, 5).map((rpt, idx) => {
              const data = rpt.fullData || {};
              const model = data.actualModel || data.modelUsed || 'gemini-2.5-flash';
              const procTime = data.processingTimeMs ? (data.processingTimeMs / 1000).toFixed(1) + 's' : '~2.0s';
              const conf = data.evidenceStatus || 'Uncertain';
              const safeImg = sanitizeUrl(rpt.thumbnailDataUrl) || sanitizeUrl(rpt.imageDataUrl) || sanitizeUrl(rpt.fullImage) || '/images/urban-analysis.jpg';

              return `
                <div class="bg-surface-container-lowest p-3.5 rounded-xl border ghost-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <img src="${escapeHtml(safeImg)}" alt="${escapeHtml(rpt.title)}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 border ghost-border" />
                    <div class="min-w-0 space-y-1">
                      <h4 class="font-serif text-xs font-bold text-slate-100 truncate">${escapeHtml(rpt.title)}</h4>
                      <div class="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span class="text-indigo-300 font-semibold">${escapeHtml(model)}</span>
                        <span>•</span>
                        <span>Time: ${escapeHtml(procTime)}</span>
                        <span>•</span>
                        <span class="text-emerald-400 font-semibold">Evidence: ${escapeHtml(conf)}</span>
                        <span>•</span>
                        <span>${escapeHtml(rpt.date || 'Recently')}</span>
                      </div>
                    </div>
                  </div>

                  <button type="button" class="dash-reopen-btn bg-surface-container hover:bg-surface-variant text-indigo-300 border ghost-border px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors" data-idx="${idx}">
                    <span class="material-symbols-outlined text-[16px]">visibility</span>
                    Open Again
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </section>

      <!-- SYSTEM STATUS (5 COLS) -->
      <section class="lg:col-span-5 bg-surface-container p-6 rounded-2xl ghost-border space-y-4">
        <div class="flex items-center justify-between border-b ghost-border pb-3.5">
          <h2 class="font-serif text-base font-bold text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-sky-400 text-[20px]">settings_system_daydream</span>
            System Status
          </h2>
          <span class="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">LIVE</span>
        </div>

        <div class="space-y-3 font-mono text-xs">
          <div class="p-3.5 bg-surface-container-lowest rounded-xl border ghost-border space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-on-surface-variant">Gemini Connection:</span>
              <span class="${isOnline ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'} flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
                ${isOnline ? 'Online (REST Endpoint)' : 'Offline Mode'}
              </span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-on-surface-variant">Current Selected Model:</span>
              <strong class="text-indigo-400">${escapeHtml((systemPreferences.model || 'auto').toUpperCase())}</strong>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-on-surface-variant">API Endpoint Status:</span>
              <span class="text-emerald-400 font-bold">Operational (v1beta)</span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-on-surface-variant">Storage Status:</span>
              <span class="text-sky-300 font-bold">${formatBytes(stats.storageUsedBytes)}</span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-on-surface-variant">Theme Preference:</span>
              <span class="text-purple-300 font-bold">${escapeHtml((systemPreferences.theme || 'dark').toUpperCase())}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- REAL CHARTS & DATA BREAKDOWN SECTION -->
    <section class="bg-surface-container p-6 md:p-8 rounded-2xl ghost-border space-y-6">
      <div class="border-b ghost-border pb-4 flex items-center justify-between">
        <div>
          <span class="text-[11px] font-mono text-purple-400 font-bold uppercase tracking-wider block">USAGE ANALYTICS</span>
          <h2 class="font-serif text-lg text-on-surface font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-purple-400 text-[22px]">bar_chart</span>
            Real Application Usage Charts &amp; Distributions
          </h2>
        </div>
      </div>

      ${stats.totalReports === 0 ? `
        <!-- ELEGANT EMPTY STATE FOR CHARTS -->
        <div class="p-8 text-center bg-surface-container-lowest rounded-xl border ghost-border text-xs text-slate-400 font-mono">
          No usage analytics available yet. Generate research reports to populate real distribution charts.
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          
          <!-- CHART 1: CATEGORIES DISTRIBUTION -->
          <div class="bg-surface-container-lowest p-5 rounded-xl border ghost-border space-y-3">
            <h3 class="font-serif font-bold text-on-surface text-xs flex items-center gap-2">
              <span class="material-symbols-outlined text-indigo-400 text-[18px]">pie_chart</span>
              Research Categories Distribution
            </h3>
            <div class="space-y-2 font-mono">
              ${Object.keys(stats.categoryCounts).map(cat => {
                const count = stats.categoryCounts[cat];
                const pct = Math.round((count / stats.totalReports) * 100);
                return `
                  <div>
                    <div class="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span class="truncate pr-2">${escapeHtml(cat)}</span>
                      <span class="text-indigo-400 font-bold">${count} (${pct}%)</span>
                    </div>
                    <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div class="h-full bg-indigo-500 rounded-full" style="width: ${pct}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- CHART 2: MODEL USAGE DISTRIBUTION -->
          <div class="bg-surface-container-lowest p-5 rounded-xl border ghost-border space-y-3">
            <h3 class="font-serif font-bold text-on-surface text-xs flex items-center gap-2">
              <span class="material-symbols-outlined text-purple-400 text-[18px]">memory</span>
              Vision Model Engine Usage
            </h3>
            <div class="space-y-2 font-mono">
              ${Object.keys(stats.modelCounts).map(model => {
                const count = stats.modelCounts[model];
                const pct = Math.round((count / stats.totalReports) * 100);
                return `
                  <div>
                    <div class="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>${model}</span>
                      <span class="text-purple-400 font-bold">${count} (${pct}%)</span>
                    </div>
                    <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div class="h-full bg-purple-500 rounded-full" style="width: ${pct}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- CHART 3: EXPORT FORMATS -->
          <div class="bg-surface-container-lowest p-5 rounded-xl border ghost-border space-y-3">
            <h3 class="font-serif font-bold text-on-surface text-xs flex items-center gap-2">
              <span class="material-symbols-outlined text-sky-400 text-[18px]">download</span>
              Export Formats Distribution
            </h3>
            <div class="grid grid-cols-2 gap-3 font-mono">
              <div class="p-3 bg-surface-container rounded-lg border ghost-border space-y-1">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">PDF Documents</span>
                <strong class="text-sky-300 text-sm font-bold block">${stats.pdfExports}</strong>
              </div>
              <div class="p-3 bg-surface-container rounded-lg border ghost-border space-y-1">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Markdown Briefs</span>
                <strong class="text-emerald-300 text-sm font-bold block">${stats.markdownExports}</strong>
              </div>
            </div>
          </div>

          <!-- CHART 4: WEEKLY ACTIVITY READOUT -->
          <div class="bg-surface-container-lowest p-5 rounded-xl border ghost-border space-y-3">
            <h3 class="font-serif font-bold text-on-surface text-xs flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-400 text-[18px]">date_range</span>
              Reports per Day (This Week)
            </h3>
            <div class="grid grid-cols-7 gap-1 text-center font-mono text-[10px]">
              ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                const count = stats.dayCounts[day] || 0;
                return `
                  <div class="p-2 bg-surface-container rounded-lg border ghost-border space-y-1">
                    <span class="text-slate-400 block text-[9px]">${day}</span>
                    <strong class="text-emerald-400 font-bold block">${count}</strong>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `}
    </section>
  `;

  // Attach Event Listeners for Quick Actions and Open Again Buttons
  document.getElementById('qa-new-research')?.addEventListener('click', () => navigateTo('desk'));
  document.getElementById('qa-open-archive')?.addEventListener('click', () => navigateTo('archive'));
  document.getElementById('qa-export-all')?.addEventListener('click', () => exportPreferencesFile());
  document.getElementById('qa-settings')?.addEventListener('click', () => navigateTo('settings'));
  document.getElementById('dash-empty-start-btn')?.addEventListener('click', () => navigateTo('desk'));
  document.getElementById('dash-retry-btn')?.addEventListener('click', () => renderRealDashboard());

  document.querySelectorAll('.dash-reopen-btn').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      let selected = stats.reportsList[idx];
      if (selected) {
        if (!selected.fullData) {
          const fetched = await getReportById(selected.id);
          if (fetched) selected = fetched;
        }
        const dataToRender = { 
          ...(selected.fullData || selected), 
          imageDataUrl: selected.imageDataUrl || selected.fullImage || selected.thumbnailDataUrl || '', 
          thumbnailDataUrl: selected.thumbnailDataUrl || null,
          id: selected.id,
          title: selected.title || (selected.fullData && selected.fullData.title),
          subject: selected.subject || (selected.fullData && selected.fullData.subject)
        };
        setActiveReportData(dataToRender);
        renderResultScreen(dataToRender);
      }
    };
  });
}

// Deprecated stub: persistence is handled directly by PostgreSQL /api/analyze
export async function saveReportToHistory(imageDataUrl, reportData) {
  return null;
}
