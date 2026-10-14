import { useEffect } from 'react';

export function scrollProgress(scrollTop, scrollHeight, viewportHeight) {
  const distance = scrollHeight - viewportHeight;
  return distance > 0 ? Math.max(0, Math.min(1, scrollTop / distance)) : 0;
}

export function processProgress(top, height, viewportHeight) {
  return Math.max(0, Math.min(1, (viewportHeight * 0.8 - top) / Math.max(height, 1)));
}

export default function useLandingMotion(pageRef, active, enabled) {
  useEffect(() => {
    if (!active) return undefined;
    const page = pageRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const hero = page.querySelector('.landing-hero');
    const steps = page.querySelector('.process-steps');
    let frame;
    let reveals;
    let heroObserver;
    let running = false;

    const paint = () => {
      frame = null;
      if (!running || document.hidden) return;
      const progress = scrollProgress(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
      const heroTop = hero.getBoundingClientRect().top;
      const stepBounds = steps.getBoundingClientRect();
      page.style.setProperty('--page-progress', progress);
      page.style.setProperty('--scene-shift', `${Math.max(-36, Math.min(0, heroTop * 0.055))}px`);
      page.style.setProperty('--process-progress', processProgress(stepBounds.top, stepBounds.height, window.innerHeight));
    };

    const queuePaint = () => {
      if (running && frame == null && !document.hidden) frame = requestAnimationFrame(paint);
    };

    const configure = () => {
      cancelAnimationFrame(frame);
      frame = null;
      reveals?.disconnect();
      heroObserver?.disconnect();
      running = enabled && !reduced.matches && !coarse.matches;
      page.dataset.motion = running ? 'running' : 'paused';
      page.classList.remove('reveal-ready');
      page.dataset.heroVisible = 'true';
      if (!running) {
        page.style.setProperty('--scene-shift', '0px');
        page.style.setProperty('--process-progress', '1');
        return;
      }
      if (window.IntersectionObserver) {
        reveals = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              reveals.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12 });
        page.classList.add('reveal-ready');
        page.querySelectorAll('[data-reveal]').forEach((element) => reveals.observe(element));
        heroObserver = new IntersectionObserver(([entry]) => {
          page.dataset.heroVisible = String(entry.isIntersecting);
        });
        heroObserver.observe(hero);
      }
      queuePaint();
    };

    const visibilityChanged = () => {
      page.dataset.pageHidden = String(document.hidden);
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = null;
      } else queuePaint();
    };
    configure();
    visibilityChanged();
    reduced.addEventListener('change', configure);
    coarse.addEventListener('change', configure);
    window.addEventListener('scroll', queuePaint, { passive: true });
    window.addEventListener('resize', queuePaint);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      cancelAnimationFrame(frame);
      reveals?.disconnect();
      heroObserver?.disconnect();
      page.classList.remove('reveal-ready');
      reduced.removeEventListener('change', configure);
      coarse.removeEventListener('change', configure);
      window.removeEventListener('scroll', queuePaint);
      window.removeEventListener('resize', queuePaint);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [pageRef, active, enabled]);
}
