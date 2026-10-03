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
  setupDepthCanvas(prefersReducedMotion);
  if (!prefersReducedMotion) {
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

// Advanced Multi-Layer 3D Spatial Depth & Constellation Engine
function setupDepthCanvas(reducedMotion = false) {
  const canvas = document.getElementById('landing-depth-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animFrameId = null;
  let width = 0;
  let height = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  let gridPhase = 0;
  let shapeRotation = 0;

  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 32 : 72;
  const maxDistance = isMobile ? 95 : 155;

  // Controlled, vibrant multi-color palette
  const COLOR_PALETTE = [
    { r: 99, g: 102, b: 241, name: 'indigo' },   // #6366f1
    { r: 6, g: 182, b: 212, name: 'cyan' },      // #06b6d4
    { r: 139, g: 92, b: 246, name: 'violet' },   // #8b5cf6
    { r: 236, g: 72, b: 153, name: 'magenta' },  // #ec4899
    { r: 20, g: 184, b: 166, name: 'teal' },     // #14b8a6
    { r: 245, g: 158, b: 11, name: 'gold' }      // #f59e0b
  ];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform before scaling
    ctx.scale(dpr, dpr);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  landingCleanupFns.push(() => window.removeEventListener('resize', resize));

  // Initialize 3D Spatial Particles across 3 depth strata (Background, Midground, Foreground)
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const depth = 0.2 + Math.random() * 1.3; // z-depth: 0.2 (distant) to 1.5 (near)
    const colorObj = COLOR_PALETTE[i % COLOR_PALETTE.length];
    particles.push({
      x: Math.random() * (width || 1200),
      y: Math.random() * (height || 900),
      z: depth,
      vx: (Math.random() - 0.5) * 0.35 * (0.6 + depth * 0.4),
      vy: (Math.random() - 0.5) * 0.35 * (0.6 + depth * 0.4),
      baseRadius: (0.8 + depth * 1.6),
      color: colorObj,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03
    });
  }

  // Energy pulses traveling along constellation links
  const pulses = [];
  const maxPulses = isMobile ? 6 : 14;

  const handleMouseMove = (e) => {
    targetMouseX = (e.clientX / width - 0.5) * 60;
    targetMouseY = (e.clientY / height - 0.5) * 40;
  };

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  landingCleanupFns.push(() => window.removeEventListener('mousemove', handleMouseMove));

  // 3D Wireframe Polyhedron Definitions (Octahedron & Cube)
  const octahedronVertices = [
    [0, -1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1, 0]
  ];
  const octahedronEdges = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [5, 1], [5, 2], [5, 3], [5, 4],
    [1, 2], [2, 3], [3, 4], [4, 1]
  ];

  const floatingShapes = [
    { x: width * 0.15, y: height * 0.28, size: isMobile ? 30 : 55, rotX: 0.2, rotY: 0.5, speedX: 0.008, speedY: 0.012, color: 'rgba(6, 182, 212, ' },
    { x: width * 0.88, y: height * 0.45, size: isMobile ? 35 : 70, rotX: 0.8, rotY: 0.3, speedX: 0.006, speedY: -0.009, color: 'rgba(139, 92, 246, ' },
    { x: width * 0.50, y: height * 0.82, size: isMobile ? 25 : 45, rotX: 0.5, rotY: 0.9, speedX: -0.009, speedY: 0.007, color: 'rgba(236, 72, 153, ' }
  ];

  const render = () => {
    // Smooth lerp mouse tracking
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;
    gridPhase = (gridPhase + 0.004) % 1;
    shapeRotation += 0.01;

    ctx.clearRect(0, 0, width, height);

    // =========================================================================
    // LAYER 1: 3D PERSPECTIVE HORIZON GRID (BOTTOM-TO-MIDGROUND SPATIAL MATRIX)
    // =========================================================================
    const horizonY = height * 0.42 + mouseY * 0.3;
    const vanishX = width * 0.5 + mouseX * 0.8;

    ctx.save();
    ctx.lineWidth = 0.7;

    // Converging Perspective Rays
    const numRays = isMobile ? 12 : 24;
    for (let i = 0; i <= numRays; i++) {
      const bottomX = (width / numRays) * i + (mouseX * 0.5);
      const grad = ctx.createLinearGradient(vanishX, horizonY, bottomX, height);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
      grad.addColorStop(0.35, 'rgba(6, 182, 212, 0.05)');
      grad.addColorStop(1, 'rgba(139, 92, 246, 0.18)');

      ctx.beginPath();
      ctx.moveTo(vanishX, horizonY);
      ctx.lineTo(bottomX, height);
      ctx.strokeStyle = grad;
      ctx.stroke();
    }

    // Exponential Depth Transverse Lines (with smooth forward drift)
    const numTransverse = isMobile ? 8 : 14;
    for (let j = 0; j < numTransverse; j++) {
      const t = (j + gridPhase) / numTransverse;
      const lineY = horizonY + Math.pow(t, 2.4) * (height - horizonY);
      const alpha = Math.min(1, Math.pow(t, 1.8) * 0.32);

      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(width, lineY);
      ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
      ctx.stroke();
    }
    ctx.restore();

    // =========================================================================
    // LAYER 2: 3D FLOATING STRUCTURAL WIREFRAME NODES (POLYHEDRA)
    // =========================================================================
    ctx.save();
    floatingShapes.forEach((shape, sIdx) => {
      shape.rotX += shape.speedX;
      shape.rotY += shape.speedY;

      const posX = shape.x + mouseX * (0.4 + sIdx * 0.2);
      const posY = shape.y + mouseY * (0.4 + sIdx * 0.2);

      const radX = shape.rotX;
      const radY = shape.rotY;

      // Project 3D vertices to 2D
      const projected = octahedronVertices.map(v => {
        let x = v[0], y = v[1], z = v[2];
        // Rotate around Y
        let x1 = x * Math.cos(radY) + z * Math.sin(radY);
        let z1 = -x * Math.sin(radY) + z * Math.cos(radY);
        // Rotate around X
        let y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
        let z2 = y * Math.sin(radX) + z1 * Math.cos(radX);

        const fov = 3.5;
        const scale = fov / (fov + z2);
        return [
          posX + x1 * shape.size * scale,
          posY + y2 * shape.size * scale,
          scale
        ];
      });

      // Draw Edges
      ctx.lineWidth = 0.9;
      octahedronEdges.forEach(([i1, i2]) => {
        const p1 = projected[i1];
        const p2 = projected[i2];
        const avgScale = (p1[2] + p2[2]) / 2;
        const alpha = Math.max(0.08, Math.min(0.45, avgScale * 0.32));

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.strokeStyle = `${shape.color}${alpha})`;
        ctx.stroke();
      });

      // Draw vertices halos
      projected.forEach(p => {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2 * p[2], 0, Math.PI * 2);
        ctx.fillStyle = `${shape.color}0.75)`;
        ctx.fill();
      });
    });
    ctx.restore();

    // =========================================================================
    // LAYER 3: 3D SPATIAL PARTICLES & NEURAL CONSTELLATION NETWORK
    // =========================================================================
    const activePairs = [];

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.pulse += p.pulseSpeed;

      // Screen wrapping with margins
      if (p.x < -40) p.x = width + 40;
      if (p.x > width + 40) p.x = -40;
      if (p.y < -40) p.y = height + 40;
      if (p.y > height + 40) p.y = -40;

      // Parallax shift based on 3D depth z
      const drawX = p.x + mouseX * p.z * 0.8;
      const drawY = p.y + mouseY * p.z * 0.8;
      const dynamicRadius = p.baseRadius * (0.85 + Math.sin(p.pulse) * 0.25);
      const alpha = Math.min(0.95, (0.35 + p.z * 0.45) * (0.8 + Math.sin(p.pulse) * 0.2));

      // Draw particle glowing halo
      if (p.z > 0.8) {
        ctx.beginPath();
        ctx.arc(drawX, drawY, dynamicRadius * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.25})`;
        ctx.fill();
      }

      // Draw particle core
      ctx.beginPath();
      ctx.arc(drawX, drawY, dynamicRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
      ctx.fill();

      // Find nearby particles within depth slice to connect
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        if (Math.abs(p.z - p2.z) > 0.65) continue; // Only connect within similar depth strata

        const p2DrawX = p2.x + mouseX * p2.z * 0.8;
        const p2DrawY = p2.y + mouseY * p2.z * 0.8;

        const dx = drawX - p2DrawX;
        const dy = drawY - p2DrawY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          const lineAlpha = (1 - dist / maxDistance) * (0.32 + p.z * 0.28);
          
          ctx.beginPath();
          ctx.moveTo(drawX, drawY);
          ctx.lineTo(p2DrawX, p2DrawY);

          // Gradient vector between two particle colors
          const lineGrad = ctx.createLinearGradient(drawX, drawY, p2DrawX, p2DrawY);
          lineGrad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${lineAlpha})`);
          lineGrad.addColorStop(1, `rgba(${p2.color.r}, ${p2.color.g}, ${p2.color.b}, ${lineAlpha})`);

          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = 0.85 * p.z;
          ctx.stroke();

          if (dist > 30 && Math.random() < 0.003 && pulses.length < maxPulses) {
            pulses.push({
              x1: drawX, y1: drawY,
              x2: p2DrawX, y2: p2DrawY,
              progress: 0,
              speed: 0.025 + Math.random() * 0.02,
              color: p.color
            });
          }
        }
      }
    }

    // =========================================================================
    // LAYER 4: TRAVELING ENERGY PULSES
    // =========================================================================
    for (let k = pulses.length - 1; k >= 0; k--) {
      const pulse = pulses[k];
      pulse.progress += pulse.speed;

      if (pulse.progress >= 1) {
        pulses.splice(k, 1);
        continue;
      }

      const px = pulse.x1 + (pulse.x2 - pulse.x1) * pulse.progress;
      const py = pulse.y1 + (pulse.y2 - pulse.y1) * pulse.progress;
      const pAlpha = Math.sin(pulse.progress * Math.PI) * 0.9;

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pulse.color.r}, ${pulse.color.g}, ${pulse.color.b}, ${pAlpha})`;
      ctx.shadowColor = `rgba(${pulse.color.r}, ${pulse.color.g}, ${pulse.color.b}, 0.8)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }

    if (!reducedMotion) {
      animFrameId = requestAnimationFrame(render);
    }
  };

  if (!reducedMotion) {
    animFrameId = requestAnimationFrame(render);
  } else {
    render();
  }
  landingCleanupFns.push(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
  });
}
