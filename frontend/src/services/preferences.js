// InsightLens Preferences & Diagnostic Service

import { API_BASE } from '../utils/api.js';

export const DEFAULT_PREFERENCES = {
  theme: 'dark', // 'dark' | 'light' | 'system'
  provider: 'auto', // 'auto' | 'gemini' | 'openrouter'
  model: 'auto', // 'auto' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-pro'
  geminiApiKey: '',
  openrouterApiKey: '',
  language: 'en', // 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja'
  researchLength: 'long', // 'long' | 'short'
  citationStyle: 'APA', // 'APA' | 'MLA' | 'IEEE' | 'Chicago'
  exportFormat: 'pdf', // 'pdf' | 'markdown' | 'json'
  autoModelFallback: true,
  compactMode: false,
  fontSize: 'medium',
  animationsOn: true,
  autoSaveReports: true
};

export function getStoredPreferences() {
  try {
    const saved = localStorage.getItem('insightlens_preferences');
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Failed to parse stored preferences:', err);
  }
  return { ...DEFAULT_PREFERENCES };
}

export function saveStoredPreferences(newPrefs) {
  const current = getStoredPreferences();
  const updated = { ...current, ...newPrefs };
  localStorage.setItem('insightlens_preferences', JSON.stringify(updated));
  localStorage.setItem('insightlens_theme', updated.theme);
  applyPreferencesToDOM(updated);
  return updated;
}

export function applyPreferencesToDOM(prefs = getStoredPreferences()) {
  const theme = prefs.theme || 'dark';
  let isDark = true;

  if (theme === 'system') {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDark = theme === 'dark';
  }

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Compact Mode
  if (prefs.compactMode) {
    document.body.classList.add('compact-mode');
  } else {
    document.body.classList.remove('compact-mode');
  }

  // Font Size
  document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
  document.body.classList.add(`font-size-${prefs.fontSize || 'medium'}`);

  // Animations
  if (prefs.animationsOn === false) {
    document.body.classList.add('no-animations');
  } else {
    document.body.classList.remove('no-animations');
  }
}

export async function testApiConnection(provider, apiKey) {
  const targetUrl = `${API_BASE}/api/settings/test-provider`;
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey })
    });
    const json = await res.json();
    return {
      success: json.success,
      status: json.data?.status || (json.success ? 'HTTP 200 OK' : 'Error'),
      message: json.message || 'Provider test complete',
      latency: json.data?.latency || 0
    };
  } catch (err) {
    return {
      success: false,
      status: 'Network Error',
      message: 'Failed to connect to backend server for provider connection test.',
      latency: 0
    };
  }
}

export function exportPreferencesFile() {
  const prefs = getStoredPreferences();
  const dataStr = JSON.stringify(prefs, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `InsightLens_Preferences_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importPreferencesFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        const updated = saveStoredPreferences(imported);
        resolve(updated);
      } catch (err) {
        reject(new Error('Invalid preferences JSON file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function resetPreferencesToDefault() {
  localStorage.setItem('insightlens_preferences', JSON.stringify(DEFAULT_PREFERENCES));
  localStorage.setItem('insightlens_theme', DEFAULT_PREFERENCES.theme);
  applyPreferencesToDOM(DEFAULT_PREFERENCES);
  return { ...DEFAULT_PREFERENCES };
}

export function clearAllHistoryData() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('insightlens_history_')) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

export function clearAllApplicationData() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('insightlens')) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  resetPreferencesToDefault();
}
