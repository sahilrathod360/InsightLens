// InsightLens — Landing Page V2 Interactive Logic & 3D Depth Engine

import { navigateTo } from '../state.js';

let landingCleanupFns = [];

export function setupLandingPageEvents() {
  // Cleanup previous listeners and canvas animations if called multiple times
  landingCleanupFns.forEach(fn => fn());
  landingCleanupFns = [];

  // Primary Start Button
  const startBtn = document.getElementById('hero-start-btn');
  if (startBtn) {
    const startHandler = () => navigateTo('desk');
    startBtn.addEventListener('click', startHandler);
    landingCleanupFns.push(() => startBtn.removeEventListener('click', startHandler));
  }

  // Live Vision Button
  const liveVisionBtn = document.getElementById('hero-livevision-btn');
  if (liveVisionBtn) {
    const liveHandler = () => navigateTo('livevision');
    liveVisionBtn.addEventListener('click', liveHandler);
    landingCleanupFns.push(() => liveVisionBtn.removeEventListener('click', liveHandler));
  }

  // Compare Button
  const compareBtn = document.getElementById('hero-compare-btn');
  if (compareBtn) {
    const compareHandler = () => navigateTo('compare');
    compareBtn.addEventListener('click', compareHandler);
    landingCleanupFns.push(() => compareBtn.removeEventListener('click', compareHandler));
  }

  // Setup Interactive Hero Asset Quick Lenses
  setupHeroAssetSwitcher();

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  setupScrollReveal(prefersReducedMotion);
  if (!prefersReducedMotion) {
    setupDepthCanvas();
    setupMouseParallax();
  }
}

// 5 Real Asset Profiles for the Interactive Hero Telemetry Switcher
const ASSET_PROFILES = {
  manhattan: {
    src: '/images/manhattan-golden-hour.jpg',
    title: 'Manhattan Golden Hour Skyline',
    badge: 'Structural Facade Matrix',
    resolution: '1920 × 1080 • Multimodal',
    pin1: 'Apex Spire • [X: 482, Y: 128]',
    pin2: 'Architectural Density • Grid Matrix'
  },
  planet: {
    src: '/images/planet-eclipse.jpg',
    title: 'Celestial Eclipse & Planetary Limb',
    badge: 'Atmospheric Rayleigh Scattering',
    resolution: '2048 × 1365 • Deep Space',
    pin1: 'Limb Horizon • [X: 512, Y: 210]',
    pin2: 'Chromatic Corona • Radiation Vector'
  },
  milkyway: {
    src: '/images/milkyway-lake-mountains.jpg',
    title: 'Mountain Lake Galactic Reflection',
    badge: 'Stellar Coordinate Plane',
    resolution: '1920 × 1200 • Astronomical',
    pin1: 'Galactic Core • [X: 490, Y: 140]',
    pin2: 'Specular Mirror Lake • Boundary Vector'
  },
  alpine: {
    src: '/images/alpine-cosmos-snow.jpg',
    title: 'Alpine Snow & Cosmic Nebula Sky',
    badge: 'Elevation Relief & Nebula',
    resolution: '1920 × 1080 • Terrain Vision',
    pin1: 'Mountain Peak • [X: 460, Y: 180]',
    pin2: 'Slope Illumination • Gradient Trail'
  },
  citynight: {
    src: '/images/city-harbor-night.jpg',
    title: 'Photonic Highway & Maritime Harbor',
    badge: 'Traffic Flux & Vessel Topology',
    resolution: '1920 × 1200 • Infrastructure',
    pin1: 'Highway Flux • [X: 680, Y: 620]',
    pin2: 'Mooring Cluster • Vessel Coordinates'
  }
};

function setupHeroAssetSwitcher() {
  const container = document.getElementById('hero-asset-lenses');
  if (!container) return;

  const thumbs = container.querySelectorAll('.hero-lens-thumb');
  const heroImg = document.getElementById('hero-active-img');
  const heroTitle = document.getElementById('hero-active-title');
  const heroBadge = document.getElementById('hero-active-badge');
  const heroRes = document.getElementById('hero-active-res');
  const heroPin1 = document.getElementById('hero-pin-1');
  const heroPin2 = document.getElementById('hero-pin-2');

  thumbs.forEach(thumb => {
    const clickHandler = (e) => {
      e.preventDefault();
      const assetKey = thumb.getAttribute('data-asset');
      const profile = ASSET_PROFILES[assetKey];
      if (!profile) return;

      // Update active thumb
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');

      // Smoothly update preview image and telemetry callouts
      if (heroImg) {
        heroImg.style.opacity = '0.3';
        setTimeout(() => {
          heroImg.src = profile.src;
          heroImg.style.opacity = '0.9';
        }, 120);
      }

      if (heroTitle) heroTitle.textContent = profile.title;
      if (heroBadge) heroBadge.textContent = profile.badge;
      if (heroRes) heroRes.textContent = profile.resolution;
      if (heroPin1) heroPin1.textContent = profile.pin1;
      if (heroPin2) heroPin2.textContent = profile.pin2;
    };

    thumb.addEventListener('click', clickHandler);
    landingCleanupFns.push(() => thumb.removeEventListener('click', clickHandler));
  });
}

export function setupScrollReveal(reducedMotion) {
  if (typeof IntersectionObserver === 'undefined' || reducedMotion) {
    document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
  landingCleanupFns.push(() => observer.disconnect());
}

function setupMouseParallax() {
  const hero = document.getElementById('landing-hero');
  if (!hero) return;

  const layers = document.querySelectorAll('.parallax-layer');
  if (layers.length === 0) return;

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    layers.forEach(layer => {
      const speed = parseFloat(layer.getAttribute('data-parallax-speed')) || 16;
      layer.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
    });
  };

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  landingCleanupFns.push(() => window.removeEventListener('mousemove', handleMouseMove));
}

// Lightweight 3D Depth Constellation Canvas
function setupDepthCanvas() {
  const canvas = document.getElementById('landing-depth-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animFrameId = null;
  let width = 0;
  let height = 0;
  let mouseX = 0;
  let mouseY = 0;
  let isMouseOver = false;

  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 16 : 42;
  const maxDistance = isMobile ? 80 : 130;

  const resize = () => {
    const parent = canvas.parentElement;
    width = parent ? parent.offsetWidth : window.innerWidth;
    height = parent ? parent.offsetHeight : window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  landingCleanupFns.push(() => window.removeEventListener('resize', resize));

  // Initialize nodes
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * (width || 1000),
      y: Math.random() * (height || 800),
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 1.5 + 1,
      color: i % 3 === 0 ? 'rgba(99, 102, 241, 0.7)' : (i % 3 === 1 ? 'rgba(6, 182, 212, 0.7)' : 'rgba(148, 163, 184, 0.5)')
    });
  }

  const handleMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isMouseOver = true;
  };

  const handleMouseLeave = () => {
    isMouseOver = false;
  };

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
  landingCleanupFns.push(() => window.removeEventListener('mousemove', handleMouseMove));
  landingCleanupFns.push(() => window.removeEventListener('mouseleave', handleMouseLeave));

  const render = () => {
    ctx.clearRect(0, 0, width, height);

    // Draw subtle 3D perspective depth grid at the bottom
    const horizonY = height * 0.45;
    ctx.beginPath();
    // Grid horizontal lines (exponential perspective spacing)
    for (let i = 0; i < 9; i++) {
      const lineY = horizonY + Math.pow(i / 8, 2.2) * (height - horizonY);
      const alpha = (i / 8) * 0.08;
      ctx.moveTo(0, lineY);
      ctx.lineTo(width, lineY);
      ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
      ctx.lineWidth = 0.6;
    }
    ctx.stroke();

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Subtle mouse attraction on desktop
      if (isMouseOver && !isMobile) {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 10) {
          p.x += (dx / dist) * 0.35;
          p.y += (dy / dist) * 0.35;
        }
      }

      // Draw particle dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Connect nearby particles with delicate hairline vectors
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          const alpha = (1 - dist / maxDistance) * 0.28;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    animFrameId = requestAnimationFrame(render);
  };

  animFrameId = requestAnimationFrame(render);
  landingCleanupFns.push(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
  });
}
