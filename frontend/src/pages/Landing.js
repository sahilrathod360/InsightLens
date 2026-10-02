// InsightLens — Next-Gen Visual Intelligence Presentation Logic

import { navigateTo } from '../state.js';

let landingCleanupFns = [];

export function setupLandingPageEvents() {
  // Cleanup previous listeners
  landingCleanupFns.forEach(fn => fn());
  landingCleanupFns = [];

  // Hero primary CTA
  const startBtn = document.getElementById('hero-start-btn');
  if (startBtn) {
    const startHandler = () => navigateTo('desk');
    startBtn.addEventListener('click', startHandler);
    landingCleanupFns.push(() => startBtn.removeEventListener('click', startHandler));
  }

  // Hero secondary CTAs
  const liveBtn = document.getElementById('hero-live-btn');
  if (liveBtn) {
    const liveHandler = () => navigateTo('livevision');
    liveBtn.addEventListener('click', liveHandler);
    landingCleanupFns.push(() => liveBtn.removeEventListener('click', liveHandler));
  }

  const compareBtn = document.getElementById('hero-compare-btn');
  if (compareBtn) {
    const compareHandler = () => navigateTo('compare');
    compareBtn.addEventListener('click', compareHandler);
    landingCleanupFns.push(() => compareBtn.removeEventListener('click', compareHandler));
  }

  // Interactive Transformation Pipeline Tabs
  const transformTabs = document.querySelectorAll('.hero-transform-tab');
  const transformStages = document.querySelectorAll('.hero-stage-view');

  transformTabs.forEach(tab => {
    const tabHandler = () => {
      const targetStage = tab.getAttribute('data-stage');
      
      transformTabs.forEach(t => {
        t.classList.remove('active', 'border-indigo-500', 'text-white', 'bg-white/[0.08]');
        t.classList.add('border-transparent', 'text-slate-400', 'hover:text-slate-200');
      });
      tab.classList.add('active', 'border-indigo-500', 'text-white', 'bg-white/[0.08]');
      tab.classList.remove('border-transparent', 'text-slate-400');

      transformStages.forEach(stage => {
        if (stage.getAttribute('data-stage') === targetStage) {
          stage.classList.remove('hidden');
          stage.classList.add('animate-fade-in');
        } else {
          stage.classList.add('hidden');
          stage.classList.remove('animate-fade-in');
        }
      });
    };
    tab.addEventListener('click', tabHandler);
    landingCleanupFns.push(() => tab.removeEventListener('click', tabHandler));
  });

  // Sample Dataset Click Handlers
  document.querySelectorAll('.landing-sample-card, .landing-demo-card').forEach(card => {
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
      if (infoFilesize) infoFilesize.textContent = 'Ready for Analysis';
    };
    card.addEventListener('click', cardHandler);
    landingCleanupFns.push(() => card.removeEventListener('click', cardHandler));
  });

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  setupScrollReveal(prefersReducedMotion);
  if (!prefersReducedMotion) {
    setupNumberCounters();
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
        const duration = 1200;
        
        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 4);
          const current = easeOut * targetVal;
          
          el.textContent = (hasDecimals ? current.toFixed(1) : Math.floor(current)) + suffix;
          
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = targetText;
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
