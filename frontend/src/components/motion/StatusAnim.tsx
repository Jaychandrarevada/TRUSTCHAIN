/**
 * Status animations — the "signature moment" for success, and the single
 * corrective shake for error (MICROINTERACTIONS.md #9 and #175: "one shake,
 * never a bounce loop"; "the one celebration"). Both reduced-motion-safe:
 * SuccessPulse collapses to a plain fade-in, ErrorShake collapses to no
 * motion at all — the error message/red border alone still carries the
 * meaning, exactly as the interaction laws require (motion never being the
 * only signal).
 */
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { motionSafe, popIn } from "@/lib/motion";

/** Wrap a success icon/message that should arrive with one restrained pop. */
export function SuccessPulse({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={motionSafe(reduced, popIn)}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

/**
 * Wrap form content that should shake once when `trigger` changes (bump a
 * counter/error-message reference on each new validation failure — the
 * shake is keyed to that value, not to a boolean, so a *repeated* identical
 * error still gets its own shake).
 */
export function ErrorShake({ trigger, children, className }: {
  trigger: unknown; children: ReactNode; className?: string;
}) {
  const reduced = useReducedMotion();
  const controls = useAnimation();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; } // never shake on first mount
    if (reduced) return; // state change (error message/red border) still lands — just no motion
    void controls.start({ x: [0, -4, 4, -4, 0], transition: { duration: 0.3, ease: "easeInOut" } });
  }, [trigger, reduced, controls]);

  return (
    <motion.div className={className} animate={controls}>
      {children}
    </motion.div>
  );
}
