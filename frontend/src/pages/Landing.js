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

// =========================================================================
// ADVANCED 3D SPATIAL PERSPECTIVE DEPTH ENGINE (TRUE Z-AXIS FLIGHT & ORBIT)
// =========================================================================
function setupDepthCanvas(reducedMotion = false) {
  const canvas = document.getElementById('landing-depth-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animFrameId = null;
  let width = 0;
  let height = 0;
  let centerX = 0;
  let centerY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let simTime = 0;

  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 48 : 110;
  const FOV = 620; // Perspective field of view distance

  // Controlled, futuristic color palette
  const PALETTE = [
    { r: 6, g: 182, b: 212, name: 'cyan' },       // #06b6d4
    { r: 99, g: 102, b: 241, name: 'indigo' },    // #6366f1
    { r: 139, g: 92, b: 246, name: 'violet' },    // #8b5cf6
    { r: 236, g: 72, b: 153, name: 'magenta' },   // #ec4899
    { r: 20, g: 184, b: 166, name: 'teal' }       // #14b8a6
  ];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    centerX = width / 2;
    centerY = height / 2;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  landingCleanupFns.push(() => window.removeEventListener('resize', resize));

  // Initialize True 3D Particles in World Space (X, Y, Z)
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const colorObj = PALETTE[i % PALETTE.length];
    particles.push({
      x: (Math.random() - 0.5) * (width * 1.5 || 1800),
      y: (Math.random() - 0.5) * (height * 1.4 || 1200),
      z: 50 + Math.random() * 1250, // Z from 50 (close foreground) to 1300 (deep background)
      vz: 0.8 + Math.random() * 1.4, // Forward continuous Z-speed
      baseRadius: 1.8 + Math.random() * 2.2,
      color: colorObj,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03
    });
  }

  // Mouse Parallax Listener
  const handleMouseMove = (e) => {
    targetMouseX = ((e.clientX / width) - 0.5) * 80;
    targetMouseY = ((e.clientY / height) - 0.5) * 60;
  };

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  landingCleanupFns.push(() => window.removeEventListener('mousemove', handleMouseMove));

  // 3D Geometric Objects Definitions (World Coordinates)
  const octahedronVertices = [
    [0, -1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1, 0]
  ];
  const octahedronEdges = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [5, 1], [5, 2], [5, 3], [5, 4],
    [1, 2], [2, 3], [3, 4], [4, 1]
  ];

  // Icosahedron (12 vertices, 30 edges) for sophisticated neural crystal
  const tPhi = (1.0 + Math.sqrt(5.0)) / 2.0;
  const rawIcosaVertices = [
    [-1,  tPhi,  0], [ 1,  tPhi,  0], [-1, -tPhi,  0], [ 1, -tPhi,  0],
    [ 0, -1,  tPhi], [ 0,  1,  tPhi], [ 0, -1, -tPhi], [ 0,  1, -tPhi],
    [ tPhi,  0, -1], [ tPhi,  0,  1], [-tPhi,  0, -1], [-tPhi,  0,  1]
  ].map(v => {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return [v[0]/len, v[1]/len, v[2]/len];
  });

  const icosahedronEdges = [];
  for (let i = 0; i < rawIcosaVertices.length; i++) {
    for (let j = i + 1; j < rawIcosaVertices.length; j++) {
      const dx = rawIcosaVertices[i][0] - rawIcosaVertices[j][0];
      const dy = rawIcosaVertices[i][1] - rawIcosaVertices[j][1];
      const dz = rawIcosaVertices[i][2] - rawIcosaVertices[j][2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < 1.15) {
        icosahedronEdges.push([i, j]);
      }
    }
  }

  // Floating 3D Geometric Objects positioned in world space
  const worldObjects = [
    {
      type: 'octahedron',
      worldX: -width * 0.28,
      worldY: -height * 0.18,
      worldZ: 380,
      radius: isMobile ? 38 : 68,
      rotX: 0.3,
      rotY: 0.6,
      rotZ: 0.1,
      speedX: 0.009,
      speedY: 0.013,
      speedZ: 0.006,
      color: 'rgba(6, 182, 212, '
    },
    {
      type: 'icosahedron',
      worldX: width * 0.34,
      worldY: height * 0.05,
      worldZ: 340,
      radius: isMobile ? 42 : 78,
      rotX: 0.8,
      rotY: 0.4,
      rotZ: 0.2,
      speedX: 0.007,
      speedY: -0.011,
      speedZ: 0.008,
      color: 'rgba(139, 92, 246, '
    },
    {
      type: 'gyroscope',
      worldX: -width * 0.05,
      worldY: height * 0.32,
      worldZ: 440,
      radius: isMobile ? 35 : 62,
      rotX: 0.5,
      rotY: 0.9,
      rotZ: 0.4,
      speedX: -0.012,
      speedY: 0.015,
      speedZ: 0.009,
      color: 'rgba(236, 72, 153, '
    }
  ];

  // Energy pulses traversing connections
  const pulses = [];
  const maxPulses = isMobile ? 6 : 14;

  const render = () => {
    simTime += 0.016;

    // Autonomous continuous camera motion (gentle 3D Lissajous orbit)
    const autoCamX = Math.sin(simTime * 0.35) * 35 + Math.cos(simTime * 0.18) * 20;
    const autoCamY = Math.cos(simTime * 0.28) * 25 + Math.sin(simTime * 0.14) * 15;

    // Smooth lerp mouse tracking layered on top of autonomous orbit
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    const camX = autoCamX + mouseX;
    const camY = autoCamY + mouseY;

    ctx.clearRect(0, 0, width, height);

    // =========================================================================
    // LAYER 1: 3D PERSPECTIVE HORIZON & SPATIAL FLOOR GRID
    // =========================================================================
    ctx.save();
    const floorY = centerY + 180;
    const vanishX = centerX + camX * 0.5;
    const vanishY = centerY - 40 + camY * 0.3;

    // Converging Perspective Rays from Horizon
    const numRays = isMobile ? 12 : 22;
    for (let i = 0; i <= numRays; i++) {
      const bottomX = (width / numRays) * i + camX * 0.4;
      const grad = ctx.createLinearGradient(vanishX, vanishY, bottomX, height);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
      grad.addColorStop(0.35, 'rgba(6, 182, 212, 0.07)');
      grad.addColorStop(1, 'rgba(139, 92, 246, 0.24)');

      ctx.beginPath();
      ctx.moveTo(vanishX, vanishY);
      ctx.lineTo(bottomX, height);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Transverse 3D grid lines with continuous forward motion drift
    const gridSpeed = (simTime * 28) % 60;
    const numGridLines = isMobile ? 8 : 14;
    for (let g = 0; g < numGridLines; g++) {
      const zDepth = ((g * 60 + gridSpeed) / (numGridLines * 60));
      const expDepth = Math.pow(zDepth, 2.2);
      const lineY = vanishY + expDepth * (height - vanishY);
      const lineAlpha = Math.min(0.35, Math.pow(zDepth, 1.4) * 0.38);

      if (lineY >= vanishY && lineY <= height) {
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(width, lineY);
        ctx.strokeStyle = `rgba(6, 182, 212, ${lineAlpha})`;
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
    }
    ctx.restore();

    // =========================================================================
    // LAYER 2: 3D ROTATING GEOMETRIC POLYHEDRA & GYROSCOPES
    // =========================================================================
    ctx.save();
    worldObjects.forEach((obj) => {
      obj.rotX += obj.speedX;
      obj.rotY += obj.speedY;
      obj.rotZ += obj.speedZ;

      // Object 3D world position with subtle floating oscillation
      const ox = obj.worldX + Math.sin(simTime * 0.5 + obj.worldZ) * 18;
      const oy = obj.worldY + Math.cos(simTime * 0.4 + obj.worldZ) * 14;
      const oz = obj.worldZ;

      // 3D Perspective Projection
      const projScale = FOV / (FOV + oz);
      const screenObjX = centerX + (ox - camX) * projScale;
      const screenObjY = centerY + (oy - camY) * projScale;

      const radX = obj.rotX;
      const radY = obj.rotY;
      const radZ = obj.rotZ;

      if (obj.type === 'octahedron') {
        const projected = octahedronVertices.map(v => {
          let x = v[0], y = v[1], z = v[2];
          // 3D Matrix Rotation (Euler XYZ)
          let y1 = y * Math.cos(radX) - z * Math.sin(radX);
          let z1 = y * Math.sin(radX) + z * Math.cos(radX);
          let x2 = x * Math.cos(radY) + z1 * Math.sin(radY);
          let z2 = -x * Math.sin(radY) + z1 * Math.cos(radY);
          let x3 = x2 * Math.cos(radZ) - y1 * Math.sin(radZ);
          let y3 = x2 * Math.sin(radZ) + y1 * Math.cos(radZ);

          const localScale = FOV / (FOV + oz + z2 * obj.radius * 0.5);
          return [
            screenObjX + x3 * obj.radius * projScale,
            screenObjY + y3 * obj.radius * projScale,
            z2
          ];
        });

        // Draw Edges with depth attenuation
        ctx.lineWidth = 1.4 * projScale;
        octahedronEdges.forEach(([i1, i2]) => {
          const p1 = projected[i1];
          const p2 = projected[i2];
          const avgZ = (p1[2] + p2[2]) / 2;
          const edgeAlpha = Math.max(0.22, Math.min(0.85, 0.52 + avgZ * 0.35));

          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.strokeStyle = `${obj.color}${edgeAlpha})`;
          ctx.stroke();
        });

        // Draw Vertices Halos
        projected.forEach(p => {
          ctx.beginPath();
          ctx.arc(p[0], p[1], 2.8 * projScale, 0, Math.PI * 2);
          ctx.fillStyle = `${obj.color}0.95)`;
          ctx.fill();
        });
      } else if (obj.type === 'icosahedron') {
        const projected = rawIcosaVertices.map(v => {
          let x = v[0], y = v[1], z = v[2];
          let y1 = y * Math.cos(radX) - z * Math.sin(radX);
          let z1 = y * Math.sin(radX) + z * Math.cos(radX);
          let x2 = x * Math.cos(radY) + z1 * Math.sin(radY);
          let z2 = -x * Math.sin(radY) + z1 * Math.cos(radY);
          let x3 = x2 * Math.cos(radZ) - y1 * Math.sin(radZ);
          let y3 = x2 * Math.sin(radZ) + y1 * Math.cos(radZ);

          return [
            screenObjX + x3 * obj.radius * projScale,
            screenObjY + y3 * obj.radius * projScale,
            z2
          ];
        });

        ctx.lineWidth = 1.2 * projScale;
        icosahedronEdges.forEach(([i1, i2]) => {
          const p1 = projected[i1];
          const p2 = projected[i2];
          const avgZ = (p1[2] + p2[2]) / 2;
          const edgeAlpha = Math.max(0.18, Math.min(0.80, 0.48 + avgZ * 0.30));

          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.strokeStyle = `${obj.color}${edgeAlpha})`;
          ctx.stroke();
        });

        projected.forEach(p => {
          ctx.beginPath();
          ctx.arc(p[0], p[1], 2.5 * projScale, 0, Math.PI * 2);
          ctx.fillStyle = `${obj.color}0.9)`;
          ctx.fill();
        });
      } else if (obj.type === 'gyroscope') {
        // Nested 3D Elliptical Gyroscope Rings
        [0.6, 0.85, 1.1].forEach((ringRadiusMult, ringIdx) => {
          const ringRad = obj.radius * ringRadiusMult * projScale;
          const ringAngle = obj.rotY * (1 + ringIdx * 0.4);

          ctx.save();
          ctx.translate(screenObjX, screenObjY);
          ctx.rotate(ringAngle);
          ctx.scale(1, Math.cos(obj.rotX * (1 + ringIdx * 0.3)));

          ctx.beginPath();
          ctx.arc(0, 0, ringRad, 0, Math.PI * 2);
          ctx.lineWidth = 1.2 * projScale;
          ctx.strokeStyle = `${obj.color}${0.35 + ringIdx * 0.20})`;
          ctx.stroke();
          ctx.restore();
        });
      }
    });
    ctx.restore();

    // =========================================================================
    // LAYER 3: 3D VOLUMETRIC PARTICLE FLIGHT & SPATIAL NEURAL CLUSTERS
    // =========================================================================
    // Update particle Z positions (continuous forward flight in 3D)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.z -= p.vz;
      p.pulse += p.pulseSpeed;

      // Respawner: when particle passes camera, respawn at far background
      if (p.z <= 20) {
        p.z = 1250 + Math.random() * 200;
        p.x = (Math.random() - 0.5) * (width * 1.5 || 1800);
        p.y = (Math.random() - 0.5) * (height * 1.4 || 1200);
      }

      // Calculate 3D perspective projection
      const scale = FOV / (FOV + p.z);
      p.projScale = scale;
      p.screenX = centerX + (p.x - camX) * scale;
      p.screenY = centerY + (p.y - camY) * scale;
    }

    // 3D Neural Connections (Only connect particles within genuine 3D distance)
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      if (p1.screenX < -60 || p1.screenX > width + 60 || p1.screenY < -60 || p1.screenY > height + 60) continue;

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        if (p2.screenX < -60 || p2.screenX > width + 60 || p2.screenY < -60 || p2.screenY > height + 60) continue;

        // Calculate genuine 3D Euclidean distance in world space
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Connect only close spatial neighbors (creates organic 3D clusters, not flat spiderwebs)
        const maxDist3D = 150;
        if (dist3D < maxDist3D) {
          const avgScale = (p1.projScale + p2.projScale) / 2;
          const proximityAlpha = (1 - dist3D / maxDist3D) * Math.min(1, avgScale * 1.4);
          const lineAlpha = Math.max(0.04, Math.min(0.55, proximityAlpha * 0.42));

          ctx.beginPath();
          ctx.moveTo(p1.screenX, p1.screenY);
          ctx.lineTo(p2.screenX, p2.screenY);

          const grad = ctx.createLinearGradient(p1.screenX, p1.screenY, p2.screenX, p2.screenY);
          grad.addColorStop(0, `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${lineAlpha})`);
          grad.addColorStop(1, `rgba(${p2.color.r}, ${p2.color.g}, ${p2.color.b}, ${lineAlpha})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.max(0.6, 1.4 * avgScale);
          ctx.stroke();

          // Spontaneous energy pulse trigger along neural pathway
          if (dist3D > 35 && Math.random() < 0.0025 && pulses.length < maxPulses) {
            pulses.push({
              x1: p1.screenX, y1: p1.screenY,
              x2: p2.screenX, y2: p2.screenY,
              progress: 0,
              speed: 0.03 + Math.random() * 0.02,
              color: p1.color,
              scale: avgScale
            });
          }
        }
      }
    }

    // Draw Particles with 3D Depth Scaling and Chromatic Halos
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.screenX < -40 || p.screenX > width + 40 || p.screenY < -40 || p.screenY > height + 40) continue;

      const scale = p.projScale;
      const dynamicRadius = Math.max(0.7, p.baseRadius * scale * (0.88 + Math.sin(p.pulse) * 0.22));
      const alpha = Math.min(1, Math.max(0.15, (0.3 + scale * 0.8) * (0.85 + Math.sin(p.pulse) * 0.15)));

      // Foreground Particle Glowing Halo (for close Z depth particles)
      if (p.z < 450) {
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, dynamicRadius * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.22})`;
        ctx.fill();
      }

      // Particle Solid Core
      ctx.beginPath();
      ctx.arc(p.screenX, p.screenY, dynamicRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
      ctx.fill();
    }

    // =========================================================================
    // LAYER 4: TRAVELING NEURAL ENERGY PULSES
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
      const pAlpha = Math.sin(pulse.progress * Math.PI) * 0.95;
      const pRadius = (2.2 + pulse.scale * 2.0);

      ctx.beginPath();
      ctx.arc(px, py, pRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pulse.color.r}, ${pulse.color.g}, ${pulse.color.b}, ${pAlpha})`;
      ctx.shadowColor = `rgba(${pulse.color.r}, ${pulse.color.g}, ${pulse.color.b}, 0.85)`;
      ctx.shadowBlur = 10 * pulse.scale;
      ctx.fill();
      ctx.shadowBlur = 0;
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
