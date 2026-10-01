import { 
  extractEvidence, 
  compareVisuals, 
  evaluateConsistency, 
  askVisualQuestion, 
  createVisualWorkspace, 
  fetchWorkspaceIntelligence 
} from '../../services/visualIntelligenceApi.js';
import { renderEvidenceViewer } from '../EvidenceViewer/EvidenceViewerComponent.js';
import { openLiveVisionModal } from '../LiveVision/LiveVisionComponent.js';
import { renderGuessMode } from '../Guess/GuessComponent.js';
import { startNarration, setNarrationHighlightCallback } from '../Narration/NarrationPlayerComponent.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { getActiveReportData } from '../../state.js';

let currentWorkspaceArtifacts = [];
let currentAnalysisIntent = 'General Understanding';
let currentActiveTab = 'visual'; // visual, structure, evidence, findings, compare, verify, ask, guess
let selectedEvidenceId = null;
let currentComparisonMode = 'side-by-side'; // side-by-side, slider, overlay, diff, findings
let currentSliderPos = 50;

export async function renderVisualWorkspace() {
  const container = document.getElementById('page-workspace');
  if (!container) return;

  const activeReport = getActiveReportData();

  if (activeReport && currentWorkspaceArtifacts.length === 0) {
    currentWorkspaceArtifacts = [
      {
        id: activeReport.id || 'ART-PRIMARY',
        title: activeReport.title || 'Primary Visual Analysis',
        visualType: activeReport.visualType || 'DIAGRAM',
        imageSrc: activeReport.image_data_url || activeReport.thumbnail_data_url || '',
        diagramStructure: activeReport.diagramStructure || activeReport.full_data?.diagramStructure || null,
        chartStructure: activeReport.chartStructure || activeReport.full_data?.chartStructure || null,
        claims: activeReport.claims || activeReport.full_data?.claims || [],
        findings: activeReport.findings || activeReport.full_data?.keyFindings || []
      }
    ];
  }

  container.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <!-- Header with Quick Action Launchers -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs font-semibold uppercase tracking-wider">
              Visual Intelligence Workspace
            </span>
            <span class="text-xs font-mono text-slate-400">See Deeper. Analyze Smarter.</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-slate-100 tracking-tight">
            Universal Visual Understanding &amp; Evidence Platform
          </h1>
        </div>

        <!-- Tool Actions & Intent Selector -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Optional Tool Buttons -->
          <button onclick="window.openLiveVisionModal()" class="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Live Vision
          </button>

          <button onclick="window.handleStartWorkspaceNarration()" class="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            Narrate
          </button>

          <button onclick="window.switchWorkspaceTab('guess')" class="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            Guess Mode
          </button>

          <div class="h-5 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>

          <div class="flex items-center gap-2">
            <select id="workspace-intent-select" class="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer">
              <option value="General Understanding">Intent: General</option>
              <option value="Structural Analysis">Intent: Structural</option>
              <option value="Verification">Intent: Verification</option>
              <option value="Inconsistency Detection">Intent: Inconsistencies</option>
              <option value="Data Extraction">Intent: Extraction</option>
              <option value="Research / Evidence Analysis">Intent: Evidence Research</option>
              <option value="Comparison">Intent: Comparison</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs (Dedicated Panels) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'visual' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="visual">
          1. Region Explorer
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'structure' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="structure">
          2. Structure
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'evidence' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="evidence">
          3. Evidence Registry
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'findings' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="findings">
          4. Intent Findings
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="compare">
          5. Visual Comparison
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'verify' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="verify">
          6. Multi-Visual Consistency
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'ask' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="ask">
          7. Grounded Q&amp;A
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'guess' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="guess">
          8. Guess Mode
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="workspace-tab-content" class="min-h-[450px]">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  setupWorkspaceEvents();
  renderActiveTabContent();
}

export function switchWorkspaceTab(tabName) {
  currentActiveTab = tabName;
  document.querySelectorAll('.ws-tab-btn').forEach(btn => {
    const t = btn.getAttribute('data-tab');
    if (t === tabName) {
      btn.className = `ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${tabName === 'guess' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'} shadow-md cursor-pointer`;
    } else {
      btn.className = 'ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5 cursor-pointer';
    }
  });
  renderActiveTabContent();
}

async function renderActiveTabContent() {
  const content = document.getElementById('workspace-tab-content');
  if (!content) return;

  const primary = currentWorkspaceArtifacts[0] || {
    id: 'DEMO-VISUAL',
    title: 'Sample Architecture Diagram',
    visualType: 'DFD',
    diagramStructure: {
      nodes: [
        { id: 'node_1', label: 'User Client', type: 'External Entity' },
        { id: 'node_2', label: 'API Gateway', type: 'Process' },
        { id: 'node_3', label: 'PostgreSQL DB', type: 'Data Store' }
      ],
      links: [
        { from: 'User Client', to: 'API Gateway', label: 'HTTPS Auth' },
        { from: 'API Gateway', to: 'PostgreSQL DB', label: 'SQL Query' }
      ]
    },
    claims: [
      { claim: 'User Client connects directly to API Gateway', status: 'OBSERVED' },
      { claim: 'Database enforces write-ahead logging', status: 'INFERRED' },
      { claim: 'Undocumented external microservice operates in background', status: 'UNDETERMINABLE' }
    ]
  };

  if (currentActiveTab === 'visual') {
    content.innerHTML = `<div id="workspace-evidence-viewer-mount"></div>`;
    const evData = extractEvidenceLocally(primary);
    renderEvidenceViewer('workspace-evidence-viewer-mount', {
      imageSrc: primary.imageSrc,
      evidenceList: evData.evidence,
      activeEvidenceId: selectedEvidenceId
    });
  } else if (currentActiveTab === 'structure') {
    const struct = primary.diagramStructure || { nodes: [], links: [] };
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="font-serif font-bold text-lg text-slate-100">Extracted Visual Topology</h3>
          <span class="text-xs font-mono text-slate-400">${struct.nodes?.length || 0} Entities | ${struct.links?.length || 0} Connections</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
            <h4 class="text-xs font-mono uppercase text-indigo-400 font-bold">Entities / Nodes</h4>
            <div class="space-y-2">
              ${(struct.nodes || []).map(n => `
                <div class="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                  <div class="space-y-0.5">
                    <span class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(n.label || n.id)}</span>
                    <span class="block text-[10px] font-mono text-slate-400">${escapeHtml(n.type || 'Entity')}</span>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">OBSERVED</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
            <h4 class="text-xs font-mono uppercase text-indigo-400 font-bold">Connections / Flows</h4>
            <div class="space-y-2">
              ${(struct.links || []).map(l => `
                <div class="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                  <span class="font-mono text-xs text-slate-300">${escapeHtml(l.from)} <span class="text-indigo-400">→</span> ${escapeHtml(l.to)}</span>
                  <span class="text-[10px] font-mono text-slate-400">${escapeHtml(l.label || 'Direct Flow')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'evidence') {
    const evData = extractEvidenceLocally(primary);
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="font-serif font-bold text-lg text-slate-100">Visual Evidence Registry</h3>
          <span class="text-xs font-mono text-slate-400">${evData.evidence.length} Evidence Items</span>
        </div>

        <div class="space-y-3">
          ${evData.evidence.map(ev => `
            <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(ev.region || ev.label || ev.id)}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${ev.status === 'OBSERVED' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : (ev.status === 'UNDETERMINABLE' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-indigo-500/10 text-indigo-300')}">
                  ${escapeHtml(ev.status)}
                </span>
              </div>
              <p class="text-xs text-slate-400 font-sans">${escapeHtml(ev.explanation)}</p>
              <div class="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-slate-500">
                <span>Evidence ID: ${escapeHtml(ev.id)}</span>
                <span>Type: ${escapeHtml(ev.evidenceType)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'findings') {
    const findings = prioritizeFindingsLocally(primary.findings || primary.claims || [], currentAnalysisIntent);
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-serif font-bold text-lg text-slate-100">Intent-Prioritized Findings</h3>
            <p class="text-xs text-slate-400">Findings ranked categorically for intent: <span class="text-indigo-400 font-mono">${escapeHtml(currentAnalysisIntent)}</span></p>
          </div>
          <span class="text-xs font-mono text-slate-400">${findings.length} Findings</span>
        </div>

        <div class="space-y-3">
          ${findings.map(f => `
            <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(f.title || f.claim || f.text)}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${f.relevance === 'HIGH RELEVANCE' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'}">
                  ${escapeHtml(f.relevance)}
                </span>
              </div>
              <p class="text-xs text-slate-300 font-sans leading-relaxed">${escapeHtml(f.description || f.rationale || f.explanation || '')}</p>
              <div class="text-[11px] font-mono text-indigo-400/80">
                Rationale: ${escapeHtml(f.relevanceRationale || 'Evaluated for current intent.')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'compare') {
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <h3 class="font-serif font-bold text-lg text-slate-100">Visual Comparison Engine</h3>
            <p class="text-xs text-slate-400">Semantic &amp; topological delta analysis across two visual revisions.</p>
          </div>

          <!-- Comparison Mode Selector -->
          <div class="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl p-1 text-xs font-mono">
            <button onclick="window.setComparisonMode('side-by-side')" class="px-2.5 py-1 rounded-lg ${currentComparisonMode === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'} cursor-pointer">Side-by-Side</button>
            <button onclick="window.setComparisonMode('slider')" class="px-2.5 py-1 rounded-lg ${currentComparisonMode === 'slider' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'} cursor-pointer">Slider</button>
            <button onclick="window.setComparisonMode('overlay')" class="px-2.5 py-1 rounded-lg ${currentComparisonMode === 'overlay' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'} cursor-pointer">Overlay</button>
            <button onclick="window.setComparisonMode('diff')" class="px-2.5 py-1 rounded-lg ${currentComparisonMode === 'diff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'} cursor-pointer">Diff</button>
          </div>
        </div>

        <div class="flex justify-end">
          <button onclick="window.handleRunVisualComparison()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Run Semantic Diff
          </button>
        </div>

        <!-- Render Comparison Modes -->
        <div id="comparison-display-mount">
          ${renderComparisonViewsHtml()}
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'verify') {
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <h3 class="font-serif font-bold text-lg text-slate-100">Multi-Visual Consistency Audit</h3>
            <p class="text-xs text-slate-400">Verifies entity names, labels, and flow directions across multiple diagrams (DFD + UML + ERD).</p>
          </div>
          <button onclick="window.handleEvaluateConsistency()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold cursor-pointer">
            Audit Consistency
          </button>
        </div>

        <div id="consistency-audit-mount" class="p-8 text-center bg-slate-900/40 rounded-2xl border border-white/5">
          <p class="text-xs text-slate-400 font-mono">Click "Audit Consistency" to inspect cross-visual models for conflicting directions or missing nodes.</p>
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'ask') {
    content.innerHTML = `
      <div class="space-y-6 max-w-3xl mx-auto">
        <div class="text-center space-y-1">
          <h3 class="font-serif font-bold text-xl text-slate-100">Evidence-Grounded Visual Q&amp;A</h3>
          <p class="text-xs text-slate-400 font-sans">Every answer is strictly grounded in extracted visual coordinates. Unsupported claims are refused as UNDETERMINABLE.</p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4">
          <div class="flex items-center gap-2">
            <input type="text" id="vqa-query-input" placeholder="e.g. Does User Client directly connect to PostgreSQL DB?" class="flex-grow bg-[#05060a] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
            <button onclick="window.handleAskVQA()" class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-all cursor-pointer">
              Ask Visual
            </button>
          </div>

          <div id="vqa-result-card" class="hidden p-5 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'guess') {
    content.innerHTML = `<div id="guess-mode-mount"></div>`;
    renderGuessMode('guess-mode-mount', primary);
  }
}

function renderComparisonViewsHtml() {
  if (currentComparisonMode === 'slider') {
    return `
      <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 select-none">
        <div class="absolute inset-0 bg-slate-950 flex items-center justify-center text-slate-400 font-serif text-lg font-bold">
          Architecture v1 (Before)
        </div>
        <div class="absolute inset-y-0 left-0 bg-indigo-950/90 border-r-2 border-indigo-400 flex items-center justify-center text-indigo-200 font-serif text-lg font-bold overflow-hidden" style="width: ${currentSliderPos}%;">
          <div class="w-full text-center">Architecture v2 (+Payment Service)</div>
        </div>
        <input type="range" min="0" max="100" value="${currentSliderPos}" oninput="window.updateSliderPos(this.value)" class="absolute inset-x-4 bottom-4 z-30 w-[90%] cursor-ew-resize" />
      </div>
    `;
  } else if (currentComparisonMode === 'overlay') {
    return `
      <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
        <div class="text-center space-y-2 p-6">
          <div class="text-xs font-mono text-indigo-400 uppercase tracking-wider">Superimposed Overlay Matrix</div>
          <p class="text-xs text-slate-400">Green highlight represents +Added nodes; Red highlight represents -Removed elements.</p>
        </div>
      </div>
    `;
  }

  // Default: Side by Side
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
        <div class="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-white/5">
          <span>Source Artifact A (v1.0)</span>
          <span class="text-slate-500">2 Nodes</span>
        </div>
        <div class="p-6 rounded-xl bg-slate-950/60 border border-white/5 text-center text-xs font-mono text-slate-300">
          User Client → Legacy Monolith
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
        <div class="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-white/5">
          <span>Source Artifact B (v2.0)</span>
          <span class="text-emerald-400">+Added Microservice</span>
        </div>
        <div class="p-6 rounded-xl bg-slate-950/60 border border-white/5 text-center text-xs font-mono text-slate-300">
          User Client → Auth Service → Payment Microservice
        </div>
      </div>
    </div>
  `;
}

function extractEvidenceLocally(art) {
  const nodes = art.diagramStructure?.nodes || [];
  const links = art.diagramStructure?.links || [];

  const evidence = nodes.map((n, i) => ({
    id: `EVI-NODE-${i + 1}`,
    claimId: `CLM-NODE-${i + 1}`,
    evidenceType: 'NODE_REGION',
    region: `Node: ${n.label || n.id}`,
    label: n.label || n.id,
    status: 'OBSERVED',
    coordinates: n.coordinates || { x: 0.1 + (i % 3) * 0.3, y: 0.15 + Math.floor(i / 3) * 0.25, width: 0.25, height: 0.15, normalized: true },
    explanation: `Identified visual entity "${n.label || n.id}" in source visual.`
  }));

  links.forEach((l, i) => {
    evidence.push({
      id: `EVI-LINK-${i + 1}`,
      claimId: `CLM-LINK-${i + 1}`,
      evidenceType: 'EDGE_REGION',
      region: `Flow: ${l.from} -> ${l.to}`,
      label: `${l.from} -> ${l.to}`,
      status: 'OBSERVED',
      coordinates: { x: 0.2 + (i % 2) * 0.3, y: 0.2 + Math.floor(i / 2) * 0.25, width: 0.2, height: 0.1, normalized: true },
      explanation: `Observed data flow from "${l.from}" to "${l.to}".`
    });
  });

  return { evidence };
}

function prioritizeFindingsLocally(findings, intent) {
  return findings.map((f, i) => {
    const text = typeof f === 'string' ? f : (f.claim || f.text || f.title || `Finding ${i + 1}`);
    const status = typeof f === 'object' ? (f.status || 'OBSERVED') : 'OBSERVED';
    const isHigh = i === 0 || status === 'OBSERVED' || intent === 'Verification';
    return {
      title: text,
      status,
      relevance: isHigh ? 'HIGH RELEVANCE' : 'SUPPORTING',
      relevanceRationale: status === 'UNDETERMINABLE' ? 'Highlights evidentiary uncertainty in source visual.' : 'Key observation for visual structure.'
    };
  });
}

export function setupWorkspaceEvents() {
  window.switchWorkspaceTab = switchWorkspaceTab;
  window.openLiveVisionModal = openLiveVisionModal;
  
  window.handleStartWorkspaceNarration = () => {
    const primary = currentWorkspaceArtifacts[0];
    startNarration(primary);
  };

  window.setComparisonMode = (mode) => {
    currentComparisonMode = mode;
    const mount = document.getElementById('comparison-display-mount');
    if (mount) mount.innerHTML = renderComparisonViewsHtml();
  };

  window.updateSliderPos = (val) => {
    currentSliderPos = val;
    const mount = document.getElementById('comparison-display-mount');
    if (mount) mount.innerHTML = renderComparisonViewsHtml();
  };

  setNarrationHighlightCallback((eviId) => {
    selectedEvidenceId = eviId;
    if (currentActiveTab === 'visual') {
      const primary = currentWorkspaceArtifacts[0];
      const evData = extractEvidenceLocally(primary);
      renderEvidenceViewer('workspace-evidence-viewer-mount', {
        imageSrc: primary.imageSrc,
        evidenceList: evData.evidence,
        activeEvidenceId: selectedEvidenceId
      });
    }
  });

  document.querySelectorAll('.ws-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchWorkspaceTab(tab);
    });
  });

  const intentSelect = document.getElementById('workspace-intent-select');
  if (intentSelect) {
    intentSelect.value = currentAnalysisIntent;
    intentSelect.addEventListener('change', (e) => {
      currentAnalysisIntent = e.target.value;
      showToast(`Analysis intent changed to: ${currentAnalysisIntent}`, 'info');
      renderActiveTabContent();
    });
  }

  window.handleSelectEvidenceRegion = (evId) => {
    selectedEvidenceId = evId;
    renderActiveTabContent();
  };

  window.handleRunVisualComparison = async () => {
    const mount = document.getElementById('comparison-display-mount');
    if (!mount) return;

    mount.innerHTML = `<div class="py-8 text-center text-xs font-mono text-slate-400 animate-pulse">Running semantic comparison on topological models...</div>`;

    try {
      const artA = { id: 'V1', title: 'Architecture v1', visualType: 'DIAGRAM', diagramStructure: { nodes: [{ label: 'Web Server' }, { label: 'Legacy Monolith' }], links: [{ from: 'Web Server', to: 'Legacy Monolith' }] } };
      const artB = { id: 'V2', title: 'Architecture v2', visualType: 'DIAGRAM', diagramStructure: { nodes: [{ label: 'Web Server' }, { label: 'Auth Service' }, { label: 'Payment Microservice' }], links: [{ from: 'Web Server', to: 'Auth Service' }, { from: 'Auth Service', to: 'Payment Microservice' }] } };

      const res = await compareVisuals(artA, artB);
      mount.innerHTML = `
        <div class="space-y-4 text-left">
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <span class="font-serif font-bold text-slate-100 text-sm">Visual Topology Diff Result</span>
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">+${res.summary?.addedCount || 2} Added</span>
              <span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold">-${res.summary?.removedCount || 1} Removed</span>
            </div>
          </div>
          <div class="space-y-2">
            ${res.diffs.map(d => `
              <div class="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span class="font-serif font-bold text-slate-200">${escapeHtml(d.label)}</span>
                  <p class="text-[11px] text-slate-400 font-sans">${escapeHtml(d.description)}</p>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${d.status === 'ADDED' ? 'bg-emerald-500/10 text-emerald-400' : (d.status === 'REMOVED' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-300')}">
                  ${escapeHtml(d.status)}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      mount.innerHTML = `<div class="p-4 rounded-xl bg-rose-500/10 text-rose-300 text-xs font-mono">${escapeHtml(err.message)}</div>`;
    }
  };

  window.handleEvaluateConsistency = async () => {
    const mount = document.getElementById('consistency-audit-mount');
    if (!mount) return;

    mount.innerHTML = `<div class="py-6 text-center text-xs font-mono text-slate-400 animate-pulse">Auditing cross-visual entity and flow consistency...</div>`;

    try {
      const art1 = { id: 'DFD-1', title: 'DFD Context Model', visualType: 'DFD', diagramStructure: { nodes: [{ label: 'Customer' }, { label: 'Bank' }], links: [{ from: 'Customer', to: 'Bank' }] } };
      const art2 = { id: 'UML-1', title: 'Sequence Diagram', visualType: 'UML', diagramStructure: { nodes: [{ label: 'Customer' }, { label: 'Bank' }], links: [{ from: 'Bank', to: 'Customer' }] } };
      
      const res = await evaluateConsistency([art1, art2]);
      mount.innerHTML = `
        <div class="space-y-4 text-left">
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <span class="font-serif font-bold text-slate-100 text-sm">Multi-Visual Consistency Audit</span>
            <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold ${res.overallStatus === 'CONSISTENT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">${escapeHtml(res.overallStatus)}</span>
          </div>
          <div class="space-y-2">
            ${res.findings.map(f => `
              <div class="p-3.5 rounded-xl bg-slate-950/60 border ${f.status === 'POTENTIAL CONFLICT' ? 'border-amber-500/30' : 'border-white/5'} space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(f.title)}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${f.status === 'POTENTIAL CONFLICT' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}">${escapeHtml(f.status)}</span>
                </div>
                <p class="text-xs text-slate-400 font-sans">${escapeHtml(f.description)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      mount.innerHTML = `<div class="p-4 rounded-xl bg-rose-500/10 text-rose-300 text-xs font-mono">${escapeHtml(err.message)}</div>`;
    }
  };

  window.handleAskVQA = async () => {
    const input = document.getElementById('vqa-query-input');
    const resultCard = document.getElementById('vqa-result-card');
    if (!input || !resultCard) return;

    const query = input.value.trim();
    if (!query) {
      showToast('Please type a question about the visual.', 'warning');
      return;
    }

    resultCard.classList.remove('hidden');
    resultCard.innerHTML = `<div class="py-4 text-center text-xs font-mono text-slate-400">Grounding query in visual evidence...</div>`;

    try {
      const primary = currentWorkspaceArtifacts[0];
      const answer = await askVisualQuestion(primary, query);

      resultCard.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-slate-400">Q: "${escapeHtml(query)}"</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${answer.verdict === 'YES' || answer.status === 'OBSERVED' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : (answer.verdict === 'UNDETERMINABLE' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-indigo-500/10 text-indigo-300')}">
              ${escapeHtml(answer.verdict || answer.status)}
            </span>
          </div>

          <h4 class="font-serif font-bold text-slate-100 text-base leading-snug">${escapeHtml(answer.answer)}</h4>
          <p class="text-xs text-slate-400 font-sans">${escapeHtml(answer.reason)}</p>

          ${answer.evidenceRegions && answer.evidenceRegions.length > 0 ? `
            <div class="pt-2 border-t border-white/5 space-y-1 text-[11px] font-mono text-slate-400">
              <span class="text-indigo-400">Linked Visual Regions:</span>
              ${answer.evidenceRegions.map(r => `
                <div class="flex justify-between text-slate-300">
                  <span>${escapeHtml(r.label)}</span>
                  <span>[${r.coordinates?.x}, ${r.coordinates?.y}, ${r.coordinates?.width}, ${r.coordinates?.height}]</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } catch (err) {
      resultCard.innerHTML = `<div class="text-rose-400 text-xs font-mono">${escapeHtml(err.message)}</div>`;
    }
  };
}
