# TrustChain — Cinematic Landing Experience (Blueprint)

**Not a homepage. A ten-chapter film about trust.** This is the implementation-ready cinematic blueprint — storyboards, motion specs, scroll choreography, camera, lighting, particle behavior, interaction maps, and the emotional journey — for frontend engineers to build an unforgettable entrance.

It inherits the `Proof of Light` design language ([00-README](00-README.md), [DESIGN-LANGUAGE](DESIGN-LANGUAGE.md), [DESIGN-TOKENS](DESIGN-TOKENS.md)). Every visual uses the shipped vocabulary: **The Constellation** (nodes + confirmed edges), **The Seal** (living light-mark), **Consensus Motion** (motion = agreement/arrival/connection/confirmation), **Cryptal glass**, the **aurora** substrate, **Trust Blue `#1D4ED8`** over blue→violet→green mesh, **Sora / Inter / JetBrains Mono**, and the **7-verdict** engine.

> **North star:** worthy of Apple / Framer / Awwwards, unmistakably TrustChain. Every scroll advances the story. Every motion means trust. 60 FPS or it doesn't ship.

---

## 0. The core metaphor (why this holds together)

One idea drives the whole film: **a credential is a point of light; the world tries to fake it; TrustChain proves it.** The visitor's cursor *is* a light source. As they descend, scattered dim points assemble into a constellation, a certificate forms, a seal ignites, and by the finale the whole network breathes as one confirmed field of light. The user leaves feeling: *"this cannot be faked."*

**Technical strategy (decided up front):** WebGL/Three.js for the hero constellation only (one canvas, instanced points, GPU-driven). Everything below the fold is DOM + CSS + Framer Motion + GSAP ScrollTrigger — cheaper, accessible, 60 FPS on mid devices. No WebGL scroll-jacking. This keeps LCP fast and Lighthouse ≥95.

---

## 1. First Impression — the perfect first 10 seconds

### Storyboard (0.0s → 10.0s)

| t | Screen | Meaning |
|---|---|---|
| **0.0–0.8s** | Near-black (`#070B16`). Total silence. One faint point of light breathing at center. | Mystery. "Something is here." |
| **0.8–2.0s** | Cursor moves → the point *follows the light*. A second, third point fade in nearby. | The visitor discovers **they** are the light source. |
| **2.0–3.5s** | Points multiply softly (12→40), drifting in 3D depth; thin Trust-Blue edges begin to form between the nearest ones. | Connection begins. Consensus forming. |
| **3.5–5.0s** | The aurora mesh (blue→violet→green) blooms up from below at 55–75% opacity behind the constellation; faint 48px grid mask fades in at the horizon. | The world gains depth and atmosphere. |
| **5.0–6.5s** | Headline **types-in / masks-up** word by word: *"Certificates that "* → then the gradient keyword *"prove themselves."* settles with a single 450ms spring. | The thesis lands. |
| **6.5–8.0s** | Subhead fades up (16px rise); the live **Verdict Demo card** (Cryptal glass) settles in from the right with a gentle overshoot. | Proof is offered immediately. |
| **8.0–9.2s** | Primary CTA *"Verify a certificate"* fades in with an ambient Trust-Blue glow; a scroll cue (a single descending light-dot) appears at the base. | Invitation. |
| **9.2–10.0s** | Everything holds. The constellation keeps breathing (one soft pulse ~every 4s). Nothing demands attention. | Calm confidence. The film waits for the viewer. |

### Motion hierarchy (what moves, in order)
1. The cursor-light (immediate, continuous).
2. The constellation assembling (ambient, 0–5s).
3. The headline (focal, 5–6.5s).
4. The demo card + CTA (supporting, 6.5–9s).
Never two focal motions at once. The constellation never competes with the headline — it dims to ~70% brightness while text resolves.

### Timing & curves
- Point fade-in: 600ms, `ease-out`.
- Edge draw: 400ms, `out-expo`, staggered 40ms by proximity.
- Headline word mask: 90ms per word, `out-expo`; keyword spring `(0.34,1.56,0.64,1)`.
- Card settle: 700ms `out-expo`.
- Aurora bloom: 1.2s `ease-in-out`, then loops at 18s.

### Sound (optional, off by default)
- A single, near-inaudible sub-bass "presence" swell at 0.8s when the first point appears (−36 LUFS).
- A soft crystalline "settle" the instant the keyword locks (6.4s).
- Both opt-in, both with visual twins, both muted under OS reduce-sound. Never required to understand anything.

### Accessibility fallback
- Static hero: near-black field, a still constellation illustration (SVG), headline, subhead, demo card, CTA — fully readable, all contrast AA.
- Screen readers: `<h1>` reads immediately; the canvas is `aria-hidden`; the demo card is a labeled region. The whole message is available without a single frame of animation.

### Reduced-motion version
- No cursor-light, no assembly, no aurora drift. The constellation renders as a **static** low-opacity SVG. Headline and card **fade** in (≤120ms opacity, no transform). Scroll cue is static. The film becomes a still, and the still is still beautiful.

---

## 2. Hero — a living digital experience (not logo + heading + button)

### The living constellation (WebGL, one canvas)
- **Points:** 60–120 instanced GPU points (device-tiered: 120 desktop, 60 tablet, static SVG on low-power/`deviceMemory<4`). Each = a certificate-as-light. Slow Brownian drift in a shallow 3D volume (z-depth ±120px).
- **Edges:** thin Trust-Blue lines drawn between points within a proximity radius; opacity scales with closeness (0.06→0.22). Edges brighten toward green as "consensus" ripples across the field every ~8s (a slow radial wave).
- **Cursor as light:** a soft radial light attached to the pointer; points within its radius brighten and lean toward it (subtle magnetism, ≤6px, damped spring). On touch: the light gently auto-orbits instead.
- **Depth & parallax:** three z-layers of points; on pointer-move the field parallaxes ±8px (mouse) — a "camera" micro-dolly, never nausea-inducing.
- **Hash visualization:** occasionally (~every 6s) one edge lights a green halo sweeping its length — a "hash matched" beat, tying the abstract field to the product's real verification.
- **Ambient lighting & glass:** the Cryptal demo card catches a faint moving specular from the aurora; its top edge holds an inner-light highlight.

### The live Verdict Demo (the hero's right hand)
Real product UI, safe demo data, fully interactive (see §9). It is the hero's proof — the visitor can verify *on the first screen*.

### Hero camera behavior
- Idle: imperceptible slow dolly-in (scale 1.00→1.015 over 20s, then out) — the scene "breathes."
- On scroll start: the constellation recedes (scale 0.92, opacity 0.5, blur 2px) as Chapter 1 rises — the camera pulls back to reveal the story.

### Responsive hero
- ≥lg: two columns (message left, demo right), full constellation.
- md: stacked, constellation as full-bleed background at lower density.
- sm: message + demo stacked; constellation → 40-point static field; cursor-light off (no pointer).

### Performance
- Single `requestAnimationFrame` loop, capped at display refresh; points as one instanced draw call; edges as a single line-segment buffer rebuilt at 20fps (not 60 — invisible, saves GPU).
- Pauses entirely when the hero scrolls out of view (`IntersectionObserver`) and when the tab is hidden.
- Canvas resolution capped at `min(devicePixelRatio, 2)`.

---

## 3. Scroll Storytelling — the ten chapters

**Scroll engine:** GSAP ScrollTrigger drives a pinned "stage" per chapter with scrubbed timelines; between chapters, a **scene transition** (the aurora shifts hue toward the next chapter's accent, and a thin light-line sweeps the seam). No hard cuts. Progress is a **light rail** on the left edge that fills as you descend — a spine of light.

Each chapter is **one idea, one visual, one line of type.** The visitor should never read a paragraph while something moves.

### Chapter 1 — Why trust matters *(accent: Trust Blue)*
- **Visual:** a single certificate of light floats in the void. Around it, the world is dark.
- **Type (masks up):** *"Everything important rests on one question — is this real?"*
- **Motion:** the certificate rotates 8° to catch the light; a faint heartbeat pulse.
- **Transition out:** the light dims; darkness encroaches → sets up the problem.

### Chapter 2 — The problem with fake certificates *(accent: Alert Red, restrained)*
- **Visual:** the single certificate **multiplies into a grid of near-identical copies**; on scroll, subtle differences flicker — one is forged. The visitor can't tell which. A red edge quietly marks the fake only after it's too late.
- **Type:** *"Forgery is easy. Catching it is not."*
- **Motion:** copies fade in staggered; the "reveal" of the fake is a single restrained red pulse — gravity, not alarm.
- **HCI note:** this creates the *tension* the rest of the film resolves. Red is used exactly once here.

### Chapter 3 — How verification works *(accent: Trust Blue)*
- **Visual:** the real certificate returns; light **enters its Seal and passes cleanly through** — the seven checks light up one by one as a vertical rail (integrity → proof → anchor → issuer → revocation → expiry → binding).
- **Type:** *"TrustChain checks seven things in under three seconds."*
- **Motion:** checks tick in at 120ms stagger; on the last, a single Verification Pulse. The verdict word **VALID** resolves in Sora.
- **Interaction:** hovering a check reveals its plain-language meaning (glass tooltip).

### Chapter 4 — Blockchain trust *(accent: Violet → Green)*
- **Visual:** the camera pulls back; the single certificate is revealed to be **one node in the Constellation** — thousands of confirmed points, edges brightening to green as consensus sweeps.
- **Type:** *"Sealed on a public blockchain. Provable by anyone. Forever."*
- **Motion:** a block-tile joins the chain from the right and *settles*; a green finality glow spreads outward.
- **Signature beat:** the whole field pulses once, together — the network agreeing.

### Chapter 5 — Institutions *(accent: Trust Blue)*
- **Visual:** a stream of certificates issues from an **institution seal** — bulk issuance shown as many points of light emitting from one source, each catching a maker-checker "approval" spark before it flies.
- **Type:** *"Issue thousands. Approve with control. Seal in one click."*
- **Motion:** points emit in a gentle arc; a subtle "0 errors — ready to seal" chip settles.

### Chapter 6 — Students *(accent: Aurora Violet)*
- **Visual:** the certificates gather into a **single wallet of light** held by one point (the holder). A ribbon of light draws across it.
- **Type:** *"Yours for life. Share only what you choose."*
- **Motion:** a selective-disclosure beat — some fields dim ("hidden from verifier") while the credential stays glowing.

### Chapter 7 — Employers *(accent: Cyan)*
- **Visual:** a beam of light (the verifier's gaze) sweeps a row of credentials; valid ones glow green, one flickers red and is caught instantly.
- **Type:** *"Verify in seconds. Catch fraud before it costs you."*
- **Motion:** the scan line moves at reading pace; the caught-fraud beat is a firm, quiet red settle.

### Chapter 8 — Security *(accent: Trust Blue, deep)*
- **Visual:** the certificate is shown as **layered glass** — peel back to reveal the salted hash, the Merkle proof, the anchor — but **no personal data anywhere on the chain**. A lock of light closes.
- **Type:** *"Zero personal data on the blockchain. Ever."*
- **Motion:** layers separate on scroll (parallax depth), then re-seal.

### Chapter 9 — Technology *(accent: Violet)*
- **Visual:** a calm technical constellation — W3C VC, Polygon, open-source verifier — as labeled nodes, each a point of light with a monospace tag.
- **Type:** *"Open standards. Public chain. Works even if we disappear."*
- **Motion:** nodes connect into a stable lattice; the "vendor-independence" line lands with weight.

### Chapter 10 — Future *(accent: full aurora)*
- **Visual:** the camera lifts above the whole Constellation — a galaxy of confirmed light stretching to the horizon, breathing as one.
- **Type:** *"A world where every credential proves itself."*
- **Motion:** the slowest, grandest beat of the film — a single, wide synchronization wave. Silence returns.

---

## 4. Scene / section transition choreography

- **Between chapters:** 600–900ms. The outgoing visual recedes (scale 0.96, blur 2px, opacity → 0.3); a thin horizontal light-line sweeps the seam left→right; the aurora hue lerps toward the incoming accent; the incoming visual *arrives* (fade + 24px rise, out-expo). Scrubbed to scroll so the user controls the cut.
- **The light rail** (left spine) fills continuously — the film's runtime bar.
- **Chapter titles** (tiny, monospace, top-left: `CH.03 — VERIFICATION`) fade in per chapter — a cinematic slate. Optional; off on mobile.

---

## 5. Typography as motion

- **Headlines (Sora 700–800):** enter by **word-mask reveal** (each word slides up from a clip, 90ms stagger, out-expo). The single **keyword** per headline uses the gradient text and gets a 450ms spring settle. One keyword per chapter, never more.
- **Fluid scale:** `clamp(2.75rem, 6vw, 4.5rem)` for chapter headlines; they dominate, then recede.
- **Number & hash typography:** any on-screen ID/hash renders in **JetBrains Mono**, tabular, with a copy-morph affordance — the "honest machine voice" beside the confident Sora.
- **Rhythm:** headline → breath (whitespace) → one supporting line → visual. Never a wall of text. Reading measure ≤ 66ch.
- **Reduced motion:** all headlines fade (opacity only). The gradient keyword still renders; it just doesn't spring.

---

## 6. Background / atmosphere (alive, never distracting)

- **Aurora mesh:** the shipped `mesh-primary` (blue/violet/green radials), 55% (light) / 75% (dark) opacity, 40px blur, 18s drift. Hue-shifts per chapter toward the accent.
- **Grid depth:** 48px grid, radially masked at the horizon — spatial orientation, near-subliminal.
- **Noise:** 2–4% film grain over large surfaces — prevents banding, adds "material."
- **Floating nodes:** low-density ambient points drift behind DOM chapters (CSS-only, `will-change: transform`), echoing the hero constellation without a second canvas.
- **Interactive glow:** section CTAs and the Seal carry a soft glow that intensifies on hover; the aurora subtly brightens near the cursor on the hero.
- **Law:** background luminance never rises enough to drop body text below AA. If it would, it dims. Readability wins every time.

---

## 7. Blockchain visualization (responds to the user)

- **Hero:** cursor-light brightens nearby nodes and forms edges (§2). Click anywhere on the hero field → a small **consensus ripple** emanates from the click, edges brightening green outward — the user *causes* agreement.
- **Chapter 4 & 10:** scroll velocity feeds the synchronization wave speed (faster scroll = faster ripple), so the network feels responsive to the viewer's pace.
- **Digital signature:** in Chapter 3 the Seal draws with **one continuous stroke of light**, then locks — the signature flourish.
- **Transactions:** a point travels an edge to its block and *pulses* on arrival (Chapter 4).
- **All chain motion** collapses to static confirmed-state imagery under reduced motion.

---

## 8. Premium details (the 1% that compounds) — 60+

**Cursor & light (1–10):** 1 cursor-light on hero · 2 nodes lean toward cursor · 3 click = consensus ripple · 4 CTA magnetism (≤0.3) · 5 aurora brightens near pointer · 6 demo card specular tracks cursor · 7 light rail glows at scroll · 8 chapter-slate fade · 9 scroll cue descending dot · 10 idle camera breath.

**Type & reveal (11–22):** 11 word-mask headlines · 12 gradient keyword spring · 13 monospace chapter slates · 14 number copy-morph · 15 per-chapter accent hue-shift · 16 seam light-line sweep · 17 recede-and-blur on transition · 18 arrive-and-rise on enter · 19 verdict word resolve (Sora) · 20 "VALID" settle · 21 selective-disclosure dim beat · 22 "0 errors" chip settle.

**Seal & certificate (23–34):** 23 Seal draws in one stroke · 24 holographic tilt with pointer · 25 dynamic border-flow (blue→violet→green) · 26 QR assembles from quiet-zone inward · 27 ownership ribbon draw · 28 verification glow rises · 29 layered-glass peel (Chapter 8) · 30 lock-of-light close · 31 finality permanent glow · 32 hash halo sweep · 33 institution seal emission · 34 approval spark on issue.

**Network & atmosphere (35–48):** 35 constellation breath (~4s) · 36 consensus sweep (~8s) · 37 block-tile join + settle · 38 transaction travel + pulse · 39 synchronization wave (Chapter 10) · 40 scroll-velocity-driven ripple · 41 ambient floating nodes behind DOM · 42 film-grain noise · 43 grid horizon mask · 44 z-layer parallax · 45 green-halo hash beat · 46 red fraud pulse (once, Chapter 2/7) · 47 aurora drift · 48 depth dolly on hero.

**Trust & finish (49–60+):** 49 issuer accreditation chip on demo verdict · 50 "verified in <3s" stat · 51 explorer-link shimmer · 52 "works even if we disappear" weight-line · 53 zero-PII lock beat · 54 seven-check rail light-up · 55 confidence meter fill-and-rest · 56 CTA ambient glow pulse · 57 footer constellation fade · 58 glass reflections on all Cryptal cards · 59 elegant skeleton on demo load · 60 the final silence.

**Rule for every detail:** felt more than noticed, carries meaning, vanishes gracefully under reduced motion.

---

## 9. Interactive demo (verify on the homepage)

The hero's proof. Real verdict UI, safe demo data.

**Interaction flow:**
1. Card shows a sample certificate (name, program, issuer) with a *"Verify"* affordance and a pre-filled sample ID (`TC-DEMO-2026`).
2. Visitor clicks Verify (or the field is pre-armed). Skeleton shimmer (0.6s) — *no spinner*.
3. The seven checks resolve one by one (120ms stagger), each `…` → green check — the visitor **watches proof happen**.
4. The verdict icon settles (450ms spring); a single Verification Pulse.
5. **VALID** resolves in Sora; issuer accreditation chip fades in; "verified in 2.1s" stat appears.
6. A subtle "try tampering" toggle: flip one field → re-verify → **TAMPERED** resolves (firm, no pulse) — the visitor *feels* the system catch a forgery. Reset restores VALID.

**Feedback & trust indicators:** streaming checks, the pulse, the accreditation chip, the honest "as-of" timestamp, and a one-tap "see the blockchain proof" that expands the anchor/tx (monospace) — proof one tap below, never required.

**Microinteractions:** copy-morph on the hash, hover-explain on each check, the tamper toggle's dim-and-reveal. All from the shipped verdict components — this is the real product, dressed for the stage.

**Accessibility:** the demo is a labeled region; `role=status` announces the verdict; fully keyboard-operable; reduced-motion shows the final VALID state instantly with the checks as a static list.

---

## 10. Call to action — the emotional ending

Not "Start Now." The finale (below Chapter 10):

- **Visual:** the camera holds on the galaxy of confirmed light. It slowly dims to near-black, leaving **one bright, steady point** at center — the user's own credential, waiting to be lit.
- **Type (masks up, slow):** *"Your credentials deserve to prove themselves."*
- **CTA:** *"Verify a certificate"* (primary, ambient glow) + *"For institutions →"* (secondary glass). The primary has gentle magnetism; on hover, the central point of light brightens — *the visitor's action lights the network.*
- **Emotion target:** not urgency — **inevitability.** "Of course I want this."

---

## 11. Footer — the final scene

- Not a link list — the film's end credits over a living backdrop.
- **Visual:** a low, slow, dark Constellation drifts behind; the TrustChain shield-mark holds a faint steady glow (finality = stillness).
- **Content:** minimal — Verify · For institutions · Docs · Privacy · Security.txt — set as quiet monospace, generously spaced.
- **Ambient motion:** one barely-there network pulse every few seconds — the chain, still alive, as the screen ends.
- **Reduced motion:** static dark field, still shield-glow, all links legible.

---

## 12. Motion philosophy & performance (the engineering contract)

- **Only `transform` + `opacity` animate.** No layout thrash. WebGL confined to the hero canvas.
- **60 FPS floor.** Device tiers: full (desktop, dPR≤2, mem≥4) → constellation + all scroll motion; reduced (tablet) → lower point density, DOM-only chapters; minimal (low-power / `prefers-reduced-motion` / `save-data`) → static SVG hero, opacity-only reveals.
- **Scroll:** GSAP ScrollTrigger, scrubbed, `IntersectionObserver`-gated; timelines killed when off-screen; hero canvas paused off-view and on hidden tab.
- **Lighthouse ≥95 / LCP fast:** the LCP element is the **headline text** (instant, SSR), not the canvas. Canvas hydrates after first paint. Fonts preloaded + `display: swap` (self-host for prod). Images AVIF, lazy. No CLS: all reserved heights fixed; the demo card has a fixed skeleton box.
- **Budget:** hero JS (Three.js + scene) code-split and lazy-loaded after the DOM hero paints; if it fails or is slow, the static SVG hero is already on screen — **the story never depends on WebGL.**

---

## 13. Accessibility strategy (WCAG 2.2 AA)

- **Reduced motion:** the entire film degrades to elegant stills + opacity fades; every chapter's meaning survives (§1–§11 each specify the RM version).
- **Keyboard:** the page is a normal scroll document — arrow/space/Tab all work; the demo and CTAs are fully operable; skip-link to main; no scroll-jack that traps.
- **Screen readers:** canvas + decorative constellation `aria-hidden`; each chapter is a `<section>` with a heading; the story reads as clean prose top to bottom; the demo announces verdicts via `role=status`.
- **Contrast:** all text AA (verdict text ≥7:1 target); backgrounds dim to protect legibility; a high-contrast theme strips aurora/glow.
- **Touch / low-power:** cursor-light → gentle auto-orbit; constellation density drops; heavy effects off; the demo works by tap.
- **No meaning by motion or color alone:** verdicts are icon + label + color; the fraud beat (Chapter 2/7) is also labeled, never red-only.

---

## 14. Emotional journey (the arc engineers are serving)

`Mystery → Curiosity → Tension → Relief → Understanding → Confidence → Belonging → Awe → Inevitability.`

| Chapter | Feeling engineered |
|---|---|
| Entrance | Mystery, then discovery (you are the light) |
| 1 | Gravity — this matters |
| 2 | Tension — you can't tell what's fake |
| 3 | Relief — TrustChain can |
| 4 | Awe — sealed forever, provable by anyone |
| 5–7 | Belonging — this is for me (issuer/student/employer) |
| 8–9 | Confidence — private, open, independent |
| 10 | Awe again — a world of confirmed light |
| Finale | Inevitability — "I want this" |

The film moves the visitor one step rightward per chapter and never backward. By the CTA, wanting to try TrustChain feels like the only natural response.

---

## 15. Build handoff — what engineering implements

1. **Hero canvas** (`packages/ui` or a hero module): instanced-point constellation, cursor-light, edges, consensus ripple, device tiers, IO pause. Lazy-loaded after DOM hero.
2. **Static SVG hero fallback** (ships first, is the LCP-safe base).
3. **Scroll stage** (GSAP ScrollTrigger): 10 pinned chapters, scrubbed timelines, seam transitions, left light rail, per-chapter accent hue-shift.
4. **Chapter visuals:** DOM + CSS + Framer Motion (word-mask headlines, reveal/parallax, the layered-glass peel, the scan line, the seal draw as SVG stroke). No second WebGL context.
5. **Live demo:** reuse the real `VerdictPanel` / `CheckList` / `AnchorProof` components (already built) with demo data + the tamper toggle.
6. **Finale + footer:** dim-to-one-point, emotional CTA, living-footer constellation (CSS).
7. **A11y + reduced-motion + device-tier switches** wired from the start, not retrofitted.
8. **Perf gates:** Lighthouse ≥95 in CI; 60 FPS profiling on a mid-tier device; canvas off-view pause verified.

---

*This is the cinematic blueprint — the film's script, storyboard, and motion bible. It is unmistakably TrustChain because it is built entirely from `Proof of Light`: the Constellation, the Seal, Consensus Motion, Trust Blue over aurora, and the seven checks resolving to a single, calm, certain point of light. Build it so the first ten seconds already feel like trust — and the last ten feel like inevitability.*
