/**
 * PageTransition — the calm route-change fade + 4px rise (MICROINTERACTIONS
 * #114), mounted once in each layout around <Outlet/>. Keyed by pathname so
 * every navigation replays it; reduced-motion collapses to an instant swap
 * (no animation, immediate content — never a blocked transition).
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { pageTransition, motionSafe } from "@/lib/motion";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={motionSafe(reduced, pageTransition)}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
