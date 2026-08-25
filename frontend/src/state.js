// Application Central State & Routing Management

import { DEFAULT_PREFERENCES, systemPreferences, loadPreferences } from './services/storage.js';
import { showToast } from './utils/toast.js';

export const PROTECTED_PAGES = ['dashboard', 'profile', 'archive', 'settings'];

let activeFile = null;
let activeReportData = null;
let progressInterval = null;
let progressTimeouts = [];
let userSession = null;
let authMode = 'signin';
let currentAnalysisId = 0;
let globalSafetyTimer = null;
let lastAnalysisPayload = null;

// Registered Page & Component render callbacks to avoid circular imports
let renderCallbacks = {
  renderArchivePage: () => {},
  renderDashboard: () => {},
  renderProfilePage: () => {},
  renderSettingsPage: () => {},
  updateAuthUI: () => {},
  setAuthModeUI: () => {}
};

export function registerRenderCallbacks(callbacks) {
  renderCallbacks = { ...renderCallbacks, ...callbacks };
}

// Getters & Setters
export function getActiveFile() { return activeFile; }
export function setActiveFile(file) { activeFile = file; }

export function getActiveReportData() { return activeReportData; }
export function setActiveReportData(data) { activeReportData = data; }

export function getProgressInterval() { return progressInterval; }
export function setProgressInterval(intId) { progressInterval = intId; }

export function getProgressTimeouts() { return progressTimeouts; }
export function addProgressTimeout(t) { progressTimeouts.push(t); }
export function clearProgressTimeouts() {
  progressTimeouts.forEach(t => clearTimeout(t));
  progressTimeouts = [];
}

export function getUserSession() { return userSession; }
export function setUserSession(sess) { userSession = sess; }

export function getAuthMode() { return authMode; }
export function setAuthModeState(mode) { authMode = mode; }

export function getCurrentAnalysisId() { return currentAnalysisId; }
export function incrementAnalysisId() { currentAnalysisId++; return currentAnalysisId; }
export function setCurrentAnalysisId(id) { currentAnalysisId = id; }

export function getGlobalSafetyTimer() { return globalSafetyTimer; }
export function setGlobalSafetyTimer(timer) { globalSafetyTimer = timer; }

export function getLastAnalysisPayload() { return lastAnalysisPayload; }
export function setLastAnalysisPayload(payload) { lastAnalysisPayload = payload; }

export function getSystemPreferences() { return systemPreferences; }

export function clearTimeouts() {
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = null;
  clearProgressTimeouts();
  if (globalSafetyTimer) clearTimeout(globalSafetyTimer);
  globalSafetyTimer = null;
}

export function navigateTo(pageId) {
  if (PROTECTED_PAGES.includes(pageId) && !userSession) {
    showToast('Authentication Required: Please sign in to access your Researcher Portal.', 'warning');
    if (typeof renderCallbacks.setAuthModeUI === 'function') {
      renderCallbacks.setAuthModeUI('signin');
    }
    navigateTo('login');
    return;
  }

  document.querySelectorAll('.page-view').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('animate-page-enter');
  });

  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.remove('hidden');
    void targetPage.offsetWidth;
    targetPage.classList.add('animate-page-enter');
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-page') === pageId) {
      link.setAttribute('data-active', 'true');
      link.className = 'nav-link px-3 py-1.5 rounded-md font-semibold cursor-pointer active-nav transition-colors';
    } else {
      link.removeAttribute('data-active');
      link.className = 'nav-link px-3 py-1.5 rounded-md cursor-pointer font-medium transition-colors';
    }
  });

  const exportNavBtn = document.getElementById('export-nav-btn');
  if (exportNavBtn) {
    if (pageId === 'result') {
      exportNavBtn.classList.remove('hidden');
    } else {
      exportNavBtn.classList.add('hidden');
    }
  }

  if (pageId === 'archive') {
    renderCallbacks.renderArchivePage();
  } else if (pageId === 'dashboard') {
    renderCallbacks.renderDashboard();
  } else if (pageId === 'profile') {
    renderCallbacks.renderProfilePage();
  } else if (pageId === 'settings') {
    renderCallbacks.renderSettingsPage();
  }

  document.getElementById('user-dropdown-menu')?.classList.remove('show');
  document.getElementById('mobile-nav-drawer')?.classList.remove('show');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
