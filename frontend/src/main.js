import './style.css';
import { registerRenderCallbacks } from './state.js';
import { loadPreferences, initPersistentSession } from './services/storage.js';

import { setupNavigation, setupMobileDrawer, setupGlobalKeyboardEvents, setupTheme, setupAuthEvents, setupLogoutModal, setupUserDropdownMenu, setAuthMode, updateAuthUI } from './components/Navbar.js';
import { setupUploadEvents } from './components/ResearchDesk.js';
import { startAnalysisPipeline } from './components/LoadingPipeline.js';
import { setupReportActions } from './components/ReportViewer.js';
import { setupDashboardEvents, renderDashboard } from './components/Dashboard.js';
import { renderArchivePage } from './components/Archive.js';
import { setupSettingsEvents, renderSettingsPage } from './components/Settings.js';
import { setupProfileEvents, renderProfilePage } from './pages/Profile.js';
import { setupMethodologyEvents } from './components/Methodology.js';
import { setupLandingPageEvents } from './pages/Landing.js';
import { exportCleanPDF } from './utils/export.js';
import { getActiveReportData, setActiveReportData } from './state.js';
import { renderResultScreen } from './components/ReportViewer.js';

window.exportCleanPDF = exportCleanPDF;
window.getActiveReportData = getActiveReportData;
window.setActiveReportData = setActiveReportData;
window.renderResultScreen = renderResultScreen;

document.addEventListener('DOMContentLoaded', () => {
  // Register render callbacks to resolve cross-module calls without circular dependencies
  registerRenderCallbacks({
    renderArchivePage,
    renderDashboard,
    renderProfilePage,
    renderSettingsPage,
    updateAuthUI,
    setAuthModeUI: setAuthMode
  });

  loadPreferences();
  setupTheme();
  initPersistentSession();
  setupNavigation();
  setupMobileDrawer();
  setupUploadEvents(startAnalysisPipeline);
  setupAuthEvents(renderArchivePage, renderDashboard);
  setupProfileEvents();
  setupSettingsEvents();
  setupLogoutModal(renderArchivePage);
  setupReportActions(startAnalysisPipeline);
  setupUserDropdownMenu();
  setupDashboardEvents();
  setupGlobalKeyboardEvents();
  setupLandingPageEvents();
  setupMethodologyEvents();
  renderArchivePage();
});
