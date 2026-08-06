/**
 * Motion primitives — the premium interaction layer (Framer Motion).
 *
 * Timing sourced from lib/motion.ts (DURATION/EASE/SPRING) — the single
 * canonical motion system; see docs/brand/MOTION-SYSTEM.md. All primitives
 * are reduced-motion-aware: when the user prefers reduced motion, transforms
 * collapse to opacity or disable entirely (WCAG 2.3.3). Target 60 FPS: only
 * transform/opacity are animated (compositor-friendly), never layout
 * properties.
 */
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionProps,
} from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/utils";
import { DURATION, EASE, SPRING } from "@/lib/motion";

// ── Reveal — scroll-triggered fade-up (staggered content entrances) ──────────
export function Reveal({
  children, delay = 0, className, y = 16, as = "div",
}: {
  children: ReactNode; delay?: number; className?: string; y?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduced = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: DURATION.settle, ease: EASE.out, delay }}
    >
      {children}
    </Comp>
  );
}

// ── Stagger container + item — choreographed list entrances ──────────────────
export function Stagger({ children, className, gap = 0.06 }: {
  children: ReactNode; className?: string; gap?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: {
  children: ReactNode; className?: string;
} & MotionProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: DURATION.settle, ease: EASE.out } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ── TiltCard — 3D pointer tilt with glass reflection (depth on hover) ────────
export function TiltCard({ children, className, intensity = 8 }: {
  children: ReactNode; className?: string; intensity?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotX = useSpring(useTransform(py, [0, 1], [intensity, -intensity]), SPRING.gentle);
  const rotY = useSpring(useTransform(px, [0, 1], [-intensity, intensity]), SPRING.gentle);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={cn("relative [transform-style:preserve-3d]", className)}
      style={{ rotateX: rotX, rotateY: rotY, perspective: 900 }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { px.set(0.5); py.set(0.5); }}
    >
      {children}
    </motion.div>
  );
}

// ── MagneticButton — cursor-attracting press-physics wrapper ─────────────────
export function Magnetic({ children, className, strength = 0.3 }: {
  children: ReactNode; className?: string; strength?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), SPRING.snappy);
  const y = useSpring(useMotionValue(0), SPRING.snappy);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

export { motion, useReducedMotion };
