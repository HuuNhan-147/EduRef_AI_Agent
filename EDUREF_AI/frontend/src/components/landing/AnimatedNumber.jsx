import { useEffect, useRef } from 'react';

export function countAtProgress(target, progress) {
  const bounded = Math.max(0, Math.min(1, progress));
  return Math.round(target * (1 - (1 - bounded) ** 3));
}

export default function AnimatedNumber({ value, motionEnabled, duration = 1150 }) {
  const numberRef = useRef(null);
  const playedRef = useRef(false);
  const formatted = String(value).padStart(2, '0');

  useEffect(() => {
    const element = numberRef.current;
    let frame;
    let cancelled = false;
    const finish = () => { element.textContent = formatted; };
    if (!motionEnabled || playedRef.current
      || window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches
      || !window.IntersectionObserver) {
      finish();
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      if (cancelled) return;
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      playedRef.current = true;
      let startedAt;
      let displayed;
      const tick = (time) => {
        if (cancelled) return;
        startedAt ??= time;
        const progress = (time - startedAt) / duration;
        const next = countAtProgress(value, progress);
        if (next !== displayed) element.textContent = String(next).padStart(2, '0');
        displayed = next;
        if (progress < 1) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.65 });
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      finish();
    };
  }, [value, duration, formatted, motionEnabled]);

  return (
    <span className="animated-number">
      <span className="sr-only">{value}</span>
      <span ref={numberRef} aria-hidden="true" data-counter-target={value}>{formatted}</span>
    </span>
  );
}
