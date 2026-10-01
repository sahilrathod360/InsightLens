// Comprehensive Knowledge Workspace Component
// Backed by PostgreSQL: Overview, Time Machine, Knowledge Gaps, Decision Memory, Claim Domino, Project Autopsy

import {
  fetchOverviewStats,
  analyzeEvolution,
  fetchEvolutionHistory,
  fetchEvolutionById,
  deleteEvolution,
  analyzeKnowledgeGaps,
  fetchKnowledgeGaps,
  createKnowledgeGap,
  updateKnowledgeGap,
  deleteKnowledgeGap,
  fetchDecisions,
  createDecision,
  updateDecision,
  validateDecision,
  fetchGraph,
  saveGraphNode,
  saveGraphEdge,
  simulateWhatIf,
  generateAutopsy,
  fetchAutopsies,
  fetchAutopsyById,
  stressTestAssumptions,
  runAdversarialReview
} from '../../services/knowledgeApi.js';

import { getActiveReportData, navigateTo } from '../../state.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';

let activeKnowledgeTab = 'overview'; // 'overview', 'timemachine', 'gaps', 'decisions', 'domino', 'autopsy'
let currentEvolutionData = null;
let currentWhatIfData = null;
let currentAutopsyData = null;
let liveGraphData = { nodes: [], edges: [] };

const PRESET_DATASETS = {
  'api-spec': {
    title: 'High-Throughput Vision API Specification (v1.0 vs v2.0)',
    sourceA: `# Vision Processing API v1.0\nSystem supports 100 concurrent users.\nPostgreSQL database used for persistent record storage.\nClient authentication requires JWT bearer tokens.\nSynchronous processing pipeline is enabled for all analysis tasks.\nLegacy XML export format is supported for archival.`,
    sourceB: `# Vision Processing API v2.0\nSystem supports 1000 concurrent users.\nPostgreSQL database used for persistent record storage.\nClient authentication requires JWT bearer tokens with refresh rotation.\nAsynchronous queue pipeline is enabled for large multimodal tasks.\nNew Webhook dispatcher added for real-time third-party alerts.`
  },
  'ai-paper': {
    title: 'Multimodal Research Paper (Initial Preprint vs Final Revision)',
    sourceA: `# Research Paper Preprint\nOur proprietary model is more accurate than existing systems on baseline benchmarks.\nInference executes in real-time with sub-second latency on standard GPUs.\nSystem extracts complete diagram topology without human intervention.\nTraining was performed on a curated private academic dataset.`,
    sourceB: `# Research Paper Final Revision\nOur proposed vision model achieves comparable precision against existing baseline models under standardized benchmark conditions.\nInference executes with measured p95 latency of 1.8 seconds on standard GPUs.\nSystem extracts partial diagram topology with automated validation warnings for unresolved connectors.\nTraining and evaluation were validated against a public stratified benchmark set.`
  }
};

export function setupKnowledgeEvents() {
  window.switchKnowledgeTab = switchKnowledgeTab;
  window.loadPresetKnowledge = loadPresetKnowledge;
  window.loadCurrentReportIntoKnowledge = loadCurrentReportIntoKnowledge;
  window.openNewDecisionModal = openNewDecisionModal;
  window.closeNewDecisionModal = closeNewDecisionModal;
  window.openNewGapModal = openNewGapModal;
  window.closeNewGapModal = closeNewGapModal;
  window.openWhatIfModal = openWhatIfModal;
  window.closeWhatIfModal = closeWhatIfModal;

  // Setup tab buttons
  document.querySelectorAll('.knowledge-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchKnowledgeTab(tab);
    });
  });

  // Time Machine Run Button
  document.getElementById('run-timemachine-btn')?.addEventListener('click', handleRunTimeMachine);

  // Gaps Analyze Button
  document.getElementById('run-gaps-analyze-btn')?.addEventListener('click', handleAnalyzeGaps);

  // New Decision Form Submission
  document.getElementById('new-decision-form')?.addEventListener('submit', handleCreateDecisionSubmit);

  // New Gap Form Submission
  document.getElementById('new-gap-form')?.addEventListener('submit', handleCreateGapSubmit);

  // What-If Form Submission
  document.getElementById('whatif-form')?.addEventListener('submit', handleSimulateWhatIfSubmit);

  // Autopsy Generation Form Submission
  document.getElementById('autopsy-form')?.addEventListener('submit', handleGenerateAutopsySubmit);
}

export async function renderKnowledgePage() {
  await switchKnowledgeTab(activeKnowledgeTab || 'overview');
}

export async function switchKnowledgeTab(tabId) {
  activeKnowledgeTab = tabId;

  // Update tab buttons UI
  document.querySelectorAll('.knowledge-tab-btn').forEach(btn => {
    const isCurrent = btn.getAttribute('data-tab') === tabId;
    if (isCurrent) {
      btn.className = 'knowledge-tab-btn px-4 py-2 rounded-xl bg-indigo-600 text-white font-mono text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0';
    } else {
      btn.className = 'knowledge-tab-btn px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-mono text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0';
    }
  });

  // Hide all panes
  document.querySelectorAll('.knowledge-tab-pane').forEach(pane => {
    pane.classList.add('hidden');
  });

  // Show active pane
  const activePane = document.getElementById(`knowledge-pane-${tabId}`);
  if (activePane) {
    activePane.classList.remove('hidden');
  }

  // Load content for active tab
  if (tabId === 'overview') {
    await renderOverviewTab();
  } else if (tabId === 'timemachine') {
    await renderTimeMachineTab();
  } else if (tabId === 'gaps') {
    await renderGapsTab();
  } else if (tabId === 'decisions') {
    await renderDecisionsTab();
  } else if (tabId === 'domino') {
    await renderDominoTab();
  } else if (tabId === 'autopsy') {
    await renderAutopsyTab();
  }
}

// ============================================================================
// 1. KNOWLEDGE OVERVIEW TAB
// ============================================================================
async function renderOverviewTab() {
  const container = document.getElementById('knowledge-overview-container');
  if (!container) return;

  container.innerHTML = `
    <div class="py-12 flex flex-col items-center justify-center space-y-3">
      <div class="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
      <span class="text-xs font-mono text-slate-400">Loading PostgreSQL Knowledge stats...</span>
    </div>
  `;

  try {
    const stats = await fetchOverviewStats();
    
    container.innerHTML = `
      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div class="report-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Claims</span>
          <span class="text-2xl font-serif font-bold text-slate-100">${stats.totalClaims || 0}</span>
          <span class="text-[10px] text-slate-500 block">From active briefs</span>
        </div>

        <div class="report-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span class="text-[10px] font-mono text-sky-400 uppercase tracking-wider block">Assumptions</span>
          <span class="text-2xl font-serif font-bold text-sky-200">${stats.totalAssumptions || 0}</span>
          <span class="text-[10px] text-slate-500 block">Stress-tested</span>
        </div>

        <div class="report-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span class="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Decisions</span>
          <span class="text-2xl font-serif font-bold text-emerald-200">${stats.totalDecisions || 0}</span>
          <span class="text-[10px] text-emerald-400/80 block">${stats.activeDecisions || 0} Active</span>
        </div>

        <div class="report-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span class="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">Knowledge Gaps</span>
          <span class="text-2xl font-serif font-bold text-amber-200">${stats.totalKnowledgeGaps || 0}</span>
          <span class="text-[10px] text-amber-400/80 block">${stats.openGaps || 0} Open</span>
        </div>

        <div class="report-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span class="text-[10px] font-mono text-purple-400 uppercase tracking-wider block">Time Machine</span>
          <span class="text-2xl font-serif font-bold text-purple-200">${stats.totalEvolutionAnalyses || 0}</span>
          <span class="text-[10px] text-slate-500 block">Saved revisions</span>
        </div>

        <div class="report-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span class="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">Unresolved</span>
          <span class="text-2xl font-serif font-bold text-rose-200">${stats.unresolvedItems || 0}</span>
          <span class="text-[10px] text-rose-400/80 block">Requires attention</span>
        </div>
      </div>

      <!-- Quick Action Cards / Empty State -->
      ${!stats.hasData ? `
        <div class="p-8 rounded-2xl bg-surface-container/70 border border-white/5 text-center space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <span class="material-symbols-outlined text-2xl">auto_stories</span>
          </div>
          <div class="space-y-1">
            <h3 class="font-serif font-bold text-slate-100 text-base">No knowledge records yet</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Start tracking document evolution, cataloging knowledge gaps, and recording structural architectural decisions.</p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button onclick="window.loadCurrentReportIntoKnowledge()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-md cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">sync</span>
              Load Active Report
            </button>
            <button onclick="window.switchKnowledgeTab('timemachine')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-white/5 flex items-center gap-1.5 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">compare_arrows</span>
              Compare Versions (Time Machine)
            </button>
            <button onclick="window.openNewDecisionModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-white/5 flex items-center gap-1.5 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">add_circle</span>
              New Decision Record
            </button>
          </div>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Recent Activity & Status -->
          <div class="report-card p-5 rounded-2xl space-y-3">
            <div class="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span class="font-serif font-bold text-slate-100 text-xs flex items-center gap-2">
                <span class="material-symbols-outlined text-emerald-400 text-[16px]">verified</span>
                Knowledge Intelligence Overview
              </span>
              <span class="text-[10px] font-mono text-slate-400">PostgreSQL Verified</span>
            </div>
            <p class="text-xs text-slate-300 font-sans leading-relaxed">
              Your research workspace contains active persistent tracking for claims, structural assumptions, and reversible decision records. All records are scoped to your authenticated account.
            </p>
            <div class="flex flex-wrap gap-2 pt-2">
              <button onclick="window.switchKnowledgeTab('timemachine')" class="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-mono font-medium border border-indigo-500/30 flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[15px]">compare_arrows</span> Time Machine
              </button>
              <button onclick="window.switchKnowledgeTab('gaps')" class="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-mono font-medium border border-amber-500/30 flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[15px]">report_problem</span> Knowledge Gaps
              </button>
              <button onclick="window.switchKnowledgeTab('decisions')" class="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono font-medium border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[15px]">history_edu</span> Decision Memory
              </button>
              <button onclick="window.switchKnowledgeTab('domino')" class="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-mono font-medium border border-sky-500/30 flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[15px]">account_tree</span> Claim Domino
              </button>
            </div>
          </div>

          <!-- Shortcuts -->
          <div class="report-card p-5 rounded-2xl space-y-3">
            <div class="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span class="font-serif font-bold text-slate-100 text-xs flex items-center gap-2">
                <span class="material-symbols-outlined text-indigo-400 text-[16px]">bolt</span>
                Quick Workflows
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button onclick="window.openNewGapModal()" class="p-3 rounded-xl bg-[#05060a] hover:bg-slate-800 text-left border border-white/5 space-y-1 transition-all cursor-pointer">
                <strong class="text-amber-300 block font-serif">+ Catalog Gap</strong>
                <span class="text-[11px] text-slate-400 block">Record missing proof or ambiguous requirement</span>
              </button>
              <button onclick="window.openNewDecisionModal()" class="p-3 rounded-xl bg-[#05060a] hover:bg-slate-800 text-left border border-white/5 space-y-1 transition-all cursor-pointer">
                <strong class="text-emerald-300 block font-serif">+ New Decision</strong>
                <span class="text-[11px] text-slate-400 block">Record architectural decision with alternatives</span>
              </button>
              <button onclick="window.switchKnowledgeTab('domino')" class="p-3 rounded-xl bg-[#05060a] hover:bg-slate-800 text-left border border-white/5 space-y-1 transition-all cursor-pointer">
                <strong class="text-sky-300 block font-serif">What-If Sandbox</strong>
                <span class="text-[11px] text-slate-400 block">Simulate hypothetical assumption shifts</span>
              </button>
              <button onclick="window.switchKnowledgeTab('autopsy')" class="p-3 rounded-xl bg-[#05060a] hover:bg-slate-800 text-left border border-white/5 space-y-1 transition-all cursor-pointer">
                <strong class="text-purple-300 block font-serif">Project Autopsy</strong>
                <span class="text-[11px] text-slate-400 block">Reconstruct plan vs final state timeline</span>
              </button>
            </div>
          </div>
        </div>
      `}
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-xs text-rose-300 font-mono">
        Failed to load knowledge overview: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

// ============================================================================
// 2. KNOWLEDGE TIME MACHINE (EVOLUTION) TAB
// ============================================================================
async function renderTimeMachineTab() {
  await loadTimeMachineHistory();
}

async function handleRunTimeMachine() {
  const sourceA = document.getElementById('timemachine-source-a')?.value || '';
  const sourceB = document.getElementById('timemachine-source-b')?.value || '';
  const title = document.getElementById('timemachine-title-input')?.value || 'Document Evolution Analysis';
  const labelA = document.getElementById('timemachine-label-a')?.value || 'Version 1';
  const labelB = document.getElementById('timemachine-label-b')?.value || 'Version 2';

  if (!sourceA.trim() || !sourceB.trim()) {
    showToast('Please provide both Version A (Baseline) and Version B (Current) contents.', 'warning');
    return;
  }

  const btn = document.getElementById('run-timemachine-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Comparing Revisions...';
  }

  try {
    const data = await analyzeEvolution(sourceA, sourceB, { title, sourceALabel: labelA, sourceBLabel: labelB });
    currentEvolutionData = data;
    renderTimeMachineResults(data);
    await loadTimeMachineHistory();
    showToast('Time Machine comparison analyzed & saved to PostgreSQL!', 'success');
  } catch (err) {
    showToast(`Comparison error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">compare_arrows</span> Compare &amp; Save Evolution';
    }
  }
}

function renderTimeMachineResults(data) {
  const container = document.getElementById('timemachine-results-container');
  if (!container) return;

  container.classList.remove('hidden');

  const m = data.metrics || {};
  const total = m.totalClaimsTracked || 1;
  const pctUnchanged = Math.round((m.unchangedCount / total) * 100);
  const pctModified = Math.round((m.modifiedCount / total) * 100);
  const pctNew = Math.round((m.newCount / total) * 100);
  const pctRemoved = Math.round((m.removedCount / total) * 100);
  const pctContradicted = Math.round((m.contradictionsCount / total) * 100);

  const changes = data.changes || [];

  container.innerHTML = `
    <!-- Summary Bar -->
    <div class="report-card p-5 rounded-2xl space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-serif font-bold text-slate-100 text-sm flex items-center gap-2">
          <span class="material-symbols-outlined text-indigo-400 text-[18px]">stacked_bar_chart</span>
          Semantic Change Map: ${escapeHtml(data.title || 'Evolution Analysis')}
        </h3>
        <span class="text-[11px] font-mono text-slate-400">${changes.length} Propositions</span>
      </div>

      <div class="h-4 rounded-xl bg-slate-800 flex overflow-hidden border border-white/10 shadow-inner">
        <div style="width: ${pctUnchanged}%" title="Unchanged: ${m.unchangedCount}" class="bg-slate-600"></div>
        <div style="width: ${pctModified}%" title="Modified: ${m.modifiedCount}" class="bg-amber-500"></div>
        <div style="width: ${pctNew}%" title="New: ${m.newCount}" class="bg-emerald-500"></div>
        <div style="width: ${pctRemoved}%" title="Removed: ${m.removedCount}" class="bg-rose-500"></div>
        <div style="width: ${pctContradicted}%" title="Contradicted: ${m.contradictionsCount}" class="bg-purple-600"></div>
      </div>

      <div class="flex flex-wrap gap-3 text-[11px] font-mono pt-1 text-slate-300">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-emerald-500"></span> ${m.newCount || 0} New</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-amber-500"></span> ${m.modifiedCount || 0} Modified</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-rose-500"></span> ${m.removedCount || 0} Removed</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-purple-600"></span> ${m.contradictionsCount || 0} Contradicted</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-slate-600"></span> ${m.unchangedCount || 0} Stable</span>
      </div>
    </div>

    <!-- Delta Narrative -->
    ${data.deltaNarrative ? `
      <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-sans text-indigo-200 leading-relaxed">
        <strong>Semantic Delta Summary:</strong> ${escapeHtml(data.deltaNarrative)}
      </div>
    ` : ''}

    <!-- Clickable Change Cards Grid -->
    <div class="space-y-3">
      <h4 class="font-serif font-bold text-slate-100 text-sm">Itemized Semantic Delta Details (Click for inspection)</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        ${changes.map((c, i) => {
          let badgeColor = 'bg-slate-700 text-slate-300';
          if (c.status === 'NEW') badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
          if (c.status === 'MODIFIED') badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
          if (c.status === 'REMOVED') badgeColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
          if (c.status === 'CONTRADICTED') badgeColor = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';

          return `
            <div onclick="alert('Change Detail:\\nType: ${escapeHtml(c.status)}\\nPrevious: ${escapeHtml(c.previousStatement || 'None')}\\nCurrent: ${escapeHtml(c.currentStatement || 'None')}\\nImpact: ${escapeHtml(c.impact || 'Standard delta')}')" class="report-card p-4 rounded-2xl border border-white/5 hover:border-indigo-500/40 transition-all cursor-pointer space-y-2.5 group">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${badgeColor}">${escapeHtml(c.status)}</span>
                <span class="text-[10px] font-mono text-slate-400">${escapeHtml(c.category || 'Proposition')}</span>
              </div>

              <div class="space-y-1.5 text-xs">
                ${c.previousStatement ? `
                  <div>
                    <span class="text-[10px] font-mono text-rose-400 block">Previous:</span>
                    <p class="text-slate-400 line-through text-[11px] leading-relaxed">${escapeHtml(c.previousStatement)}</p>
                  </div>
                ` : ''}

                <div>
                  <span class="text-[10px] font-mono text-emerald-400 block">${c.previousStatement ? 'Current Revision:' : 'Added Statement:'}</span>
                  <p class="text-slate-100 font-medium text-[11px] leading-relaxed group-hover:text-indigo-200 transition-colors">${escapeHtml(c.currentStatement || c.statement)}</p>
                </div>

                ${c.impact ? `
                  <div class="pt-1 text-[10px] font-mono text-amber-300/80 border-t border-white/5">
                    Impact: ${escapeHtml(c.impact)}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

async function loadTimeMachineHistory() {
  const container = document.getElementById('timemachine-history-list');
  if (!container) return;

  try {
    const list = await fetchEvolutionHistory();
    if (list.length === 0) {
      container.innerHTML = `<span class="text-xs font-mono text-slate-500">No saved revision comparisons yet.</span>`;
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-white/5 hover:border-indigo-500/30 transition-all text-xs">
        <div class="space-y-0.5">
          <strong class="font-serif text-slate-200 block">${escapeHtml(item.title)}</strong>
          <span class="text-[10px] font-mono text-slate-400">${escapeHtml(item.source_a_label)} ➔ ${escapeHtml(item.source_b_label)} • ${new Date(item.created_at).toLocaleDateString()}</span>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.reopenEvolution('${escapeHtml(item.id)}')" class="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-mono cursor-pointer">View</button>
          <button onclick="window.deleteEvolutionItem('${escapeHtml(item.id)}')" class="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 text-xs cursor-pointer"><span class="material-symbols-outlined text-[16px]">delete</span></button>
        </div>
      </div>
    `).join('');

    window.reopenEvolution = async (id) => {
      try {
        const item = await fetchEvolutionById(id);
        if (item) {
          renderTimeMachineResults({
            title: item.title,
            metrics: item.change_metrics,
            changes: item.semantic_changes,
            impactSummary: item.impact_graph
          });
          showToast(`Reopened evolution analysis: ${item.title}`, 'info');
        }
      } catch (e) {
        showToast(e.message, 'error');
      }
    };

    window.deleteEvolutionItem = async (id) => {
      if (!confirm('Delete this saved evolution comparison?')) return;
      try {
        await deleteEvolution(id);
        showToast('Evolution analysis deleted.', 'info');
        await loadTimeMachineHistory();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
  } catch (err) {
    container.innerHTML = `<span class="text-xs font-mono text-rose-400">Failed to load history.</span>`;
  }
}

// ============================================================================
// 3. KNOWLEDGE GAP DETECTOR TAB
// ============================================================================
async function renderGapsTab() {
  await loadKnowledgeGapsList();
}

async function handleAnalyzeGaps() {
  const text = document.getElementById('gaps-input-text')?.value || '';
  if (!text.trim()) {
    showToast('Please paste document or report text to analyze for gaps.', 'warning');
    return;
  }

  const btn = document.getElementById('run-gaps-analyze-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Detecting Gaps...';
  }

  try {
    const gaps = await analyzeKnowledgeGaps(text);
    showToast(`Detected and saved ${gaps.length} knowledge gap(s)!`, 'success');
    await loadKnowledgeGapsList();
  } catch (err) {
    showToast(`Gap detection error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">radar</span> Analyze Knowledge Gaps';
    }
  }
}

async function loadKnowledgeGapsList() {
  const container = document.getElementById('gaps-list-container');
  if (!container) return;

  const statusFilter = document.getElementById('gaps-filter-status')?.value || 'ALL';
  const typeFilter = document.getElementById('gaps-filter-type')?.value || 'ALL';

  container.innerHTML = `
    <div class="col-span-full py-8 text-center text-xs font-mono text-slate-400">
      <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      Loading knowledge gaps...
    </div>
  `;

  try {
    const gaps = await fetchKnowledgeGaps({ status: statusFilter, gap_type: typeFilter });
    if (gaps.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 rounded-2xl bg-surface-container/50 border border-white/5 text-center space-y-2">
          <span class="material-symbols-outlined text-3xl text-slate-500">task_alt</span>
          <h4 class="font-serif font-bold text-slate-200 text-sm">No knowledge gaps found</h4>
          <p class="text-xs text-slate-400">Analyze an artifact or add a manual gap to begin tracking.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = gaps.map(g => {
      let statusColor = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      if (g.status === 'INVESTIGATING') statusColor = 'bg-sky-500/10 text-sky-300 border-sky-500/20';
      if (g.status === 'RESOLVED') statusColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      if (g.status === 'ACCEPTED') statusColor = 'bg-slate-800 text-slate-400 border-white/5';

      return `
        <div class="report-card p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-3">
          <div class="space-y-2">
            <div class="flex items-start justify-between gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/5">${escapeHtml(g.gap_type)}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${statusColor} border font-bold">${escapeHtml(g.status)}</span>
            </div>

            <h4 class="font-serif font-bold text-slate-100 text-sm leading-snug">${escapeHtml(g.title)}</h4>
            <p class="text-xs text-slate-300 font-sans leading-relaxed">${escapeHtml(g.description || '')}</p>

            ${g.source_reference ? `
              <div class="text-[10px] font-mono text-slate-400 bg-[#05060a] p-2 rounded-lg border border-white/5">
                Ref: ${escapeHtml(g.source_reference)}
              </div>
            ` : ''}

            ${g.resolution_notes ? `
              <div class="text-[11px] font-sans text-emerald-300/90 bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
                <strong>Resolution Note:</strong> ${escapeHtml(g.resolution_notes)}
              </div>
            ` : ''}
          </div>

          <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
            <select onchange="window.handleUpdateGapStatus('${escapeHtml(g.id)}', this.value)" class="bg-[#05060a] text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none">
              <option value="OPEN" ${g.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
              <option value="INVESTIGATING" ${g.status === 'INVESTIGATING' ? 'selected' : ''}>INVESTIGATING</option>
              <option value="RESOLVED" ${g.status === 'RESOLVED' ? 'selected' : ''}>RESOLVED</option>
              <option value="ACCEPTED" ${g.status === 'ACCEPTED' ? 'selected' : ''}>ACCEPTED</option>
            </select>

            <button onclick="window.handleDeleteGap('${escapeHtml(g.id)}')" class="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors" title="Delete gap">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    window.handleUpdateGapStatus = async (id, status) => {
      try {
        let notes = null;
        if (status === 'RESOLVED') {
          notes = prompt('Enter resolution notes or verified proof:') || '';
        }
        await updateKnowledgeGap(id, { status, resolution_notes: notes });
        showToast(`Knowledge gap marked as ${status}.`, 'success');
        await loadKnowledgeGapsList();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };

    window.handleDeleteGap = async (id) => {
      if (!confirm('Delete this knowledge gap?')) return;
      try {
        await deleteKnowledgeGap(id);
        showToast('Knowledge gap deleted.', 'info');
        await loadKnowledgeGapsList();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="col-span-full p-4 rounded-xl bg-rose-500/10 text-rose-300 text-xs font-mono">Failed to load gaps: ${escapeHtml(err.message)}</div>`;
  }
}

function openNewGapModal() {
  document.getElementById('new-gap-modal')?.classList.add('show');
}
function closeNewGapModal() {
  document.getElementById('new-gap-modal')?.classList.remove('show');
}

async function handleCreateGapSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('new-gap-title')?.value || '';
  const gap_type = document.getElementById('new-gap-type')?.value || 'Missing Evidence';
  const description = document.getElementById('new-gap-description')?.value || '';
  const impact_level = document.getElementById('new-gap-impact')?.value || 'medium';

  if (!title.trim()) {
    showToast('Please provide a title for the knowledge gap.', 'warning');
    return;
  }

  try {
    await createKnowledgeGap({ title, gap_type, description, impact_level, status: 'OPEN' });
    showToast('Knowledge gap created & persisted to PostgreSQL!', 'success');
    closeNewGapModal();
    document.getElementById('new-gap-form')?.reset();
    await loadKnowledgeGapsList();
  } catch (err) {
    showToast(`Create gap error: ${err.message}`, 'error');
  }
}

// ============================================================================
// 4. DECISION MEMORY TAB
// ============================================================================
async function renderDecisionsTab() {
  await loadDecisionsList();
}

async function loadDecisionsList() {
  const container = document.getElementById('decisions-list-container');
  if (!container) return;

  const statusFilter = document.getElementById('decisions-filter-status')?.value || 'ALL';

  container.innerHTML = `
    <div class="col-span-full py-8 text-center text-xs font-mono text-slate-400">
      <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      Loading decision memory...
    </div>
  `;

  try {
    const decisions = await fetchDecisions({ status: statusFilter });
    if (decisions.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 rounded-2xl bg-surface-container/50 border border-white/5 text-center space-y-2">
          <span class="material-symbols-outlined text-3xl text-slate-500">history_edu</span>
          <h4 class="font-serif font-bold text-slate-200 text-sm">No decisions recorded yet</h4>
          <p class="text-xs text-slate-400">Record architectural and research decisions with alternatives and assumptions.</p>
          <button onclick="window.openNewDecisionModal()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium inline-flex items-center gap-1.5 shadow-md cursor-pointer mt-2">
            <span class="material-symbols-outlined text-[16px]">add_circle</span>
            Record First Decision
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = decisions.map(d => {
      let statusBadge = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      if (d.status === 'REVISITING') statusBadge = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      if (d.status === 'REVERSED') statusBadge = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      if (d.status === 'SUPERSEDED') statusBadge = 'bg-purple-500/10 text-purple-300 border-purple-500/20';

      const alternatives = d.alternatives || [];
      const assumptions = d.related_assumptions || [];

      return `
        <div class="report-card p-5 rounded-2xl border border-white/5 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${statusBadge} border">${escapeHtml(d.status)}</span>
                <span class="text-[10px] font-mono text-slate-400">${new Date(d.created_at).toLocaleDateString()}</span>
              </div>
              <h4 class="font-serif font-bold text-slate-100 text-base group-hover:text-emerald-300 transition-colors">${escapeHtml(d.decision)}</h4>
            </div>
          </div>

          <div class="space-y-2 text-xs text-slate-300 font-sans">
            <div>
              <strong class="text-slate-400 font-mono text-[10px] uppercase block">Reason &amp; Rationale:</strong>
              <p class="leading-relaxed text-[11px]">${escapeHtml(d.reason)}</p>
            </div>

            ${alternatives.length > 0 ? `
              <div>
                <strong class="text-slate-400 font-mono text-[10px] uppercase block">Alternatives Considered:</strong>
                <ul class="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                  ${alternatives.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${assumptions.length > 0 ? `
              <div>
                <strong class="text-sky-400 font-mono text-[10px] uppercase block">Related Assumptions:</strong>
                <div class="flex flex-wrap gap-1 mt-1">
                  ${assumptions.map(asm => `<span class="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-[10px] font-mono border border-sky-500/20">${escapeHtml(asm)}</span>`).join('')}
                </div>
              </div>
            ` : ''}

            ${d.reversal_reason ? `
              <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                <strong>Reversal Notice:</strong> ${escapeHtml(d.reversal_reason)}
              </div>
            ` : ''}
          </div>

          <div class="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
            <button onclick="window.handleValidateDecision('${escapeHtml(d.id)}')" class="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-mono flex items-center gap-1.5 border border-indigo-500/30 cursor-pointer">
              <span class="material-symbols-outlined text-[15px]">verified</span>
              Is this decision still valid?
            </button>

            <div class="flex items-center gap-1.5">
              <select onchange="window.handleUpdateDecisionStatus('${escapeHtml(d.id)}', this.value)" class="bg-[#05060a] text-slate-200 text-xs font-mono rounded-lg px-2 py-1 border border-white/10 focus:outline-none">
                <option value="ACTIVE" ${d.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                <option value="REVISITING" ${d.status === 'REVISITING' ? 'selected' : ''}>REVISITING</option>
                <option value="REVERSED" ${d.status === 'REVERSED' ? 'selected' : ''}>REVERSED</option>
                <option value="SUPERSEDED" ${d.status === 'SUPERSEDED' ? 'selected' : ''}>SUPERSEDED</option>
              </select>
            </div>
          </div>
        </div>
      `;
    }).join('');

    window.handleValidateDecision = async (id) => {
      try {
        const val = await validateDecision(id);
        const threatsMsg = val.threats?.length ? `\n\nPotential Threats:\n• ` + val.threats.join('\n• ') : '';
        alert(`Decision Validity Assessment:\nVerdict: ${val.verdict}\n${val.reasoning}${threatsMsg}`);
      } catch (e) {
        showToast(e.message, 'error');
      }
    };

    window.handleUpdateDecisionStatus = async (id, status) => {
      try {
        let revReason = null;
        if (status === 'REVERSED') {
          revReason = prompt('Enter reversal reason / trigger:');
        }
        await updateDecision(id, { status, reversal_reason: revReason });
        showToast(`Decision marked as ${status}.`, 'success');
        await loadDecisionsList();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="col-span-full p-4 rounded-xl bg-rose-500/10 text-rose-300 text-xs font-mono">Failed to load decisions: ${escapeHtml(err.message)}</div>`;
  }
}

function openNewDecisionModal() {
  document.getElementById('new-decision-modal')?.classList.add('show');
}
function closeNewDecisionModal() {
  document.getElementById('new-decision-modal')?.classList.remove('show');
}

async function handleCreateDecisionSubmit(e) {
  e.preventDefault();
  const decision = document.getElementById('new-decision-text')?.value || '';
  const reason = document.getElementById('new-decision-reason')?.value || '';
  const altRaw = document.getElementById('new-decision-alternatives')?.value || '';
  const asmRaw = document.getElementById('new-decision-assumptions')?.value || '';
  const evidence = document.getElementById('new-decision-evidence')?.value || '';

  if (!decision.trim() || !reason.trim()) {
    showToast('Please provide both a decision statement and justification.', 'warning');
    return;
  }

  const alternatives = altRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const related_assumptions = asmRaw.split('\n').map(s => s.trim()).filter(Boolean);

  try {
    await createDecision({ decision, reason, alternatives, related_assumptions, evidence, status: 'ACTIVE' });
    showToast('Decision record saved & persisted to PostgreSQL!', 'success');
    closeNewDecisionModal();
    document.getElementById('new-decision-form')?.reset();
    await loadDecisionsList();
  } catch (err) {
    showToast(`Save decision error: ${err.message}`, 'error');
  }
}

// ============================================================================
// 5. CLAIM DOMINO & WHAT-IF TAB
// ============================================================================
async function renderDominoTab() {
  const container = document.getElementById('domino-graph-workspace');
  if (!container) return;

  container.innerHTML = `
    <div class="py-12 text-center text-xs font-mono text-slate-400">
      <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      Loading Domino graph...
    </div>
  `;

  try {
    liveGraphData = await fetchGraph();
    renderDominoGraph(liveGraphData);
  } catch (err) {
    container.innerHTML = `<div class="p-4 bg-rose-500/10 text-rose-300 text-xs font-mono">Failed to load graph: ${escapeHtml(err.message)}</div>`;
  }
}

function renderDominoGraph(graph) {
  const container = document.getElementById('domino-graph-workspace');
  if (!container) return;

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  if (nodes.length === 0) {
    container.innerHTML = `
      <div class="p-8 rounded-2xl bg-surface-container/50 border border-white/5 text-center space-y-3">
        <span class="material-symbols-outlined text-3xl text-slate-500">hub</span>
        <h4 class="font-serif font-bold text-slate-200 text-sm">Domino Graph is currently empty</h4>
        <p class="text-xs text-slate-400 max-w-md mx-auto">Create decisions, assumptions, or stress-test an active report to populate the multi-layered domino graph.</p>
        <button onclick="window.seedSampleDominoGraph()" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-medium shadow-md cursor-pointer">
          Seed Sample Graph
        </button>
      </div>
    `;

    window.seedSampleDominoGraph = async () => {
      try {
        await saveGraphNode({ id: 'node-asm-1', node_type: 'ASSUMPTION', label: 'Single PostgreSQL DB', detail: 'Assumes database latency < 5ms under standard query loads.' });
        await saveGraphNode({ id: 'node-dec-1', node_type: 'DECISION', label: 'Use JWT Auth with Refresh', detail: 'Stateless authentication tokens.' });
        await saveGraphNode({ id: 'node-req-1', node_type: 'REQUIREMENT', label: 'Support 1000 Concurrent Users', detail: 'High-throughput concurrency standard.' });
        await saveGraphNode({ id: 'node-comp-1', node_type: 'COMPONENT', label: 'Analysis Admission Queue', detail: 'Throttles concurrent heavy AI vision tasks.' });
        
        await saveGraphEdge({ source_node_id: 'node-asm-1', target_node_id: 'node-dec-1', relation_type: 'SUPPORTS' });
        await saveGraphEdge({ source_node_id: 'node-dec-1', target_node_id: 'node-req-1', relation_type: 'DEPENDS_ON' });
        await saveGraphEdge({ source_node_id: 'node-req-1', target_node_id: 'node-comp-1', relation_type: 'AFFECTS' });

        showToast('Sample Domino graph nodes seeded to PostgreSQL!', 'success');
        await renderDominoTab();
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
    return;
  }

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-white/5 pb-2">
        <span class="font-serif font-bold text-slate-100 text-sm flex items-center gap-2">
          <span class="material-symbols-outlined text-sky-400 text-[18px]">account_tree</span>
          Claim Domino Graph Workspace
        </span>
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-mono text-slate-400">${nodes.length} Nodes • ${edges.length} Dependencies</span>
          <button onclick="window.openWhatIfModal()" class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer">
            <span class="material-symbols-outlined text-[15px]">casino</span>
            WHAT IF?
          </button>
        </div>
      </div>

      <!-- Multi-Column Layout -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <!-- Col 1: Assumptions -->
        <div class="space-y-2">
          <span class="text-[10px] font-mono text-indigo-400 uppercase font-bold block">1. Assumptions</span>
          ${nodes.filter(n => n.node_type === 'ASSUMPTION').map(n => renderNodeCard(n)).join('') || '<span class="text-[11px] text-slate-500">None</span>'}
        </div>

        <!-- Col 2: Decisions -->
        <div class="space-y-2">
          <span class="text-[10px] font-mono text-emerald-400 uppercase font-bold block">2. Decisions</span>
          ${nodes.filter(n => n.node_type === 'DECISION').map(n => renderNodeCard(n)).join('') || '<span class="text-[11px] text-slate-500">None</span>'}
        </div>

        <!-- Col 3: Requirements & Claims -->
        <div class="space-y-2">
          <span class="text-[10px] font-mono text-sky-400 uppercase font-bold block">3. Claims &amp; Req</span>
          ${nodes.filter(n => n.node_type === 'REQUIREMENT' || n.node_type === 'CLAIM').map(n => renderNodeCard(n)).join('') || '<span class="text-[11px] text-slate-500">None</span>'}
        </div>

        <!-- Col 4: Components & Risks -->
        <div class="space-y-2">
          <span class="text-[10px] font-mono text-rose-400 uppercase font-bold block">4. Components &amp; Risks</span>
          ${nodes.filter(n => n.node_type === 'COMPONENT' || n.node_type === 'RISK' || n.node_type === 'KNOWLEDGE_GAP').map(n => renderNodeCard(n)).join('') || '<span class="text-[11px] text-slate-500">None</span>'}
        </div>
      </div>
    </div>
  `;
}

function renderNodeCard(node) {
  let isAffected = node.isAffected;
  return `
    <div onclick="alert('Node Details:\\nLabel: ${escapeHtml(node.label)}\\nType: ${escapeHtml(node.node_type)}\\nStatus: ${escapeHtml(node.status || 'ACTIVE')}\\nDetail: ${escapeHtml(node.detail || 'None')}')" class="p-3 rounded-xl ${isAffected ? 'bg-rose-500/20 border-rose-500 text-rose-100 ring-2 ring-rose-400' : 'bg-surface-container border-white/5 text-slate-200'} border hover:border-sky-400 transition-all cursor-pointer space-y-1">
      <div class="flex items-center justify-between">
        <strong class="font-serif block text-xs truncate">${escapeHtml(node.label)}</strong>
        ${isAffected ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono font-bold">RIPPLE</span>' : ''}
      </div>
      <p class="text-[10px] text-slate-400 font-sans line-clamp-2">${escapeHtml(node.detail || '')}</p>
    </div>
  `;
}

function openWhatIfModal() {
  const select = document.getElementById('whatif-target-node');
  if (select && liveGraphData.nodes) {
    select.innerHTML = liveGraphData.nodes.map(n => `
      <option value="${escapeHtml(n.id)}">[${escapeHtml(n.node_type)}] ${escapeHtml(n.label)}</option>
    `).join('');
  }
  document.getElementById('whatif-modal')?.classList.add('show');
}
function closeWhatIfModal() {
  document.getElementById('whatif-modal')?.classList.remove('show');
}

async function handleSimulateWhatIfSubmit(e) {
  e.preventDefault();
  const targetNodeId = document.getElementById('whatif-target-node')?.value;
  const hypotheticalAction = document.getElementById('whatif-action-type')?.value || 'change_assumption';
  const simulatedChange = document.getElementById('whatif-change-desc')?.value || '';

  if (!targetNodeId) {
    showToast('Please select a target node to simulate.', 'warning');
    return;
  }

  try {
    const result = await simulateWhatIf({ targetNodeId, hypotheticalAction, simulatedChange });
    currentWhatIfData = result;
    closeWhatIfModal();

    // Render hypothetical output
    const outBox = document.getElementById('whatif-output-banner');
    if (outBox) {
      outBox.classList.remove('hidden');
      outBox.innerHTML = `
        <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">casino</span>
              HYPOTHETICAL SCENARIO — ORIGINAL PROJECT STATE NOT MODIFIED
            </span>
            <button onclick="document.getElementById('whatif-output-banner')?.classList.add('hidden'); window.switchKnowledgeTab('domino');" class="text-xs font-mono text-slate-400 hover:text-white">Exit Scenario</button>
          </div>
          <p class="text-xs font-sans">
            Simulated Action: <strong>${escapeHtml(hypotheticalAction)}</strong> on <strong>"${escapeHtml(result.scenario.targetLabel)}"</strong>.
            Found <strong>${result.impactedNodesCount}</strong> potentially affected downstream component(s).
          </p>
          ${result.rippleChains.length > 0 ? `
            <ul class="list-disc list-inside text-[11px] font-mono text-amber-300 space-y-1 pt-1">
              ${result.rippleChains.map(r => `<li>${escapeHtml(r.impactAssessment)}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
    }

    renderDominoGraph(result.hypotheticalGraph);
    showToast('What-If scenario rendered without touching PostgreSQL records!', 'success');
  } catch (err) {
    showToast(`Simulation error: ${err.message}`, 'error');
  }
}

// ============================================================================
// 6. PROJECT AUTOPSY TAB
// ============================================================================
async function renderAutopsyTab() {
  await loadAutopsiesHistory();
}

async function handleGenerateAutopsySubmit(e) {
  e.preventDefault();
  const title = document.getElementById('autopsy-title-input')?.value || 'Project Post-Mortem Autopsy';
  const proposal = document.getElementById('autopsy-proposal-text')?.value || '';
  const requirements = document.getElementById('autopsy-requirements-text')?.value || '';
  const revisions = document.getElementById('autopsy-revisions-text')?.value || '';
  const decisions = document.getElementById('autopsy-decisions-text')?.value || '';
  const finalState = document.getElementById('autopsy-final-text')?.value || '';

  if (!proposal.trim() && !requirements.trim()) {
    showToast('Please provide proposal or requirements documentation.', 'warning');
    return;
  }

  const btn = document.getElementById('run-autopsy-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Reconstructing Chronology...';
  }

  try {
    const autopsy = await generateAutopsy({ title, proposal, requirements, revisions, decisions, finalState });
    currentAutopsyData = autopsy;
    renderAutopsyResults(autopsy);
    await loadAutopsiesHistory();
    showToast('Project Autopsy reconstructed & saved to PostgreSQL!', 'success');
  } catch (err) {
    showToast(`Autopsy error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">timeline</span> Generate Project Autopsy';
    }
  }
}

function renderAutopsyResults(autopsy) {
  const container = document.getElementById('autopsy-results-container');
  if (!container) return;

  container.classList.remove('hidden');

  const reqs = autopsy.requirements_timeline || [];
  const decs = autopsy.decisions_timeline || [];
  const revs = autopsy.changes_timeline || [];
  const finalState = autopsy.final_state || {};

  container.innerHTML = `
    <div class="report-card p-6 rounded-2xl space-y-5 border border-white/10">
      <div class="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <span class="text-[10px] font-mono text-purple-400 uppercase font-bold block">Post-Mortem Chronology</span>
          <h3 class="font-serif font-bold text-slate-100 text-lg">${escapeHtml(autopsy.title)}</h3>
        </div>
        <span class="text-[11px] font-mono text-slate-400">${new Date(autopsy.created_at).toLocaleDateString()}</span>
      </div>

      <!-- Chronological Stepper: PLAN -> REQUIREMENTS -> DECISIONS -> CHANGES -> FINAL STATE -->
      <div class="space-y-4 text-xs font-sans">
        <!-- 1. ORIGINAL PLAN -->
        <div class="p-4 rounded-xl bg-[#05060a] border border-white/5 space-y-1">
          <strong class="text-indigo-300 font-mono text-[11px] uppercase block">1. Original Plan &amp; Milestone Scope</strong>
          <p class="text-slate-300 leading-relaxed">${escapeHtml(autopsy.original_plan?.summary || 'Initial conceptual baseline.')}</p>
        </div>

        <!-- 2. REQUIREMENTS EVOLUTION -->
        <div class="p-4 rounded-xl bg-[#05060a] border border-white/5 space-y-2">
          <div class="flex items-center justify-between">
            <strong class="text-sky-300 font-mono text-[11px] uppercase">2. Requirements Timeline (${reqs.length})</strong>
            <span class="text-[10px] font-mono text-slate-400">${finalState.disappearedRequirementsCount || 0} Disappeared</span>
          </div>
          <div class="space-y-1">
            ${reqs.map(r => `
              <div class="flex items-center justify-between text-[11px] p-2 rounded bg-surface-container border border-white/5">
                <span class="${r.status === 'DISAPPEARED' ? 'line-through text-rose-400' : 'text-slate-200'}">${escapeHtml(r.requirement)}</span>
                <span class="text-[9px] font-mono px-2 py-0.5 rounded ${r.status === 'DISAPPEARED' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}">${escapeHtml(r.status)}</span>
              </div>
            `).join('') || '<span class="text-slate-500 text-[11px]">No formal requirements extracted.</span>'}
          </div>
        </div>

        <!-- 3. DECISIONS LOG -->
        <div class="p-4 rounded-xl bg-[#05060a] border border-white/5 space-y-2">
          <div class="flex items-center justify-between">
            <strong class="text-emerald-300 font-mono text-[11px] uppercase">3. Decisions Log (${decs.length})</strong>
            <span class="text-[10px] font-mono text-slate-400">${finalState.reversedDecisionsCount || 0} Reversed</span>
          </div>
          <div class="space-y-1">
            ${decs.map(d => `
              <div class="flex items-center justify-between text-[11px] p-2 rounded bg-surface-container border border-white/5">
                <span class="${d.status === 'REVERSED' ? 'line-through text-rose-400' : 'text-slate-200'}">${escapeHtml(d.decision)}</span>
                <span class="text-[9px] font-mono px-2 py-0.5 rounded ${d.status === 'REVERSED' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}">${escapeHtml(d.status)}</span>
              </div>
            `).join('') || '<span class="text-slate-500 text-[11px]">No architectural decisions documented.</span>'}
          </div>
        </div>

        <!-- 4. FINAL SYNTHESIS -->
        <div class="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
          <strong class="text-purple-300 font-mono text-[11px] uppercase block">4. Final State Post-Mortem Synthesis</strong>
          <p class="text-slate-200 leading-relaxed">${escapeHtml(finalState.summary || 'Project completed with documented structural audit.')}</p>
        </div>
      </div>
    </div>
  `;
}

async function loadAutopsiesHistory() {
  const container = document.getElementById('autopsy-history-list');
  if (!container) return;

  try {
    const list = await fetchAutopsies();
    if (list.length === 0) {
      container.innerHTML = `<span class="text-xs font-mono text-slate-500">No saved autopsies yet.</span>`;
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-white/5 hover:border-purple-500/30 transition-all text-xs">
        <div>
          <strong class="font-serif text-slate-200 block">${escapeHtml(item.title)}</strong>
          <span class="text-[10px] font-mono text-slate-400">${new Date(item.created_at).toLocaleDateString()}</span>
        </div>
        <button onclick="window.reopenAutopsy('${escapeHtml(item.id)}')" class="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-xs font-mono cursor-pointer">View</button>
      </div>
    `).join('');

    window.reopenAutopsy = async (id) => {
      try {
        const item = await fetchAutopsyById(id);
        if (item) {
          renderAutopsyResults(item);
          showToast(`Reopened autopsy: ${item.title}`, 'info');
        }
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
  } catch (err) {
    container.innerHTML = `<span class="text-xs font-mono text-rose-400">Failed to load autopsies.</span>`;
  }
}

// Preset Loader
function loadPresetKnowledge(key) {
  const preset = PRESET_DATASETS[key];
  if (!preset) return;
  const inputA = document.getElementById('timemachine-source-a');
  const inputB = document.getElementById('timemachine-source-b');
  const titleInput = document.getElementById('timemachine-title-input');
  if (inputA) inputA.value = preset.sourceA;
  if (inputB) inputB.value = preset.sourceB;
  if (titleInput) titleInput.value = preset.title;
  showToast(`Loaded preset dataset: ${preset.title}`, 'info');
}

function loadCurrentReportIntoKnowledge() {
  const report = getActiveReportData();
  if (!report) {
    showToast('No active report in memory. Loaded sample API specification.', 'info');
    loadPresetKnowledge('api-spec');
    return;
  }

  const reportText = `Subject: ${report.subject || 'Visual Target'}\nClassification: ${report.classification || report.category || 'General Analysis'}\nExecutive Summary: ${report.executiveSummary || report.summaryLead || ''}\nClaims:\n${(report.claims || []).map(c => `- ${c.statement} [${c.status}]`).join('\n')}`;

  const inputA = document.getElementById('timemachine-source-a');
  const inputB = document.getElementById('timemachine-source-b');
  const gapsInput = document.getElementById('gaps-input-text');

  if (inputA && !inputA.value) inputA.value = reportText;
  if (inputB && !inputB.value) inputB.value = reportText + '\n- System scales to 1000 concurrent requests with enhanced caching.';
  if (gapsInput) gapsInput.value = reportText;

  showToast(`Loaded Active Report: "${report.subject || 'Research Brief'}" into Knowledge Workspace`, 'success');
}
