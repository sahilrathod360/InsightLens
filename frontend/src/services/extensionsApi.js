// Extensions Platform API Client Services

import { API_BASE, getAuthHeaders } from '../utils/api.js';

export async function fetchExtensions() {
  const res = await fetch(`${API_BASE}/api/extensions`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Failed to fetch extensions (HTTP ${res.status})`);
  return json.data?.extensions || [];
}

export async function fetchThemes() {
  const res = await fetch(`${API_BASE}/api/extensions/themes`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Failed to fetch themes (HTTP ${res.status})`);
  return json.data?.themes || [];
}

export async function fetchTypographyPacks() {
  const res = await fetch(`${API_BASE}/api/extensions/typography`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Failed to fetch typography (HTTP ${res.status})`);
  return json.data?.typographyPacks || [];
}

export async function fetchLayoutPacks() {
  const res = await fetch(`${API_BASE}/api/extensions/layouts`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Failed to fetch layouts (HTTP ${res.status})`);
  return json.data?.layoutPacks || [];
}

export async function downloadExtensionPackage(id) {
  const res = await fetch(`${API_BASE}/api/extensions/${id}/download`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to download extension package (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `${id}-extension.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  return true;
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

export async function enableExtension(id) {
  const res = await fetch(`${API_BASE}/api/extensions/${id}/enable`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Enable failed');
  return json.data;
}

export async function disableExtension(id) {
  const res = await fetch(`${API_BASE}/api/extensions/${id}/disable`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Disable failed');
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
