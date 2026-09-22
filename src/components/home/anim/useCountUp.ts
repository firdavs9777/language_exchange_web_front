import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./useInView";

/**
 * Animates 0 -> target with an ease-out curve, for the stat strip.
 *
 * Under reduced motion it returns the target on the first render and never
 * animates — a number ticking upward is exactly the kind of motion that rule
 * exists to suppress.
 */
export function useCountUp(
  target: number,
  opts: { durationMs?: number; start?: boolean } = {}
): number {
  const { durationMs = 1200, start = true } = opts;
  const reduced = prefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const frame = useRef<number>();

  useEffect(() => {
    if (reduced || !start) {
      setValue(target);
      return;
    }

    const began = Date.now();
    const tick = () => {
      const elapsed = Date.now() - began;
      const t = Math.min(1, elapsed / durationMs);
      // easeOutCubic — fast start, settles rather than stopping dead.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame.current = window.requestAnimationFrame(tick);
    };

    frame.current = window.requestAnimationFrame(tick);
    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs, start, reduced]);

  return value;
}
