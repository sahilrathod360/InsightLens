// Extensions Platform API Client Services

import { API_BASE, getAuthHeaders } from '../utils/api.js';

export async function fetchExtensions() {
  try {
    const res = await fetch(`${API_BASE}/api/extensions`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch extensions');
    return json.data?.extensions || [];
  } catch (err) {
    console.warn('[ExtensionsAPI] Fetch extensions notice:', err.message);
    return [];
  }
}

export async function fetchThemes() {
  try {
    const res = await fetch(`${API_BASE}/api/extensions/themes`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch themes');
    return json.data?.themes || [];
  } catch (err) {
    console.warn('[ExtensionsAPI] Fetch themes notice:', err.message);
    return [];
  }
}

export async function fetchTypographyPacks() {
  try {
    const res = await fetch(`${API_BASE}/api/extensions/typography`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch typography');
    return json.data?.typographyPacks || [];
  } catch (err) {
    console.warn('[ExtensionsAPI] Fetch typography notice:', err.message);
    return [];
  }
}

export async function fetchLayoutPacks() {
  try {
    const res = await fetch(`${API_BASE}/api/extensions/layouts`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch layouts');
    return json.data?.layoutPacks || [];
  } catch (err) {
    console.warn('[ExtensionsAPI] Fetch layouts notice:', err.message);
    return [];
  }
}

export async function installExtension(id) {
  const res = await fetch(`${API_BASE}/api/extensions/${id}/install`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Installation failed');
  return json.data;
}

export async function uninstallExtension(id) {
  const res = await fetch(`${API_BASE}/api/extensions/${id}/uninstall`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Uninstallation failed');
  return json.data;
}

export async function toggleExtension(id, enabled) {
  const res = await fetch(`${API_BASE}/api/extensions/${id}/toggle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ enabled })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Toggle failed');
  return json.data;
}

export async function fetchActiveState() {
  try {
    const res = await fetch(`${API_BASE}/api/extensions/active-state`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch active state');
    return json.data || null;
  } catch (err) {
    console.warn('[ExtensionsAPI] Fetch active state notice:', err.message);
    return null;
  }
}

export async function updateActiveState(updates = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/extensions/active-state`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update active state');
    return json.data;
  } catch (err) {
    console.warn('[ExtensionsAPI] Update active state notice:', err.message);
    return null;
  }
}
