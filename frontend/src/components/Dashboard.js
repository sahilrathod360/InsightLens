// Researcher Dashboard Component Module Bridge

import { renderRealDashboard } from './Dashboard/DashboardComponent.js';

export function setupDashboardEvents() {
  // Navigation & interaction listeners are mounted dynamically when the dashboard view renders
}

export function renderDashboard() {
  renderRealDashboard();
}

export { saveReportToHistory } from './Dashboard/DashboardComponent.js';
