// Hero Section Component Event Handlers

import { navigateTo } from '../state.js';

export function setupHeroEvents() {
  document.getElementById('hero-start-btn')?.addEventListener('click', () => navigateTo('desk'));
  document.getElementById('hero-login-btn')?.addEventListener('click', () => navigateTo('login'));
  document.getElementById('hero-demo-btn')?.addEventListener('click', () => {
    document.getElementById('landing-demo-section')?.scrollIntoView({ behavior: 'smooth' });
  });
}
