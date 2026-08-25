// Fully Functional Settings Component Implementation

import { 
  getStoredPreferences, 
  saveStoredPreferences, 
  exportPreferencesFile, 
  importPreferencesFile, 
  resetPreferencesToDefault,
  testApiConnection,
  clearAllHistoryData,
  clearAllApplicationData,
  applyPreferencesToDOM
} from '../../services/preferences.js';
import { hashPassword } from '../../services/storage.js';
import { getUserSession, setUserSession } from '../../state.js';
import { showToast } from '../../utils/toast.js';
import { updateAuthUI } from '../Navbar.js';

function ensureSettingsDOM() {
  let settingsContainer = document.getElementById('page-settings');
  if (!settingsContainer) {
    settingsContainer = document.createElement('div');
    settingsContainer.id = 'page-settings';
    settingsContainer.className = 'page-view hidden flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-8 py-10 space-y-8';
    
    const methodologyPage = document.getElementById('page-methodology');
    if (methodologyPage && methodologyPage.parentNode) {
      methodologyPage.parentNode.insertBefore(settingsContainer, methodologyPage);
    } else {
      document.body.appendChild(settingsContainer);
    }
  }

  if (!settingsContainer.innerHTML.trim()) {
    settingsContainer.innerHTML = `
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ghost-border pb-6">
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/50 mb-2.5">
            System Control Panel
          </div>
          <h1 class="font-display-lg text-2xl md:text-3xl text-on-surface font-serif font-bold">System Preferences &amp; API Settings</h1>
          <p class="font-body-sm text-on-surface-variant text-xs md:text-sm mt-1">Configure AI providers, API credentials, model parameters, theme appearance, and data management.</p>
        </div>

        <div class="flex items-center gap-2.5 self-start md:self-auto">
          <button id="settings-export-json-btn" type="button" class="bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-medium px-3.5 py-2 rounded-xl border ghost-border flex items-center gap-1.5 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">download</span>
            Export Settings
          </button>
          
          <label id="settings-import-label" class="bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-medium px-3.5 py-2 rounded-xl border ghost-border flex items-center gap-1.5 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">upload</span>
            Import Settings
            <input type="file" id="settings-import-input" accept="application/json" class="hidden" />
          </label>
        </div>
      </header>

      <form id="system-settings-form" class="space-y-6">

        <!-- SECTION 0: ACCOUNT SETTINGS -->
        <section class="bg-surface-container p-6 md:p-8 rounded-2xl ghost-border space-y-6 relative" id="account-settings-section">
          <!-- Auth barrier (hidden when logged in, covers the section when logged out) -->
          <div id="account-settings-auth-barrier" class="absolute inset-0 bg-surface-container/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-2xl hidden">
            <span class="material-symbols-outlined text-4xl text-slate-500 mb-2">lock</span>
            <p class="text-slate-300 font-medium">Please sign in to view and edit your account settings.</p>
          </div>
          
          <div class="border-b ghost-border pb-4 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">ACCOUNT MANAGEMENT</span>
              <h2 class="font-serif text-lg text-on-surface font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-emerald-400 text-[22px]">manage_accounts</span>
                Account Profile &amp; Credentials
              </h2>
            </div>
            <div class="text-right">
              <button type="button" id="btn-save-account-settings" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">save</span>
                Save Account
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div class="space-y-2">
              <label for="settings-first-name" class="block font-medium text-on-surface">First Name</label>
              <input type="text" id="settings-first-name" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-emerald-400 focus:outline-none transition-colors" />
            </div>
            
            <div class="space-y-2">
              <label for="settings-last-name" class="block font-medium text-on-surface">Last Name</label>
              <input type="text" id="settings-last-name" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-emerald-400 focus:outline-none transition-colors" />
            </div>
            
            <div class="space-y-2 lg:col-span-2">
              <label for="settings-email" class="block font-medium text-on-surface">Email Address</label>
              <input type="email" id="settings-email" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-emerald-400 focus:outline-none transition-colors" />
            </div>
            
            <!-- Change Password Section -->
            <div class="space-y-2 mt-4 pt-4 border-t border-white/5 lg:col-span-2">
              <h3 class="font-medium text-on-surface mb-3 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">password</span> Change Password</h3>
              <p class="text-[11px] text-on-surface-variant mb-3">Leave blank if you do not wish to change your password. Current password is required to save changes.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label for="settings-current-password" class="block font-medium text-slate-300">Current Password</label>
                  <input type="password" id="settings-current-password" placeholder="••••••••" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-amber-400 focus:outline-none transition-colors" />
                </div>
                <div class="space-y-1.5">
                  <label for="settings-new-password" class="block font-medium text-slate-300">New Password</label>
                  <input type="password" id="settings-new-password" placeholder="•••••••• (Min 8 chars)" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-amber-400 focus:outline-none transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <!-- SECTION 1: AI PROVIDER & MODEL SELECTOR -->
        <section class="bg-surface-container p-6 md:p-8 rounded-2xl ghost-border space-y-6">
          <div class="border-b ghost-border pb-4 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">AI ENGINE CONFIGURATION</span>
              <h2 class="font-serif text-lg text-on-surface font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-indigo-400 text-[22px]">psychology</span>
                1. AI Provider &amp; Model Selection
              </h2>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-on-surface-variant uppercase block font-bold font-mono">Active Provider</span>
              <span id="settings-active-provider-badge" class="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold">
                AUTO (DEFAULT)
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <!-- Provider Selector -->
            <div class="space-y-2">
              <label for="pref-ai-provider" class="block font-medium text-on-surface">AI Provider</label>
              <select id="pref-ai-provider" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer font-sans">
                <option value="auto" selected>Auto (Default — Native Failover)</option>
                <option value="gemini">Google Gemini API</option>
                <option value="openrouter">OpenRouter API (Future-Ready Cloud Gateway)</option>
              </select>
              <p class="text-[11px] text-on-surface-variant leading-relaxed">Auto selects Google Gemini API with automatic candidate failover on quota limits.</p>
            </div>

            <!-- Model Selector -->
            <div class="space-y-2">
              <label for="pref-model-selector" class="block font-medium text-on-surface">Vision Model</label>
              <select id="pref-model-selector" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer font-sans">
                <option value="auto" selected>Auto (Dynamic Candidate Selection)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast &amp; Accurate)</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Low Latency)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Visual Reasoning)</option>
              </select>
              <p id="model-auto-explanation" class="text-[11px] text-indigo-300 leading-relaxed font-mono">
                When Auto is selected, the system chooses Gemini 2.5 Flash and automatically fails over if quota limits occur.
              </p>
            </div>
          </div>

          <!-- API KEYS SECTION -->
          <div class="space-y-4 pt-2 border-t ghost-border">
            <h3 class="font-serif text-sm font-semibold text-on-surface flex items-center gap-2">
              <span class="material-symbols-outlined text-indigo-400 text-[18px]">key</span>
              API Key Credentials
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <!-- Gemini API Key Input -->
              <div class="space-y-2 bg-surface-container-lowest p-4 rounded-xl border ghost-border">
                <div class="flex items-center justify-between">
                  <label for="pref-gemini-key" class="font-medium text-on-surface">Google Gemini API Key</label>
                  <span class="text-[10px] text-indigo-400 font-mono">Primary Endpoint</span>
                </div>
                
                <div class="relative">
                  <input type="password" id="pref-gemini-key" placeholder="Enter custom Gemini API key..." class="w-full bg-surface-container border ghost-border text-on-surface rounded-lg p-2.5 pr-10 text-xs focus:border-indigo-400 focus:outline-none font-mono" />
                  <button type="button" id="toggle-gemini-key-btn" class="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface cursor-pointer">
                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                </div>

                <div class="flex items-center justify-between gap-2 pt-1">
                  <div class="flex gap-2">
                    <button type="button" id="save-gemini-key-btn" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium cursor-pointer transition-colors">
                      Save Key
                    </button>
                    <button type="button" id="clear-gemini-key-btn" class="px-3 py-1 bg-surface-container hover:bg-surface-variant text-slate-400 hover:text-red-400 rounded text-[11px] font-medium cursor-pointer border ghost-border transition-colors">
                      Clear
                    </button>
                  </div>
                  <button type="button" id="test-gemini-conn-btn" class="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded text-[11px] font-mono border border-indigo-500/30 cursor-pointer transition-colors">
                    Test Connection
                  </button>
                </div>
              </div>

              <!-- OpenRouter API Key Input -->
              <div class="space-y-2 bg-surface-container-lowest p-4 rounded-xl border ghost-border">
                <div class="flex items-center justify-between">
                  <label for="pref-openrouter-key" class="font-medium text-on-surface">OpenRouter API Key</label>
                  <span class="text-[10px] text-purple-400 font-mono">Future Gateway</span>
                </div>

                <div class="relative">
                  <input type="password" id="pref-openrouter-key" placeholder="Enter OpenRouter API key (sk-or-v1-...)" class="w-full bg-surface-container border ghost-border text-on-surface rounded-lg p-2.5 pr-10 text-xs focus:border-indigo-400 focus:outline-none font-mono" />
                  <button type="button" id="toggle-openrouter-key-btn" class="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface cursor-pointer">
                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                </div>

                <div class="flex items-center justify-between gap-2 pt-1">
                  <div class="flex gap-2">
                    <button type="button" id="save-openrouter-key-btn" class="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-medium cursor-pointer transition-colors">
                      Save Key
                    </button>
                    <button type="button" id="clear-openrouter-key-btn" class="px-3 py-1 bg-surface-container hover:bg-surface-variant text-slate-400 hover:text-red-400 rounded text-[11px] font-medium cursor-pointer border ghost-border transition-colors">
                      Clear
                    </button>
                  </div>
                  <button type="button" id="test-openrouter-conn-btn" class="px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded text-[11px] font-mono border border-purple-500/30 cursor-pointer transition-colors">
                    Test Connection
                  </button>
                </div>
              </div>
            </div>

            <div id="api-test-result-box" class="hidden p-3.5 bg-surface-container-lowest rounded-xl border ghost-border font-mono text-xs text-slate-300">
            </div>
          </div>
        </section>

        <!-- SECTION 2: APPEARANCE & THEME -->
        <section class="bg-surface-container p-6 md:p-8 rounded-2xl ghost-border space-y-6">
          <div class="border-b ghost-border pb-4">
            <span class="text-[11px] font-mono text-purple-400 font-bold uppercase tracking-wider block">VISUAL THEME</span>
            <h2 class="font-serif text-lg text-on-surface font-bold flex items-center gap-2">
              <span class="material-symbols-outlined text-purple-400 text-[22px]">palette</span>
              2. Theme &amp; Visual Appearance
            </h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <!-- Appearance Option -->
            <div class="space-y-2">
              <label for="pref-theme-mode" class="block font-medium text-on-surface">Appearance Mode</label>
              <select id="pref-theme-mode" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
                <option value="dark" selected>Dark Space (Default)</option>
                <option value="light">Light Mode</option>
                <option value="system">System Preference (Auto Detect)</option>
              </select>
            </div>

            <!-- Compact Mode -->
            <div class="space-y-2">
              <span class="block font-medium text-on-surface mb-2">Display Density</span>
              <label class="flex items-center gap-2 cursor-pointer text-slate-200">
                <input type="checkbox" id="pref-compact-mode" class="rounded accent-indigo-500" />
                <span>Enable Compact Mode</span>
              </label>
            </div>

            <!-- Interface Animations -->
            <div class="space-y-2">
              <span class="block font-medium text-on-surface mb-2">Interface Motion</span>
              <label class="flex items-center gap-2 cursor-pointer text-slate-200">
                <input type="checkbox" id="pref-animations" checked class="rounded accent-indigo-500" />
                <span>Enable Micro-Animations</span>
              </label>
            </div>
          </div>
        </section>

        <!-- SECTION 3: RESEARCH PREFERENCES -->
        <section class="bg-surface-container p-6 md:p-8 rounded-2xl ghost-border space-y-6">
          <div class="border-b ghost-border pb-4">
            <span class="text-[11px] font-mono text-sky-400 font-bold uppercase tracking-wider block">RESEARCH PARAMETERS</span>
            <h2 class="font-serif text-lg text-on-surface font-bold flex items-center gap-2">
              <span class="material-symbols-outlined text-sky-400 text-[22px]">menu_book</span>
              3. Research &amp; Report Synthesis Options
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs">
            <!-- Language -->
            <div class="space-y-2">
              <label for="pref-language" class="block font-medium text-on-surface">Target Language</label>
              <select id="pref-language" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
                <option value="en" selected>English (EN)</option>
                <option value="es">Spanish (ES)</option>
                <option value="fr">French (FR)</option>
                <option value="de">German (DE)</option>
                <option value="zh">Chinese (ZH)</option>
                <option value="ja">Japanese (JA)</option>
              </select>
            </div>

            <!-- Report Length -->
            <div class="space-y-2">
              <label for="pref-report-length" class="block font-medium text-on-surface">Report Depth</label>
              <select id="pref-report-length" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
                <option value="long" selected>Comprehensive (3-4 Detailed Sections)</option>
                <option value="short">Short Brief (1-2 Concise Sections)</option>
              </select>
            </div>

            <!-- Citation Style -->
            <div class="space-y-2">
              <label for="pref-citation-style" class="block font-medium text-on-surface">Citation Style</label>
              <select id="pref-citation-style" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
                <option value="APA" selected>APA 7th Edition</option>
                <option value="MLA">MLA 9th Edition</option>
                <option value="IEEE">IEEE Reference Standard</option>
                <option value="Chicago">Chicago Manual of Style</option>
              </select>
            </div>

            <!-- Export Format -->
            <div class="space-y-2">
              <label for="pref-export-format" class="block font-medium text-on-surface">Export Format</label>
              <select id="pref-export-format" class="w-full bg-surface-container-lowest border ghost-border text-on-surface rounded-xl p-3 text-xs focus:border-indigo-400 focus:outline-none cursor-pointer">
                <option value="pdf" selected>Standalone PDF (.pdf)</option>
                <option value="markdown">Raw Markdown Brief (.md)</option>
                <option value="json">Raw JSON Payload (.json)</option>
              </select>
            </div>
          </div>
        </section>

        <!-- SECTION 4: DATA MANAGEMENT -->
        <section class="bg-surface-container p-6 md:p-8 rounded-2xl ghost-border space-y-6">
          <div class="border-b ghost-border pb-4">
            <span class="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">DATA &amp; LOCAL STORAGE</span>
            <h2 class="font-serif text-lg text-on-surface font-bold flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-400 text-[22px]">database</span>
              4. Data Management &amp; Application Reset
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <button id="data-export-settings-btn" type="button" class="bg-surface-container-lowest hover:bg-surface-container p-4 rounded-xl border ghost-border text-left space-y-1 cursor-pointer transition-all">
              <span class="material-symbols-outlined text-indigo-400 text-[20px] block">download</span>
              <strong class="text-on-surface font-semibold block text-xs">Export Settings</strong>
              <p class="text-[10px] text-on-surface-variant">Download preferences JSON backup file.</p>
            </button>

            <button id="data-import-settings-btn" type="button" class="bg-surface-container-lowest hover:bg-surface-container p-4 rounded-xl border ghost-border text-left space-y-1 cursor-pointer transition-all">
              <span class="material-symbols-outlined text-sky-400 text-[20px] block">upload</span>
              <strong class="text-on-surface font-semibold block text-xs">Import Settings</strong>
              <p class="text-[10px] text-on-surface-variant">Upload preferences JSON backup file.</p>
            </button>

            <button id="data-clear-history-btn" type="button" class="bg-surface-container-lowest hover:bg-surface-container p-4 rounded-xl border ghost-border text-left space-y-1 cursor-pointer transition-all">
              <span class="material-symbols-outlined text-amber-400 text-[20px] block">delete_sweep</span>
              <strong class="text-on-surface font-semibold block text-xs">Clear History</strong>
              <p class="text-[10px] text-on-surface-variant">Remove saved research briefs from history.</p>
            </button>

            <button id="data-reset-app-btn" type="button" class="bg-surface-container-lowest hover:bg-surface-container p-4 rounded-xl border ghost-border text-left space-y-1 cursor-pointer transition-all">
              <span class="material-symbols-outlined text-red-400 text-[20px] block">cleaning_services</span>
              <strong class="text-red-400 font-semibold block text-xs">Reset Application</strong>
              <p class="text-[10px] text-on-surface-variant">Purge all local storage and restore defaults.</p>
            </button>
          </div>
        </section>

        <!-- SUBMIT & ACTION BUTTONS -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
          <button id="reset-settings-btn" type="button" class="bg-surface-container hover:bg-surface-variant text-red-400 text-xs font-medium px-5 py-3 rounded-xl border ghost-border flex items-center gap-2 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">restart_alt</span>
            Reset Settings
          </button>

          <button id="save-settings-btn" type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20">
            <span class="material-symbols-outlined text-[18px]">save</span>
            Save All Preferences
          </button>
        </div>
      </form>
    `;
  }
}

export function setupSettingsEvents() {
  ensureSettingsDOM();

  const settingsForm = document.getElementById('system-settings-form');
  const resetBtn = document.getElementById('reset-settings-btn');
  const exportBtn = document.getElementById('settings-export-json-btn');
  const importInput = document.getElementById('settings-import-input');

  const saveAccountBtn = document.getElementById('btn-save-account-settings');
  saveAccountBtn?.addEventListener('click', async () => {
    const userSession = getUserSession();
    if (!userSession) return;

    let users = {};
    try {
      users = JSON.parse(localStorage.getItem('insightlens_users')) || {};
    } catch (err) {}

    const originalEmailKey = Object.keys(users).find(u => u.toLowerCase() === userSession.email.toLowerCase());
    const activeUser = users[originalEmailKey];
    if (!activeUser) {
      showToast('Account data not found.', 'error');
      return;
    }

    const fName = document.getElementById('settings-first-name')?.value.trim();
    const lName = document.getElementById('settings-last-name')?.value.trim();
    const newEmail = document.getElementById('settings-email')?.value.trim().toLowerCase();
    
    const currentPwd = document.getElementById('settings-current-password')?.value;
    const newPwd = document.getElementById('settings-new-password')?.value;

    if (!fName || !lName || !newEmail) {
      showToast('First Name, Last Name, and Email are required.', 'warning');
      return;
    }

    // Check email uniqueness if it changed
    if (newEmail !== activeUser.email.toLowerCase()) {
      const emailExists = Object.keys(users).find(u => u.toLowerCase() === newEmail);
      if (emailExists) {
        showToast('This email is already in use by another account.', 'warning');
        return;
      }
    }

    // Handle password change if requested
    let finalPasswordHash = activeUser.passwordHash;
    if (newPwd) {
      if (!currentPwd) {
        showToast('Current password is required to change password.', 'warning');
        return;
      }
      if (newPwd.length < 8) {
        showToast('New password must be at least 8 characters long.', 'warning');
        return;
      }
      const hashedCurrent = await hashPassword(currentPwd);
      if (hashedCurrent !== activeUser.passwordHash) {
        showToast('Incorrect current password.', 'error');
        return;
      }
      finalPasswordHash = await hashPassword(newPwd);
    }

    // Update user record
    const newName = `${fName} ${lName}`;
    const newInitials = newName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    // Create new object, delete old if email changed
    const updatedUser = {
      ...activeUser,
      name: newName,
      email: newEmail, // update to original casing from input
      initials: newInitials,
      passwordHash: finalPasswordHash
    };
    
    if (newEmail !== originalEmailKey) {
      delete users[originalEmailKey];
    }
    users[newEmail] = updatedUser;
    
    localStorage.setItem('insightlens_users', JSON.stringify(users));

    // Update session
    const updatedSession = {
      ...userSession,
      name: newName,
      email: newEmail,
      initials: newInitials
    };
    setUserSession(updatedSession);
    localStorage.setItem('insightlens_session', JSON.stringify(updatedSession));
    
    updateAuthUI();
    showToast('Account profile updated successfully.', 'success');
    
    // Clear password fields
    if (document.getElementById('settings-current-password')) document.getElementById('settings-current-password').value = '';
    if (document.getElementById('settings-new-password')) document.getElementById('settings-new-password').value = '';
  });

  const toggleGeminiBtn = document.getElementById('toggle-gemini-key-btn');
  const toggleOpenRouterBtn = document.getElementById('toggle-openrouter-key-btn');

  const saveGeminiKeyBtn = document.getElementById('save-gemini-key-btn');
  const clearGeminiKeyBtn = document.getElementById('clear-gemini-key-btn');
  const testGeminiConnBtn = document.getElementById('test-gemini-conn-btn');

  const saveOpenRouterKeyBtn = document.getElementById('save-openrouter-key-btn');
  const clearOpenRouterKeyBtn = document.getElementById('clear-openrouter-key-btn');
  const testOpenRouterConnBtn = document.getElementById('test-openrouter-conn-btn');

  const dataExportBtn = document.getElementById('data-export-settings-btn');
  const dataImportBtn = document.getElementById('data-import-settings-btn');
  const dataClearHistBtn = document.getElementById('data-clear-history-btn');
  const dataResetAppBtn = document.getElementById('data-reset-app-btn');

  const testResultBox = document.getElementById('api-test-result-box');

  // Toggle Password Visibility
  toggleGeminiBtn?.addEventListener('click', () => {
    const input = document.getElementById('pref-gemini-key');
    const icon = toggleGeminiBtn.querySelector('.material-symbols-outlined');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.textContent = 'visibility_off';
    } else {
      input.type = 'password';
      if (icon) icon.textContent = 'visibility';
    }
  });

  toggleOpenRouterBtn?.addEventListener('click', () => {
    const input = document.getElementById('pref-openrouter-key');
    const icon = toggleOpenRouterBtn.querySelector('.material-symbols-outlined');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.textContent = 'visibility_off';
    } else {
      input.type = 'password';
      if (icon) icon.textContent = 'visibility';
    }
  });

  // Save / Clear Gemini Key
  saveGeminiKeyBtn?.addEventListener('click', () => {
    const key = document.getElementById('pref-gemini-key')?.value.trim() || '';
    saveStoredPreferences({ geminiApiKey: key });
    alert('Gemini API key saved to local storage!');
  });

  clearGeminiKeyBtn?.addEventListener('click', () => {
    const input = document.getElementById('pref-gemini-key');
    if (input) input.value = '';
    saveStoredPreferences({ geminiApiKey: '' });
    alert('Gemini API key cleared.');
  });

  // Save / Clear OpenRouter Key
  saveOpenRouterKeyBtn?.addEventListener('click', () => {
    const key = document.getElementById('pref-openrouter-key')?.value.trim() || '';
    saveStoredPreferences({ openrouterApiKey: key });
    alert('OpenRouter API key saved to local storage!');
  });

  clearOpenRouterKeyBtn?.addEventListener('click', () => {
    const input = document.getElementById('pref-openrouter-key');
    if (input) input.value = '';
    saveStoredPreferences({ openrouterApiKey: '' });
    alert('OpenRouter API key cleared.');
  });

  // Test Gemini Connection
  testGeminiConnBtn?.addEventListener('click', async () => {
    const key = document.getElementById('pref-gemini-key')?.value.trim();
    if (testResultBox) {
      testResultBox.classList.remove('hidden');
      testResultBox.innerHTML = '<span class="text-indigo-400 font-bold">Testing Gemini API connection...</span>';
    }
    const res = await testApiConnection('gemini', key);
    if (testResultBox) {
      testResultBox.innerHTML = `<span class="${res.success ? 'text-emerald-400' : 'text-amber-400'} font-bold">${res.status}:</span> ${res.message}`;
    }
  });

  // Test OpenRouter Connection
  testOpenRouterConnBtn?.addEventListener('click', async () => {
    const key = document.getElementById('pref-openrouter-key')?.value.trim();
    if (testResultBox) {
      testResultBox.classList.remove('hidden');
      testResultBox.innerHTML = '<span class="text-purple-400 font-bold">Testing OpenRouter API connection...</span>';
    }
    const res = await testApiConnection('openrouter', key);
    if (testResultBox) {
      testResultBox.innerHTML = `<span class="${res.success ? 'text-emerald-400' : 'text-amber-400'} font-bold">${res.status}:</span> ${res.message}`;
    }
  });

  // Export / Import
  exportBtn?.addEventListener('click', () => exportPreferencesFile());
  dataExportBtn?.addEventListener('click', () => exportPreferencesFile());

  dataImportBtn?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        await importPreferencesFile(e.target.files[0]);
        renderSettingsPage();
        alert('Settings imported successfully!');
      } catch (err) {
        alert(err.message || 'Failed to import settings');
      }
    }
  });

  // Clear History
  dataClearHistBtn?.addEventListener('click', () => {
    if (confirm('Clear all saved research history entries from local storage?')) {
      clearAllHistoryData();
      alert('Research history cleared.');
    }
  });

  // Reset Application
  dataResetAppBtn?.addEventListener('click', () => {
    if (confirm('DANGER: Permanently purge all local storage data, research history, and settings?')) {
      clearAllApplicationData();
      renderSettingsPage();
      alert('Application reset to initial state.');
    }
  });

  // Reset Settings Button
  resetBtn?.addEventListener('click', () => {
    if (confirm('Reset all system settings to default parameters?')) {
      resetPreferencesToDefault();
      renderSettingsPage();
      alert('Preferences reset to default values.');
    }
  });

  // Form Submit
  settingsForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const provider = document.getElementById('pref-ai-provider')?.value || 'auto';
    const model = document.getElementById('pref-model-selector')?.value || 'auto';
    const geminiApiKey = document.getElementById('pref-gemini-key')?.value.trim() || '';
    const openrouterApiKey = document.getElementById('pref-openrouter-key')?.value.trim() || '';
    
    const theme = document.getElementById('pref-theme-mode')?.value || 'dark';
    const language = document.getElementById('pref-language')?.value || 'en';
    const researchLength = document.getElementById('pref-report-length')?.value || 'long';
    const citationStyle = document.getElementById('pref-citation-style')?.value || 'APA';
    const exportFormat = document.getElementById('pref-export-format')?.value || 'pdf';

    const compactMode = document.getElementById('pref-compact-mode')?.checked ?? false;
    const animationsOn = document.getElementById('pref-animations')?.checked ?? true;

    saveStoredPreferences({
      provider,
      model,
      geminiApiKey,
      openrouterApiKey,
      theme,
      language,
      researchLength,
      citationStyle,
      exportFormat,
      compactMode,
      animationsOn
    });

    renderSettingsPage();
    alert('System preferences saved!');
  });

  renderSettingsPage();
}

export function renderSettingsPage() {
  ensureSettingsDOM();
  const prefs = getStoredPreferences();
  
  const userSession = getUserSession();
  const authBarrier = document.getElementById('account-settings-auth-barrier');
  if (userSession) {
    if (authBarrier) authBarrier.classList.add('hidden');
    
    // Populate Account Fields
    const fNameInput = document.getElementById('settings-first-name');
    const lNameInput = document.getElementById('settings-last-name');
    const emailInput = document.getElementById('settings-email');
    
    if (fNameInput && userSession.name) {
      const parts = userSession.name.split(' ');
      fNameInput.value = parts[0] || '';
      if (lNameInput) lNameInput.value = parts.slice(1).join(' ') || '';
    }
    if (emailInput) {
      emailInput.value = userSession.email || '';
    }
  } else {
    if (authBarrier) authBarrier.classList.remove('hidden');
  }

  const providerSelect = document.getElementById('pref-ai-provider');
  if (providerSelect) providerSelect.value = prefs.provider || 'auto';

  const providerBadge = document.getElementById('settings-active-provider-badge');
  if (providerBadge) {
    providerBadge.textContent = (prefs.provider || 'auto').toUpperCase();
  }

  const modelSelect = document.getElementById('pref-model-selector');
  if (modelSelect) modelSelect.value = prefs.model || 'auto';

  const geminiInput = document.getElementById('pref-gemini-key');
  if (geminiInput) geminiInput.value = prefs.geminiApiKey || '';

  const openrouterInput = document.getElementById('pref-openrouter-key');
  if (openrouterInput) openrouterInput.value = prefs.openrouterApiKey || '';

  const themeSelect = document.getElementById('pref-theme-mode');
  if (themeSelect) themeSelect.value = prefs.theme || 'dark';

  const langSelect = document.getElementById('pref-language');
  if (langSelect) langSelect.value = prefs.language || 'en';

  const lengthSelect = document.getElementById('pref-report-length');
  if (lengthSelect) lengthSelect.value = prefs.researchLength || 'long';

  const citationSelect = document.getElementById('pref-citation-style');
  if (citationSelect) citationSelect.value = prefs.citationStyle || 'APA';

  const exportSelect = document.getElementById('pref-export-format');
  if (exportSelect) exportSelect.value = prefs.exportFormat || 'pdf';

  const compactCheck = document.getElementById('pref-compact-mode');
  if (compactCheck) compactCheck.checked = !!prefs.compactMode;

  const animCheck = document.getElementById('pref-animations');
  if (animCheck) animCheck.checked = prefs.animationsOn !== false;

  applyPreferencesToDOM(prefs);
}
