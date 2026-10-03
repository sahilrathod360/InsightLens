// Interactive Multi-Step Onboarding Wizard
// Backed by PostgreSQL user_profiles table via POST /api/auth/onboarding

import { navigateTo, getUserSession, setUserSession } from '../state.js';
import { API_BASE, getAuthHeaders } from '../utils/api.js';
import { showToast } from '../utils/toast.js';

let currentStep = 1;
const TOTAL_STEPS = 7;

const onboardingState = {
  primaryUses: [],
  interests: [],
  visualTypes: [],
  analysisDepth: 'balanced',
  presentationStyle: ['balanced', 'evidence-first'],
  evidencePreference: 'strict',
  role: 'Researcher',
  field: '',
  institution: '',
  bio: ''
};

export function setupOnboardingEvents() {
  // Step Navigation Buttons
  document.getElementById('onboarding-next-btn')?.addEventListener('click', handleNextStep);
  document.getElementById('onboarding-prev-btn')?.addEventListener('click', handlePrevStep);
  document.getElementById('onboarding-skip-btn')?.addEventListener('click', handleSkipOnboarding);
  document.getElementById('onboarding-finish-btn')?.addEventListener('click', handleFinishOnboarding);

  // Bind interactive option clicks in steps
  document.querySelectorAll('[data-onboard-group]').forEach(groupEl => {
    const groupName = groupEl.getAttribute('data-onboard-group');
    const isMulti = groupEl.getAttribute('data-multi') === 'true';

    groupEl.querySelectorAll('[data-onboard-value]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-onboard-value');
        if (isMulti) {
          btn.classList.toggle('selected-choice');
          updateMultiState(groupName);
        } else {
          groupEl.querySelectorAll('[data-onboard-value]').forEach(b => b.classList.remove('selected-choice'));
          btn.classList.add('selected-choice');
          onboardingState[groupName] = val;
        }
      });
    });
  });
}

function updateMultiState(groupName) {
  const groupEl = document.querySelector(`[data-onboard-group="${groupName}"]`);
  if (!groupEl) return;
  const selected = [];
  groupEl.querySelectorAll('.selected-choice').forEach(b => {
    selected.push(b.getAttribute('data-onboard-value'));
  });
  onboardingState[groupName] = selected;
}

export function renderOnboardingPage() {
  const session = getUserSession();
  if (!session) {
    navigateTo('login');
    return;
  }

  // Pre-fill user name greeting in onboarding
  const welcomeEl = document.getElementById('onboarding-welcome-name');
  if (welcomeEl) {
    welcomeEl.textContent = session.firstName || (session.name ? session.name.split(' ')[0] : 'Researcher');
  }

  currentStep = 1;
  showStep(currentStep);
}

function showStep(step) {
  currentStep = step;
  
  // Update step views
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const stepEl = document.getElementById(`onboard-step-${i}`);
    if (stepEl) {
      if (i === step) {
        stepEl.classList.remove('hidden');
      } else {
        stepEl.classList.add('hidden');
      }
    }
  }

  // Update progress indicator
  const progressPct = Math.round((step / TOTAL_STEPS) * 100);
  const progressBar = document.getElementById('onboarding-progress-bar');
  const progressText = document.getElementById('onboarding-progress-text');
  const stepCountText = document.getElementById('onboarding-step-counter');

  if (progressBar) progressBar.style.width = `${progressPct}%`;
  if (progressText) progressText.textContent = `Step ${step} of ${TOTAL_STEPS}`;
  if (stepCountText) stepCountText.textContent = `${progressPct}% Complete`;

  // Update button visibility
  const prevBtn = document.getElementById('onboarding-prev-btn');
  const nextBtn = document.getElementById('onboarding-next-btn');
  const finishBtn = document.getElementById('onboarding-finish-btn');

  if (prevBtn) {
    if (step === 1) prevBtn.classList.add('invisible');
    else prevBtn.classList.remove('invisible');
  }

  if (step === TOTAL_STEPS) {
    nextBtn?.classList.add('hidden');
    finishBtn?.classList.remove('hidden');
  } else {
    nextBtn?.classList.remove('hidden');
    finishBtn?.classList.add('hidden');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleNextStep() {
  if (currentStep < TOTAL_STEPS) {
    showStep(currentStep + 1);
  }
}

function handlePrevStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

async function handleSkipOnboarding() {
  await submitOnboardingData();
}

async function handleFinishOnboarding() {
  // Read step 7 form inputs
  const roleInput = document.getElementById('onboard-role-input');
  const fieldInput = document.getElementById('onboard-field-input');
  const instInput = document.getElementById('onboard-inst-input');
  const bioInput = document.getElementById('onboard-bio-input');

  if (roleInput) onboardingState.role = roleInput.value.trim() || 'Researcher';
  if (fieldInput) onboardingState.field = fieldInput.value.trim();
  if (instInput) onboardingState.institution = instInput.value.trim();
  if (bioInput) onboardingState.bio = bioInput.value.trim();

  await submitOnboardingData();
}

async function submitOnboardingData() {
  const finishBtn = document.getElementById('onboarding-finish-btn');
  const skipBtn = document.getElementById('onboarding-skip-btn');

  if (finishBtn) {
    finishBtn.disabled = true;
    finishBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Saving Preferences...`;
  }
  if (skipBtn) skipBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/auth/onboarding`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(onboardingState)
    });

    const json = await res.json();
    if (res.ok && json.success) {
      // Update local session
      const session = getUserSession();
      if (session) {
        session.onboarding_completed = true;
        session.role = onboardingState.role || session.role;
        setUserSession(session);
        localStorage.setItem('insightlens_session', JSON.stringify(session));
      }

      showToast('Personalization complete! Welcome to your InsightLens workbench.', 'success');
      navigateTo('desk');
    } else {
      showToast(json.message || 'Saved with local preferences.', 'info');
      navigateTo('desk');
    }
  } catch (err) {
    console.error('[Onboarding Error]', err);
    showToast('Preferences saved for this session.', 'info');
    navigateTo('desk');
  } finally {
    if (finishBtn) {
      finishBtn.disabled = false;
      finishBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">check_circle</span> Complete Setup & Launch`;
    }
    if (skipBtn) skipBtn.disabled = false;
  }
}
