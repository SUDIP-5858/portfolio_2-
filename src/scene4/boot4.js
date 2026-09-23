// Scene four's lifecycle: rebuild the reference as living layers, then run
// the assembly. The environment is canvas (gallery.js); the twelve project
// cards are DOM buttons wearing sprites cut from the reference itself; the
// figure is the reference's own pixels, matted. Everything is placed through
// one fitCover() mapping, so the layers agree to the pixel.
//
// Interaction model:
//   pointer  -> a damped -1..1 pair; the deck yaws a couple of degrees, each
//               card drifts by its depth (near flanks move most, the far row
//               least), the figure counters gently, the plate slides opposite
//   hover    -> the card lifts toward the camera; its siblings ease back
//   scroll   -> past the intro, the whole universe dollies subtly toward you

import { createGL } from '../gl/renderer.js';
import { Gallery } from './gallery.js';
import { CARDS, PERSON, PORTRAIT, fitCover } from './layout4.js';
import { sample4, cardIn, popEase, T4 } from './timeline4.js';

const damp = (v, to, k, dt) => v + (to - v) * (1 - Math.exp(-k * dt));

export async function initGallery() {
  const section = document.getElementById('gallery');
  const canvas = document.getElementById('galleryStage');
  const deck = document.getElementById('galleryDeck');
  const person = document.getElementById('galleryPerson');
  if (!section || !canvas || !deck || !person) return null;

  const gl = createGL(canvas);
  if (!gl) {
    section.classList.add('is-fallback', 'is-set');
    return null;
  }
  const gallery = new Gallery(canvas, gl);
  await gallery.load();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const labels = [...section.querySelectorAll('.g-label')];
  const num = document.getElementById('galleryNum');

  // ---- cards ---------------------------------------------------------------
  // far row surfaces first: entrance order is depth-sorted, back to front
  const order = CARDS.map((c, i) => i)
    .sort((a, b) => CARDS[b].depth - CARDS[a].depth);
  const rank = [];
  order.forEach((ci, k) => { rank[ci] = k; });

  const cards = CARDS.map((c, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'g-card';
    el.dataset.i = String(i);
    el.setAttribute('aria-label', `Project — ${c.title}`);
    el.style.setProperty('--tint',
      `rgba(${c.tint.map((v, k) => k < 3 ? Math.round(v * 255) : v)}, 0.5)`);
    el.style.zIndex = String(10 + Math.round((1 - c.depth) * 20));
    el.style.setProperty('--i', String(i));   // float dephasing
    el.innerHTML = `<span class="g-card__in">`
      + `<img src="public/projects/${c.id}.png" alt="" `
      + `draggable="false" loading="eager" decoding="async">`
      + `<span class="g-card__title-overlay">${c.title.replace('\n', ' ')}</span></span>`;
    deck.appendChild(el);
    return el;
  });
  person.style.zIndex = '34';

  // ---- placement -----------------------------------------------------------
  let portrait = false;
  function place() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const f = gallery.resize(w, h, dpr);
    portrait = w / h < 0.75;
    section.classList.toggle('is-portrait', portrait);

    for (let i = 0; i < cards.length; i++) {
      const c = CARDS[i];
      const el = cards[i];
      if (portrait) {
        const p = PORTRAIT.get(i);
        if (!p) { el.style.display = 'none'; continue; }
        el.style.display = '';
        const cw = p.w * w;
        el.style.width = `${cw}px`;
        el.style.left = `${p.cx * w - cw / 2}px`;
        el.style.top = `${p.cy * h - (cw * c.box[3] / c.box[2]) / 2}px`;
      } else {
        el.style.display = '';
        el.style.width = `${c.box[2] * f.s}px`;
        el.style.left = `${c.box[0] * f.s + f.ox}px`;
        el.style.top = `${c.box[1] * f.s + f.oy}px`;
      }
    }

    // the red 01 belongs to the composition, not the viewport corners: it
    // rides just over the hero screen's top-left, where the reference puts it
    if (num && !portrait) {
      num.style.left = `${588 * f.s + f.ox}px`;
      num.style.top = `${46 * f.s + f.oy}px`;
      num.style.fontSize = `${Math.max(10, 15 * f.s)}px`;
    }

    // The figure keeps the plate's own cover mapping in EVERY orientation:
    // he must sit exactly over the hole the extractor filled behind him, or
    // the fill's soft edge reads as a box around his silhouette.
    person.style.width = `${PERSON.w * f.s}px`;
    person.style.left = `${PERSON.x * f.s + f.ox}px`;
    person.style.top = `${PERSON.y * f.s + f.oy}px`;
  }
  place();
  let resizeId;
  window.addEventListener('resize', () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(place, 140);
  });

  // ---- pointer -------------------------------------------------------------
  const ptr = { tx: 0, ty: 0, x: 0, y: 0, inside: false };
  section.addEventListener('pointermove', (e) => {
    const r = section.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    ptr.inside = true;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { ptr.inside = false; });

  // hover: the deck learns something is hot so siblings can ease back
  deck.addEventListener('pointerover', (e) => {
    if (e.target.closest('.g-card')) deck.classList.add('is-hot');
  });
  deck.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.g-card')) {
      deck.classList.remove('is-hot');
    }
  });

  // ---- the clock -----------------------------------------------------------
  const state = { started: 0, running: false, visible: false, raf: 0, last: 0, set: false };

  const frame = (now) => {
    if (!state.running) return;
    const dt = Math.min(0.05, (now - state.last) / 1000 || 0.016);
    state.last = now;
    const t = reduced ? T4.live + 2 : (now - state.started) / 1000;
    const s = sample4(t);

    // scroll dolly: progress of the pin through its extra scroll room
    const r = section.getBoundingClientRect();
    const room = section.offsetHeight - window.innerHeight;
    const sp = room > 4 ? Math.min(1, Math.max(0, -r.top / room)) : 0;

    ptr.x = damp(ptr.x, ptr.inside ? ptr.tx : 0, 2.8, dt);
    ptr.y = damp(ptr.y, ptr.inside ? ptr.ty : 0, 2.8, dt);
    gallery.par.x = ptr.x;
    gallery.par.y = ptr.y;
    gallery.dolly = sp;
    gallery.render(t, s);

    // the deck yaws with the pointer - the "looking around the room" degree
    const live = s.live ? 1 : 0;
    deck.style.transform =
      `rotateY(${(ptr.x * 2.1 * live).toFixed(3)}deg) `
      + `rotateX(${(-ptr.y * 1.4 * live).toFixed(3)}deg) `
      + `scale(${(1 + sp * 0.045).toFixed(4)})`;

    for (let i = 0; i < cards.length; i++) {
      if (portrait && !PORTRAIT.get(i)) continue;
      const el = cards[i];
      const d = CARDS[i].depth;
      const e = popEase(cardIn(s.deck, rank[i], cards.length));
      const rise = (1 - e) * (0.42 * window.innerHeight);
      const str = (6 + (1 - d) * 26) * live;
      const tx = ptr.x * str;
      const ty = ptr.y * str * 0.55;
      el.style.transform =
        `translate3d(${tx.toFixed(2)}px, ${(ty + rise).toFixed(2)}px, 0) `
        + `rotateX(${((1 - e) * -24).toFixed(2)}deg) `
        + `rotateZ(${((1 - e) * (i % 2 ? 3.5 : -3.5)).toFixed(2)}deg) `
        + `scale(${(0.84 + e * 0.16).toFixed(4)})`;
      const op = Math.min(1, Math.max(0, e * 2.4));
      el.style.opacity = op.toFixed(3);
      // blur -> sharp is part of the pop; cleared once settled so hover and
      // floating never pay for a live filter
      if (e < 0.995) {
        el.style.filter = `blur(${((1 - Math.min(1, e)) * 7).toFixed(2)}px)`;
      } else if (el.style.filter) {
        el.style.filter = '';
      }
    }

    // the figure: rises into the light after his gallery is mostly up
    const pe = s.person;
    person.style.transform =
      `translate3d(${(ptr.x * -9 * live).toFixed(2)}px, `
      + `${(ptr.y * -5 * live + (1 - pe) * 34).toFixed(2)}px, 40px) `
      + `rotateX(${(-ptr.y * 8 * live).toFixed(2)}deg) `
      + `rotateY(${(ptr.x * 12 * live).toFixed(2)}deg) `
      + `scale(${(0.985 + pe * 0.015 + sp * 0.03).toFixed(4)})`;
    person.style.opacity = pe.toFixed(3);

    if (s.labels > 0 && !state.set) {
      state.set = true;
      section.classList.add('is-labels');
    }
    if (s.live) section.classList.add('is-live');

    state.raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (state.running) return;
    state.running = true;
    state.last = performance.now();
    if (!state.started) state.started = performance.now();
    state.raf = requestAnimationFrame(frame);
  };
  const stop = () => { state.running = false; cancelAnimationFrame(state.raf); };

  new IntersectionObserver((entries) => {
    for (const e of entries) {
      state.visible = e.isIntersecting;
      if (e.isIntersecting) start(); else stop();
    }
  }, { threshold: 0.22 }).observe(section);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else if (state.visible) start();
  });

  labels.forEach((el, i) => el.style.setProperty('--li', String(i)));

  // ---- project detail panel ------------------------------------------------
  // Only the first four cards are real projects (p01–p04); the remaining eight
  // are decorative room-dressing cards and stay as visual-only elements.
  const REAL_CARD_COUNT = 4;

  const projects = (() => {
    try {
      const el = document.getElementById('projectData');
      return el ? JSON.parse(el.textContent) : [];
    } catch { return []; }
  })();

  const backdrop = document.getElementById('projBackdrop');
  const panel    = document.getElementById('projPanel');
  const closeBtn = document.getElementById('projPanelClose');

  if (backdrop && panel && projects.length) {
    const numEl      = document.getElementById('projPanelNum');
    const tagEl      = document.getElementById('projPanelTag');
    const titleEl    = document.getElementById('projPanelTitle');
    const descEl     = document.getElementById('projPanelDesc');
    const problemWrap= document.getElementById('projPanelProblemWrap');
    const problemEl  = document.getElementById('projPanelProblem');
    const solutionWrap= document.getElementById('projPanelSolutionWrap');
    const solutionEl = document.getElementById('projPanelSolution');
    const metricsWrap= document.getElementById('projPanelMetricsWrap');
    const metricsEl  = document.getElementById('projPanelMetrics');
    const featsWrap  = document.getElementById('projPanelFeaturesWrap');
    const featsEl    = document.getElementById('projPanelFeatures');
    const aimlWrap   = document.getElementById('projPanelAIMLWrap');
    const aimlEl     = document.getElementById('projPanelAIML');
    const stackWrap  = document.getElementById('projPanelStackWrap');
    const stackEl    = document.getElementById('projPanelStack');
    const linksEl    = document.getElementById('projPanelLinks');
    const pipelineWrap = document.getElementById('projPanelPipelineWrap');
    const pipelineEl   = document.getElementById('projPanelPipeline');

    function openPanel(data) {
      if (!data) return;
      if (numEl)   numEl.textContent   = data.num || '';
      if (tagEl)   tagEl.textContent   = data.tag || '';
      if (titleEl) titleEl.innerHTML   = (data.title || '').replace(/\n/g, '<br>');
      if (descEl)  descEl.textContent  = data.desc || '';

      if (problemWrap && problemEl) {
        if (data.problem) { problemEl.textContent = data.problem; problemWrap.style.display = 'block'; }
        else { problemWrap.style.display = 'none'; }
      }
      if (solutionWrap && solutionEl) {
        if (data.solution) { solutionEl.textContent = data.solution; solutionWrap.style.display = 'block'; }
        else { solutionWrap.style.display = 'none'; }
      }
      if (metricsWrap && metricsEl) {
        if (data.metrics && data.metrics.length) {
          metricsEl.innerHTML = data.metrics.map(m => `<li>${m}</li>`).join('');
          metricsWrap.style.display = 'block';
        } else { metricsWrap.style.display = 'none'; }
      }
      if (featsWrap && featsEl) {
        if (data.features && data.features.length) {
          featsEl.innerHTML = data.features.map(f => `<li>${f}</li>`).join('');
          featsWrap.style.display = 'block';
        } else { featsWrap.style.display = 'none'; }
      }
      if (pipelineWrap && pipelineEl) {
        if (data.pipeline && data.pipeline.length) {
          pipelineEl.innerHTML = data.pipeline.map((step, i) =>
            `<span class="proj-panel__pipe-step">${step}</span>${i < data.pipeline.length - 1 ? '<span class="proj-panel__pipe-arrow">→</span>' : ''}`
          ).join('');
          pipelineWrap.style.display = 'block';
        } else { pipelineWrap.style.display = 'none'; }
      }
      if (aimlWrap && aimlEl) {
        if (data.aiml) { aimlEl.textContent = data.aiml; aimlWrap.style.display = 'block'; }
        else { aimlWrap.style.display = 'none'; }
      }
      if (stackWrap && stackEl) {
        if (data.stack && data.stack.length) {
          stackEl.innerHTML = data.stack.map(s => `<span class="proj-panel__pill">${s}</span>`).join('');
          stackWrap.style.display = 'block';
        } else { stackWrap.style.display = 'none'; }
      }

      if (linksEl) {
        linksEl.innerHTML = '';
        if (data.github) {
          const a = document.createElement('a');
          a.href      = data.github;
          a.target    = '_blank';
          a.rel       = 'noopener noreferrer';
          a.className = 'proj-panel__link proj-panel__link--primary';
          a.textContent = 'View on GitHub';
          linksEl.appendChild(a);
        }
      }

      backdrop.classList.add('is-open');
      backdrop.removeAttribute('aria-hidden');
      panel.setAttribute('tabindex', '-1');
      document.body.style.overflow = 'hidden';
      // move focus into the panel for accessibility
      requestAnimationFrame(() => { closeBtn && closeBtn.focus(); });
    }

    function closePanel() {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    // wire real cards (0–3)
    cards.forEach((el, i) => {
      if (i >= REAL_CARD_COUNT) return;
      el.addEventListener('click', () => openPanel(projects[i]));
      // visual hint that this card is interactive (cursor is already pointer)
      el.title = projects[i]?.title?.replace(/\n/g, ' — ') || '';
      
      // subtle 3D hover effect logic
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        // Calculate pointer position from -1 to 1 across the card
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        const inner = el.querySelector('.g-card__in');
        if (inner) {
          // Tilt max 8 degrees. translateZ already pushed in CSS, here we override to include rotations
          inner.style.transform = `translateZ(30px) scale(1.022) rotateX(${y * -8}deg) rotateY(${x * 8}deg)`;
        }
      });
      el.addEventListener('mouseleave', () => {
        const inner = el.querySelector('.g-card__in');
        if (inner) {
          // Clear inline transform to allow CSS transition back to resting state
          inner.style.transform = '';
        }
      });
    });

    // close on button, backdrop click, or ESC
    closeBtn && closeBtn.addEventListener('click', closePanel);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closePanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closePanel();
    });
  }

  // review hook: canvas only (the cards are DOM; screenshot the pane for those)
  window.__shot4 = async (name = 'gallery', at = null) => {
    const t = at !== null ? at : (performance.now() - state.started) / 1000;
    gallery.render(t, sample4(t));
    const url = canvas.toDataURL('image/png');
    await fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: url });
    return `${canvas.width}x${canvas.height} @ t=${t.toFixed(2)}`;
  };
  window.__gallery = { gallery, state, section };

  return { gallery, section };
}

