// Researcher Profile Page Component

import { getUserSession } from '../state.js';
import { getInitials } from '../services/storage.js';

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
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase" id="profile-account-status">Active Account</span>
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

export function renderProfilePage() {
  ensureProfileDOM();
  
  const userSession = getUserSession();
  if (!userSession) return;

  // Retrieve complete user record to get Join Date
  let users = {};
  try {
    users = JSON.parse(localStorage.getItem('insightlens_users')) || {};
  } catch (err) {}
  
  const activeUser = Object.values(users).find(u => u.email.toLowerCase() === userSession.email.toLowerCase());
  const joinDate = activeUser && activeUser.createdAt ? new Date(activeUser.createdAt).toLocaleDateString() : 'Unknown';

  // Retrieve History Stats
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(`insightlens_history_${userSession.email}`)) || [];
  } catch (err) {}
  
  // Filter history for current user (if your history has user attribution. Assuming global for now per requirements, or we can filter if email is saved)
  // For now, assume history is all for this local session.
  const totalAnalyses = history.length;
  // Total reports is same as analyses in this app
  const totalReports = history.length;
  const lastAnalysis = history.length > 0 ? history[0].title || history[0].metadata?.title || 'Untitled Research' : 'No history found';

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
  
  if (statJoined) statJoined.textContent = joinDate;
  if (statLastLogin) statLastLogin.textContent = new Date(userSession.loginTime || Date.now()).toLocaleString();
  if (statReports) statReports.textContent = totalReports.toString();
  if (statAnalyses) statAnalyses.textContent = totalAnalyses.toString();
  if (statLastAnalysis) statLastAnalysis.textContent = lastAnalysis;
}
