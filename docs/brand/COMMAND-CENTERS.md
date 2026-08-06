# TrustChain — Command Center Experience System (Blueprint)

**Not dashboards. Command centers.** Four workspaces — Institution, Student, Employer, Administrator — each engineered so the operator feels *"I am running a powerful, trustworthy system."* Not CRUD. Not an admin panel. Mission Control for trust.

Inherits `Proof of Light` ([DESIGN-LANGUAGE](DESIGN-LANGUAGE.md), [DESIGN-TOKENS](DESIGN-TOKENS.md), [MICROINTERACTIONS](MICROINTERACTIONS.md)). Every surface uses the shipped vocabulary: **The Constellation**, **The Seal**, **Consensus Motion**, **Cryptal glass**, aurora substrate, **Trust Blue `#1D4ED8`**, role accents, **Sora / Inter / JetBrains Mono**, the **7-verdict** engine. No code — the experience blueprint.

> **North star:** Bloomberg Terminal density × Apple restraint × Linear motion × NASA-console authority — unmistakably TrustChain.

---

## 1. Workspace Philosophy — identity, mood, purpose, flow, emotion, motion

A workspace is not a page. It has a **personality** the operator feels the instant it loads. Each portal is lit by its **role accent** (the aurora shifts hue on entry) so a returning user knows *which world they're in* pre-consciously.

| Workspace | Accent | Identity | Mood | Emotion engineered |
|---|---|---|---|---|
| **Institution** | Trust Blue `#1D4ED8` | The Registry Office | Composed authority | Command, control, competence |
| **Student** | Aurora Violet `#7C3AED` | The Identity Vault | Personal, proud, secure | Ownership, belonging |
| **Employer** | Cyan `#0891B2` | The Inspection Deck | Fast, sharp, decisive | Confidence, speed, authority |
| **Administrator** | Amber `#B45309` | Mission Control | Vigilant, operational, calm-under-load | Stewardship, situational awareness |

**Six laws every workspace obeys:**
1. **One truth on entry.** The single most-important thing (a queue, a verdict, an alert) owns the top-left focal zone.
2. **The system feels alive.** A barely-there blockchain heartbeat + live-status dots signal "operational," never demanding attention.
3. **Density with air.** Bloomberg information density, but the *important* number always has silence around it.
4. **Motion means data.** Panels breathe on new data; nothing animates for decoration (Consensus Motion).
5. **Power is keyboard-first.** ⌘K everywhere; every action reachable without a mouse.
6. **Trust is reinforced constantly.** Anchoring evidence, audit trails, accreditation chips, and honest "as-of" timestamps are always in view, never buried.

---

## 2. Information Hierarchy — cognitive attention map

Design order follows how the eye and brain triage under load (F-pattern + pre-attentive cues: motion, luminance, color pop).

**The five questions, mapped to zones (every workspace):**

| Question | Zone | Treatment |
|---|---|---|
| **What matters now?** | Top-left focal (largest, most light) | The primary KPI/queue/verdict, glowing |
| **What needs attention?** | Attention rail (right of focal) | Amber/red items only — rare, therefore loud |
| **What changed?** | Activity spine (right column) | Newest-first live feed, arrives with motion |
| **What can I do?** | Quick-action dock (bottom or top-right) | 3–5 primary actions, always reachable |
| **Where is the chain acting?** | Blockchain strip (persistent, thin) | Live anchoring/consensus status, ambient |

**Pre-attentive rules:** only *attention* items use warm color; only *new* items use motion-on-arrival; only the *focal* uses the highest luminance. If everything glows, nothing does — the 1% state-color discipline is enforced hardest here.

**Visual attention map (Institution example):**
```
┌──────────────────────────────────────────────────────────┐
│ [FOCAL: Live Certificate Pipeline]      [ATTENTION RAIL]  │
│  big, glowing, breathing on new data     pending approvals │
│                                          failed rows        │
│ ┌─ Trust Index ─┐ ┌─ Verifications ─┐   open disputes      │
│ │  animated ring │ │ time-series     │  ─────────────────  │
│ └───────────────┘ └─────────────────┘  [ACTIVITY SPINE]    │
│ ┌── Blockchain Activity strip (thin, live) ──┐  newest     │
│ └─────────────────────────────────────────────┘  first     │
│ [QUICK-ACTION DOCK: New batch · Invite · Analytics]        │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Layout System — adaptive workspaces (beyond sidebar + cards)

Six composable layout primitives; each workspace picks a default and can morph.

1. **Bento grid** — the default. Resizable glass tiles on a 12-col spatial grid; important tiles span more, glow more. Tiles remember size per user (workspace memory).
2. **Floating panels** — context panels slide over the bento (a certificate detail, an approval) as Cryptal glass, dimming the field behind (adaptive blur).
3. **Dock navigation** — a floating glass dock (bottom on desktop, tab-bar on mobile) replaces the heavy sidebar for primary nav; role-accent active state.
4. **Context panels** — right-edge slide-ins for the selected item's detail/actions; never a full page nav.
5. **Focus mode** — press `F`: everything but the active task dims to 20%; the task tile expands with a soft glow. For batch approval, revocation, KYB review.
6. **Zen mode** — press `Z`: strips all chrome to a single centered task on the aurora field — for the gravest actions (revocation, chain kill-switch), where the UI removes all distraction and demands full presence.

**Context-aware behavior:** the layout adapts to state — empty tenant shows an onboarding bento; a surge shows the anchoring strip promoted to focal; an incident promotes the alert rail. The workspace reorganizes around what matters *right now*.

**Responsive:** bento reflows 12→6→1 col; dock → bottom tab-bar; context panels → full-screen sheets; focus/zen persist on mobile (they're even more valuable on small screens).

---

## 4. Institution Command Center — storyboard

**Identity:** The Registry Office. Trust-Blue lit. Composed, authoritative.

**Entry (0–1.2s):** aurora warms to Trust Blue; the **Live Certificate Pipeline** focal tile settles first (spring), KPIs count to value, the blockchain strip's heartbeat begins, the activity spine streams its three newest events. Nothing else moves.

**Bento tiles:**
- **Live Certificate Pipeline (focal, 2×2):** issued → claimed → verified as a flowing light-stream; new issuances emit as points; breathes on new data.
- **Trust Index (1×1):** an animated ring (accreditation + verification health + revocation rate) — a single 0–100 figure with a glowing arc; the institution's "prestige" made visible.
- **Verification Queue / Requests (1×2):** pending items, newest-first, each a glass row; hover reveals actions.
- **Blockchain Activity strip (persistent, 4-wide, thin):** anchoring FSM (queued→submitted→confirmed→finalized) as live counts + a mini Constellation; the chain, alive.
- **Institution Status (1×1):** KYB/active/suspended with the on-chain issuer badge; green finality glow when registered.
- **Certificate Timeline (2×1):** a horizontal light-spine of recent batches; click → context panel.
- **Recent Activity spine (right col):** audit-grade feed with actor + accent-coded event.
- **Analytics (2×1):** verifications by verdict, claim-rate funnel — interactive, animated draw-in.
- **AI Suggestions (1×1):** grounded helper cards ("37 unclaimed >30 days — re-notify?") — advisory, never auto-acting, always cited.
- **System Health (1×1):** relayer wallet, anchoring latency, RPC — green heartbeat.
- **Quick-action dock:** New batch · Invite member · Revocations · Analytics · Audit.

**Prestige moment:** when a batch anchors, the pipeline emits a satisfying green pulse and the Trust Index ring ticks up — the operator *feels* the institution's standing grow.

**Signature flows:** batch approval enters **Focus mode** (the batch tile expands, maker-checker banner, one Approve action); revocation enters **Zen mode** (typed REVOKE, two-person, grave).

---

## 5. Student Experience — the Identity Vault

**Identity:** Apple Wallet × Digital Passport × Identity Vault. Aurora-Violet lit. Personal, proud, secure.

**Not a dashboard — a vault of light.** The credential collection *is* the interface.

**Storyboard:**
- **Entry:** violet aurora; the **Digital Identity Card** (a Cryptal-glass credential holding the holder's name + DID + a live Seal) settles at top — the passport cover.
- **Credential collection:** certificates as **stacked luxury cards** (Apple-Wallet fan) that spread on hover; each catches a holographic tilt with the pointer; tapping brings one forward with a shared-element morph into the **Luxury Certificate Viewer**.
- **Trust Score:** a small violet ring — claimed rate, verification activity, share health — the holder's own standing.
- **Academic Journey / Achievement Showcase:** a vertical **timeline of light** — issue → claim → each verification event as a node; scroll = walk the journey.
- **Institution Network:** the issuers who've sealed your credentials, as a small Constellation — "who vouches for me."
- **Blockchain Timeline:** each credential's on-chain life (anchor → status updates), monospace + light-spine.
- **Animated QR:** on the identity card, a QR that assembles from its quiet-zone inward on reveal; scanning shows the live public verdict.
- **Ownership history:** who viewed each share, when — agency made visible.

**Premium moments:** the claim celebration (shield pulse + the one warm line); the ribbon-of-light drawing across a newly claimed card; selective-disclosure builder where hidden fields dim as you toggle — privacy as controllable light.

**Emotion:** this is *yours*. The vault feels valuable, personal, and permanent.

---

## 6. Employer Experience — the Inspection Deck

**Identity:** fast, sharp, decisive. Cyan lit. Confidence, speed, authority.

**Storyboard:**
- **Focal:** a **mega verify input** (paste ID / scan QR / drop file) that dominates — the deck exists to answer one question fast.
- **Live Results:** verdicts resolve with the seven-check rail + pulse; the **Trust Meter** fills and rests full on VALID; issuer **reputation** chip (accreditation + institution history) fades in beside it.
- **AI Verification Summary:** a grounded one-line read ("Valid · accredited issuer · issued 2024 · never revoked") — decision support, cited, never a black box.
- **Certificate Comparison:** two credentials side-by-side (a candidate's claims vs. a reference) with matched/mismatched fields highlighted — for diligence.
- **Bulk verify:** CSV → **exceptions-first** results (REVOKED/TAMPERED float to top); watch-list arm in one click.
- **Verification History:** past checks as immutable verdict snapshots with notes/tags; a **Trust Timeline** per candidate.
- **Risk Indicators:** quiet amber/red flags (unknown issuer, suspended institution, prior fraud flag) — surfaced, never screamed.
- **Blockchain Timeline:** the tx/anchor proof one tap below every verdict.

**Flow philosophy:** the deck optimizes for *time-to-confident-decision*. Exceptions surface first; valid is calm and instant; fraud is caught firmly. The employer feels sharp and in control.

---

## 7. Administrator Command Center — Mission Control

**Identity:** vigilant, operational, calm-under-load. Amber lit. Stewardship + situational awareness.

**The operational center.** Everything is live; nothing is alarming until it must be.

**Bento:**
- **Global System Overview (focal):** SLO tiles — verify availability, p95 latency, anchor queue depth+age, relayer balances, webhook DLQ, open KYB — each green/amber/red, each linking a runbook. Red/amber only when real.
- **Network Health:** a live **node Constellation** — RPC providers, indexer lag, confirmation depth — the chain's vital signs.
- **Blockchain strip → full Explorer:** transaction timeline, hash explorer, consensus view, gas usage, wallet activity — the digital ledger, alive and inspectable.
- **Institutions:** KYB queue (SLA-sorted), tenant lifecycle, suspicious-issuer flags.
- **Certificates / Traffic:** issuance + verification volume heatmaps.
- **Security / Fraud Detection:** flag stream, risk scores, a **verification heatmap** (where/when checks happen), anomaly alerts.
- **Audit Logs:** append-only, "chain verified ✓" integrity banner, expandable diffs.
- **Alerts:** a triage rail; each alert = one line, severity-tagged, runbook-linked.
- **Analytics:** platform growth, anchoring cost, fraud trends — forecasts included.

**Situational-awareness law:** under an incident, the layout **auto-promotes** the relevant tile to focal, dims the rest (context-aware). The admin's attention is directed by the system, not left to hunt.

**Gravest actions** (chain kill-switch, tenant suspension) enter **Zen mode** with dual-control — the UI removes all else and demands presence.

---

## 8. Blockchain Experience — alive and interactive

The chain is rendered as **The Constellation**, never a stock cube-chain.

| Element | Visual | Interaction |
|---|---|---|
| Nodes | points of light: dim (pending) → amber (confirming) → green (confirmed) | hover = inspect; click = draw its edges |
| Connections | thin Trust-Blue edges, brighten on consensus | scroll velocity feeds ripple speed |
| Blocks | luminous tiles joining from the right, settling | click = expand tx list |
| Hashes | monospace; matched hash gets a green halo sweep | copy-morph to check |
| Consensus | edges converge + brighten to one node, pulse | user click = cause a ripple |
| Transactions | a point travels an edge to its block, pulses on arrival | select = highlight its path |
| Gas | slim luminous meter (ops-only) | ambient, never alarms users |
| Ledger | monospace rows streaming in | select row = draw its constellation edges |
| Verification signals | light entering a Seal, passing through | live per verdict |

**Blockchain heartbeat:** one soft ambient pulse every few seconds on chain-connected surfaces — "the network is alive." Vanishes under reduced motion.

---

## 9. Analytics — premium visualization (no boring charts)

- **Trust Evolution:** a glowing line that *is* the institution's trust index over time; the line brightens where verification activity peaks.
- **Certificate Trends / Institution Growth:** animated area charts that draw in from baseline; hover pins a glass tooltip; every chart has a **table toggle** (accessibility).
- **Blockchain Activity:** anchoring volume as a pulse-timeline synced to the heartbeat.
- **Verification Success:** the seven-check pass-rate as a small multiples grid.
- **Risk Analysis:** a heatmap (issuer × time) where fraud flags glow.
- **Verification Heatmap:** geographic/temporal density of checks.
- **Comparison Views:** benchmark vs. sector median (anonymized).
- **Forecasts:** dotted projection continuing the glowing line, clearly labeled "projected."
- **Timeline:** the certificate/institution lifecycle as an interactive light-spine.

**Rules:** numbers render final + tabular (never animated counts on trust figures); series distinguished by shape/dash (not hue alone); every viz is keyboard-navigable and table-fallback-equipped; color carries meaning, never mood.

---

## 10. Certificate Experience — luxury viewer

Full anatomy in [DESIGN-LANGUAGE §8](DESIGN-LANGUAGE.md). In the workspaces:

- **Luxury Certificate Viewer:** digital paper on the aurora surround; the **Seal draws in one stroke of light** then locks; holographic tilt tracks the pointer; dynamic border-flow (blue→violet→green) on valid; verification glow rises from within.
- **Interactive preview:** hover a stacked card → it lifts and previews; click → shared-element morph to full viewer.
- **Animated verification:** the seven checks light in sequence, verdict settles, one pulse.
- **Blockchain stamp / institution seal / hash signature:** the tx + anchor + content hash set as an elegant monospace foot; the issuer seal ringed with accreditation.
- **Security texture / dynamic watermark / holographic layer:** present only on **live, verified** views (anti-screenshot authenticity).
- **Ownership ribbon:** draws in on claim.
- **Animated QR:** assembles inward; always resolves to the public verdict.

**Five styles** (Classic Registry, Modern Credential, Prestige Foil, Micro-credential Chip, Legacy Attested) — all share the Seal, QR, hash foot, verification glow, so any TrustChain certificate is recognizable.

---

## 11. Microinteraction Library — 300+ (index)

The workspaces draw from and extend the [220-entry catalog](MICROINTERACTIONS.md). This blueprint adds **80+ workspace-specific interactions** (bringing the system past 300). Each: trigger → response → meaning → reduced-motion fallback.

**Bento & panels (1–20):** tile hover-lift · tile resize handle glow · tile drag with ghost + snap · tile settle on drop · new-data breath on tile · focal glow intensify · context-panel slide-over + backdrop blur · panel close recede · focus-mode dim-others · zen-mode strip-chrome · workspace-memory restore animation · tile pin sparkle · tile favorite fill · split-view divider glow · widget rearrange stagger · empty-tile onboarding shimmer · tile error state (amber border) · tile loading skeleton · tile refresh pulse · tile expand→full.

**Institution (21–45):** pipeline new-issuance emit · Trust-Index ring tick-up · anchored-batch green pulse · verification-queue row hover-actions · approval Focus-mode expand · maker-checker banner settle · self-approval block hint · KYB-status arc (pending→active) · issuer-registered finality glow · relayer-balance heartbeat · anchoring FSM column tick · audit-row arrive · dispute-SLA amber pulse · unclaimed-nudge card · re-notify confirm · analytics draw-in · funnel step light · member-invite role-badge · key-rotation reassurance · suspend-tenant grave dialog · batch dry-run errors-first table · fix-row check clear · submit-for-approval note · anchoring-delayed honest state · report-ready pulse.

**Student (46–68):** wallet-card fan spread · card holographic tilt · card→viewer shared-element morph · identity-card Seal breathe · claim shield-pulse · ownership-ribbon draw · trust-score ring fill · journey-timeline node arrive · institution-network constellation form · QR assemble-inward · share-builder field-dim · share-created link+QR assemble · share-revoke confirm · view-event whisper · download-menu explainer fade · VC-JSON download pulse · DigiLocker-push pending state · dispute-open form · achievement acknowledgment · academic-journey scroll-reveal · credential-detail proof expand · copy-cert-ID morph · offline-cached badge.

**Employer (69–86):** mega-input focus widen · verdict stream-in · Trust-Meter fill+rest · issuer-reputation chip · AI-summary line settle · comparison field-match highlight · bulk exceptions-first float · watch-list arm · risk-flag amber surface · verification-history snapshot · trust-timeline node · attestation-PDF assemble · candidate-tag inline edit · scan-QR camera modal · file-drop verify accept · tamper-caught firm settle · consent-request send · usage-quota meter.

**Admin (87–110):** SLO-tile red/amber/green · incident auto-promote-to-focal · node-Constellation health pulse · anchor-retry idempotent · kill-switch dual-control zen · KYB-approve registered pulse · tenant-suspend confirm · fraud-flag case-create · risk-score attach · verification-heatmap glow · alert-triage row · audit integrity-banner · gas-meter fill (ops) · explorer row→edges · consensus-view converge · webhook-DLQ count · runbook-link hover · announcement-editor · regulator-view official-green lighting · analytics-forecast dotted-line · anomaly-alert pulse · balance-alert amber card · session-JIT-timer.

**Blockchain & atmosphere (111–130+):** heartbeat ambient pulse · consensus sweep · block join+settle · tx travel+pulse · hash halo sweep · node inspect-on-hover · click-causes-ripple · sync wave · finality permanent-glow · aurora role-hue shift · cursor-magnetism on CTAs · glass-reflection on Cryptal tiles · context-glow on active tile · floating-shadow lift · adaptive-blur on panel-open · ambient-light warm-on-cursor · scroll-velocity ripple · trust-ribbon on prestige · animated-hash on reveal · live-status dot.

*(Full 300+ enumerated in build; this index defines the categories, timings inherit the token set: `fast/standard/overlay/settle/pulse`.)*

---

## 12. Navigation — philosophy (beyond menus)

- **Command palette (⌘K):** the primary navigator — search actions, jump anywhere, paste a `TC-…` to verify instantly. Already shipped; extend per workspace.
- **Floating dock:** glass, bottom-center (desktop), role-accent active; the 5 core destinations per workspace. Replaces the heavy sidebar.
- **Global search:** `/` opens instant search across certificates/holders/batches (privacy-scoped).
- **Workspace tabs:** power users open multiple contexts (a batch + a certificate + analytics) as tabs; state persists.
- **Quick switcher:** ⌘1–5 jump to dock destinations; ⌘[ / ⌘] history back/forward.
- **Workspace memory:** tile sizes, last route, open panels restore on return — the workspace remembers you.
- **Context navigation:** selecting an item slides in its context panel; you never lose your place.

---

## 13. Empty states — premium guidance

Each = the Constellation vocabulary: a dim waiting node + one plain-language promise + one action.

| Empty | Visual + copy |
|---|---|
| No certificates | a single dim node; *"Issue your first batch — we'll validate, approve, and seal it."* + New batch |
| No activity | a still constellation; *"All quiet. New activity appears here as it happens."* |
| No institution | onboarding bento; *"Register your institution to start issuing."* |
| No analytics | *"No data for this range."* + widen-range action |
| No verification history | scan illustration; *"Verify your first candidate."* |
| No credentials (student) | a waiting node that lights on first claim; *"When an institution issues you a certificate, it appears here."* |

Never a dead end. Every empty is an invitation.

---

## 14. Loading — choreography (no spinners)

| Situation | Treatment |
|---|---|
| Any tile | skeleton of the *real* tile + 1.6s shimmer sweep; content streams in |
| Certificate assembly | the Seal + fields draw in progressively |
| Blockchain sync | radial wave across the node field + plain-language status |
| Verification | the seven checks resolve individually (`…`→result); never a spinner |
| Network loading | Constellation building toward a confirmed green node |
| Progressive | focal tile first; supporting tiles hydrate after; proof last |

**Law:** never a void, never a fake-complete, always narrate the wait's truth.

---

## 15. Motion System — timing rules

Inherits the tokens (`fast` 120ms · `standard` 200ms · `overlay` 300ms · `settle` 450ms spring · `pulse` 2.4s once · `aurora` 18s).

| Event | Spec |
|---|---|
| Tile hover | lift −3px + shadow warm, 120ms |
| Panel expand / context slide | 300ms out-expo |
| Widget rearrange | 200ms stagger 40ms, spring |
| Drag | 1:1 follow, ghost at 0.6 opacity, snap 150ms |
| Timeline scrub | scrubbed to input, no easing |
| Notification arrive | slide+fade 200ms, aria-live |
| Wallet connect | glass panel + address settle, 300ms |
| Verification | checks 120ms stagger → verdict 450ms settle → one pulse |
| Chart motion | draw-in from baseline 600ms, once |
| New-data breath | tile scale 1→1.01→1, 400ms, on data change |
| Context motion | active tile glow-in, others dim to 0.5, 200ms |

**Laws:** transform/opacity only; one focal motion at a time; reduced-motion collapses all to ≤120ms opacity; trust values (verdicts, hashes, counts) render final; 60 FPS floor.

---

## 16. Interaction Design — the power-user model

- **Keyboard shortcuts:** ⌘K palette · `/` search · `F` focus · `Z` zen · ⌘1–5 dock · ⌘\ sidebar · ⌘Enter submit · Esc close/cancel · `J/K` list nav · `X` multi-select.
- **Power-user mode:** denser tables, keyboard-only flows, vim-style list nav, bulk-action bar.
- **Right-click / context menus:** on any item — the fast path to actions without hunting.
- **Multi-select + bulk actions:** shift/⌘-click; a floating action bar rises; bulk re-notify, export, watch-list.
- **Drag-drop:** reorder bento tiles; drag a certificate into a comparison slot (employer).
- **Smart search:** typo-tolerant, entity-aware (recognizes `TC-…` IDs, emails, batch names).
- **AI assistance:** grounded helper cards + a NL query on analytics ("claim rate for 2025 CSE cohort?") — always cited, never auto-acting.

---

## 17. Visual Details — the premium 1% (60+)

Adaptive ambient light (aurora warms toward cursor + role accent) · glass reflections on every Cryptal tile · cursor magnetism on primary CTAs · live blockchain heartbeat · certificate glow on valid · institution-prestige ring animation · trust ribbon on claim · animated hash constellation · context glow on active tile · floating shadows (elevation = luminous border in dark) · adaptive blur on panel-open · light-follows-cursor on the Seal · elegant copy-morph · premium QR assemble · verification pulse · finality permanent-glow · new-data tile breath · SLO-tile status heartbeat · accreditation chip on every issuer · honest "as-of" timestamp on cached state · exceptions-first ordering everywhere · one-warm-line claim celebration · Zen-mode aurora field · Focus-mode dim-others · workspace-memory restore · role-accent sidebar glide · scroll-velocity ripple · monospace chapter-slates · film-grain on large glass · grid-horizon depth · … (full list enumerated at build; each felt-not-noticed, meaningful, reduced-motion-safe).

---

## 18. Productivity enhancements

Quick commands (⌘K) · recent actions (⌘K default list) · pinned tiles/items · favorites · history (⌘[ / ⌘]) · workspace recall (tiles + route + panels restore) · multi-window (open a batch in a new tab/window) · split view (compare two certificates / a batch beside its report) · saved filters · scheduled exports · keyboard-only issuance and approval paths.

---

## 19. Accessibility (WCAG 2.2 AA)

- **Reduced motion:** every breath/pulse/ripple/heartbeat has a static fallback; the workspace becomes a still, legible information surface.
- **Keyboard:** the whole system is operable without a mouse; ⌘K + dock + `/` cover all nav; focus rings visible; focus-not-obscured under sticky tiles.
- **Screen readers:** each tile is a labeled region; live feeds use `aria-live=polite`; verdicts `role=status`; canvases/constellations `aria-hidden` with text equivalents; charts have table toggles.
- **Contrast:** all text AA; verdict text ≥7:1 target; a high-contrast theme strips aurora/glow and thickens borders.
- **Touch:** dock → bottom tab-bar; tiles → cards; context panels → sheets; 44px targets; heavy effects off on low-power; no swipe-near-destructive.
- **Responsive:** bento 12→6→1; focus/zen persist (more valuable on mobile).

---

## 20. Performance (Lighthouse ≥95 · 60 FPS)

- **One WebGL context max** (the admin node-Constellation / explorer), lazy-loaded, IO-paused off-view; every other "alive" element is CSS/Framer (compositor-only).
- **Virtualize** all lists/tables >50 rows; windowed rendering on the activity spine and audit log.
- **Minimal repaints:** animate transform/opacity only; `will-change` sparingly; new-data breath on the changed tile only, never the grid.
- **Data:** TanStack Query SWR; live feeds via SSE/poll with backoff; skeletons prevent CLS (fixed tile heights).
- **Bundle:** route + workspace code-split; charts/web3 lazy; fonts preloaded (self-host prod).
- **Gates:** Lighthouse ≥95 in CI; 60 FPS profiled on a mid device; off-view pause verified; new-error-in-release blocks promotion.

---

## Build handoff

1. **Bento engine** (resizable, draggable, workspace-memory) — one primitive, four workspaces.
2. **Layout modes** (focus `F`, zen `Z`) as global state + CSS.
3. **Workspace shells** with role-accent aurora + dock + ⌘K + context panels.
4. **Tiles** compose shipped components (`StatCard`, `VerdictPanel`, `CheckList`, charts, `Timeline`, `AnchorProof`) + the new pipeline/Trust-Index/node-Constellation visuals.
5. **Live layer:** SSE feeds, new-data breath, heartbeat, SLO tiles.
6. **Certificate viewer** with the Seal draw + holographic tilt + verification glow.
7. **A11y + reduced-motion + device tiers** wired from day one.
8. **Perf gates** in CI.

---

*The complete TrustChain Command Center Experience System. Bloomberg density, Apple restraint, Linear motion, NASA-console authority — every tile lit by `Proof of Light`, every motion meaning trust, every workspace making the operator feel they run a powerful, trustworthy system. Build it so opening a workspace feels like taking the controls.*
