'use client';

import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Fraction of element visible before triggering (0–1). Default: 0.1 */
  threshold?: number;
  /** Margin around the root. Default: "0px" */
  rootMargin?: string;
  /** Only trigger once, then disconnect the observer. Default: true */
  once?: boolean;
}

/**
 * Lightweight IntersectionObserver hook.
 *
 * Returns a tuple: [ref, isInView]
 *
 * Usage:
 *   const [ref, isInView] = useInView({ threshold: 0.15, once: true });
 *   <h2 ref={ref} className={isInView ? 'animate-fade-in-up' : 'opacity-0'}>…</h2>
 */
export function useInView<T extends Element = HTMLElement>(
  options: UseInViewOptions = {},
): [React.RefObject<T | null>, boolean] {
  const { threshold = 0.1, rootMargin = '0px', once = true } = options;
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If already intersecting on mount (e.g. above the fold), trigger immediately
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isInView];
}
