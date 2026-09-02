// Storage, Metrics & Session Services

import { setUserSession } from '../state.js';

export const DEFAULT_PREFERENCES = {
  theme: 'dark',
  model: 'auto',
  autoModelFallback: true,
  customApiKey: '',
  compactMode: false,
  fontSize: 'medium',
  animationsOn: true,
  writingStyle: 'classic',
  researchLength: 'long',
  citationStyle: 'APA',
  language: 'en',
  exportFormat: 'pdf',
  autoSaveReports: true
};

export let systemPreferences = { ...DEFAULT_PREFERENCES };

export function loadPreferences() {
  try {
    const saved = localStorage.getItem('insightlens_preferences');
    if (saved) {
      systemPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (err) {
    systemPreferences = { ...DEFAULT_PREFERENCES };
  }
  if (!systemPreferences.model || systemPreferences.model === 'gemini-3.6-flash') {
    systemPreferences.model = 'auto';
  }
  return systemPreferences;
}

export function savePreferences(newPrefs) {
  systemPreferences = { ...systemPreferences, ...newPrefs };
  localStorage.setItem('insightlens_preferences', JSON.stringify(systemPreferences));
  localStorage.setItem('insightlens_theme', systemPreferences.theme);
  applyAppearancePreferences();
  return systemPreferences;
}

export function applyAppearancePreferences() {
  applyTheme(systemPreferences.theme);

  // Compact Mode
  if (systemPreferences.compactMode) {
    document.body.classList.add('compact-mode');
  } else {
    document.body.classList.remove('compact-mode');
  }

  // Font Size
  document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
  document.body.classList.add(`font-size-${systemPreferences.fontSize || 'medium'}`);

  // Animations
  if (systemPreferences.animationsOn === false) {
    document.body.classList.add('no-animations');
  } else {
    document.body.classList.remove('no-animations');
  }
}

export function applyTheme(theme) {
  const themeIcon = document.getElementById('theme-toggle-icon');
  const themeRadios = document.querySelectorAll('input[name="settings-theme"]');
  
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    if (themeIcon) themeIcon.textContent = 'dark_mode';
  } else {
    document.documentElement.classList.add('dark');
    if (themeIcon) themeIcon.textContent = 'light_mode';
  }

  themeRadios.forEach(radio => {
    radio.checked = (radio.value === theme);
  });
}

export function initPersistentSession(updateAuthUI) {
  try {
    const token = localStorage.getItem('insightlens_token');
    const storedSession = localStorage.getItem('insightlens_session');

    // Only restore authenticated session if valid JWT token is present
    if (token && storedSession) {
      const parsed = JSON.parse(storedSession);
      if (parsed && parsed.email && parsed.email !== 'guest@insightlens.edu') {
        setUserSession(parsed);
      } else {
        localStorage.removeItem('insightlens_session');
        localStorage.removeItem('insightlens_token');
        setUserSession(null);
      }
    } else {
      localStorage.removeItem('insightlens_session');
      localStorage.removeItem('insightlens_token');
      setUserSession(null);
    }

    if (typeof updateAuthUI === 'function') updateAuthUI();
  } catch (err) {
    console.error('Failed to parse persistent session:', err);
    localStorage.removeItem('insightlens_session');
    localStorage.removeItem('insightlens_token');
    setUserSession(null);
  }
}

export async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getInitials(name) {
  if (!name) return 'SR';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function getAppMetrics() {
  try {
    return JSON.parse(localStorage.getItem('insightlens_metrics')) || {
      totalImagesAnalyzed: 0,
      totalReportsGenerated: 0,
      pdfExportsCount: 0,
      markdownExportsCount: 0,
      lastAnalysisTimestamp: null,
      lastSuccessfulModel: null,
      lastSuccessfulTime: null
    };
  } catch (err) {
    return {
      totalImagesAnalyzed: 0,
      totalReportsGenerated: 0,
      pdfExportsCount: 0,
      markdownExportsCount: 0,
      lastAnalysisTimestamp: null,
      lastSuccessfulModel: null,
      lastSuccessfulTime: null
    };
  }
}

export function saveAppMetrics(newMetrics) {
  const current = getAppMetrics();
  const updated = { ...current, ...newMetrics };
  localStorage.setItem('insightlens_metrics', JSON.stringify(updated));
  return updated;
}

export function getActivityLogs() {
  try {
    return JSON.parse(localStorage.getItem('insightlens_activity_logs')) || [];
  } catch (err) {
    return [];
  }
}

export function logUserActivity(type, text) {
  try {
    const logs = getActivityLogs();
    const newLog = {
      id: Date.now() + Math.random(),
      type, // 'upload' | 'generate' | 'pdf' | 'markdown' | 'delete'
      text,
      timestamp: Date.now()
    };
    logs.unshift(newLog);
    if (logs.length > 30) logs.pop();
    localStorage.setItem('insightlens_activity_logs', JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to log user activity:', err);
  }
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
