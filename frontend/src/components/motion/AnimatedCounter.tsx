/**
 * AnimatedCounter — counts up when scrolled into view (premium stat tiles).
 * On reduced motion it renders the final value instantly (no count animation),
 * and trust-critical numbers should always render final values (spec §13).
 */
import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EASE } from "@/lib/motion";

export function AnimatedCounter({
  value, suffix = "", prefix = "", duration = 1.4,
}: { value: number; suffix?: string; prefix?: string; duration?: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setDisplay(value); return; }
    const controls = animate(0, value, {
      duration,
      ease: EASE.out,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  const formatted = display >= 1000 ? Math.round(display).toLocaleString() : display.toFixed(display % 1 ? 1 : 0);
  return (
    <span ref={ref} className="tabular">
      {prefix}{formatted}{suffix}
    </span>
  );
}
