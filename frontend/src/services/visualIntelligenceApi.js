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

export async function sendLiveVisionFrame(framePayload) {
  const res = await fetch(`${API_BASE}/api/live-vision/frame`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(framePayload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to analyze live camera frame');
  return json.data;
}

export async function analyzeSpecificRegion(regionPayload) {
  const res = await fetch(`${API_BASE}/api/regions/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(regionPayload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to analyze specific region');
  return json.data;
}

export async function evaluateUserGuess(guess, visualArtifact) {
  const res = await fetch(`${API_BASE}/api/guess/evaluate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ guess, visualArtifact })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to evaluate guess');
  return json.data;
}

export async function generateNarrationSequence(reportData) {
  const res = await fetch(`${API_BASE}/api/narration/sequence`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reportData })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to generate narration sequence');
  return json.data;
}
