# TrustChain — Motion System (Implementation Reference)

This is the **implementation** companion to [MICROINTERACTIONS.md](MICROINTERACTIONS.md)
(the *what and why* catalog of 220 handcrafted interactions). This document is
the *how*: the canonical tokens, the one file every animated component pulls
from, and where each of the ten requested motion categories lives in code.

**The rule this whole document exists to enforce:** a duration or easing
curve is never typed inline more than once. It lives in
[`lib/motion.ts`](../../frontend/src/lib/motion.ts) and every component
imports it from there. That's what "use easing consistently" means in
practice — one file, not forty inline `[0.16, 1, 0.3, 1]` arrays.

---

## 1. Tokens — the single source of truth

`frontend/src/lib/motion.ts` exports three primitives:

```ts
DURATION = { fast: 0.12, standard: 0.2, overlay: 0.3, settle: 0.45 }  // seconds
EASE     = { out: [0.16, 1, 0.3, 1], inOut: [0.4, 0, 0.2, 1] }
SPRING   = { gentle: {...}, snappy: {...}, settle: {...} }            // Transition objects
```

These mirror the CSS-side tokens in `tailwind.config.ts`
(`duration-fast/standard/overlay/settle`, `ease-spring/out-expo`) and the
values documented in MICROINTERACTIONS.md's token line (`fast 120ms · standard
200ms · overlay 300ms · settle 450ms spring · pulse 2.4s`) — Framer-driven
components use the TS tokens, plain-CSS components (Toast's `animate-fade-up`,
Skeleton's shimmer) use the Tailwind utilities. Same numbers, two syntaxes.

**Reduced motion** is handled in one place: `motionSafe(reduced, variants)`
strips transforms out of a variants object, leaving only the opacity fade —
every primitive below routes through it (or through the global CSS override
in `globals.css` that forces `transition-duration`/`animation-duration` to
`0.01ms` under `prefers-reduced-motion: reduce`, which is why Toast/Skeleton/
Dialog need no separate reduced-motion branch of their own).

Variant presets built on these tokens: `fadeUp`, `fadeIn`, `scaleIn`,
`slideInRight`, `slideInLeft`, `pageTransition`, `popIn` — all in the same
file, all reusable as-is.

---

## 2. The ten categories

### Page transitions
`components/motion/PageTransition.tsx`, mounted once in each layout
(`layouts/index.tsx`, both `PublicLayout` and `ConsoleLayout`) around
`<Outlet/>`. Keyed by pathname — every navigation gets a calm fade + 4px rise
(`pageTransition` variant, `DURATION.standard`, `EASE.out`). Reduced motion:
instant swap, no transition at all (never a blocked route change).

### Card animations
`Card` (`components/ui/card.tsx`) carries `glow` (animated gold conic border)
and `hover` (lift + shadow) as boolean props — no new API, same component
every page already uses. Entrance animation for card *grids* is `Stagger` +
`StaggerItem` (`components/motion/index.tsx`), now sourced from
`DURATION.settle`/`EASE.out` instead of a bespoke inline value.

### Button interactions
`components/ui/button.tsx` — unchanged API, already premium: press-physics
(`active:scale-[0.97]`), a diagonal sheen sweep on hover, an ambient glow on
the primary variant. `Magnetic` (`components/motion/index.tsx`) wraps a
button for cursor-attraction on hero CTAs, now running `SPRING.snappy`.

### Hover effects
Three primitives cover every hover moment in the app: `Card hover` (lift),
`TiltCard` (3D pointer-tilt, `SPRING.gentle`), and the `.lift` utility class
(`globals.css`) for anything that just needs a `-3px` rise. No fourth pattern
needed — consolidate, don't proliferate.

### Modal animations
`components/ui/dialog.tsx` uses the native `<dialog>` element for its
browser-managed focus trap and Esc handling — that behavior is untouched.
What's new: a real CSS entrance in `globals.css` using `@starting-style` +
`transition-behavior: allow-discrete`, so the browser animates the
`display:none → block` swap natively (opacity + scale + 8px rise, 300ms,
`ease-out-expo`). Scoped to **entry only** — closing stays the native instant
close, a deliberate call: a modal that arrives with weight but leaves
instantly reads as premium without spending motion where it isn't earning
its keep ("avoid excessive motion").

### Sidebar transitions
`ConsoleLayout`'s mobile drawer (`layouts/index.tsx`) now uses `AnimatePresence`
+ the `slideInLeft` variant for the panel and a fading/blurring scrim,
replacing what was previously an instant conditional-render appear/disappear
(MICROINTERACTIONS #112: "slides from left, scrim blurs behind"). The desktop
persistent sidebar has no transition to define — it's always present.

### Toast notifications
`components/ui/toast.tsx` — unchanged: `animate-fade-up` (a real Tailwind
keyframe, `DURATION`-equivalent 500ms/`ease-out-expo`), queued at max 3,
danger tones persist until dismissed. Already matched the system; documented
here as the canonical toast entrance rather than rewritten.

### Loading states
`Spinner` (`components/ui/misc.tsx`) for inline "working" states,
`VerificationCeremony` / `IssuanceCeremony` for the multi-stage pipelines
where a bare spinner would hide meaningful progress (see those files' own
headers for the honesty rules governing what each stage may display).

### Success animations
New: `SuccessPulse` (`components/motion/StatusAnim.tsx`) — one restrained
`popIn` (spring, `SPRING.settle`) for "the signature moment"
(MICROINTERACTIONS #175: "the one celebration"). Wired into `ClaimPage`'s
claim-success state. Reduced motion: opacity-only fade, same final state.

### Error animations
New: `ErrorShake` (`components/motion/StatusAnim.tsx`) — a single 4px
horizontal shake (MICROINTERACTIONS #9: "one shake, never a bounce loop"),
triggered by bumping a counter prop so a *repeated* identical error still
shakes. Implemented with `useAnimation` + a mounted-ref guard specifically so
it **never** plays on initial mount — only on a genuine new failure. Wired
into `ClaimPage`'s identity-mismatch path. Reduced motion: no shake at all —
the red border and error text alone carry the meaning (interaction law #3:
motion is never the only signal).

### Skeleton loading
`.skeleton` (`globals.css`) — real-layout shimmer sweep, 1.6s, left unchanged.
This is a deliberate exception to "everything sources from `DURATION`": ambient
loading loops (skeleton shimmer, the aurora-drift mesh, the trust marquee, the
boot sequence's particle drift) run on their own longer, decorative timings —
they're not interaction feedback, they're ambient texture, and forcing them
onto the 120–450ms interaction scale would make them flicker instead of
breathe. The system distinguishes **interaction timing** (this document) from
**ambient timing** (intentionally separate, documented in each component's own
header) — conflating the two was the anti-pattern to avoid, not a token count
to minimize.

---

## 3. Reduced motion — the actual contract

Three layers, so no component can accidentally skip it:

1. **Global CSS override** (`globals.css`, `@media (prefers-reduced-motion:
   reduce)`) forces every `animation-duration`/`transition-duration` to
   `0.01ms` app-wide — the safety net underneath everything, including
   third-party or future code that never calls `motionSafe`.
2. **`motionSafe()`** in `lib/motion.ts` — the deliberate, per-variant
   collapse from transform+opacity down to opacity-only, used by every
   Framer-driven primitive in `components/motion/`.
3. **Per-component `useReducedMotion()` checks** for anything that shouldn't
   render at all under reduced motion (the boot sequence's canvas particles,
   `TiltCard`/`Magnetic`'s pointer-tracking, `ErrorShake`'s shake keyframes) —
   the *state change* always still happens; only the motion is removed.

## 4. Interaction laws (unchanged from MICROINTERACTIONS.md, restated for code review)

1. Meaning first — no motion ships without a named reason.
2. One motion per moment — never stack two animations on the same change.
3. Reduced-motion complete — every entry has a fallback that preserves meaning.
4. Trust values never animate — verdicts, hashes, counts render final, not counting up from a random start.
5. Felt, not noticed — if it draws attention to itself, it's too much.
6. Timing and easing come from `lib/motion.ts` — never a fresh magic number.
