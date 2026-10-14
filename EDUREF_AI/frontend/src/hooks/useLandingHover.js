import { useEffect } from 'react';

export function hoverPosition(bounds, clientX, clientY) {
  const x = Math.max(0, Math.min(1, (clientX - bounds.left) / Math.max(bounds.width, 1)));
  const y = Math.max(0, Math.min(1, (clientY - bounds.top) / Math.max(bounds.height, 1)));
  return { rotateX: (0.5 - y) * 8, rotateY: (x - 0.5) * 8 };
}

export default function useLandingHover(pageRef, active, enabled) {
  useEffect(() => {
    if (!active || !enabled) return undefined;
    const page = pageRef.current;
    const preference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let target = null;
    let bounds;
    let point;
    let frame = null;

    const reset = () => {
      cancelAnimationFrame(frame);
      frame = null;
      if (target) {
        target.classList.remove('is-pointer-active');
        ['--hover-rotate-x', '--hover-rotate-y'].forEach((property) => target.style.removeProperty(property));
      }
      target = null;
    };

    const hasSelection = () => Boolean(window.getSelection()?.toString());
    const paint = () => {
      frame = null;
      if (!target || document.hidden || !preference.matches || hasSelection()) {
        reset();
        return;
      }
      const position = hoverPosition(bounds, point.x, point.y);
      target.style.setProperty('--hover-rotate-x', `${position.rotateX}deg`);
      target.style.setProperty('--hover-rotate-y', `${position.rotateY}deg`);
    };

    const move = (event) => {
      const next = event.target.closest?.('[data-hover-depth]');
      if (!next || !page.contains(next) || event.pointerType === 'touch' || document.hidden || !preference.matches || hasSelection()) {
        reset();
        return;
      }
      if (next !== target) {
        reset();
        target = next;
        bounds = next.getBoundingClientRect();
        target.classList.add('is-pointer-active');
      }
      point = { x: event.clientX, y: event.clientY };
      if (frame == null) frame = requestAnimationFrame(paint);
    };
    const leave = (event) => {
      if (target && !target.contains(event.relatedTarget)) reset();
    };

    page.addEventListener('pointermove', move, { passive: true });
    page.addEventListener('pointerout', leave);
    page.addEventListener('focusin', reset);
    preference.addEventListener('change', reset);
    window.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('resize', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      reset();
      page.removeEventListener('pointermove', move);
      page.removeEventListener('pointerout', leave);
      page.removeEventListener('focusin', reset);
      preference.removeEventListener('change', reset);
      window.removeEventListener('scroll', reset);
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [pageRef, active, enabled]);
}
