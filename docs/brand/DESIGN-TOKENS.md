# TrustChain — Design Tokens Reference

The machine-mappable token layer for [DESIGN-LANGUAGE.md](DESIGN-LANGUAGE.md). These tokens are **the real, shipped values** — they map directly to `frontend/tailwind.config.ts`, `frontend/src/styles/globals.css`, and `frontend/src/constants` in the implemented product, so this document is the source of truth, not an aspiration.

**Naming:** `--tc-{category}-{concept}-{variant}` for CSS variables; Tailwind semantic classes (`bg-surface`, `text-text-primary`, `verdict-*`) for components. **Components reference semantic tokens only — raw hex in app code is a lintable smell.**

---

## 1. Color tokens

### 1.1 Brand & accent (primitives)

| Token | Value | Meaning |
|---|---|---|
| `primary-50…900` | `#EFF4FF · #DBE6FE · #BFD3FE · #93B4FD · #5E8CFA · #3B6FF6 · #1D4ED8 · #1E40AF · #1E338A · #1E2A78` | Trust Blue — action & brand |
| `primary-DEFAULT` | `#1D4ED8` | The one primary action color |
| `accent-400/500/600` | `#A78BFA · #8B5CF6 · #7C3AED` | Aurora Violet — innovation/ambient only |

### 1.2 Semantic surfaces (theme-switched CSS variables)

| Semantic token | Light | Dark | OLED (dark+oled) |
|---|---|---|---|
| `--tc-bg-page` | `#F6F8FC` | `#070B16` | `#000000` |
| `--tc-bg-surface` | `#FFFFFF` | `#0E1424` | `#060A12` |
| `--tc-bg-raised` | `#FFFFFF` | `#131B2E` | `#0A0F1A` |
| `--tc-text-primary` | `#0B1220` | `#EEF2FB` | `#EEF2FB` |
| `--tc-text-secondary` | `#55617A` | `#9AA6C2` | `#9AA6C2` |
| `--tc-border-default` | `#E6EBF3` | `#1E2740` | `#161D30` |
| `--tc-focus-ring` | `#3B6FF6` | `#7EA2FF` | `#7EA2FF` |

Tailwind bindings: `page`, `surface`, `raised`, `glass`, `text-primary`, `text-secondary`, `border-default`, `border-glass`.

### 1.3 Glass palette (Cryptal material)

| Token | Light | Dark |
|---|---|---|
| `--tc-glass-bg` | `rgba(255,255,255,0.62)` | `rgba(19,27,46,0.55)` |
| `--tc-glass-border` | `rgba(255,255,255,0.70)` | `rgba(255,255,255,0.08)` |
| Backdrop blur | `16px saturate(140%)` (`.glass`) · `24px saturate(160%)` (`.glass-strong`) | same |

### 1.4 State colors (semantic — the 1%)

| Token | Scale | Meaning |
|---|---|---|
| `success` | `100 #DCFCE7 · 400 #4ADE80 · 500 #22C55E · 700 #15803D` | Valid / confirmed |
| `warning` | `100 #FEF3C7 · 400 #FBBF24 · 700 #B45309` | Expired / pending / suspended |
| `danger` | `100 #FEE2E2 · 400 #F87171 · 700 #B91C1C · 800 #991B1B` | Revoked / tampered / threat |
| `info` | `100 #E0F2FE · 400 #38BDF8 · 700 #0369A1` | Superseded / informational |

### 1.5 Verdict tokens (the recognition kit — never color-only)

| Verdict | Icon | fg/bg (light) | fg/bg (dark) |
|---|---|---|---|
| VALID | shield-check | `success-700` / `success-100` | `success-400` / `success-700/20` |
| REVOKED | slash-circle | `danger-700` / `danger-100` | `danger-400` / `danger-700/20` |
| SUPERSEDED | arrow-right-circle | `info-700` / `info-100` | `info-400` / `info-700/20` |
| EXPIRED | clock | `warning-700` / `warning-100` | `warning-400` / `warning-700/20` |
| TAMPERED | shield-off | `danger-800` / `danger-100` | `danger-400` / `danger-700/25` |
| UNKNOWN ISSUER | help-circle | `warning-700` / `warning-100` | `warning-400` / `warning-700/20` |
| SUSPENDED ISSUER | pause-circle | `warning-700` / `warning-100` | `warning-400` / `warning-700/20` |

### 1.6 Role accent tokens (Digital Identity)

| Token | Light | Dark |
|---|---|---|
| `--tc-accent-institution` | `#1D4ED8` | `#5E8CFA` |
| `--tc-accent-student` | `#7C3AED` | `#A78BFA` |
| `--tc-accent-employer` | `#0891B2` | `#22D3EE` |
| `--tc-accent-admin` | `#B45309` | `#FBBF24` |
| Regulator (semantic) | `#15803D` | `#4ADE80` |

### 1.7 Gradient & mesh system

| Token | Definition |
|---|---|
| `bg-mesh-primary` | 3 radial gradients: blue `rgba(59,111,246,.28)` @20/20 + violet `rgba(139,92,246,.22)` @80/10 + green `rgba(34,197,94,.14)` @70/80 |
| `bg-grid-fade` | 1px lines on `--tc-grid-line` at 48px pitch, radially masked |
| `.text-gradient` | `linear-gradient(120deg, text-primary, #3B6FF6 60%, #8B5CF6)` clipped to text |
| `--tc-grid-line` | `rgba(15,23,42,.04)` light · `rgba(255,255,255,.035)` dark |
| `--tc-mesh-opacity` | `0.55` light · `0.75` dark |
| `--tc-noise-opacity` | `0.025` light · `0.04` dark |

### 1.8 Shadow & glow palette

| Token | Value | Use |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(15,23,42,.06)` | Cards |
| `shadow-md` | `0 4px 16px rgba(15,23,42,.08)` | Popovers, sticky |
| `shadow-lg` | `0 12px 40px rgba(15,23,42,.12)` | Modals |
| `shadow-glass` | `0 8px 32px rgba(15,23,42,.10), inset 0 1px 0 rgba(255,255,255,.14)` | Cryptal glass (light) |
| `shadow-glass-dark` | `0 8px 32px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.06)` | Cryptal glass (dark) |
| `shadow-glow` | `0 0 0 1px rgba(59,111,246,.20), 0 8px 30px -6px rgba(59,111,246,.45)` | Primary CTA, focus |
| `shadow-glow-success` | `0 0 40px -8px rgba(34,197,94,.45)` | VALID verdict aura |
| `shadow-glow-danger` | `0 0 40px -8px rgba(185,28,28,.45)` | Danger emphasis |

**Elevation law:** in dark/OLED, elevation is a 1px luminous border, not a drop shadow.

### 1.9 Border palette

| Token | Value |
|---|---|
| `border-default` | theme `--tc-border-default` |
| `border-glass` | theme `--tc-glass-border` |
| `.border-gradient` | animated conic blue/violet/green padding-box border, 6s flow |
| Border widths | 1px default · 2px focus/high-contrast |

---

## 2. Typography tokens

| Token | Family | Weight | Size / line / tracking |
|---|---|---|---|
| `font-display` | Sora → Inter → system | 500–800 | — |
| `font-sans` | Inter → Noto Sans Devanagari → system | 400–700 | — |
| `font-mono` | JetBrains Mono → ui-monospace | 400–500 | — |
| `text-display-lg` | display | 800 | `clamp(2.75rem,6vw,4.5rem)` / 1.05 / −0.03em |
| `text-display` | display | 700 | `clamp(2.25rem,4.5vw,3.5rem)` / 1.08 / −0.025em |
| `h1` | display | 700 | 30px / 1.15 / −0.02em |
| `h2` | display | 600 | 24px / 1.2 |
| `h3` | display | 600 | 20px / 1.3 |
| `body-lg` | sans | 400 | 18px / 1.5 |
| `body` | sans | 400 | 16px / 1.5 |
| `body-sm` | sans | 400 | 14px / 1.45 |
| `caption` | sans | 500 | 12px / 1.35 |
| `mono` | mono | 450 | 14px / 1.4, `tabular-nums` |

**Number discipline:** `.tabular` = `font-variant-numeric: tabular-nums`. IDs/hashes always mono; trust numbers render final (never animated). Reading measure ≤ 66ch (`max-w-2xl`).

---

## 3. Spacing, radius, layout

| Category | Tokens |
|---|---|
| **Space (4px base)** | `1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64 · 24=96` |
| **Radius** | `sm 6 · md 10 · lg 14 · xl 20 · 2xl 28 · full` |
| **Border width** | `1 · 2` |
| **Containers** | content ≤ `max-w-6xl` (1152) · reading ≤ `max-w-2xl` (672) · gutters 16 (mobile) / 24 (desktop) |
| **Grid** | 12-col desktop · 4-col mobile · section gaps ≥ 32 |
| **Card padding** | 24 · **Table row** 44 (touch) · **Navbar** 64 · **Sidebar** 240 / rail 64 |
| **Touch target** | ≥ 44px (min interactive 24px per WCAG 2.5.8) |

**Spacing law:** whitespace scales with *importance*. The verdict gets the most; dense tables the least.

---

## 4. Motion tokens

| Token | Duration | Curve | Use |
|---|---|---|---|
| `duration-fast` | 120ms | ease-out | Hover, press, toggles |
| `duration-standard` | 200ms | `out-expo (0.16,1,0.3,1)` | Enters, reveals, page content |
| `duration-overlay` | 300ms | out-expo | Modals, sheets, command bar |
| `settle` | 450ms | `spring (0.34,1.56,0.64,1)` | Verdict icon overshoot-rest |
| `ease-spring` | — | `cubic-bezier(0.34,1.56,0.64,1)` | Gentle overshoot |
| `ease-out-expo` | — | `cubic-bezier(0.16,1,0.3,1)` | Standard enters |

**Keyframe/animation tokens** (from `tailwind.config.ts`):

| Animation | Keyframe | Timing |
|---|---|---|
| `animate-aurora-drift` | translate+scale drift | 18s ease-in-out infinite |
| `animate-float` | ±8px Y | 6s ease-in-out infinite |
| `animate-shimmer` | translateX 100% | 1.6s infinite (skeleton) |
| `animate-pulse-ring` | scale 0.9→1.8, fade | 2.4s cubic-bezier once (Verification Pulse) |
| `animate-fade-up` | opacity+12px Y | 0.5s out-expo |
| `animate-border-flow` | bg-position shift | 6s ease infinite (gradient border) |

**Motion laws:** animate only `transform`/`opacity`; one motion per view-change; reduced-motion collapses all to ≤120ms opacity (globals `@media (prefers-reduced-motion: reduce)`); the pulse plays once; trust values never animate.

---

## 5. Material / effect tokens

| Token | Value |
|---|---|
| `backdrop-blur-xs` | 2px |
| `backdrop-blur-glass` | 16px |
| `.glass` | `--tc-glass-bg` + blur 16 saturate 140 + `--tc-glass-border` |
| `.glass-strong` | + blur 24 saturate 160 |
| `.mesh-bg` | aurora substrate, `--tc-mesh-opacity`, blur 40, optional drift |
| `.grid-overlay` | grid-fade, 48px, radial mask |
| `.glow-ambient` | radial blue glow behind element |
| `.skeleton` | border-default fill + shimmer sweep |
| `.lift` | translateY −3px on hover, out-expo |
| Noise opacity | `--tc-noise-opacity` 0.025 light / 0.04 dark |

---

## 6. Interaction tokens

| Token | Value |
|---|---|
| Focus ring | 2px solid `--tc-focus-ring`, 2px offset, 6px radius |
| Selection | `rgba(59,111,246,0.24)` |
| Magnetic strength | ≤ 0.3 (damped spring, stiffness 250 / damping 18) |
| Tilt intensity | 5–8° (spring stiffness 200 / damping 20) |
| Scrollbar | 10px, thumb `--tc-border-default`, rounded |
| Stagger gap | 60–80ms (content) · 30ms (dense lists) · 70ms (verdict checks) |
| Toast | width 360, auto-dismiss 5s (danger persists), max 3 |
| Dialog widths | sm 400 · md 560 · lg 720 |

---

## 7. Theme token summary

| Theme | Trigger | Character |
|---|---|---|
| **Light** | default | soft near-white, honest paper; public verification default |
| **Dark** | `.dark` on `<html>` | deep navy, richest aurora; the hero theme |
| **OLED** | `.dark.oled` (opt-in) | pure black; battery-kind; max verdict contrast |
| **Accessibility** | high-contrast media / opt-in | heightened contrast, thicker borders, glow off, motion minimized |
| **Print** | `@media print` | ink-on-paper: no glass/glow, black text, crisp QR + hash |

All themes are built from the **same semantic tokens** — components never fork by theme; only the variable values change.

---

## 8. Token governance

1. **Primitives → semantics → components.** Components consume semantic/component tokens only; primitives (raw hex) are referenced solely by semantic tokens.
2. **One source of truth.** These tokens live in `tailwind.config.ts` + `globals.css`; this document mirrors them. A change to one must update the other (PR check).
3. **No raw values in app code.** Enforced by lint; a raw hex or magic spacing number is a review blocker.
4. **Additive evolution.** New tokens are added, not renamed; renames are breaking and require a version bump.
5. **Every token carries meaning.** If a token can't be tied to a trust concept or an accessibility need, it doesn't belong in the system.
