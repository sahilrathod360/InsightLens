// Knowledge Intelligence API Client Services

import { API_BASE, getAuthHeaders } from '../utils/api.js';

/**
 * Overview Stats
 */
export async function fetchOverviewStats() {
  const res = await fetch(`${API_BASE}/api/knowledge/overview`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch knowledge overview');
  return json.data;
}

/**
 * Evolution (Time Machine)
 */
export async function analyzeEvolution(sourceA, sourceB, options = {}) {
  const res = await fetch(`${API_BASE}/api/knowledge/evolution`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      sourceA,
      sourceB,
      title: options.title || 'Document Evolution Analysis',
      sourceALabel: options.sourceALabel || 'Version 1',
      sourceBLabel: options.sourceBLabel || 'Version 2',
      projectId: options.projectId || null
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Evolution analysis failed');
  return json.data;
}

export async function fetchEvolutionHistory() {
  const res = await fetch(`${API_BASE}/api/knowledge/evolution`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch evolution history');
  return json.data;
}

export async function fetchEvolutionById(id) {
  const res = await fetch(`${API_BASE}/api/knowledge/evolution/${id}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch evolution record');
  return json.data;
}

export async function deleteEvolution(id) {
  const res = await fetch(`${API_BASE}/api/knowledge/evolution/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete evolution record');
  return json.data;
}

export async function analyzeImpact(changes, context = 'software_specification') {
  const res = await fetch(`${API_BASE}/api/knowledge/impact`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ changes, context })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Impact analysis failed');
  return json.data;
}

/**
 * Knowledge Gap Detector
 */
export async function analyzeKnowledgeGaps(text, reportId = null, projectId = null) {
  const res = await fetch(`${API_BASE}/api/knowledge/gaps/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, reportId, projectId })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Knowledge gap analysis failed');
  return json.data;
}

export async function fetchKnowledgeGaps(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.append('status', filters.status);
  if (filters.gap_type) query.append('gap_type', filters.gap_type);

  const res = await fetch(`${API_BASE}/api/knowledge/gaps?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch knowledge gaps');
  return json.data;
}

export async function createKnowledgeGap(gapData) {
  const res = await fetch(`${API_BASE}/api/knowledge/gaps`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(gapData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create knowledge gap');
  return json.data;
}

export async function updateKnowledgeGap(id, updates) {
  const res = await fetch(`${API_BASE}/api/knowledge/gaps/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update knowledge gap');
  return json.data;
}

export async function deleteKnowledgeGap(id) {
  const res = await fetch(`${API_BASE}/api/knowledge/gaps/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete knowledge gap');
  return json.data;
}

/**
 * Decision Memory
 */
export async function fetchDecisions(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.append('status', filters.status);

  const res = await fetch(`${API_BASE}/api/knowledge/decisions?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch decisions');
  return json.data;
}

export async function createDecision(decisionData) {
  const res = await fetch(`${API_BASE}/api/knowledge/decisions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(decisionData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create decision record');
  return json.data;
}

export async function updateDecision(id, updates) {
  const res = await fetch(`${API_BASE}/api/knowledge/decisions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update decision');
  return json.data;
}

export async function validateDecision(id) {
  const res = await fetch(`${API_BASE}/api/knowledge/decisions/${id}/validate`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to validate decision');
  return json.data;
}

/**
 * Claim Domino Graph & What-If Sandbox
 */
export async function fetchGraph(projectId = null) {
  const query = projectId ? `?projectId=${projectId}` : '';
  const res = await fetch(`${API_BASE}/api/knowledge/graph${query}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch domino graph');
  return json.data;
}

export async function saveGraphNode(nodeData) {
  const res = await fetch(`${API_BASE}/api/knowledge/graph/nodes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(nodeData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to save graph node');
  return json.data;
}

export async function saveGraphEdge(edgeData) {
  const res = await fetch(`${API_BASE}/api/knowledge/graph/edges`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(edgeData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to save graph edge');
  return json.data;
}

export async function simulateWhatIf(scenario) {
  const res = await fetch(`${API_BASE}/api/knowledge/graph/what-if`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(scenario)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'What-if simulation failed');
  return json.data;
}

/**
 * Project Autopsy
 */
export async function generateAutopsy(payload) {
  const res = await fetch(`${API_BASE}/api/knowledge/autopsy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Project autopsy generation failed');
  return json.data;
}

export async function fetchAutopsies() {
  const res = await fetch(`${API_BASE}/api/knowledge/autopsy`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch autopsies');
  return json.data;
}

export async function fetchAutopsyById(id) {
  const res = await fetch(`${API_BASE}/api/knowledge/autopsy/${id}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch autopsy record');
  return json.data;
}

/**
 * Assumption Stress Testing & Devil's Advocate
 */
export async function stressTestAssumptions(documentText, claims = [], title = 'Assumption Stress Test') {
  const res = await fetch(`${API_BASE}/api/knowledge/assumptions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ documentText, claims, title })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Assumption stress testing failed');
  return json.data;
}

export async function runAdversarialReview(claims = [], conclusions = [], documentText = '', title = "Adversarial Devil's Advocate Review") {
  const res = await fetch(`${API_BASE}/api/knowledge/adversarial`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ claims, conclusions, documentText, title })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Adversarial review failed');
  return json.data;
}
