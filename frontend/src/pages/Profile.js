// Researcher Profile Page Component (Backed by Aiven PostgreSQL)

import { getUserSession } from '../state.js';
import { getInitials } from '../services/storage.js';
import { getReportsHistory } from '../services/history.js';
import { API_BASE, getAuthHeaders } from '../utils/api.js';

function ensureProfileDOM() {
  let profileContainer = document.getElementById('page-profile');
  if (!profileContainer) {
    profileContainer = document.createElement('div');
    profileContainer.id = 'page-profile';
    profileContainer.className = 'page-view hidden flex-grow w-full max-w-[1000px] mx-auto px-6 md:px-8 py-10 space-y-8';
    
    // Insert before methodology if it exists
    const methodologyPage = document.getElementById('page-methodology');
    if (methodologyPage && methodologyPage.parentNode) {
      methodologyPage.parentNode.insertBefore(profileContainer, methodologyPage);
    } else {
      document.body.appendChild(profileContainer);
    }
  }

  if (!profileContainer.innerHTML.trim()) {
    profileContainer.innerHTML = `
      <header class="flex items-center gap-4 border-b ghost-border pb-6">
        <div id="profile-avatar-large" class="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 to-rose-500 text-white font-semibold text-2xl flex items-center justify-center shadow-lg">
          --
        </div>
        <div>
          <h1 id="profile-display-name" class="font-display-lg text-2xl md:text-3xl text-on-surface font-serif font-bold">Researcher Name</h1>
          <p id="profile-display-email" class="font-body-sm text-on-surface-variant text-sm mt-1">researcher@university.edu</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase" id="profile-account-status">Active Researcher</span>
          </div>
        </div>
      </header>

      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Stats Cards -->
        <div class="bg-surface-container rounded-2xl p-6 border ghost-border flex flex-col space-y-2">
          <span class="text-[11px] font-mono text-on-surface-variant uppercase">Join Date</span>
          <span id="profile-stat-joined" class="text-lg font-serif font-bold text-on-surface">--</span>
        </div>
        <div class="bg-surface-container rounded-2xl p-6 border ghost-border flex flex-col space-y-2">
          <span class="text-[11px] font-mono text-on-surface-variant uppercase">Last Login</span>
          <span id="profile-stat-last-login" class="text-lg font-serif font-bold text-on-surface">--</span>
        </div>
        <div class="bg-surface-container rounded-2xl p-6 border ghost-border flex flex-col space-y-2">
          <span class="text-[11px] font-mono text-indigo-400 uppercase">Total Reports</span>
          <span id="profile-stat-reports" class="text-2xl font-serif font-bold text-indigo-300">0</span>
        </div>
        <div class="bg-surface-container rounded-2xl p-6 border ghost-border flex flex-col space-y-2">
          <span class="text-[11px] font-mono text-emerald-400 uppercase">Total Analyses</span>
          <span id="profile-stat-analyses" class="text-2xl font-serif font-bold text-emerald-300">0</span>
        </div>
        <div class="bg-surface-container rounded-2xl p-6 border ghost-border flex flex-col space-y-2 lg:col-span-2">
          <span class="text-[11px] font-mono text-amber-400 uppercase">Last Analysis</span>
          <span id="profile-stat-last-analysis" class="text-lg font-serif font-bold text-amber-300 truncate">No history found</span>
        </div>
      </section>
    `;
  }
}

export function setupProfileEvents() {
  // Navigation is handled globally by data-page="profile" triggers
}

export async function renderProfilePage() {
  ensureProfileDOM();
  
  const userSession = getUserSession();
  if (!userSession) return;

  // DOM Elements
  const displayName = document.getElementById('profile-display-name');
  const displayEmail = document.getElementById('profile-display-email');
  const avatarLarge = document.getElementById('profile-avatar-large');
  const statJoined = document.getElementById('profile-stat-joined');
  const statLastLogin = document.getElementById('profile-stat-last-login');
  const statReports = document.getElementById('profile-stat-reports');
  const statAnalyses = document.getElementById('profile-stat-analyses');
  const statLastAnalysis = document.getElementById('profile-stat-last-analysis');

  if (displayName) displayName.textContent = userSession.name;
  if (displayEmail) displayEmail.textContent = userSession.email;
  if (avatarLarge) avatarLarge.textContent = userSession.initials || getInitials(userSession.name);
  if (statLastLogin) statLastLogin.textContent = new Date(userSession.loginTime || Date.now()).toLocaleString();

  // Fetch verified user profile from PostgreSQL
  try {
    const userRes = await fetch(`${API_BASE}/api/auth/me?email=${encodeURIComponent(userSession.email)}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (userRes.ok) {
      const userJson = await userRes.json();
      if (userJson.success && userJson.data?.created_at && statJoined) {
        statJoined.textContent = new Date(userJson.data.created_at).toLocaleDateString();
      }
    }
  } catch (e) {}

  // Fetch reports from PostgreSQL
  try {
    const reports = await getReportsHistory();
    const totalReports = reports.length;
    const lastReport = reports.length > 0 ? (reports[0].title || 'Visual Intelligence Brief') : 'No reports found';

    if (statReports) statReports.textContent = totalReports.toString();
    if (statAnalyses) statAnalyses.textContent = totalReports.toString();
    if (statLastAnalysis) statLastAnalysis.textContent = lastReport;
  } catch (err) {
    console.warn('[Profile] Error loading history from database:', err);
  }
}
