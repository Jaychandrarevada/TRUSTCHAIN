/**
 * MeshBackground — the immersive gradient-mesh + grid substrate behind hero
 * and auth surfaces. Pure CSS (compositor-only), respects reduced motion, and
 * never sits above content (z-0, pointer-events-none) so readability is intact.
 */
import { useReducedMotion } from "framer-motion";
import { cn } from "@/utils";

export function MeshBackground({ grid = true, className }: { grid?: boolean; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="mesh-bg" data-animate={reduced ? "false" : "true"} />
      {grid && <div className="grid-overlay" />}
      {/* Soft floating orbs for depth (decorative) */}
      <div
        className={cn(
          "absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl",
          !reduced && "animate-float",
        )}
      />
      <div
        className={cn(
          "absolute -right-20 top-40 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl",
          !reduced && "animate-float [animation-delay:2s]",
        )}
      />
    </div>
  );
}
