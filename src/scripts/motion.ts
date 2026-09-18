// Central motion controller: reveal, story stagger, cover scroll.
// One owner per animation. Progressive enhancement: content is visible
// by default; `html.js` enables hidden states (see global.css).

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function showAll(): void {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
  document.querySelectorAll('.story-row').forEach((el) => el.classList.add('visible'));
}

function initReveals(motionOK: () => boolean): IntersectionObserver | null {
  const revealElements = document.querySelectorAll('.reveal');
  if (!revealElements.length) return null;

  // Immediately show elements already in viewport for fast first paint.
  revealElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('visible');
    }
  });

  // Bidirectional reveal: transitions retarget mid-motion so reversals stay smooth.
  const observer = new IntersectionObserver(
    (entries) => {
      if (!motionOK()) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
        else entry.target.classList.remove('visible');
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
  );
  revealElements.forEach((el) => observer.observe(el));
  return observer;
}

function initStoryRows(motionOK: () => boolean): IntersectionObserver | null {
  const storyRows = document.querySelectorAll('.story-row');
  if (!storyRows.length) return null;

  const storyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          // Entry-only stagger: delay on enter, instant on exit.
          const index = Number(target.dataset.storyIndex ?? 0);
          target.style.transitionDelay = `${Math.min(index, 4) * 80}ms`;
          if (motionOK()) target.classList.add('visible');
          else target.classList.add('visible');
        } else {
          target.style.transitionDelay = '0ms';
          if (motionOK()) target.classList.remove('visible');
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -30px 0px' },
  );

  storyRows.forEach((el, i) => {
    (el as HTMLElement).dataset.storyIndex = String(i);
    storyObserver.observe(el);
  });
  return storyObserver;
}

function initCoverScroll(motionOK: () => boolean): (() => void) | null {
  const cover = document.querySelector('.cover') as HTMLElement | null;
  const coverInner = document.querySelector('.cover-inner') as HTMLElement | null;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = window.innerWidth <= 768;
  if (!cover || !coverInner || coarsePointer || smallScreen) return null;

  const coverTitle = document.querySelector('.cover-title') as HTMLElement | null;
  const coverBrand = document.querySelector('.cover-brand') as HTMLElement | null;
  const coverSubtitle = document.querySelector('.cover-subtitle') as HTMLElement | null;

  let ticking = false;
  // letter-spacing triggers layout on every write; only touch it when the
  // factor moved enough to be visible. Opacity/transform stay per-frame
  // (compositor-only).
  let lastExpand = -1;
  const update = () => {
    ticking = false;
    if (!motionOK()) {
      coverInner.style.opacity = '';
      coverInner.style.transform = '';
      if (coverTitle) coverTitle.style.letterSpacing = '';
      if (coverBrand) coverBrand.style.letterSpacing = '';
      if (coverSubtitle) coverSubtitle.style.letterSpacing = '';
      lastExpand = -1;
      return;
    }
    const scrollY = window.scrollY;
    const fadeEnd = window.innerHeight * 0.5;
    const opacity = Math.max(0, 1 - scrollY / fadeEnd);
    coverInner.style.opacity = String(opacity);
    coverInner.style.transform = `translateY(${scrollY * 0.3}px)`;
    const expandFactor = Math.min(1, Math.max(0, scrollY / window.innerHeight));
    if (Math.abs(expandFactor - lastExpand) < 0.004) return;
    lastExpand = expandFactor;
    if (coverTitle) coverTitle.style.letterSpacing = `${0.04 + expandFactor * 0.26}em`;
    if (coverBrand) coverBrand.style.letterSpacing = `${0.04 + expandFactor * 0.16}em`;
    if (coverSubtitle) coverSubtitle.style.letterSpacing = `${0.18 + expandFactor * 0.17}em`;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}

function initMotion(): void {
  document.documentElement.classList.add('js');
  let motionAllowed = !prefersReduced();

  if (!motionAllowed) {
    showAll();
  }

  const motionOK = () => motionAllowed;

  const revealObserver = motionAllowed ? initReveals(motionOK) : null;
  // Story rows self-assign .visible on entry even in reduced motion.
  const storyObserver = initStoryRows(motionOK);
  if (!motionAllowed) showAll();

  const cleanupCover = motionAllowed ? initCoverScroll(motionOK) : null;

  // Reactive reduced-motion: stop scroll-linked movement if preference changes.
  window
    .matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', (event) => {
      motionAllowed = !event.matches;
      if (!motionAllowed) {
        revealObserver?.disconnect();
        storyObserver?.disconnect();
        cleanupCover?.();
        showAll();
      } else {
        // Re-init on opt-out of reduced motion (rare, keeps behavior correct).
        window.location.reload();
      }
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMotion, { once: true });
} else {
  initMotion();
}
