# TrustChain — Design Language & Brand Identity System v1.0

**The Design Constitution.** Every screen, animation, icon, illustration, component, and interaction in TrustChain must follow this system. This is the source of truth for how TrustChain looks, moves, and feels — and, above all, how it earns trust.

> Companion documents: [MICROINTERACTIONS.md](MICROINTERACTIONS.md) (the 220-entry interaction catalog) · [DESIGN-TOKENS.md](DESIGN-TOKENS.md) (the machine-mappable token reference, aligned to the shipped implementation).

---

## 0. The Name

**The design language is called `Proof of Light`.**

Blockchains reach agreement through *proof* — proof of work, proof of stake. TrustChain reaches *trust* through **Proof of Light**: every credential is a point of light; verification is light passing cleanly through and confirming; the chain is a constellation of confirmed points that no one can dim or forge. Light is the perfect metaphor for the brand's promise — it is transparent, it cannot be faked, it reveals truth, and it travels instantly.

Three sub-languages inherit from it:
- **Consensus Motion** — the motion system. Motion always represents data reaching agreement, never decoration.
- **Cryptal** — the material system. Surfaces behave like crystal and frosted glass: honest, layered, light-bearing.
- **The Seal** — the certificate & verification identity. Every trusted artifact carries a living seal of light.

If a designer must choose between two options, they choose the one that better answers: *"Does this make the truth feel more like light — clear, instant, and impossible to fake?"*

---

## 1. Brand DNA

### 1.1 Mission
Make every credential instantly and independently provable — so that trust is a property of the artifact itself, not of who is asking.

### 1.2 Vision
A world where "Is this real?" is answered in three seconds, for free, by anyone, forever. TrustChain becomes the invisible global standard beneath academic and professional credentials — the way the padlock became the silent standard for the secure web.

### 1.3 Brand Personality
TrustChain is **The Quiet Authority**. Five traits:

| Trait | Means | Never |
|---|---|---|
| **Assured** | States facts plainly; no hedging | Boastful, hype-driven |
| **Precise** | Every pixel, number, and word is deliberate | Fussy, ornamental |
| **Luminous** | Clarity feels like light entering a room | Neon, "crypto-flashy" |
| **Institutional** | Carries the gravity of a registry office | Stiff, bureaucratic, cold |
| **Future-calm** | Advanced technology, presented serenely | Anxious, alarmist about fraud |

### 1.4 Brand Values
Truth · Permanence · Independence · Privacy · Craft. (Independence = "works even if we disappear." Privacy = "zero personal data on-chain." These are not features; they are values made visible.)

### 1.5 Voice & Tone

**Voice (constant):** plainspoken, exact, calm, quietly confident. Sentence case. Verbs first on actions. Numbers and dates localized.

**Tone (adapts to moment):**

| Moment | Tone | Example |
|---|---|---|
| Verification success | Assured, understated | "Valid certificate." (Not "Congratulations! 🎉") |
| Verification failure | Direct, protective, non-alarmist | "This file doesn't match the sealed record. Do not rely on it." |
| Claim success | One warm beat — the single exclamation allowed | "Certificate claimed! It's now in your wallet." |
| Errors | Blameless, next-step-oriented | "That code didn't match. 3 attempts left." |
| Irreversible action | Grave, unambiguous | "This cannot be undone. A second approver must confirm." |
| Empty state | Inviting, quietly instructive | "When an institution issues you a certificate, it will appear here." |

**Forbidden voice:** fear-mongering about fraud, crypto slang, urgency banners, streaks, exclamation-mark enthusiasm (except the one claim moment).

### 1.6 Design Manifesto

1. **Trust is the product; the interface is its evidence.** If a screen feels vague, we have failed at the product level.
2. **Light, not noise.** We add clarity, never decoration. Every gradient, glow, and motion must carry meaning.
3. **The chain is invisible; the confidence is visible.** No wallets, gas, or jargon in primary paths. Proof lives one calm tap below the surface.
4. **Honesty over delight.** We never fake certainty. Pending is "pending," cached is timestamped, an opinion is labeled an opinion.
5. **Designed for the floor and the ceiling.** If a registrar trusts it enough to seal 8,000 degrees, and an embassy officer understands a verdict in five seconds, everyone between is served.
6. **Calm is a feature.** Fraud is stressful; TrustChain is the serene room where it stops being stressful.
7. **It must outlive us.** Every artifact is designed to remain legible and verifiable even if the company is gone.

### 1.7 Signature Characteristics & Recognition Factors

A user should recognize TrustChain *before the logo loads*. The recognition kit:

1. **The Verdict Panel** — the seven-state verification result with its pulse of light. No other product resolves trust this way.
2. **The Verification Pulse** — a single expanding ring of light on a VALID result. Never loops, never celebrates loudly.
3. **The Seal** — the layered light-mark on every certificate and issuer.
4. **Trust Blue over Aurora** — deep, institutional blue on a soft violet-to-green gradient mesh.
5. **Sora headlines, monospace hashes** — confident geometric display type beside honest, tabular cryptographic detail.
6. **Cryptal glass** — frosted, layered surfaces that let the aurora glow through without ever hurting legibility.
7. **The Constellation** — hashes and networks rendered as points of light joined by thin confirmed lines.
8. **Silence around the important thing** — generous space isolating the one number, verdict, or action that matters.

---

## 2. The `Proof of Light` Design Language

### 2.1 Core Rules

1. **Meaning before beauty.** Nothing decorative may compete with the one thing on screen that carries trust.
2. **One truth per view.** Each screen has a single most-important element (a verdict, a number, a decision). Everything else recedes.
3. **Light reveals; it never obscures.** Glow, mesh, and glass are always behind content, never above legibility. Body text contrast is non-negotiable.
4. **Motion is consensus.** If something moves, it is because data is agreeing, confirming, connecting, or arriving. Motion that means nothing is deleted.
5. **The chain stays backstage.** Cryptographic detail is available, elegant, and never required.
6. **Irreversibility looks irreversible.** Danger is loud, typed, two-person, and impossible to do by reflex.
7. **Honesty has a visual.** Every uncertain state (pending, cached, AI opinion) has an explicit, non-guessing treatment.
8. **Timeless over trendy.** We choose the choice that will still look right in 2036.

### 2.2 Do's and Don'ts

| Do | Don't |
|---|---|
| Use light and space to signal importance | Use size and color screaming for attention |
| Render verdicts with icon + label + color | Rely on color alone for meaning |
| Keep one animation per view-change | Layer parallax, confetti, and loops together |
| Show cryptographic proof one tap below | Force hashes/wallets into the primary path |
| Localize and left-align dense data | Center long numbers or paragraphs |
| Let the aurora glow softly behind glass | Put gradients on top of reading text |
| Confirm irreversible actions gravely | Allow one-click destructive actions |
| Round numbers only in marketing, never in trust | Animate a verdict's count or a hash |

### 2.3 Visual Grammar
- **Shape:** soft-cornered rectangles (radius 10–28px). Circles reserved for identity (avatars, nodes, the pulse). The shield-check is the only pictographic constant.
- **Depth:** three planes — *substrate* (aurora + grid, z-0), *surface* (glass/solid cards), *focus* (the one elevated element with glow). Never more than three planes stacked.
- **Density:** public/holder surfaces breathe; issuer/admin consoles are dense but gridded. Density rises with expertise, never with importance.
- **Emphasis order:** light glow > motion > color > weight > size. Prefer the earlier tool.

### 2.4 Interaction Grammar
- **Cause and effect are always visible.** Every input produces an immediate, proportionate response.
- **Reversible by default; irreversible by ceremony.** Undo where possible; typed confirmation + second person where not.
- **Keyboard is first-class.** ⌘K opens the command bar from anywhere; every action is reachable without a mouse.
- **The cursor is gently courted.** Primary actions have subtle magnetism; nothing yanks the pointer.
- **Progressive disclosure.** Depth (proof, blockchain detail, advanced settings) is one deliberate expand away, never dumped up front.

### 2.5 Motion Grammar — *Consensus Motion*
Motion vocabulary and its meaning (full timing in §6):

| Verb | Represents | Where |
|---|---|---|
| **Pulse** | A single confirmation reaching agreement | VALID verdict, transaction confirmed |
| **Arrive** | Data entering from the network | Content reveal, list stagger |
| **Connect** | Nodes/points joining into proof | Hash constellation, network graph |
| **Settle** | A value coming to rest as final | Icon overshoot-then-rest, counter stop |
| **Sweep** | Attention traveling along a path | Sheen, scan line, progress |
| **Recede** | Something leaving or de-emphasizing | Exit fade, background blur on focus |

Forbidden motion: bounce-for-fun, infinite loops near content, animated trust numbers, spinners on the verification path.

### 2.6 Spacing Grammar
4px base unit. Space is a signal: the more important the element, the more silence around it. Verdicts get the most whitespace in the product. Dense tables get the least. Never crowd the one thing that matters. (Scale in [DESIGN-TOKENS.md](DESIGN-TOKENS.md).)

### 2.7 Component Grammar
- Components express **variant × size × state × theme**; a component that can't render both themes and all its states is not done.
- Semantic tokens only — no raw hex in components (lintable).
- Every interactive component ships keyboard support, a visible focus ring, an accessible name, a loading state, an empty state, and an error state.
- Danger variants are visually distinct and paired with confirmation patterns.

### 2.8 Information Grammar
- **The verdict is the headline.** On any verification surface, the result is the largest, calmest, most isolated element.
- **Numbers are honest.** Cryptographic IDs and hashes render in monospace, tabular, copyable, and truncated with a middle ellipsis — never rounded, never animated.
- **Provenance is always reachable.** Who issued it, when, on which chain, with what transaction — one tap away, elegantly formatted.
- **Uncertainty is labeled.** "as of 12:03 UTC," "assisted opinion," "anchoring…" — never a confident-looking guess.

---

## 3. Color Psychology — *Light Has Meaning*

TrustChain's color system is **semantic before it is aesthetic**. Every hue is assigned a meaning tied to the trust domain; decorative color that carries no meaning is not used. (Exact values, ratios, and all themes in [DESIGN-TOKENS.md](DESIGN-TOKENS.md).)

### 3.1 The Meaning Map

| Concept | Color | Hue | Why (psychology) |
|---|---|---|---|
| **Trust / the brand** | Trust Blue `#1D4ED8` | Deep institutional blue | Blue is the near-universal color of trust, competence, and calm; deep + slightly cool reads as *authority*, not friendliness |
| **Verification / proof** | Trust Blue → applied as *light* (glow) | Blue luminance | Verification is the brand acting; it glows rather than shouts |
| **Innovation / chain** | Aurora Violet `#8B5CF6` | Electric violet | Violet = the frontier, cryptography, the "new" — used only as ambient light and accent, never as a primary action |
| **Success / valid / node confirmed** | Verified Green `#22C55E` / `#15803D` | Balanced green | Green = go, safe, alive; the deeper `#15803D` carries the gravity of an official stamp |
| **Warning / expired / pending / suspended** | Amber `#B45309` / `#FBBF24` | Warm amber | Amber = caution without alarm; "look closer," not "danger" |
| **Threat / revoked / tampered** | Alert Red `#B91C1C` / `#991B1B` | Deep red | Red = stop; the darker `#991B1B` for TAMPERED signals the gravest state without becoming lurid |
| **Superseded / informational** | Info Sky `#0369A1` | Clear sky-blue | A calmer blue that says "there is a newer truth, follow it" — never confused with the trust blue of the action layer |

### 3.2 Entity Accents (Digital Identity by role)
Each actor has a signature accent — a quiet way the product changes its light depending on who is present:

| Actor | Accent | Meaning |
|---|---|---|
| **Institution / Issuer** | Trust Blue `#1D4ED8` | The authority that seals |
| **Student / Holder** | Aurora Violet `#7C3AED` | Ownership, potential, the personal |
| **Employer / Verifier** | Cyan `#0891B2` | Clarity, inspection, the outside view |
| **Administrator** | Amber `#B45309` | Stewardship, oversight, care |
| **Regulator** | Verified Green `#15803D` | Sanction, official weight |

Accents appear as sidebar active states, focus glows, and role badges — never as body color. They let a returning user feel "which world am I in" pre-consciously.

### 3.3 Blockchain Palette
- **Node (unconfirmed):** neutral slate, dim.
- **Node (confirming):** amber, pulsing.
- **Node (confirmed):** Verified Green, steady light.
- **Connection / edge:** thin Trust Blue line at low opacity; brightens as consensus forms.
- **Hash:** monospace on neutral; the *matched* hash briefly haloes Verified Green.
- **Finalized:** Verified Green with the faintest steady glow — "permanent."

### 3.4 Themes
Five themes, all built from the same semantic tokens (so components never fork):

1. **Light** — soft near-white `#F6F8FC` page, honest paper feel; the default for public verification (accessible, printable, universal).
2. **Dark** — deep navy `#070B16`; the "hero" theme; aurora glows richest here; premium and focused.
3. **OLED** — pure black `#000000`; opt-in; battery-kind; maximal contrast for the verdict.
4. **Accessibility (High-Contrast)** — heightened contrast, thicker borders, glow removed, motion minimized; meaning conveyed by shape + label only.
5. **Print** — ink-on-paper: no glass, no glow, black text, the QR and hash rendered crisply; the certificate's "true document" form.

### 3.5 Color Usage Ratios
The **60 / 30 / 10 / 1** discipline:
- **60%** neutral surface & space (the calm),
- **30%** text & structure (the substance),
- **10%** Trust Blue (the action & brand),
- **1%** semantic state color (success/warning/danger — rare, therefore loud).

Aurora mesh + glow sit *outside* this ratio as ambient light at low opacity; they are atmosphere, not content. If state color exceeds ~1%, the screen is crying wolf and must be rebalanced.

### 3.6 Color Do's & Don'ts
- **Do** let one Trust-Blue action own the screen. **Don't** place two primary buttons in one view.
- **Do** reserve red for genuine threat. **Don't** use red for "required field."
- **Do** carry meaning with the accent. **Don't** tint by mood or trend.
- **Do** verify every pair at AA. **Don't** ship a state whose meaning dies in grayscale.

---

## 4. Typography System — *Confident Voice, Honest Numbers*

A two-voice system: a **confident human voice** for what we say, and an **honest machine voice** for what we prove.

### 4.1 The Families

| Role | Typeface | Why |
|---|---|---|
| **Display / Headings** | **Sora** (geometric grotesque, 500–800) | Modern, structured, quietly futuristic; confident without ego; excellent at large sizes for hero statements and page titles |
| **Body / UI** | **Inter** (400–700) | The most legible neutral UI face; renders beautifully at 14–18px; huge language coverage |
| **Regional pairing** | **Noto Sans Devanagari** | First-class Hindi at parity with Latin (GA requirement) |
| **Numbers / Hashes / Code / Certificate IDs** | **JetBrains Mono** (400–500) | The *honest machine voice*; tabular, unambiguous 0/O and 1/l, dignified for cryptographic detail |

Sora + Inter is deliberately *original* — not the Helvetica/SF defaults, not a trend face. It gives TrustChain a recognizable literary fingerprint at a glance.

### 4.2 Scale & Hierarchy
Fluid at the top (hero clamps), fixed and rhythmic below (spec §6.3 / tokens):

| Token | Use | Feel |
|---|---|---|
| `display-lg` (clamp 44–72px, Sora 800, −3% tracking) | Landing hero, the verdict headline moment | Iconic, isolated |
| `display` (clamp 36–56px, Sora 700) | Section statements | Editorial |
| `h1` 30px, `h2` 24px, `h3` 20px (Sora 600) | Page & card titles | Structured |
| `body-lg` 18px, `body` 16px, `body-sm` 14px (Inter 400) | Reading & UI | Calm, legible |
| `caption` 12px (Inter 500) | Labels, timestamps | Quiet |
| `mono` 14px (JetBrains 450) | Hashes, IDs, code | Honest |

### 4.3 Reading Rhythm & Spacing
- Body line-height 1.5; headings 1.05–1.15 with negative tracking for density.
- Reading measure capped at ~66 characters (`max-w-2xl`); trust text is never a wide wall.
- Left-aligned by default; center only short hero lines and single-verdict statements.
- Vertical rhythm on the 4px grid; section gaps ≥ 32px.

### 4.4 The Number & Hash Discipline (a signature)
- **Certificate IDs** (`TC-XXXX-XXXX-XXXX`) always render monospace, uppercase, with a subtle letter-space, and a one-tap copy affordance that morphs to a green check.
- **Hashes / roots / tx** truncate `0x8a3f…c21d` (6+6) in the UI, expand on copy, always monospace, always tabular.
- **Metrics & counters** use `tabular-nums` so digits don't jitter; trust-critical numbers render their final value instantly (never counted up).
- **Verification numbers** (block, confirmations) sit in mono beside their human label, forming the brand's characteristic "human word / machine number" pairing.

---

## 5. Material System — *Cryptal*

TrustChain's surfaces behave like **crystal and frosted glass touched by aurora light**. Materials are honest: they show depth and layering rather than faking flat "cards."

| Material | Behavior | Where |
|---|---|---|
| **Cryptal Glass** | Frosted, ~16–24px backdrop blur, saturating, thin luminous border, inner top highlight | Nav, panels, command bar, hero demo, auth card |
| **Solid Surface** | Opaque card, soft 1px border, gentle shadow | Dense data tables, dashboards (legibility first) |
| **Certificate Surface** | "Digital paper" — warm off-white plane even in dark theme; a document reads as a document | Certificate viewer, print |
| **Verification Surface** | Glass that *glows the verdict color* from within; light comes from the truth | Verdict panel |
| **Blockchain Surface** | Near-black spatial field with points of light and thin edges | Explorer, network/hash visualizations |
| **Aurora Substrate** | Fixed gradient-mesh (blue→violet→green) at low opacity, drifting slowly, behind everything | Hero, auth, verdict, CTA |
| **Grid Depth** | Faint 48px grid, radially masked, for spatial orientation | Substrate overlays |
| **Holographic Accent** | A restrained conic sheen on featured/authenticity elements only | Seal, featured cards, luxury certificate finish |
| **Noise** | 2–4% film grain to prevent banding and add "material" richness | Substrate, large glass |

**Light behavior rules:** light originates behind and within trusted content (the verdict glows outward). Shadows are soft and low; in dark/OLED, elevation is signaled by a 1px luminous border rather than a drop shadow. Reflections are subtle and only on identity/authenticity surfaces (the Seal, the certificate). Glass never reduces text contrast below AA — if it would, the surface goes solid.

---

## 6. Motion Language — *Consensus Motion* (timing)

### 6.1 Principles
1. **Every motion means agreement, arrival, connection, or confirmation.** (Vocabulary in §2.5.)
2. **One meaningful motion per view-change.** No stacking.
3. **60fps or it doesn't ship** — animate only `transform` and `opacity`; never layout.
4. **Reduced motion is a first-class theme,** not an afterthought: transforms collapse to ≤120ms opacity, pulses and loops become static, the verdict still announces.
5. **Trust values never animate** — verdicts, hashes, and counts render final instantly.

### 6.2 Timing & Curves

| Token | Duration | Curve | Use |
|---|---|---|---|
| `fast` | 120ms | ease-out | Hover, press, toggles, micro-feedback |
| `standard` | 200ms | out-expo `(0.16,1,0.3,1)` | Enters, reveals, page content |
| `overlay` | 300ms | out-expo | Modals, sheets, command bar |
| `settle` | 450ms | spring `(0.34,1.56,0.64,1)` | The verdict icon's single overshoot-and-rest |
| `pulse` | 2.4s once | ease-out | The Verification Pulse ring (VALID / confirmed) |
| `aurora` | 18s loop | ease-in-out | Substrate drift (ambient only) |

### 6.3 Motion Hierarchy (choreography)
On a view load: substrate is already present → the one focal element **settles** in → supporting content **arrives** in a 60–80ms stagger → detail (checks, rows) arrives last. Nothing waits on anything decorative; the focal truth is never gated behind an animation.

### 6.4 State-specific timing
- **Verification success:** checks *arrive* in sequence (70ms stagger) → verdict icon *settles* (450ms spring) → a single *pulse* of light (2.4s, once). Calm, assured, never a party.
- **Verification failure (TAMPERED/REVOKED):** no pulse, no bounce. Icon settles firmly; the explanation arrives without delay. Gravity through stillness.
- **Loading:** skeleton *shimmer sweep* (1.6s) + streaming content; the verification path *never* shows a spinner (see §11).
- **Transaction/anchor:** a progress that *connects* nodes toward a confirmed green point; confirmation *pulses* once.
- **Hover:** 120ms lift (−3px) + shadow/border warm; magnetic pull on primary CTAs (≤0.3 strength).
- **Page transition:** content fade + 4px rise (200ms). No slides, no route-level parallax.
- **Copy:** the icon *morphs* to a check (150ms) — a tiny, rewarding confirmation.

### 6.5 Scroll, gesture, physics
- Scroll reveals content once (fade-up 16px, out-expo), never re-triggering — respect concentration.
- Parallax is reserved for the aurora substrate only, at low magnitude.
- Physics (spring, magnetism) are gentle and damped; nothing overshoots enough to feel toy-like except the one deliberate verdict settle.
- Gestures on mobile: pull-to-refresh on lists; **no swipe-to-delete near credentials** (irreversibility discipline).

---

## 7. Blockchain Visual Language — *The Constellation*

Blockchain in TrustChain is never a stock "cube chain" cliché. It is a **constellation of light**: points (nodes/hashes) that connect into confirmed lines. Alive, elegant, calm.

| Element | Visual | Motion |
|---|---|---|
| **Node** | A point of light; dim (pending) → amber (confirming) → green (confirmed) | Confirming nodes breathe slowly; confirmed nodes hold steady |
| **Connection** | A thin Trust-Blue edge at low opacity | Brightens as two nodes reach agreement |
| **Block** | A soft-cornered luminous tile joining the chain from the right | Arrives and *settles* into line |
| **Hash** | Monospace string; on match, a brief green halo travels its length | *Sweep* of light left→right on verify |
| **Consensus** | Multiple edges brightening toward a single node | *Connect* → converge → *pulse* |
| **Transaction** | A traveling point along an edge toward its block | Moves at `standard` speed, arrives, pulses |
| **Verification** | Light entering the certificate seal and passing through cleanly | The signature §8 verification glow |
| **Synchronization** | A gentle radial wave across the node field | Slow, ambient, "the network breathes" |
| **Finality** | Confirmed node gains the faintest permanent glow | No motion — permanence is stillness |
| **Explorer** | Blockchain Surface: near-black spatial field, constellation, monospace ledger rows | Rows arrive; selected tx draws its edges |
| **Gas** | A slim luminous meter (kept out of user paths; ops-only) | Fills smoothly; never alarms users |
| **Digital signature** | A single continuous stroke of light drawing a seal, then locking | The signature flourish, once |

**The Blockchain Heartbeat:** on chain-connected surfaces, a barely-perceptible ambient pulse (one soft beat every few seconds) signals "the network is alive." It is atmosphere, never a demand for attention, and it disappears under reduced motion.

---

## 8. Certificate Identity — *The Seal*

Certificates must feel **prestigious, permanent, and unforgeable** — the digital equivalent of an embossed, sealed diploma, without kitsch.

### 8.1 Anatomy of a TrustChain Certificate
| Layer | Purpose | Treatment |
|---|---|---|
| **Digital Paper** | The document plane | Warm off-white, faint paper texture; reads as a document in any theme |
| **Institution Seal** | Who issued it | The issuer's mark within a ring of light; accreditation ring around it |
| **Blockchain Seal** | That it's sealed on-chain | The Constellation mark; on hover, edges brighten toward confirmed green |
| **Verification Seal** | Live proof status | A living seal that glows the verdict color; pulses once on verify |
| **Authenticity Layer** | Anti-screenshot trust | A holographic conic sheen that shifts subtly with pointer/tilt — present only on live, verified views |
| **Ownership Ribbon** | Who holds it | A quiet ribbon with the holder's name; appears on claim |
| **Dynamic Border** | Aliveness | A slow border-flow gradient (blue→violet→green) on featured/valid; static on print |
| **Embedded QR** | Instant re-verification | High-contrast, brand quiet-zone, always resolves to the public verdict |
| **Hash Signature** | The cryptographic truth | Monospace content hash + tx, elegantly set at the foot |
| **Digital Stamp** | The moment of issuance | Date + issuer, set like a registrar's stamp |
| **Verification Glow** | The confidence signal | Light emanating from within on a VALID state |

### 8.2 Certificate Styles (a small, dignified family)
1. **Classic Registry** — restrained, institutional; serif-adjacent formality via Sora at low contrast; for universities and boards.
2. **Modern Credential** — clean, spacious, tech-forward; for bootcamps, EdTech, professional certs.
3. **Prestige Foil** — the luxury finish: deeper paper, richer holographic Seal, more pronounced dynamic border; for honors, fellowships, flagship programs.
4. **Micro-credential Chip** — compact, badge-like, stack-friendly; for skills and modular credentials.
5. **Legacy Attested** — visibly, honestly marked "attested retroactively on <date>"; never masquerades as contemporaneous.

Every style shares the Seal, the QR, the hash foot, and the verification glow — so any TrustChain certificate is recognizable across all of them.

### 8.3 The Luxury Verification Reveal
Opening a valid certificate is a designed moment: paper settles in → Seal draws itself with a single stroke of light → holographic layer catches the light → verification glow rises → the QR reveals last. Two seconds of quiet ceremony that says *"this is real, and it is yours."* Fully skipped under reduced motion (the certificate simply appears, verified).

---

## 9. Iconography — *Line, Light, Proof*

**Philosophy:** icons are drawn as if by a single confident beam of light — consistent stroke, geometric, calm. Built on the `lucide` foundation for coverage and consistency, extended with a small custom set that carries the brand's meaning.

**Rules:**
- 1.5px stroke, 24px grid, rounded joins; optical sizing at 16/20/24.
- Every icon pairs with text or an accessible name; icons never carry meaning alone.
- Two-tone only for the custom trust set (a solid "light" fill + line), never for UI icons.
- The **shield-check** is the immutable brand glyph; it is never restyled.

**Custom trust set (the brand's own):** `seal` (layered light-ring), `constellation` (nodes + edges), `hash` (honest string mark), `anchor-point` (a node fixing to the chain), `attest` (a stamp of light), `revoke` (a broken seal), `supersede` (light passing forward), `verify-pulse` (the ring). These are used sparingly, at moments of trust, and become part of the recognition kit.

---

## 10. Illustration System — *Technical Light*

**Register:** minimal, premium, technical, elegant — **never childish, never mascot-driven, never stock-3D-blob**. Illustration in TrustChain is closer to a precise diagram lit from within than to a cartoon.

**Principles:** built from the Constellation and Seal vocabulary; thin lines, points of light, aurora tints on near-monochrome; lots of negative space; a single focal idea per illustration.

| Context | Illustration |
|---|---|
| **Hero** | The Constellation forming a Seal — abstract, luminous, calm |
| **Empty state** | A single dim node waiting to light up ("your first credential appears here") |
| **Error (404/500)** | A broken edge in the constellation, with a clear path back |
| **Offline** | The constellation dimmed, one steady local node — "still here, reconnecting" |
| **Loading** | Nodes connecting into lines (see §11) |
| **Verification** | Light passing through the Seal cleanly (valid) or refracting/breaking (tampered) |
| **Onboarding** | Three luminous steps: issue → seal → verify, each a small constellation |

No human figures unless abstracted to light; no literal graduation caps, scrolls, or coins. The imagery says *proof*, not *school* or *crypto*.

---

## 11. Loading Experience — *Consensus, Not Spinners*

**Philosophy:** loading is the network reaching agreement, shown honestly. **No spinner ever appears on the verification path.** Waiting is either instant-feeling (skeletons of the real layout) or narrated (a process, not a void).

| Situation | Treatment |
|---|---|
| **Any content** | Skeleton screens of the *actual* layout with a 1.6s shimmer sweep; content streams in as it arrives |
| **Verification** | The layout shell paints instantly (SSR); each of the seven checks resolves individually with a `…` then its result — the user watches proof happen |
| **Certificate generation** | "Sealing on the blockchain now" — a Constellation building toward a confirmed green node |
| **Network sync** | A gentle radial wave across the node field with a plain-language status |
| **Transaction** | A connecting-nodes progress, honest about confirmations, ending in one pulse |
| **Progressive reveal** | Above-the-fold first; detail and proof hydrate after, never blocking the headline |

**Loading philosophy in one line:** *never show a void, never fake completion, always narrate the truth of the wait.*

---

## 12. Emotional Design Map

For every major surface: the emotion we engineer, the confidence we build, the trust signals we plant, and the one delight we allow. (Journeys in §13.)

| Screen | Primary emotion | Secondary | Confidence target | Trust signals | Delight (one) | Density | Calm ↔ Focus |
|---|---|---|---|---|---|---|---|
| **Public Verdict** | Certainty | Relief | Very high | Verdict + 7 checks + issuer accreditation + on-chain proof; canonical domain | The single Verification Pulse | Low | Focus |
| **Verify Hub** | Ease | Curiosity | High | "Free, no account," instant lookup | Tamper reveal on paste | Low | Calm |
| **Landing** | Intrigue → conviction | Aspiration | Building | Standards badges, live verdict demo, "works even if we disappear" | The hero aurora + live demo | Low | Calm |
| **Student Wallet** | Ownership, pride | Security | High | Cross-institution unity, chain proof per card | Claim celebration (the one "!") | Low-med | Calm |
| **Claim** | Anticipation → joy | Belonging | Rising to very high | OTP to your contact, identity match | The claim shield-pulse + confetti-free beat | Low | Focus |
| **Share Builder** | Control, privacy | Confidence | High | Live "verifier will see" preview | Building your own disclosure | Low | Focus |
| **Issuer Dashboard** | Command, competence | Reassurance | High | KYB status, anchoring evidence, audit trail | Anchored-batch confirmation | Med-high | Focus |
| **Batch Wizard** | Care, control | Mild caution | High (fear-reducing) | Dry-run errors before anything is sealed; maker-checker | "0 errors — ready to seal" | High | Focus |
| **Revocation** | Gravity, responsibility | Resolve | Deliberate (slowed on purpose) | Typed REVOKE, two-person, irreversible copy | None — gravity has no delight | Low | Focus |
| **Admin KYB** | Stewardship | Diligence | High | Accreditation cross-check, on-chain register confirmation | Clean approve → registered pulse | Med | Focus |
| **Empty states** | Invitation | Optimism | N/A → onboarding | Guidance + one clear next action | The waiting node lighting up | Low | Calm |
| **Errors (404/500)** | Reassurance | Mild | Recovering | "Your work is saved," traceId, clear path | A graceful broken-edge illustration | Low | Calm |

**The macro emotional journey:** *Doubt → Curiosity → Understanding → Confidence → Trust → Advocacy.* Every screen moves the user at least one step rightward and never backward.

---

## 13. Experience Journeys

Condensed emotional-experience maps; each notes the arc and the pivotal trust moment.

- **Trust Journey (verifier, anonymous):** encounters a QR (skeptical) → scans, zero friction (surprised) → verdict in <3s with proof (convinced) → optionally re-checks independently (empowered). *Pivot: the verdict panel resolving to VALID with the pulse.*
- **Verification Journey:** input (ID/QR/file) → checks resolve one by one (watching truth happen) → verdict + issuer accreditation → proof one tap below. *Pivot: seeing the seven checks pass.*
- **Student Journey:** claim SMS (curious) → OTP + identity (a little careful) → **"Certificate claimed!"** (joy — the one celebration) → wallet with lifelong cards (pride) → selective share (control) → sees who viewed (agency). *Pivot: the claim moment.*
- **Institution Journey:** signup → KYB submitted (hopeful) → approved + on-chain register (legitimized) → first batch, dry-run catches errors (relieved) → maker-checker approve → anchored (accomplished) → "no verification emails this month" (retained). *Pivot: first anchored batch.*
- **Employer Journey:** ad-hoc scan (fast win) → team history → bulk verify, exceptions-first (efficient) → API/ATS (integrated) → independent re-check (trusting the math). *Pivot: exceptions-first bulk result.*
- **Administrator Journey:** KYB queue (careful) → cross-check + approve (responsible) → anchoring ops green (in control) → fraud case (protective) → resolution logged (accountable). *Pivot: a clean, audited approval.*
- **Onboarding Journey:** a luminous three-beat — *issue → seal → verify* — teaching the whole model in fifteen seconds, with a live sample verdict to try. *Pivot: verifying the sample yourself.*
- **Empty Journey:** never a dead end — a waiting node, a plain-language promise, one action. *Pivot: the first credential lighting the node.*
- **Failure-Recovery Journey:** blameless message → cause named → next step offered → work preserved → traceId for support. *Pivot: realizing nothing was lost.*
- **Achievement Journey:** claim, first share, first verification-by-an-employer — each a small, honest acknowledgment (never gamified). *Pivot: "someone verified your credential."*

---

## 14. Premium Details (the invisible craftsmanship)

A living list of "1% details" that compound into the feeling of a world-class product. (Interaction-level specifics in [MICROINTERACTIONS.md](MICROINTERACTIONS.md).)

- **Adaptive glow** — the verdict's ambient glow subtly matches the result color.
- **Blockchain heartbeat** — a barely-there ambient pulse on chain-connected views.
- **Context-aware lighting** — the aurora shifts hue toward the active role's accent.
- **Trust meter** — a confidence indicator that fills as checks pass, resting full and still on VALID.
- **Digital fingerprint** — the hash briefly renders as a constellation "signature" on first reveal.
- **Cursor magnetism** — primary CTAs gently court the pointer (≤0.3, damped).
- **Elegant copy** — every copy affordance morphs to a green check; hashes expand-on-copy.
- **Premium QR reveal** — the QR assembles from its quiet zone inward on certificate open.
- **Animated verification ribbon** — the ownership ribbon draws in on claim.
- **Digital signature flourish** — the Seal draws with one stroke of light, then locks.
- **Adaptive blur** — background blur deepens when a modal or the command bar takes focus.
- **Prestige animation** — flagship/honors certificates catch a slower, richer holographic sweep.
- **Live activity whisper** — subtle, non-intrusive "verified 3 times today" on a holder's card.
- **Rewarding confirmation** — anchored batches resolve with a single satisfying green pulse and a plain, proud line of copy.
- **Silence as luxury** — the deliberate, generous space around the one thing that matters.

The rule for every premium detail: *it must be felt more than noticed, it must carry meaning, and it must vanish gracefully under reduced motion.*

---

## 15. Sound Design (future-ready, optional)

Sound, if ever enabled, follows the same law as motion: **it signals consensus and confirmation, never decorates.** Default off; opt-in; always with a visual equivalent (accessibility).

| Event | Sound character | Feeling |
|---|---|---|
| Wallet connect | Two soft ascending tones resolving | "Linked, secure" |
| Verification success | A single warm, resonant confirmation chime | "Proven" (calm, not triumphant) |
| Verification failure | A soft, low, non-jarring double note | "Stop and look" (never alarming) |
| Transaction confirmed | A brief crystalline "settle" | "Permanent" |
| Notification | A gentle, brief presence tone | "Something to see" |
| Achievement (claim) | The one slightly warmer flourish | "This is yours" |
| Hover / interaction | Near-silent tactile ticks (optional, off by default) | "Responsive" |
| Ambient (explorer) | An almost-inaudible network hum | "The chain is alive" |

**Accessibility:** every sound has a visual twin; nothing depends on audio; a single master toggle; respects OS reduce-sound and mute; never plays on the verdict path without explicit opt-in (verdicts must never require sound to be understood).

---

## 16. Consistency & Review Checklists

Every screen must pass these before it is "TrustChain."

### 16.1 Brand Checklist
- [ ] Recognizable as TrustChain without the logo (recognition kit §1.7 present)?
- [ ] One truth per view; the important thing has the most space and light?
- [ ] Voice matches the moment (§1.5); no forbidden voice?
- [ ] Trust Blue owns the single primary action; state color ≤ ~1%?

### 16.2 Design Checklist
- [ ] Semantic tokens only — no raw hex?
- [ ] Three depth planes max; aurora/glow behind content, never above legibility?
- [ ] Type: Sora headings, Inter body, JetBrains mono for IDs/hashes; measure ≤ 66ch?
- [ ] Numbers tabular; trust numbers render final (never animated)?

### 16.3 Motion Checklist
- [ ] Every motion means agreement/arrival/connection/confirmation (§2.5)?
- [ ] One meaningful motion per view-change; only transform/opacity animated?
- [ ] Reduced-motion path complete; verdict still announces; no spinner on verify path?
- [ ] The Verification Pulse plays once, never loops?

### 16.4 Component Checklist
- [ ] Variant × size × state × theme all render?
- [ ] Keyboard-complete, visible focus, accessible name, loading/empty/error states?
- [ ] Danger variant distinct + paired with confirmation?

### 16.5 Accessibility Checklist (WCAG 2.2 AA)
- [ ] Contrast AA (verdict text target ≥ 7:1); meaning survives grayscale?
- [ ] Verdicts = icon + label + color (never color alone)?
- [ ] Full keyboard journey; focus not obscured (2.4.11); targets ≥ 24px (44px touch)?
- [ ] Live regions announce verdicts (role=status) and toasts (polite)?
- [ ] Reduced-motion and high-contrast themes honored?

### 16.6 Consistency Checklist
- [ ] Spacing on the 4px grid; radius/elevation from tokens?
- [ ] Icons paired with names; the shield-check unrestyled?
- [ ] Copy in sentence case; dates/numbers localized?
- [ ] Empty/error states use the Constellation illustration vocabulary?

### 16.7 Review Ritual
Design review → accessibility annotation pass → motion review (reduced-motion demoed) → brand-recognition gut check ("does this feel like TrustChain with the logo covered?") → tokens/parity check → sign-off. Only sign-off makes a screen buildable truth.

---

## 17. Future Evolution — The Visual Roadmap

The system is designed to grow without breaking recognition. Each edition inherits `Proof of Light`; it never restarts it.

| Horizon | Adds | Design intent |
|---|---|---|
| **v1 (now)** | The full language: verdict panel, Seal, Cryptal glass, Consensus Motion, command bar, five themes | Establish the recognition kit and the trust feeling |
| **v2** | Live Constellation explorer, animated certificate reveal, richer AI-assisted helper cards, deeper role-lighting | Make the chain *felt*; deepen prestige |
| **v3** | Selective-disclosure "light-masking" visuals (share only what glows), ZK "prove-without-revealing" motifs | Visualize privacy as controllable light |
| **Enterprise Edition** | Multi-tenant theming within brand guardrails, white-label Seal variants, dense ops surfaces | Flexibility without dilution |
| **Government Edition** | Heightened formality, official-green regulator lighting, print-grade certificate fidelity, sovereignty cues | Institutional gravity, on-country calm |
| **Mobile App** | Native wallet, tactile claim, offline verified-cache with honest staleness, camera-first verify | The Seal in your pocket |
| **Desktop App** | Command-bar-first power surface, multi-window explorer, keyboard everything | For registrars and analysts who live in it |
| **AR Verification** | Point-to-verify: a physical certificate blooms its live Seal and verdict in space | The verdict, made spatial |
| **AI Assistant** | A calm, grounded helper that only speaks from verified data, with citations; light-based "thinking" | Trust extended to explanation |
| **Immersive Certificate Viewer** | A spatial, holographic Seal you can turn in the light | Prestige as an experience |
| **Digital Identity Wallet** | Credentials + DIDs + selective disclosure as a unified constellation of *you* | The self, as verifiable light |

**Evolution law:** any future addition must still pass the recognition gut-check and the emotional map. New capability, same soul. `Proof of Light` is the constant.

---

*This document is the TrustChain design constitution. It governs — and outlives — any individual screen. Amendments require a design-council review and a version bump. Companion catalogs: [MICROINTERACTIONS.md](MICROINTERACTIONS.md) · [DESIGN-TOKENS.md](DESIGN-TOKENS.md).*
