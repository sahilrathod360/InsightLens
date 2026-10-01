// Theme & Extensibility Runtime Manager
// PostgreSQL is the Authoritative Source of Truth (LocalStorage is only a temporary UI cache)

import { showToast } from '../utils/toast.js';
import { fetchActiveState, updateActiveState } from './extensionsApi.js';

const THEME_DEFINITIONS = {
  'midnight-research': {
    '--bg-main': '#0B0F19',
    '--bg-canvas': '#0E1322',
    '--bg-card': '#151C30',
    '--bg-card-subtle': '#1C253E',
    '--border-color': '#263354',
    '--text-primary': '#F1F5F9',
    '--text-secondary': '#94A3B8',
    '--text-muted': '#64748B',
    '--accent-color': '#6366F1',
    '--accent-emerald': '#10B981',
    '--accent-amber': '#F59E0B',
    '--accent-purple': '#8B5CF6',
    '--accent-link': '#38BDF8',
    'isDark': true
  },
  'neo-glass': {
    '--bg-main': '#070913',
    '--bg-canvas': '#0A0E1F',
    '--bg-card': 'rgba(20, 27, 50, 0.85)',
    '--bg-card-subtle': 'rgba(30, 41, 75, 0.75)',
    '--border-color': 'rgba(139, 92, 246, 0.35)',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#A5B4FC',
    '--text-muted': '#818CF8',
    '--accent-color': '#8B5CF6',
    '--accent-emerald': '#34D399',
    '--accent-amber': '#FBBF24',
    '--accent-purple': '#A855F7',
    '--accent-link': '#22D3EE',
    'isDark': true
  },
  'terminal': {
    '--bg-main': '#050709',
    '--bg-canvas': '#080C10',
    '--bg-card': '#0E141C',
    '--bg-card-subtle': '#151D28',
    '--border-color': '#1E293B',
    '--text-primary': '#E2E8F0',
    '--text-secondary': '#94A3B8',
    '--text-muted': '#64748B',
    '--accent-color': '#10B981',
    '--accent-emerald': '#10B981',
    '--accent-amber': '#F59E0B',
    '--accent-purple': '#06B6D4',
    '--accent-link': '#10B981',
    'isDark': true
  },
  'paper': {
    '--bg-main': '#FBFBF9',
    '--bg-canvas': '#FFFFFF',
    '--bg-card': '#F4F4F0',
    '--bg-card-subtle': '#ECECE6',
    '--border-color': '#D8D8CF',
    '--text-primary': '#18181B',
    '--text-secondary': '#52525B',
    '--text-muted': '#71717A',
    '--accent-color': '#2563EB',
    '--accent-emerald': '#059669',
    '--accent-amber': '#D97706',
    '--accent-purple': '#7C3AED',
    '--accent-link': '#2563EB',
    'isDark': false
  },
  'solarized-lab': {
    '--bg-main': '#002B36',
    '--bg-canvas': '#073642',
    '--bg-card': '#094251',
    '--bg-card-subtle': '#0E5062',
    '--border-color': '#186478',
    '--text-primary': '#93A1A1',
    '--text-secondary': '#839496',
    '--text-muted': '#586E75',
    '--accent-color': '#268BD2',
    '--accent-emerald': '#2AA198',
    '--accent-amber': '#B58900',
    '--accent-purple': '#6C71C4',
    '--accent-link': '#2AA198',
    'isDark': true
  }
};

let currentActiveTheme = 'default';
let currentActiveTypography = 'academic';
let currentActiveLayout = 'research-desk';

export function applyTheme(themeSlug, persist = true) {
  const root = document.documentElement;
  const theme = THEME_DEFINITIONS[themeSlug];

  if (!theme) {
    // Reset to default theme
    root.removeAttribute('data-theme');
    currentActiveTheme = 'default';
    if (persist) {
      updateActiveState({ theme: 'midnight-research' }).catch(() => {});
    }
    return;
  }

  currentActiveTheme = themeSlug;
  root.setAttribute('data-theme', themeSlug);

  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Apply variables
  for (const [key, val] of Object.entries(theme)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, val);
    }
  }

  try {
    localStorage.setItem('insightlens_active_theme', themeSlug);
  } catch (e) {}

  if (persist) {
    updateActiveState({ theme: themeSlug }).catch(err => {
      console.warn('[ThemeRuntime] Failed to persist theme to PostgreSQL:', err.message);
    });
    showToast(`Applied Theme: ${themeSlug.replace(/-/g, ' ').toUpperCase()}`, 'info');
  }
}

export function applyTypography(typoSlug, persist = true) {
  const root = document.documentElement;
  root.setAttribute('data-typography', typoSlug);
  currentActiveTypography = typoSlug;

  try {
    localStorage.setItem('insightlens_active_typography', typoSlug);
  } catch (e) {}

  if (persist) {
    updateActiveState({ typography: typoSlug }).catch(err => {
      console.warn('[ThemeRuntime] Failed to persist typography to PostgreSQL:', err.message);
    });
    showToast(`Typography Pack updated: ${typoSlug.toUpperCase()}`, 'info');
  }
}

export function applyLayoutMode(layoutSlug, persist = true) {
  const root = document.documentElement;
  root.setAttribute('data-layout', layoutSlug);
  currentActiveLayout = layoutSlug;

  try {
    localStorage.setItem('insightlens_active_layout', layoutSlug);
  } catch (e) {}

  if (persist) {
    updateActiveState({ layout: layoutSlug }).catch(err => {
      console.warn('[ThemeRuntime] Failed to persist layout to PostgreSQL:', err.message);
    });
    showToast(`UI Layout updated: ${layoutSlug.replace(/-/g, ' ').toUpperCase()}`, 'info');
  }
}

export function togglePresentationMode(enable, persist = true) {
  const root = document.documentElement;
  if (enable) {
    root.setAttribute('data-presentation-mode', 'true');
    showToast('Entered Presentation & Review Mode', 'info');
  } else {
    root.removeAttribute('data-presentation-mode');
    showToast('Exited Presentation Mode', 'info');
  }
  if (persist) {
    syncActiveModes();
  }
}

export function toggleFocusMode(enable, persist = true) {
  const root = document.documentElement;
  if (enable) {
    root.setAttribute('data-focus-mode', 'true');
    showToast('Entered Focus Mode (Zen Workspace)', 'info');
  } else {
    root.removeAttribute('data-focus-mode');
    showToast('Exited Focus Mode', 'info');
  }
  if (persist) {
    syncActiveModes();
  }
}

export function toggleDeveloperMode(enable, persist = true) {
  const root = document.documentElement;
  if (enable) {
    root.setAttribute('data-developer-mode', 'true');
    showToast('Developer & Telemetry Mode Enabled', 'info');
  } else {
    root.removeAttribute('data-developer-mode');
    showToast('Developer Mode Disabled', 'info');
  }
  if (persist) {
    syncActiveModes();
  }
}

export function toggleAcademicMode(enable, persist = true) {
  const root = document.documentElement;
  if (enable) {
    root.setAttribute('data-academic-mode', 'true');
    showToast('Academic Mode Activated', 'info');
  } else {
    root.removeAttribute('data-academic-mode');
    showToast('Academic Mode Deactivated', 'info');
  }
  if (persist) {
    syncActiveModes();
  }
}

function syncActiveModes() {
  const root = document.documentElement;
  const activeModes = [];
  if (root.getAttribute('data-academic-mode') === 'true') activeModes.push('academic-mode');
  if (root.getAttribute('data-focus-mode') === 'true') activeModes.push('focus-mode');
  if (root.getAttribute('data-presentation-mode') === 'true') activeModes.push('presentation-mode');
  if (root.getAttribute('data-developer-mode') === 'true') activeModes.push('developer-mode');
  updateActiveState({ activeModes }).catch(() => {});
}

/**
 * Initializes runtime by checking localStorage for instantaneous render,
 * then immediately querying PostgreSQL as the authoritative source of truth.
 * If PostgreSQL state differs from localStorage, PostgreSQL wins.
 */
export async function initThemeRuntime() {
  // 1. Instantaneous temporary cache hydration
  try {
    const cachedTheme = localStorage.getItem('insightlens_active_theme');
    if (cachedTheme && THEME_DEFINITIONS[cachedTheme]) {
      applyTheme(cachedTheme, false);
    }
    const cachedTypo = localStorage.getItem('insightlens_active_typography');
    if (cachedTypo) {
      applyTypography(cachedTypo, false);
    }
    const cachedLayout = localStorage.getItem('insightlens_active_layout');
    if (cachedLayout) {
      applyLayoutMode(cachedLayout, false);
    }
  } catch (e) {}

  // 2. Authoritative PostgreSQL synchronization
  try {
    const serverState = await fetchActiveState();
    if (serverState) {
      if (serverState.theme && THEME_DEFINITIONS[serverState.theme]) {
        applyTheme(serverState.theme, false);
      }
      if (serverState.typography) {
        applyTypography(serverState.typography, false);
      }
      if (serverState.layout) {
        applyLayoutMode(serverState.layout, false);
      }
      if (Array.isArray(serverState.activeModes)) {
        toggleAcademicMode(serverState.activeModes.includes('academic-mode'), false);
        toggleFocusMode(serverState.activeModes.includes('focus-mode'), false);
        togglePresentationMode(serverState.activeModes.includes('presentation-mode'), false);
        toggleDeveloperMode(serverState.activeModes.includes('developer-mode'), false);
      }
    }
  } catch (err) {
    console.warn('[ThemeRuntime] Authoritative PostgreSQL sync notice:', err.message);
  }
}
