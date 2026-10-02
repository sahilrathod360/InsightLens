// Brand New Landing Page V2 Interactive Logic

import { navigateTo } from '../state.js';

let landingCleanupFns = [];

export function setupLandingPageEvents() {
  // Cleanup previous listeners if called multiple times
  landingCleanupFns.forEach(fn => fn());
  landingCleanupFns = [];

  const startBtn = document.getElementById('hero-start-btn');
  if (startBtn) {
    const startHandler = () => navigateTo('desk');
    startBtn.addEventListener('click', startHandler);
    landingCleanupFns.push(() => startBtn.removeEventListener('click', startHandler));
  }

  const demoBtn = document.getElementById('hero-demo-btn');
  if (demoBtn) {
    const demoHandler = () => document.getElementById('landing-demo-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    demoBtn.addEventListener('click', demoHandler);
    landingCleanupFns.push(() => demoBtn.removeEventListener('click', demoHandler));
  }

  document.querySelectorAll('.landing-demo-card').forEach(card => {
    const cardHandler = () => {
      const sampleType = card.getAttribute('data-sample-type');
      const imgMap = {
        urban: '/images/urban-analysis.jpg',
        mountain: '/images/mountain-analysis.jpg',
        milkyway: '/images/milky-way-analysis.jpg',
        comet: '/images/comet-analysis.jpg'
      };
      const nameMap = {
        urban: 'urban_scene_analysis.jpg',
        mountain: 'mountain_landscape_observation.jpg',
        milkyway: 'milky_way_astronomical_imaging.jpg',
        comet: 'comet_deep_space_analysis.jpg'
      };
      const imgSrc = imgMap[sampleType] || imgMap.urban;
      const fileName = nameMap[sampleType] || 'sample_visual.jpg';
      
      navigateTo('desk');
      
      const stageImg = document.getElementById('stage-image');
      if (stageImg) stageImg.src = imgSrc;
      
      const uploadArea = document.getElementById('upload-drop-area');
      const imageStage = document.getElementById('image-stage');
      
      if (uploadArea && imageStage) {
        uploadArea.classList.add('hidden');
        imageStage.classList.remove('hidden');
      }
      
      const infoFilename = document.getElementById('info-filename');
      const infoFilesize = document.getElementById('info-filesize');
      if (infoFilename) infoFilename.textContent = fileName;
      if (infoFilesize) infoFilesize.textContent = 'Ready';
    };
    card.addEventListener('click', cardHandler);
    landingCleanupFns.push(() => card.removeEventListener('click', cardHandler));
  });

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  setupScrollReveal(prefersReducedMotion);
  if (!prefersReducedMotion) {
    setupNumberCounters();
    setupMouseParallax();
    setupAmbientParticles();
  }
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
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
  landingCleanupFns.push(() => observer.disconnect());
}

function setupNumberCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const targetText = el.getAttribute('data-target') || '0';
        const targetVal = parseFloat(targetText);
        const hasDecimals = targetText.includes('.');
        const suffix = targetText.replace(/[\d.]/g, '');
        
        let startTimestamp = null;
        const duration = 1500;
        
        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          // easeOutQuart
          const easeOut = 1 - Math.pow(1 - progress, 4);
          const current = easeOut * targetVal;
          
          el.textContent = (hasDecimals ? current.toFixed(1) : Math.floor(current)) + suffix;
          
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = targetText; // Ensure exact final value
          }
        };
        
        requestAnimationFrame(step);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.counter-value').forEach(el => observer.observe(el));
  landingCleanupFns.push(() => observer.disconnect());
}

function setupMouseParallax() {
  const hero = document.getElementById('landing-hero');
  if (!hero) return;

  const layers = document.querySelectorAll('.parallax-layer');
  if (layers.length === 0) return;

  const handleMouseMove = (e) => {
    // Calculate mouse position relative to center (-1 to 1)
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    layers.forEach(layer => {
      const speed = parseFloat(layer.getAttribute('data-parallax-speed')) || 20;
      layer.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
    });
  };

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  landingCleanupFns.push(() => window.removeEventListener('mousemove', handleMouseMove));
}

function setupAmbientParticles() {
  const container = document.querySelector('.landing-bg-container');
  if (!container) return;
  
  // Clean up old particles if they exist
  container.querySelectorAll('.ambient-particle').forEach(p => p.remove());

  const numParticles = 12;
  const colors = ['rgba(249, 115, 22, 0.4)', 'rgba(251, 146, 60, 0.4)', 'rgba(251, 113, 133, 0.4)'];
  
  for (let i = 0; i < numParticles; i++) {
    const particle = document.createElement('div');
    particle.className = 'ambient-particle';
    
    // Randomize properties
    const size = Math.random() * 4 + 2;
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const animDuration = Math.random() * 10 + 10;
    const animDelay = Math.random() * -20; // Start at random point in animation
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${left}%`;
    particle.style.top = `${top}%`;
    particle.style.color = color;
    particle.style.animationDuration = `${animDuration}s`;
    particle.style.animationDelay = `${animDelay}s`;
    
    container.appendChild(particle);
  }
}
