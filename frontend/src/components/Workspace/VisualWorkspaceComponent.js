import { 
  extractEvidence, 
  compareVisuals, 
  evaluateConsistency, 
  askVisualQuestion, 
  createVisualWorkspace, 
  fetchWorkspaceIntelligence 
} from '../../services/visualIntelligenceApi.js';
import { renderEvidenceViewer } from '../EvidenceViewer/EvidenceViewerComponent.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { getActiveReportData } from '../../state.js';

let currentWorkspaceArtifacts = [];
let currentAnalysisIntent = 'General Understanding';
let currentActiveTab = 'visual'; // visual, structure, evidence, findings, compare, verify, ask, export
let selectedEvidenceId = null;

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
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs font-semibold uppercase tracking-wider">
              Visual Intelligence Workspace
            </span>
            <span class="text-xs font-mono text-slate-400">See Deeper. Analyze Smarter.</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-slate-100 tracking-tight">
            Evidence-Linked Visual Intelligence
          </h1>
        </div>

        <!-- Intent Selector -->
        <div class="flex items-center gap-3">
          <label class="text-xs font-mono text-slate-400">Analysis Intent:</label>
          <select id="workspace-intent-select" class="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer">
            <option value="General Understanding">General Understanding</option>
            <option value="Structural Analysis">Structural Analysis</option>
            <option value="Verification">Verification & Evidence</option>
            <option value="Inconsistency Detection">Inconsistency Detection</option>
            <option value="Data Extraction">Data Extraction</option>
            <option value="Research / Evidence Analysis">Research / Evidence Analysis</option>
            <option value="Comparison">Visual Comparison</option>
          </select>
        </div>
      </div>

      <!-- Navigation Tabs (8 Dedicated Panels) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'visual' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="visual">
          1. Visual & Evidence
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
          5. Compare
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'verify' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="verify">
          6. Cross-Visual Consistency
        </button>
        <button class="ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${currentActiveTab === 'ask' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'}" data-tab="ask">
          7. Grounded Q&A
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
      btn.className = 'ws-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all bg-indigo-600 text-white shadow-md cursor-pointer';
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
    title: 'Sample Diagram Analysis',
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

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${evData.evidence.map(ev => `
            <div class="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3 flex flex-col justify-between">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${ev.status === 'OBSERVED' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : (ev.status === 'UNDETERMINABLE' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400')}">
                    ${escapeHtml(ev.status)}
                  </span>
                  <span class="text-[10px] font-mono text-slate-400">${escapeHtml(ev.evidenceType)}</span>
                </div>
                <h4 class="font-serif font-bold text-slate-100 text-sm">${escapeHtml(ev.region)}</h4>
                <p class="text-xs text-slate-400 font-sans leading-relaxed">${escapeHtml(ev.explanation)}</p>
              </div>
              <div class="pt-2 border-t border-white/5 text-[11px] font-mono text-slate-500 flex justify-between">
                <span>Coordinates:</span>
                <span>[${ev.coordinates?.x}, ${ev.coordinates?.y}, ${ev.coordinates?.width}, ${ev.coordinates?.height}]</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'findings') {
    const prioritized = prioritizeLocally(primary.claims || [], currentAnalysisIntent);
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="font-serif font-bold text-lg text-slate-100">Findings Prioritized for "${escapeHtml(currentAnalysisIntent)}"</h3>
          <span class="text-xs font-mono text-indigo-400">${prioritized.length} prioritized claims</span>
        </div>

        <div class="space-y-3">
          ${prioritized.map(f => `
            <div class="p-4 rounded-2xl bg-slate-900/60 border ${f.relevanceTier === 'HIGH RELEVANCE' ? 'border-indigo-500/40 bg-indigo-950/10' : 'border-white/10'} flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${f.relevanceTier === 'HIGH RELEVANCE' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}">${escapeHtml(f.relevanceTier)}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono ${f.status === 'OBSERVED' ? 'text-emerald-400' : (f.status === 'UNDETERMINABLE' ? 'text-amber-400' : 'text-slate-400')}">${escapeHtml(f.status || 'OBSERVED')}</span>
                </div>
                <p class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(f.claim || f.text)}</p>
                <p class="text-xs text-slate-400 font-sans">${escapeHtml(f.relevanceRationale)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'compare') {
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="font-serif font-bold text-lg text-slate-100">Visual Comparison Engine</h3>
          <button onclick="window.runWorkspaceComparison()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium shadow-md transition-all cursor-pointer">
            Run Comparative Diff
          </button>
        </div>
        <div id="workspace-compare-results" class="p-6 rounded-2xl bg-slate-900/60 border border-white/10 text-center text-xs font-mono text-slate-400">
          Click "Run Comparative Diff" to compute structural deltas between visual revisions.
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'verify') {
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="font-serif font-bold text-lg text-slate-100">Cross-Visual Consistency Inspector</h3>
          <button onclick="window.runWorkspaceConsistency()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium shadow-md transition-all cursor-pointer">
            Analyze Multi-Artifact Consistency
          </button>
        </div>
        <div id="workspace-verify-results" class="p-6 rounded-2xl bg-slate-900/60 border border-white/10 text-center text-xs font-mono text-slate-400">
          Click "Analyze Multi-Artifact Consistency" to detect entity mismatches, missing models, and directional contradictions.
        </div>
      </div>
    `;
  } else if (currentActiveTab === 'ask') {
    content.innerHTML = `
      <div class="space-y-6 max-w-3xl">
        <div class="space-y-1">
          <h3 class="font-serif font-bold text-lg text-slate-100">Evidence-Grounded Visual Q&A</h3>
          <p class="text-xs text-slate-400 font-sans">Every answer is strictly grounded in extracted visual entities and coordinates. Unsupported questions are refused as UNDETERMINABLE.</p>
        </div>

        <div class="flex gap-2">
          <input type="text" id="vqa-query-input" placeholder="e.g. Does User Client connect directly to API Gateway?" class="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-all" />
          <button onclick="window.handleAskVQA()" class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium shadow-md transition-all cursor-pointer flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">search</span>
            Ask
          </button>
        </div>

        <div id="vqa-result-card" class="hidden p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
          <!-- Rendered on query response -->
        </div>
      </div>
    `;
  }
}

// Local mock utilities for instantaneous reactive UI rendering
function extractEvidenceLocally(art) {
  const nodes = art.diagramStructure?.nodes || [];
  const links = art.diagramStructure?.links || [];
  const evidence = [];

  nodes.forEach((n, idx) => {
    evidence.push({
      id: `EVI-NODE-${idx + 1}`,
      evidenceType: 'NODE',
      region: `Node: ${n.label || n.id}`,
      coordinates: { x: 0.1 + idx * 0.3, y: 0.2, width: 0.25, height: 0.15, normalized: true },
      status: 'OBSERVED',
      explanation: `Observed diagram entity "${n.label || n.id}".`
    });
  });

  links.forEach((l, idx) => {
    evidence.push({
      id: `EVI-LINK-${idx + 1}`,
      evidenceType: 'EDGE',
      region: `Flow: ${l.from} -> ${l.to}`,
      coordinates: { x: 0.35 + idx * 0.3, y: 0.35, width: 0.2, height: 0.1, normalized: true },
      status: 'OBSERVED',
      explanation: `Direct flow from ${l.from} to ${l.to}.`
    });
  });

  return { evidence };
}

function prioritizeLocally(claims, intent) {
  return claims.map((c, i) => {
    const text = typeof c === 'string' ? c : (c.claim || c.text);
    const status = typeof c === 'object' ? (c.status || 'OBSERVED') : 'OBSERVED';
    return {
      claim: text,
      status,
      relevanceTier: i === 0 || status === 'UNDETERMINABLE' ? 'HIGH RELEVANCE' : 'SUPPORTING',
      relevanceRationale: status === 'UNDETERMINABLE' ? 'Highlights evidentiary uncertainty in source visual.' : 'Key observation for visual structure.'
    };
  });
}

export function setupWorkspaceEvents() {
  window.switchWorkspaceTab = switchWorkspaceTab;

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

  window.runWorkspaceComparison = async () => {
    const mount = document.getElementById('workspace-compare-results');
    if (!mount) return;
    mount.innerHTML = `<div class="p-8 text-center text-xs font-mono text-slate-400">Computing differential delta...</div>`;
    
    try {
      const primary = currentWorkspaceArtifacts[0];
      const sourceB = {
        id: 'ART-V2',
        title: 'Revised Visual Architecture v2.0',
        visualType: 'DFD',
        diagramStructure: {
          nodes: [
            { id: 'node_1', label: 'User Client', type: 'External Entity' },
            { id: 'node_2', label: 'API Gateway', type: 'Process' },
            { id: 'node_4', label: 'Redis Cache', type: 'Data Store' }
          ],
          links: [
            { from: 'User Client', to: 'API Gateway' },
            { from: 'API Gateway', to: 'Redis Cache' }
          ]
        }
      };

      const cmp = await compareVisuals(primary, sourceB, currentAnalysisIntent);
      mount.innerHTML = `
        <div class="space-y-4 text-left">
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <span class="font-serif font-bold text-slate-100 text-sm">Comparison Delta Model</span>
            <div class="flex gap-2 text-[11px] font-mono">
              <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">+${cmp.summary.addedCount} Added</span>
              <span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400">-${cmp.summary.removedCount} Removed</span>
              <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-400">${cmp.summary.unchangedCount} Unchanged</span>
            </div>
          </div>
          <div class="space-y-2">
            ${cmp.diffs.map(d => `
              <div class="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                <div class="space-y-0.5">
                  <span class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(d.elementName)}</span>
                  <span class="block text-xs text-slate-400">${escapeHtml(d.description)}</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${d.status === 'ADDED' ? 'bg-emerald-500/10 text-emerald-400' : (d.status === 'REMOVED' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400')}">${escapeHtml(d.status)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      mount.innerHTML = `<div class="p-4 rounded-xl bg-rose-500/10 text-rose-300 text-xs font-mono">${escapeHtml(err.message)}</div>`;
    }
  };

  window.runWorkspaceConsistency = async () => {
    const mount = document.getElementById('workspace-verify-results');
    if (!mount) return;
    mount.innerHTML = `<div class="p-8 text-center text-xs font-mono text-slate-400">Analyzing cross-visual consistency...</div>`;

    try {
      const art1 = { id: 'DFD-1', title: 'Data Flow Diagram', visualType: 'DFD', diagramStructure: { nodes: [{ label: 'Customer' }, { label: 'Bank' }], links: [{ from: 'Customer', to: 'Bank' }] } };
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
