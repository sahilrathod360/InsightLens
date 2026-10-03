// Dedicated Authentication Views: Login & Sign-Up Pages
// Backed by Aiven PostgreSQL & Render Backend

import { navigateTo, setUserSession, getUserSession } from '../state.js';
import { API_BASE, setAuthToken } from '../utils/api.js';
import { showToast } from '../utils/toast.js';
import { getInitials } from '../services/storage.js';
import { updateAuthUI } from '../components/Navbar.js';

let signupAvatarBase64 = null;

export function setupAuthPages() {
  // Login Form Submission
  const loginForm = document.getElementById('dedicated-login-form');
  loginForm?.addEventListener('submit', handleLoginSubmit);

  // Sign-Up Form Submission
  const signupForm = document.getElementById('dedicated-signup-form');
  signupForm?.addEventListener('submit', handleSignupSubmit);

  // Sign-Up Avatar Upload & Live Preview
  const avatarInput = document.getElementById('signup-avatar-input');
  const avatarDropzone = document.getElementById('signup-avatar-dropzone');
  const avatarPreview = document.getElementById('signup-avatar-preview');
  const avatarPlaceholder = document.getElementById('signup-avatar-placeholder');
  const removeAvatarBtn = document.getElementById('signup-avatar-remove');

  avatarDropzone?.addEventListener('click', () => avatarInput?.click());

  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleAvatarFile(file);
  });

  avatarDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    avatarDropzone.classList.add('border-indigo-500', 'bg-indigo-500/10');
  });

  avatarDropzone?.addEventListener('dragleave', () => {
    avatarDropzone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
  });

  avatarDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    avatarDropzone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
    const file = e.dataTransfer.files?.[0];
    if (file) handleAvatarFile(file);
  });

  removeAvatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    signupAvatarBase64 = null;
    if (avatarInput) avatarInput.value = '';
    if (avatarPreview) {
      avatarPreview.src = '';
      avatarPreview.classList.add('hidden');
    }
    if (avatarPlaceholder) avatarPlaceholder.classList.remove('hidden');
    if (removeAvatarBtn) removeAvatarBtn.classList.add('hidden');
  });

  // Password Visibility Toggles for Login
  document.getElementById('login-show-password-toggle')?.addEventListener('click', () => {
    const pwdInput = document.getElementById('dedicated-login-password');
    const icon = document.getElementById('login-pwd-icon');
    if (pwdInput && icon) {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        icon.textContent = 'visibility';
      } else {
        pwdInput.type = 'password';
        icon.textContent = 'visibility_off';
      }
    }
  });

  // Password Visibility Toggles for Sign-Up
  document.getElementById('signup-show-pwd-toggle')?.addEventListener('click', () => {
    const pwdInput = document.getElementById('signup-password');
    const icon = document.getElementById('signup-pwd-icon');
    if (pwdInput && icon) {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        icon.textContent = 'visibility';
      } else {
        pwdInput.type = 'password';
        icon.textContent = 'visibility_off';
      }
    }
  });

  document.getElementById('signup-show-cpwd-toggle')?.addEventListener('click', () => {
    const pwdInput = document.getElementById('signup-confirm-password');
    const icon = document.getElementById('signup-cpwd-icon');
    if (pwdInput && icon) {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        icon.textContent = 'visibility';
      } else {
        pwdInput.type = 'password';
        icon.textContent = 'visibility_off';
      }
    }
  });

  // Real-time password strength meter
  document.getElementById('signup-password')?.addEventListener('input', (e) => {
    const pwd = e.target.value;
    const s1 = document.getElementById('signup-str-1');
    const s2 = document.getElementById('signup-str-2');
    const s3 = document.getElementById('signup-str-3');
    const s4 = document.getElementById('signup-str-4');
    const text = document.getElementById('signup-strength-text');

    if (!pwd) {
      [s1, s2, s3, s4].forEach(el => el && (el.className = 'flex-1 transition-colors bg-white/10'));
      if (text) text.textContent = 'Minimum 8 characters';
      return;
    }

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    const colors = ['bg-red-500', 'bg-amber-500', 'bg-indigo-400', 'bg-emerald-500'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];

    if (s1) s1.className = `flex-1 transition-colors ${strength >= 1 ? colors[0] : 'bg-white/10'}`;
    if (s2) s2.className = `flex-1 transition-colors ${strength >= 2 ? colors[1] : 'bg-white/10'}`;
    if (s3) s3.className = `flex-1 transition-colors ${strength >= 3 ? colors[2] : 'bg-white/10'}`;
    if (s4) s4.className = `flex-1 transition-colors ${strength >= 4 ? colors[4] || colors[3] : 'bg-white/10'}`;

    if (text) text.textContent = strength > 0 ? labels[strength - 1] : 'Minimum 8 characters';
  });

  // Navigation Links between Login and Sign-Up
  document.querySelectorAll('[data-auth-goto="signup"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('signup');
    });
  });

  document.querySelectorAll('[data-auth-goto="login"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('login');
    });
  });
}

function handleAvatarFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (PNG, JPEG, WebP).', 'warning');
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    showToast('Image size exceeds 4MB. Please choose a smaller photo.', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    signupAvatarBase64 = base64;

    const avatarPreview = document.getElementById('signup-avatar-preview');
    const avatarPlaceholder = document.getElementById('signup-avatar-placeholder');
    const removeAvatarBtn = document.getElementById('signup-avatar-remove');

    if (avatarPreview) {
      avatarPreview.src = base64;
      avatarPreview.classList.remove('hidden');
    }
    if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden');
    if (removeAvatarBtn) removeAvatarBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const identifier = document.getElementById('dedicated-login-identifier')?.value?.trim();
  const password = document.getElementById('dedicated-login-password')?.value;
  const submitBtn = document.getElementById('dedicated-login-submit-btn');

  if (!identifier || !password) {
    showToast('Please enter your email/username and password.', 'warning');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Signing In...`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      showToast(json.message || 'Invalid email or password.', 'warning');
      return;
    }

    const { user, token } = json.data;
    setAuthToken(token);

    const sessionObj = {
      id: user.id,
      name: user.name,
      firstName: user.firstName || (user.name ? user.name.split(' ')[0] : 'Researcher'),
      lastName: user.lastName || '',
      username: user.username,
      email: user.email,
      initials: user.initials || getInitials(user.name),
      role: user.role || 'Researcher',
      avatar: user.avatar || null,
      onboarding_completed: !!user.onboarding_completed,
      loginTime: Date.now()
    };

    setUserSession(sessionObj);
    localStorage.setItem('insightlens_session', JSON.stringify(sessionObj));
    updateAuthUI();

    showToast(`Welcome back, ${sessionObj.firstName}!`, 'success');

    if (!user.onboarding_completed) {
      navigateTo('onboarding');
    } else {
      navigateTo('landing');
    }
  } catch (err) {
    console.error('[Auth Login Error]', err);
    showToast('Network error during authentication. Please check connection.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">login</span> Sign In to Workspace`;
    }
  }
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const firstName = document.getElementById('signup-first-name')?.value?.trim();
  const lastName = document.getElementById('signup-last-name')?.value?.trim();
  const username = document.getElementById('signup-username')?.value?.trim().toLowerCase().replace(/^@+/, '');
  const email = document.getElementById('signup-email')?.value?.trim().toLowerCase();
  const password = document.getElementById('signup-password')?.value;
  const confirmPassword = document.getElementById('signup-confirm-password')?.value;
  const submitBtn = document.getElementById('signup-submit-btn');

  if (!firstName || !lastName) {
    showToast('Please provide both First Name and Last Name.', 'warning');
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'warning');
    return;
  }
  if (!password || password.length < 8) {
    showToast('Password must be at least 8 characters long.', 'warning');
    return;
  }
  if (password !== confirmPassword) {
    showToast('Passwords do not match. Please verify.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Creating Account...`;
  }

  try {
    const fullName = `${firstName} ${lastName}`.trim();
    const payload = {
      firstName,
      lastName,
      name: fullName,
      username: username || email.split('@')[0],
      email,
      password,
      avatar: signupAvatarBase64
    };

    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      showToast(json.message || 'Registration failed. Please try again.', 'warning');
      return;
    }

    const { user, token } = json.data;
    setAuthToken(token);

    const sessionObj = {
      id: user.id,
      name: user.name,
      firstName: user.firstName || firstName,
      lastName: user.lastName || lastName,
      username: user.username,
      email: user.email,
      initials: user.initials || getInitials(user.name),
      role: user.role || 'Researcher',
      avatar: user.avatar || signupAvatarBase64 || null,
      onboarding_completed: false,
      loginTime: Date.now()
    };

    setUserSession(sessionObj);
    localStorage.setItem('insightlens_session', JSON.stringify(sessionObj));
    updateAuthUI();

    showToast(`Account created! Let's personalize your research workbench.`, 'success');
    navigateTo('onboarding');
  } catch (err) {
    console.error('[Auth Signup Error]', err);
    showToast('Network error during registration. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">how_to_reg</span> Create Account & Continue`;
    }
  }
}
