// Comprehensive Researcher Profile Component
// Backed by Aiven PostgreSQL (users, user_profiles, reports, visual_comparisons, activity_logs)

import { getUserSession, setUserSession, navigateTo } from '../state.js';
import { getInitials } from '../services/storage.js';
import { API_BASE, getAuthHeaders } from '../utils/api.js';
import { showToast } from '../utils/toast.js';
import { updateAuthUI } from '../components/Navbar.js';

let editAvatarBase64 = null;

export function setupProfileEvents() {
  // Edit Profile Modal Triggers
  document.getElementById('profile-edit-btn')?.addEventListener('click', openEditProfileModal);
  document.getElementById('edit-profile-close-btn')?.addEventListener('click', closeEditProfileModal);
  document.getElementById('edit-profile-cancel-btn')?.addEventListener('click', closeEditProfileModal);
  document.getElementById('edit-profile-form')?.addEventListener('submit', handleSaveProfile);

  // Change Password Modal Triggers
  document.getElementById('profile-change-pwd-btn')?.addEventListener('click', openChangePasswordModal);
  document.getElementById('change-pwd-close-btn')?.addEventListener('click', closeChangePasswordModal);
  document.getElementById('change-pwd-cancel-btn')?.addEventListener('click', closeChangePasswordModal);
  document.getElementById('change-pwd-form')?.addEventListener('submit', handleChangePassword);

  // Avatar Upload in Edit Profile Modal
  const avatarInput = document.getElementById('edit-profile-avatar-input');
  const avatarPreview = document.getElementById('edit-profile-avatar-preview');
  const avatarPlaceholder = document.getElementById('edit-profile-avatar-placeholder');
  const removeAvatarBtn = document.getElementById('edit-profile-avatar-remove');

  document.getElementById('edit-profile-avatar-dropzone')?.addEventListener('click', () => avatarInput?.click());

  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        showToast('Image exceeds 4MB size limit.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        editAvatarBase64 = evt.target.result;
        if (avatarPreview) {
          avatarPreview.src = editAvatarBase64;
          avatarPreview.classList.remove('hidden');
        }
        if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden');
        if (removeAvatarBtn) removeAvatarBtn.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  removeAvatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    editAvatarBase64 = '';
    if (avatarInput) avatarInput.value = '';
    if (avatarPreview) {
      avatarPreview.src = '';
      avatarPreview.classList.add('hidden');
    }
    if (avatarPlaceholder) avatarPlaceholder.classList.remove('hidden');
    if (removeAvatarBtn) removeAvatarBtn.classList.add('hidden');
  });
}

export async function renderProfilePage() {
  const session = getUserSession();
  if (!session) {
    navigateTo('login');
    return;
  }

  // 1. Fill basic session info
  populateBasicProfile(session);

  // 2. Fetch full profile and live stats from PostgreSQL
  try {
    const [profileRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/api/auth/stats`, { headers: getAuthHeaders() })
    ]);

    if (profileRes.ok) {
      const pJson = await profileRes.json();
      if (pJson.success && pJson.data) {
        populateDetailedProfile(pJson.data);
      }
    }

    if (statsRes.ok) {
      const sJson = await statsRes.json();
      if (sJson.success && sJson.data) {
        populateLiveStats(sJson.data);
      }
    }
  } catch (err) {
    console.warn('[Profile] Error loading data from PostgreSQL:', err);
  }
}

function populateBasicProfile(user) {
  const nameEl = document.getElementById('profile-display-name');
  const userTagEl = document.getElementById('profile-display-username');
  const emailEl = document.getElementById('profile-display-email');
  const avatarImg = document.getElementById('profile-avatar-img');
  const avatarInitials = document.getElementById('profile-avatar-initials');

  if (nameEl) nameEl.textContent = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Researcher';
  if (userTagEl) userTagEl.textContent = `@${user.username || (user.email ? user.email.split('@')[0] : 'researcher')}`;
  if (emailEl) emailEl.textContent = user.email || '';

  if (user.avatar) {
    if (avatarImg) {
      avatarImg.src = user.avatar;
      avatarImg.classList.remove('hidden');
    }
    if (avatarInitials) avatarInitials.classList.add('hidden');
  } else {
    if (avatarImg) avatarImg.classList.add('hidden');
    if (avatarInitials) {
      avatarInitials.textContent = user.initials || getInitials(user.name);
      avatarInitials.classList.remove('hidden');
    }
  }
}

function populateDetailedProfile(userData) {
  populateBasicProfile(userData);

  // Member Since
  const joinedEl = document.getElementById('profile-stat-joined');
  if (joinedEl && userData.created_at) {
    joinedEl.textContent = new Date(userData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Personal Info Card
  const roleEl = document.getElementById('profile-val-role');
  const fieldEl = document.getElementById('profile-val-field');
  const instEl = document.getElementById('profile-val-inst');
  const bioEl = document.getElementById('profile-val-bio');

  if (roleEl) roleEl.textContent = userData.role || 'Researcher';
  if (fieldEl) fieldEl.textContent = userData.field || 'Visual Intelligence & ML';
  if (instEl) instEl.textContent = userData.institution || 'Independent Research Laboratory';
  if (bioEl) bioEl.textContent = userData.bio || 'Investigating multimodal visual reasoning, data graphics, and system architecture.';

  // Personalization Card
  const prof = userData.profile || {};
  renderTagList('profile-tags-uses', prof.primary_uses?.length ? prof.primary_uses : ['Academic Research', 'System Flow Analysis']);
  renderTagList('profile-tags-interests', prof.interests?.length ? prof.interests : ['AI/ML', 'Technology', 'Science']);
  renderTagList('profile-tags-visuals', prof.visual_types?.length ? prof.visual_types : ['Photographs', 'System Diagrams', 'Charts']);

  const depthEl = document.getElementById('profile-val-depth');
  const styleEl = document.getElementById('profile-val-style');
  const evidenceEl = document.getElementById('profile-val-evidence');

  if (depthEl) depthEl.textContent = (prof.analysis_depth || 'balanced').toUpperCase();
  if (styleEl) styleEl.textContent = Array.isArray(prof.presentation_style) ? prof.presentation_style.join(', ') : (prof.presentation_style || 'Balanced, Evidence-First');
  if (evidenceEl) evidenceEl.textContent = (prof.evidence_preference || 'strict').toUpperCase();
}

function renderTagList(containerId, tags) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!Array.isArray(tags) || tags.length === 0) {
    container.innerHTML = `<span class="text-xs text-slate-500 italic">None specified</span>`;
    return;
  }
  container.innerHTML = tags.map(t => `
    <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-medium">
      ${escapeHtml(t)}
    </span>
  `).join('');
}

function populateLiveStats(stats) {
  const reportsEl = document.getElementById('profile-stat-reports');
  const analysesEl = document.getElementById('profile-stat-analyses');
  const compEl = document.getElementById('profile-stat-comparisons');
  const favEl = document.getElementById('profile-stat-saved');
  const lastTitleEl = document.getElementById('profile-stat-last-title');
  const lastDateEl = document.getElementById('profile-stat-last-date');
  const timelineContainer = document.getElementById('profile-activity-timeline');

  if (reportsEl) reportsEl.textContent = stats.totalReports?.toString() || '0';
  if (analysesEl) analysesEl.textContent = stats.totalAnalyses?.toString() || '0';
  if (compEl) compEl.textContent = stats.totalComparisons?.toString() || '0';
  if (favEl) favEl.textContent = stats.savedReports?.toString() || '0';

  if (stats.lastAnalysis) {
    if (lastTitleEl) lastTitleEl.textContent = stats.lastAnalysis.title || stats.lastAnalysis.subject || 'Visual Brief';
    if (lastDateEl) lastDateEl.textContent = stats.lastAnalysis.date || (stats.lastAnalysis.timestamp ? new Date(stats.lastAnalysis.timestamp).toLocaleDateString() : '');
  } else {
    if (lastTitleEl) lastTitleEl.textContent = 'No analyses yet';
    if (lastDateEl) lastDateEl.textContent = '--';
  }

  if (timelineContainer && Array.isArray(stats.recentActivity)) {
    if (stats.recentActivity.length === 0) {
      timelineContainer.innerHTML = `
        <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
          No recent activity logged. Start an analysis from the Research Desk!
        </div>
      `;
    } else {
      timelineContainer.innerHTML = stats.recentActivity.map(act => `
        <div class="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all text-xs">
          <div class="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <span class="material-symbols-outlined text-[15px]">analytics</span>
          </div>
          <div class="flex-grow min-w-0">
            <p class="text-slate-200 font-medium truncate">${escapeHtml(act.text || act.activity_type || 'Activity')}</p>
            <span class="text-[10px] text-slate-400 font-mono">${act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}</span>
          </div>
        </div>
      `).join('');
    }
  }
}

function openEditProfileModal() {
  const session = getUserSession();
  if (!session) return;

  const fName = document.getElementById('edit-profile-fname');
  const lName = document.getElementById('edit-profile-lname');
  const uName = document.getElementById('edit-profile-uname');
  const role = document.getElementById('edit-profile-role');
  const field = document.getElementById('edit-profile-field');
  const inst = document.getElementById('edit-profile-inst');
  const bio = document.getElementById('edit-profile-bio');

  const avatarPreview = document.getElementById('edit-profile-avatar-preview');
  const avatarPlaceholder = document.getElementById('edit-profile-avatar-placeholder');
  const removeAvatarBtn = document.getElementById('edit-profile-avatar-remove');

  if (fName) fName.value = session.firstName || (session.name ? session.name.split(' ')[0] : '');
  if (lName) lName.value = session.lastName || (session.name ? session.name.split(' ').slice(1).join(' ') : '');
  if (uName) uName.value = session.username || '';
  if (role) role.value = session.role || 'Researcher';

  editAvatarBase64 = session.avatar || null;
  if (session.avatar) {
    if (avatarPreview) {
      avatarPreview.src = session.avatar;
      avatarPreview.classList.remove('hidden');
    }
    if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden');
    if (removeAvatarBtn) removeAvatarBtn.classList.remove('hidden');
  } else {
    if (avatarPreview) avatarPreview.classList.add('hidden');
    if (avatarPlaceholder) avatarPlaceholder.classList.remove('hidden');
    if (removeAvatarBtn) removeAvatarBtn.classList.add('hidden');
  }

  document.getElementById('edit-profile-modal')?.classList.add('show');
}

function closeEditProfileModal() {
  document.getElementById('edit-profile-modal')?.classList.remove('show');
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const fName = document.getElementById('edit-profile-fname')?.value?.trim();
  const lName = document.getElementById('edit-profile-lname')?.value?.trim();
  const uName = document.getElementById('edit-profile-uname')?.value?.trim().toLowerCase().replace(/^@+/, '');
  const role = document.getElementById('edit-profile-role')?.value?.trim();
  const field = document.getElementById('edit-profile-field')?.value?.trim();
  const inst = document.getElementById('edit-profile-inst')?.value?.trim();
  const bio = document.getElementById('edit-profile-bio')?.value?.trim();
  const submitBtn = document.getElementById('edit-profile-save-btn');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Saving...`;
  }

  try {
    const payload = {
      firstName: fName,
      lastName: lName,
      name: `${fName || ''} ${lName || ''}`.trim(),
      username: uName,
      role: role || 'Researcher',
      field,
      institution: inst,
      bio
    };

    if (editAvatarBase64 !== null) {
      payload.avatar = editAvatarBase64;
    }

    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok && json.success) {
      const updated = json.data;
      const session = getUserSession() || {};
      session.name = updated.name;
      session.firstName = updated.firstName;
      session.lastName = updated.lastName;
      session.username = updated.username;
      session.role = updated.role;
      session.avatar = updated.avatar;
      session.initials = updated.initials;
      setUserSession(session);
      localStorage.setItem('insightlens_session', JSON.stringify(session));

      updateAuthUI();
      closeEditProfileModal();
      showToast('Researcher profile updated successfully.', 'success');
      renderProfilePage();
    } else {
      showToast(json.message || 'Failed to update profile.', 'warning');
    }
  } catch (err) {
    console.error('[Profile Save Error]', err);
    showToast('Network error while saving profile.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">save</span> Save Profile`;
    }
  }
}

function openChangePasswordModal() {
  document.getElementById('change-pwd-form')?.reset();
  document.getElementById('change-password-modal')?.classList.add('show');
}

function closeChangePasswordModal() {
  document.getElementById('change-password-modal')?.classList.remove('show');
}

async function handleChangePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('change-pwd-current')?.value;
  const newPassword = document.getElementById('change-pwd-new')?.value;
  const confirmPassword = document.getElementById('change-pwd-confirm')?.value;
  const submitBtn = document.getElementById('change-pwd-submit-btn');

  if (!currentPassword || !newPassword) {
    showToast('Please provide both current and new password.', 'warning');
    return;
  }
  if (newPassword.length < 8) {
    showToast('New password must be at least 8 characters long.', 'warning');
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Updating...`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const json = await res.json();
    if (res.ok && json.success) {
      closeChangePasswordModal();
      showToast('Password updated successfully.', 'success');
    } else {
      showToast(json.message || 'Failed to update password.', 'warning');
    }
  } catch (err) {
    console.error('[Password Change Error]', err);
    showToast('Network error while updating password.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">lock_reset</span> Update Password`;
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
