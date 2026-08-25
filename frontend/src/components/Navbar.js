// Top Navigation Bar, User Auth Dropdown & Modal Events

import { navigateTo, getUserSession, setUserSession, getAuthMode, setAuthModeState } from '../state.js';
import { applyAppearancePreferences, savePreferences, hashPassword, getInitials } from '../services/storage.js';
import { exportCleanPDF } from '../utils/export.js';
import { showToast } from '../utils/toast.js';

export function setupNavigation() {
  document.getElementById('nav-brand')?.addEventListener('click', () => navigateTo('landing'));

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const page = link.getAttribute('data-page');
      navigateTo(page);
    });
  });

  document.getElementById('hero-start-btn')?.addEventListener('click', () => navigateTo('desk'));
  document.getElementById('hero-login-btn')?.addEventListener('click', () => openLoginModal());
  document.getElementById('export-nav-btn')?.addEventListener('click', exportCleanPDF);
  document.getElementById('dash-new-analysis-btn')?.addEventListener('click', () => navigateTo('desk'));
  document.getElementById('user-welcome-badge')?.addEventListener('click', () => navigateTo('profile'));
}

export function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-menu-toggle-btn');
  const drawer = document.getElementById('mobile-nav-drawer');

  toggleBtn?.addEventListener('click', () => {
    const isHidden = !drawer.classList.contains('show');
    if (isHidden) {
      drawer.classList.add('show');
      toggleBtn.setAttribute('aria-expanded', 'true');
    } else {
      drawer.classList.remove('show');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

export function setupGlobalKeyboardEvents() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('user-dropdown-menu')?.classList.remove('show');
      document.getElementById('mobile-nav-drawer')?.classList.remove('show');
      document.getElementById('logout-modal')?.classList.remove('show');
    }
  });
}

export function setupTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  applyAppearancePreferences();

  themeToggleBtn?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    savePreferences({ theme: newTheme });
    showToast(`Switched to ${newTheme.toUpperCase()} theme`, 'info');
  });
}

export function setupAuthEvents(renderArchivePage, renderDashboard) {
  const authNavBtn = document.getElementById('auth-nav-btn');
  const loginForm = document.getElementById('login-form');
  const guestBtn = document.getElementById('guest-access-btn');
  const tabSignIn = document.getElementById('tab-auth-signin');
  const tabSignUp = document.getElementById('tab-auth-signup');

  tabSignIn?.addEventListener('click', () => setAuthMode('signin'));
  tabSignUp?.addEventListener('click', () => setAuthMode('signup'));

  authNavBtn?.addEventListener('click', () => {
    if (getUserSession()) {
      openLogoutModal();
    } else {
      setAuthMode('signin');
      openLoginModal();
    }
  });

  const closeLoginBtn = document.getElementById('close-login-btn');
  closeLoginBtn?.addEventListener('click', closeLoginModal);
  
  const loginModal = document.getElementById('login-modal');
  loginModal?.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      closeLoginModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const loginModalEl = document.getElementById('login-modal');
      const logoutModalEl = document.getElementById('logout-modal');
      if (loginModalEl?.classList.contains('show')) {
        closeLoginModal();
      }
      if (logoutModalEl?.classList.contains('show')) {
        logoutModalEl.classList.remove('show');
      }
    }
  });

  // Setup password visibility toggles
  document.getElementById('toggle-password-btn')?.addEventListener('click', (e) => {
    const pwdInput = document.getElementById('login-password');
    const icon = e.currentTarget.querySelector('span');
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      icon.textContent = 'visibility';
    } else {
      pwdInput.type = 'password';
      icon.textContent = 'visibility_off';
    }
  });

  document.getElementById('toggle-confirm-password-btn')?.addEventListener('click', (e) => {
    const pwdInput = document.getElementById('login-confirm-password');
    const icon = e.currentTarget.querySelector('span');
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      icon.textContent = 'visibility';
    } else {
      pwdInput.type = 'password';
      icon.textContent = 'visibility_off';
    }
  });

  // Password Strength Indicator Logic
  document.getElementById('login-password')?.addEventListener('input', (e) => {
    if (getAuthMode() !== 'signup') return;
    const pwd = e.target.value;
    const s1 = document.getElementById('pwd-str-1');
    const s2 = document.getElementById('pwd-str-2');
    const s3 = document.getElementById('pwd-str-3');
    const s4 = document.getElementById('pwd-str-4');
    const text = document.getElementById('password-strength-text');
    
    if (!pwd) {
      s1.className = 'flex-1 transition-colors bg-transparent';
      s2.className = 'flex-1 transition-colors bg-transparent';
      s3.className = 'flex-1 transition-colors bg-transparent';
      s4.className = 'flex-1 transition-colors bg-transparent';
      text.textContent = '8+ characters';
      return;
    }
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.match(/[A-Z]/) && pwd.match(/[a-z]/)) strength++;
    if (pwd.match(/[0-9]/)) strength++;
    if (pwd.match(/[^A-Za-z0-9]/)) strength++;
    
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-400', 'bg-emerald-500'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    
    s1.className = `flex-1 transition-colors ${strength >= 1 ? colors[0] : 'bg-transparent'}`;
    s2.className = `flex-1 transition-colors ${strength >= 2 ? colors[1] : 'bg-transparent'}`;
    s3.className = `flex-1 transition-colors ${strength >= 3 ? colors[2] : 'bg-transparent'}`;
    s4.className = `flex-1 transition-colors ${strength >= 4 ? colors[3] : 'bg-transparent'}`;
    
    text.textContent = strength > 0 ? labels[strength - 1] : '8+ characters';
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const email = emailInput?.value.trim().toLowerCase();
    const password = document.getElementById('login-password')?.value;
    const confirmPassword = document.getElementById('login-confirm-password')?.value;
    
    const firstName = document.getElementById('login-first-name')?.value?.trim();
    const lastName = document.getElementById('login-last-name')?.value?.trim();
    
    const authMode = getAuthMode();

    if (!email || !password) {
      showToast('Please enter both email and password.', 'warning');
      return;
    }

    if (authMode === 'signup') {
      if (!firstName || !lastName) {
        showToast('Please provide both First Name and Last Name.', 'warning');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address.', 'warning');
        return;
      }
      
      if (password.length < 8) {
        showToast('Password must be at least 8 characters long.', 'warning');
        return;
      }
      
      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }
    }
    
    const submitBtn = document.getElementById('submit-login-btn');
    const submitLabel = document.getElementById('submit-login-label');
    const originalLabel = submitLabel ? submitLabel.textContent : 'Sign In to Workspace';
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
      if (submitLabel) submitLabel.textContent = 'Authenticating...';
    }

    try {
      // Simulate network latency for loading state
      await new Promise(resolve => setTimeout(resolve, 800));

      const hashedPassword = await hashPassword(password);
      let users = {};
      try {
        users = JSON.parse(localStorage.getItem('insightlens_users')) || {};
      } catch (err) {
        users = {};
      }

      if (authMode === 'signup') {
        const name = `${firstName} ${lastName}`;
        // Case-insensitive duplicate check
        const existingEmail = Object.keys(users).find(u => u.toLowerCase() === email);
        if (existingEmail) {
          showToast('An account with this email already exists. Please Sign In.', 'warning');
          setAuthMode('signin');
          return;
        }

        const initials = getInitials(name);
        users[email] = { name, email, initials, passwordHash: hashedPassword, createdAt: new Date().toISOString() };
        localStorage.setItem('insightlens_users', JSON.stringify(users));

        const newSession = { name, email, initials, loginTime: Date.now() };
        setUserSession(newSession);
        localStorage.setItem('insightlens_session', JSON.stringify(newSession));

        updateAuthUI();
        if (typeof renderArchivePage === 'function') renderArchivePage();
        showToast(`Welcome, ${firstName}! You're now signed in.`, 'success');
        closeLoginModal();
        navigateTo('landing');

      } else {
        const existingEmail = Object.keys(users).find(u => u.toLowerCase() === email);
        const activeUser = users[existingEmail];
        
        if (!activeUser) {
          showToast('No account found for this email. Please Create an Account first.', 'warning');
          setAuthMode('signup');
          return;
        }

        if (activeUser.passwordHash !== hashedPassword) {
          showToast('Incorrect password. Please try again.', 'warning');
          return;
        }

        const sessionObj = { 
          name: activeUser.name, 
          email: activeUser.email, 
          initials: activeUser.initials || getInitials(activeUser.name),
          loginTime: Date.now() 
        };
        setUserSession(sessionObj);
        localStorage.setItem('insightlens_session', JSON.stringify(sessionObj));

        updateAuthUI();
        if (typeof renderArchivePage === 'function') renderArchivePage();
        const first = activeUser.name.split(' ')[0];
        showToast(`Welcome, ${first}! You're now signed in.`, 'success');
        closeLoginModal();
        navigateTo('landing');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        if (submitLabel) submitLabel.textContent = originalLabel;
      }
    }
  });

  guestBtn?.addEventListener('click', () => {
    const guestSession = { name: 'Guest Researcher', email: 'guest@insightlens.edu', initials: 'GR', loginTime: Date.now() };
    setUserSession(guestSession);
    localStorage.setItem('insightlens_session', JSON.stringify(guestSession));
    updateAuthUI();
    if (typeof renderArchivePage === 'function') renderArchivePage();
    showToast('Entered Research Portal as Guest Researcher.', 'info');
    closeLoginModal();
    navigateTo('dashboard');
  });
}

export function setAuthMode(mode) {
  setAuthModeState(mode);
  const nameGroup = document.getElementById('field-name-group');
  const confirmPasswordGroup = document.getElementById('field-confirm-password-group');
  const passwordStrength = document.getElementById('password-strength-container');
  const emailVerif = document.getElementById('email-verification-placeholder');
  
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const submitLabel = document.getElementById('submit-login-label');
  const tabSignIn = document.getElementById('tab-auth-signin');
  const tabSignUp = document.getElementById('tab-auth-signup');

  if (mode === 'signup') {
    nameGroup?.classList.remove('hidden');
    nameGroup?.classList.add('grid');
    confirmPasswordGroup?.classList.remove('hidden');
    passwordStrength?.classList.remove('hidden');
    emailVerif?.classList.remove('hidden');
    
    if (title) title.textContent = 'Create Researcher Account';
    if (subtitle) subtitle.textContent = 'Register your name and email to persist research history.';
    if (submitLabel) submitLabel.textContent = 'Create Account & Sign In';

    if (tabSignUp) tabSignUp.className = 'w-1/2 py-2.5 text-center font-headline-md text-[18px] text-primary border-b-2 border-primary font-semibold cursor-pointer';
    if (tabSignIn) tabSignIn.className = 'w-1/2 py-2.5 text-center font-headline-md text-[18px] text-on-surface-variant hover:text-primary cursor-pointer';
  } else {
    nameGroup?.classList.add('hidden');
    nameGroup?.classList.remove('grid');
    confirmPasswordGroup?.classList.add('hidden');
    passwordStrength?.classList.add('hidden');
    emailVerif?.classList.add('hidden');
    
    if (title) title.textContent = 'Researcher Portal';
    if (subtitle) subtitle.textContent = 'Sign in to access your persistent research history & briefs.';
    if (submitLabel) submitLabel.textContent = 'Sign In to Research Portal';

    if (tabSignIn) tabSignIn.className = 'w-1/2 py-2.5 text-center font-headline-md text-[18px] text-primary border-b-2 border-primary font-semibold cursor-pointer';
    if (tabSignUp) tabSignUp.className = 'w-1/2 py-2.5 text-center font-headline-md text-[18px] text-on-surface-variant hover:text-primary cursor-pointer';
  }
}

export function updateAuthUI() {
  const authNavBtn = document.getElementById('auth-nav-btn');
  const welcomeBadge = document.getElementById('user-welcome-badge');
  const headerUserName = document.getElementById('header-user-name');
  const navUserAvatar = document.getElementById('nav-user-avatar');
  const userMenuContainer = document.getElementById('user-menu-container');
  const userSession = getUserSession();

  const landingTitle = document.getElementById('landing-hero-title');
  const landingSubtitle = document.getElementById('landing-hero-subtitle');
  const landingLastLogin = document.getElementById('landing-last-login');

  if (userSession) {
    authNavBtn?.classList.add('hidden'); // Hide Login/Sign Up button
    
    if (headerUserName) {
      const firstName = userSession.name.split(' ')[0];
      headerUserName.textContent = `👋 Welcome, ${firstName}`;
    }
    
    if (navUserAvatar) navUserAvatar.textContent = userSession.initials || getInitials(userSession.name);

    welcomeBadge?.classList.remove('hidden');
    userMenuContainer?.classList.remove('hidden');
    
    // Update Landing Page Hero
    if (landingTitle) {
      const firstName = userSession.name.split(' ')[0];
      landingTitle.innerHTML = `Welcome back, <span class="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent italic font-serif">${firstName}</span>`;
    }
    if (landingSubtitle) {
      landingSubtitle.textContent = 'Continue where you left off and analyze your next document.';
    }
    if (landingLastLogin) {
      landingLastLogin.classList.remove('hidden');
      const loginDate = new Date(userSession.loginTime || Date.now()).toLocaleString();
      landingLastLogin.textContent = `Last Login: ${loginDate}`;
    }

  } else {
    authNavBtn?.classList.remove('hidden'); // Show Login/Sign Up button
    
    welcomeBadge?.classList.add('hidden');
    userMenuContainer?.classList.add('hidden');
    document.getElementById('user-dropdown-menu')?.classList.remove('show');
    
    // Reset Landing Page Hero
    if (landingTitle) {
      landingTitle.innerHTML = `Turn Complex Visual Artifacts Into <span class="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent italic font-serif">Structured Research Briefs.</span>`;
    }
    if (landingSubtitle) {
      landingSubtitle.textContent = 'Empirical spatial tensor parsing, multimodal OCR extraction, and 11-section academic paper synthesis for domain researchers and enterprise analysts.';
    }
    if (landingLastLogin) {
      landingLastLogin.classList.add('hidden');
    }
  }
}

export function setupLogoutModal(renderArchivePage) {
  const modal = document.getElementById('logout-modal');
  const cancelBtn = document.getElementById('cancel-logout-btn');
  const confirmBtn = document.getElementById('confirm-logout-btn');
  const profileLogoutBtn = document.getElementById('profile-logout-btn');
  const menuLogoutBtn = document.getElementById('menu-logout-btn');

  profileLogoutBtn?.addEventListener('click', openLogoutModal);
  menuLogoutBtn?.addEventListener('click', openLogoutModal);

  cancelBtn?.addEventListener('click', () => {
    modal?.classList.remove('show');
  });

  confirmBtn?.addEventListener('click', () => {
    modal?.classList.remove('show');
    setUserSession(null);
    localStorage.removeItem('insightlens_session');
    updateAuthUI();
    if (typeof renderArchivePage === 'function') renderArchivePage();
    showToast('Signed out of researcher session.', 'info');
    navigateTo('landing');
  });
}

export function openLogoutModal() {
  document.getElementById('user-dropdown-menu')?.classList.remove('show');
  document.getElementById('logout-modal')?.classList.add('show');
}

export function openLoginModal() {
  if (getUserSession()) {
    navigateTo('dashboard');
    return;
  }
  document.getElementById('login-modal')?.classList.add('show');
  document.getElementById('login-email')?.focus();
}

export function closeLoginModal() {
  document.getElementById('login-modal')?.classList.remove('show');
  document.getElementById('login-form')?.reset();
}

export function setupUserDropdownMenu() {
  const menuBtn = document.getElementById('three-dot-menu-btn');
  const dropdown = document.getElementById('user-dropdown-menu');

  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = !dropdown?.classList.contains('show');
    if (isHidden) {
      dropdown?.classList.add('show');
      menuBtn.setAttribute('aria-expanded', 'true');
    } else {
      dropdown?.classList.remove('show');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', () => {
    dropdown?.classList.remove('show');
    menuBtn?.setAttribute('aria-expanded', 'false');
  });

  document.getElementById('menu-profile-btn')?.addEventListener('click', () => {
    navigateTo('profile');
  });

  document.getElementById('menu-dashboard-btn')?.addEventListener('click', () => {
    navigateTo('dashboard');
  });

  document.getElementById('menu-settings-btn')?.addEventListener('click', () => {
    navigateTo('settings');
  });

  document.getElementById('menu-history-btn')?.addEventListener('click', () => {
    navigateTo('archive');
  });
}
