# UI Upgrade — what changed, and how to undo it

The luxury UI upgrade is a single commit on top of a clean baseline, so
reverting is one command and nothing else in the project is affected.

| | |
|---|---|
| Baseline (before upgrade) | commit `0d9da28`, tag **`ui-baseline-pre-upgrade`**, branch `ui-baseline-backup` |
| Upgrade | commit `8421438` |

Only `frontend/` changed. Backend, blockchain contracts, and QA are untouched.

---

## Roll back

**Undo the upgrade, keep the history** (recommended — reversible):

```bash
git revert 8421438
```

**Restore only the frontend files to their pre-upgrade state:**

```bash
git checkout ui-baseline-pre-upgrade -- frontend/
```

**Discard everything since the baseline** (destructive — you lose the upgrade commit):

```bash
git reset --hard ui-baseline-pre-upgrade
```

After any of these, restart the dev server. No database reseed or backend
restart is needed — nothing outside `frontend/` was modified.

## Roll back just one piece

The changes are independent; you can keep the rest and undo one:

```bash
# Just the 3D loader (restores the plain spinner in the Suspense fallback)
git checkout ui-baseline-pre-upgrade -- frontend/src/routes/index.tsx
rm frontend/src/components/motion/BlockchainLoader.tsx

# Just the boot-sequence route gating (restores the intro on every route)
git checkout ui-baseline-pre-upgrade -- frontend/src/App.tsx

# Just the heading/paragraph text-wrap rules and hover lighting
git checkout ui-baseline-pre-upgrade -- frontend/src/styles/globals.css
```

---

## What the upgrade added

**`BlockchainLoader`** (`components/motion/BlockchainLoader.tsx`) — the signature
loading animation. Eight cube corners are rotated on two axes and run through a
perspective projection every frame, with faces depth-sorted so the geometry
reads as solid; blocks seal in sequence and a connector lights between them.
One canvas, one `requestAnimationFrame` loop. It deliberately shows **no hashes
or block numbers** — a loading state has nothing real to display yet, and
inventing plausible hex would be the same fake technical data this codebase
refuses everywhere else. Under `prefers-reduced-motion` the loop never starts;
a static, fully-sealed frame renders instead.

**`Spotlight`** (`components/motion/index.tsx`) — a soft specular highlight that
follows the cursor across a card, so surfaces catch light where you touch them.
Pointer position is written straight to CSS custom properties rather than React
state, because re-rendering a card subtree at pointer frequency is exactly what
makes an interface feel heavy. Disabled for coarse pointers, reduced motion, and
the high-contrast theme.

**`LinkButton`** (`components/ui/button.tsx`) — a router link styled as a button,
replacing the `<Link><Button/></Link>` pattern.

## Defects found by screenshot inspection

These were found by driving a real browser and looking, not by reading code:

1. **The brand intro hijacked every route.** `BootSequence` was mounted globally
   with no route check, so a first visit to *any* URL got a full-screen
   animation first — including `/v/:certUid`, where a QR scan lands, and
   `/login`. Now gated to `/` only.

2. **`<button>` nested inside `<a>` at 5 call sites.** Invalid HTML; assistive
   tech announces two nested controls for one target, and the anchor's focus
   ring and hit area collapsed to a 20px inline box against a 48px visual
   button. Replaced with `LinkButton`.

3. **Button icons sat visibly high.** `Button` wrapped its children in a plain
   `<span>`, so the button's own `items-center gap-2` applied to that wrapper
   rather than between the icon and the label — they laid out on a text
   baseline instead. Wrapper is now `inline-flex`.

4. **Display headings stranded single words** ("One platform, end to / end").
   Added `text-wrap: balance` to `h1–h3` and `text-wrap: pretty` to `p`.

5. **Loader perspective was too aggressive** — the near block rendered ~2.6×
   the far one, reading as a receding tunnel rather than a chain, and clipped
   the canvas top. Fixed with a longer lens and fit-to-both-axes scaling.

## Verification

- TypeScript: clean
- Tests: 19/19 passing
- Production build: succeeds, chunk splitting intact
- Playwright sweep: 5 public routes (desktop + mobile) and 3 admin routes —
  **zero horizontal overflow, zero console errors** on every one

## Not changed

Backend, smart contracts, API contracts, routing, permissions, and the
Black & Gold token system are all untouched. The upgrade is additive: existing
components kept their APIs, so nothing downstream needed rewriting.
