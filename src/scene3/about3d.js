import { damp, clamp, smoothstep } from '../lib/ease.js';

export function initAbout3D() {
  console.log('[about3d] Initializing...');
  // We reuse the id to preserve scrollspy, but attach to the new wrapper
  const section = document.getElementById('chrono'); 
  const wrapper = document.querySelector('.about-3d');
  const stage = document.querySelector('.about-3d__stage');
  const scene = document.querySelector('.about-3d__scene');
  const acts = document.querySelectorAll('.about-3d__act');
  const progressLine = document.querySelector('.about-3d__progress-line');
  
  if (!wrapper || !stage || !scene || acts.length === 0) {
    console.warn('[about3d] Missing elements:', { wrapper, stage, scene, acts: acts.length });
    return null;
  }
  console.log('[about3d] Elements found. Registering observer...');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarseMQ = matchMedia('(pointer: coarse)');

  const state = {
    running: false,
    visible: false,
    raf: 0,
    last: 0,
    progress: 0,
    targetProgress: 0,
    pointer: { x: 0, y: 0, tx: 0, ty: 0 }
  };

  function place() {
    if (reduced) return;
  }
  place();

  let resizeId;
  window.addEventListener('resize', () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(place, 140);
  });

  // ---- Pointer Parallax ----
  wrapper.addEventListener('pointermove', (e) => {
    if (coarseMQ.matches || reduced) return;
    const r = stage.getBoundingClientRect();
    state.pointer.tx = (e.clientX - r.left) / r.width * 2 - 1;
    state.pointer.ty = (e.clientY - r.top) / r.height * 2 - 1;
  }, { passive: true });

  wrapper.addEventListener('pointerleave', () => {
    state.pointer.tx = 0;
    state.pointer.ty = 0;
  });

  // ---- Scroll Progress ----
  function updateScroll() {
    if (!state.visible) return;
    const r = wrapper.getBoundingClientRect();
    const totalScroll = r.height - window.innerHeight;
    if (totalScroll <= 0) return;
    
    const scrollPos = Math.max(0, -r.top);
    state.targetProgress = clamp(scrollPos / totalScroll, 0, 1);
  }
  
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // ---- Render Loop ----
  const frame = (now) => {
    if (!state.running) return;
    const dt = Math.min(0.05, (now - state.last) / 1000 || 0.016);
    state.last = now;

    if (!reduced) {
      state.progress = damp(state.progress, state.targetProgress, 6.0, dt);
      
      const p = state.pointer;
      p.x = damp(p.x, p.tx, 4.0, dt);
      p.y = damp(p.y, p.ty, 4.0, dt);

      const maxRot = coarseMQ.matches ? 0.5 : 2.5; 
      const rotX = -p.y * maxRot;
      const rotY = p.x * maxRot;
      
      // Scene slightly advances over the entire scroll
      const sceneZ = state.progress * 150; 
      
      scene.style.transform = `translateZ(${sceneZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

      if (progressLine) {
        progressLine.style.transform = `scaleY(${state.progress})`;
      }

      const totalActs = acts.length;
      const actDuration = 1 / totalActs;

      acts.forEach((act, i) => {
        const actStart = i * actDuration;
        const actEnd = (i + 1) * actDuration;
        
        const center = actStart + (actDuration * 0.5);
        // Reduce the denominator so distance reaches 1.0 faster (meaning it fades out completely before the next act)
        const distance = (state.progress - center) / (actDuration * 0.45); 
        
        // Push items from back (negative Z) to front (positive Z)
        // Adjust the scale to match the perspective (1200px)
        const zOffset = -(distance * 1400); 
        
        let alpha = 0;
        if (distance > -1 && distance < 1) {
          alpha = 1 - Math.abs(distance);
          // Make the fade sharper
          alpha = smoothstep(0, 1, alpha * 2.0);
        }

        act.style.setProperty('--z', `${zOffset}px`);
        act.style.setProperty('--alpha', alpha.toFixed(3));
        
        // Add subtle rotation to the acts based on progress for more depth
        const rotOffset = distance * 5; 
        act.style.setProperty('--rx', `${rotOffset}deg`);
        
        if (alpha > 0.01) {
          act.style.visibility = 'visible';
          act.classList.add('is-active');
        } else {
          act.style.visibility = 'hidden';
          act.classList.remove('is-active');
        }
      });
    }

    state.raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (state.running) return;
    state.running = true;
    state.last = performance.now();
    updateScroll();
    state.progress = state.targetProgress;
    state.raf = requestAnimationFrame(frame);
  };

  const stop = () => { 
    state.running = false; 
    cancelAnimationFrame(state.raf); 
  };

  new IntersectionObserver((entries) => {
    for (const e of entries) {
      state.visible = e.isIntersecting;
      if (e.isIntersecting) start(); else stop();
    }
  }, { threshold: 0.0 }).observe(wrapper);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else if (state.visible) start();
  });

  return { wrapper, start, stop };
}
