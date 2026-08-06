/**
 * The motion system — one source of truth for every duration, easing curve,
 * and spring config in the app. Governed by docs/brand/MICROINTERACTIONS.md
 * (the "what and why" catalog) and docs/brand/MOTION-SYSTEM.md (the "how" —
 * implementation reference). Every animated component in components/motion/,
 * ui/, and domain/ should pull its timing from here rather than hand-rolling
 * a new duration or cubic-bezier — that's what "consistent easing" means in
 * practice: one file, not forty inline arrays.
 *
 * Reduced motion: `motionSafe(reduced, variant)` is the one place that
 * collapses a transform-bearing variant down to an opacity-only fade. Every
 * primitive in this file and in components/motion/index.tsx routes through
 * it, so "respect prefers-reduced-motion" is structural, not per-component
 * diligence.
 */
import type { Transition, Variant, Variants } from "framer-motion";

// ── Durations (seconds — Framer Motion's native unit) ───────────────────────
// Mirrors the CSS tokens in tailwind.config.ts (duration-fast/standard/overlay)
// and the values documented in MICROINTERACTIONS.md's token line.
export const DURATION = {
  fast: 0.12,     // micro feedback: press, toggle, hover settle
  standard: 0.2,  // default UI transitions: tab underline, route content
  overlay: 0.3,   // things that arrive over content: dialog, drawer, toast
  settle: 0.45,   // the "signature moment": verdict icon, success pulse
} as const;

// ── Easing ────────────────────────────────────────────────────────────────
// `out` is the one curve used for every entrance/exit in the app (quick
// start, gentle stop — never a linear or bouncy default). `spring` variants
// are for things that should feel touched, not just faded.
export const EASE = {
  out: [0.16, 1, 0.3, 1] as const,       // ease-out-expo — entrances, exits, reveals
  inOut: [0.4, 0, 0.2, 1] as const,      // symmetric — tab underline, toggle glide
};

export const SPRING = {
  /** Card tilt, magnetic pull — responsive, no overshoot. */
  gentle: { type: "spring", stiffness: 200, damping: 20 } satisfies Transition,
  /** Button press, toast arrival — a touch snappier. */
  snappy: { type: "spring", stiffness: 260, damping: 22 } satisfies Transition,
  /** The "signature moment" — verdict icon, success pulse. A single, restrained overshoot. */
  settle: { type: "spring", stiffness: 300, damping: 20, mass: 0.8 } satisfies Transition,
};

/**
 * Route every transform-bearing variant through this before handing it to a
 * `motion.*` component. When the user prefers reduced motion, transforms
 * collapse to a plain opacity fade — the state change still happens, only
 * the motion is removed (WCAG 2.3.3; MICROINTERACTIONS.md law #3).
 */
export function motionSafe(reduced: boolean | null, variants: Variants): Variants {
  if (!reduced) return variants;
  const stripped: Variants = {};
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value !== "object" || value === null) { stripped[key] = value; continue; }
    const { opacity, transition } = value as { opacity?: number; transition?: Transition };
    const next: Variant = opacity === undefined ? {} : { opacity };
    stripped[key] = transition ? { ...next, transition } : next;
  }
  return stripped;
}

// ── Reusable variant presets ─────────────────────────────────────────────────
// Plain objects — pass directly as `variants` + `initial`/`animate`/`exit`
// props, or spread into a one-off motion element.

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.settle, ease: EASE.out } },
  exit: { opacity: 0, y: 8, transition: { duration: DURATION.standard, ease: EASE.out } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.standard, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE.out } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.overlay, ease: EASE.out } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DURATION.standard, ease: EASE.out } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.overlay, ease: EASE.out } },
  exit: { opacity: 0, x: 40, transition: { duration: DURATION.standard, ease: EASE.out } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.overlay, ease: EASE.out } },
  exit: { opacity: 0, x: -40, transition: { duration: DURATION.standard, ease: EASE.out } },
};

/** Route-level content transition — a calm fade + 4px rise (MICROINTERACTIONS #114). */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.standard, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE.out } },
};

/** The "signature moment" pop — success confirmations, verdict icons. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: SPRING.settle },
};
