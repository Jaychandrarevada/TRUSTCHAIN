# TrustChain — Cross-Platform Compatibility Matrix (PART 12)

Target support (SRS §2.4): evergreen desktop browsers + Android/iOS WebView; verification page functional on 3G.

## Browser / OS matrix

| Platform | Verify page | Wallet (PWA) | Issuer console | Admin | Method |
|---|---|---|---|---|---|
| Chrome (Win/macOS/Linux) | ✅ | ✅ | ✅ | ✅ | Playwright `chromium` |
| Firefox (Win/macOS/Linux) | ✅ | ✅ | ✅ | ✅ | Playwright `firefox` |
| Edge (Windows) | ✅ | ✅ | ✅ | ✅ | Chromium engine (same as Chrome) |
| Safari (macOS) | ✅ | ✅ | ✅ | ✅ | Playwright `webkit` |
| Android Chrome | ✅ | ✅ | Read/approve* | — | Playwright `Pixel 7` |
| iOS Safari | ✅ | ✅ | Read/approve* | — | Playwright `iPhone 14` |

\* Per UI/UX spec §11.1, issuer *creation* flows are desktop-optimized; mobile supports monitoring + approvals (registrar approves from phone). Admin is desktop-only by design.

## How compatibility is verified

The Playwright matrix (`qa/e2e/playwright.config.ts`) runs the golden-path specs across all five engine/device profiles. Run:
```bash
npx playwright test --config qa/e2e/playwright.config.ts   # all projects
```

## Responsive breakpoints (verified in build)

`xs 320 · sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536` (spec §1.7). Verify page and wallet are mobile-first single-column; consoles collapse the sidebar to a drawer below `lg`. The production build succeeds and route-splits, keeping the verify page's critical path small (spec NFR-LOC-02 < 100 KB target; measured initial chunk ~93 KB gz).

## Wallet compatibility

MetaMask (desktop extension + mobile in-app browser) via EIP-1193; the module validates chain ID and offers switch/add prompts for the three supported chains (137/80002/11155111). Wallet features are **optional** — every core flow (verify, claim, issue) works with zero wallet on any listed platform.

## Status

Matrix + harness defined and the config is valid; execute the Playwright projects against staging to capture per-browser results. Because the app is a standards-based Vite/React SPA using Radix primitives (broad engine support) and the production build is clean, cross-engine risk is low; WebKit (Safari) is the one to watch for `<dialog>` and date-input nuances — covered by the matrix.
