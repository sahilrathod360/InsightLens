// Visual Intelligence API Client Services

import { API_BASE, getAuthHeaders } from '../utils/api.js';

export async function extractEvidence(reportData, imageDimensions = null) {
  const res = await fetch(`${API_BASE}/api/evidence/extract`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reportData, imageDimensions })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to extract evidence');
  return json.data;
}

export async function compareVisuals(sourceA, sourceB, intent = 'Comparison') {
  const res = await fetch(`${API_BASE}/api/comparison/compare`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceA, sourceB, intent })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to compare visuals');
  return json.data;
}

export async function evaluateConsistency(artifacts = []) {
  const res = await fetch(`${API_BASE}/api/consistency/evaluate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ artifacts })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to evaluate cross-visual consistency');
  return json.data;
}

export async function askVisualQuestion(visualArtifact, query) {
  const res = await fetch(`${API_BASE}/api/visual-qa/ask`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ visualArtifact, query })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to answer visual query');
  return json.data;
}

export async function createVisualWorkspace(data) {
  const res = await fetch(`${API_BASE}/api/workspace`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create workspace');
  return json.data;
}

export async function fetchWorkspaceIntelligence(workspaceId) {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch workspace intelligence');
  return json.data;
}
