"use client";
import { useEffect, useRef, useState } from "react";

interface Options {
  /** Root margin for IntersectionObserver (default: "0px 0px -40px 0px") */
  rootMargin?: string;
  /** Threshold to trigger (default: 0.12) */
  threshold?: number;
  /** Only trigger once (default: true) */
  once?: boolean;
}

/**
 * Returns a ref to attach to a container, and a boolean `visible` that
 * becomes true once the element enters the viewport.
 *
 * Respects `prefers-reduced-motion` — when the user has asked for reduced
 * motion, `visible` is always true immediately (no animation).
 */
export function useScrollAnimation(opts: Options = {}) {
  const {
    rootMargin = "0px 0px -40px 0px",
    threshold = 0.12,
    once = true,
  } = opts;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Respect reduced-motion preference — skip animation
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, visible };
}

/**
 * Convenience hook that returns className strings for fade-in-up animation.
 * Use on a wrapper div — children with `data-stagger-child` will animate in sequence.
 */
export function useFadeIn(opts: Options = {}) {
  const { ref, visible } = useScrollAnimation(opts);
  return {
    ref,
    className: visible ? "animate-fade-in-up" : "opacity-0 translate-y-4",
  };
}
