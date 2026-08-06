# TrustChain — Frontend

Production React application for the TrustChain platform: public verification pages, holder wallet, institution console, employer portal, and platform admin — implemented from the [UI/UX Design Specification](../docs/design/TRUSTCHAIN-UIUX-SPEC.md) and wired to the [Flask backend](../backend/README.md) and the [blockchain layer](../blockchain/README.md).

**Status:** ✅ type-check clean · production build green · 19/19 tests passing · route-split bundles (web3/charts lazy) · Docker-ready.

> **Architecture note.** The design spec assumed a Next.js multi-app deployment; this module implements the *same approved design* — tokens, the 7-verdict system, role-scoped portals, flows, WCAG commitments — as **one Vite + React 19 SPA** (the stack mandated for this build), with role-based routing standing in for separate apps. Design references (spec §) and business rules (BR-x) appear in component comments.

## Quick start

```bash
cd frontend
npm install
npm run dev          # → http://localhost:3000 (proxies /api → localhost:5000)
npm test             # vitest + RTL (19 tests)
npm run build        # tsc -b + vite build
```

Full-stack demo: start the backend (`python wsgi.py` after `python -m scripts.seed`), then `npm run dev`. Demo logins (password `ChangeMe-Demo-123!`): `admin@trustchain.local` (admin) · `registrar@demo-university.local` (approver) · `operator@demo-university.local` (operator). The seed prints certificate UIDs you can verify at `/v/<uid>` with zero login.

## What's implemented

| Area | Details |
|---|---|
| **Public** | Landing (hero/values/how-it-works/FAQ/CTA), verify hub (ID lookup + paste-payload TAMPERED detection), **flagship verdict page** `/v/:uid` (7 states, streaming checks, issuer identity, collapsed blockchain proof), share links `/share/:token` with PIN prompt and expired-link state |
| **Auth** | Login (password + **MetaMask signature login**), register (student/employer), JWT session from token claims, single-flight refresh with rotation-reuse handling, role-based post-login routing, protected routes |
| **Student wallet** | Credential cards, claim flow (identity match + celebration + mismatch guidance), certificate detail with QR, **share builder** (field selection with always-shared core, expiry/max-views/PIN, live disclosure summary), share revocation |
| **Issuer console** | Dashboard (KPIs, verdict chart, KYB apply card), **batch wizard** (CSV → dry-run errors-first table → submit), batch approval (maker-checker errors surfaced verbatim), certificate list/detail, **two-person revocation** (typed REVOKE + separate confirm), supersede correction, audit log viewer |
| **Employer** | Single verify + bulk verify (≤1k IDs) with verdict summary chips and exceptions-first results |
| **Admin** | KYB queue with approve-and-register-on-chain confirm, platform analytics |
| **Cross-cutting** | Dark mode (class strategy, no-flash bootstrap), offline banner, root error boundary (500), 403/404 pages, toasts, skeletons, empty/error states with trace IDs |

## Architecture

```
src/
├── constants/        # VERDICTS config (icon+label+copy per state), roles, chains
├── types/            # API response types (mirror backend)
├── utils/            # cn, formatting
├── services/         # http.ts (axios + refresh/429 interceptors, ApiError) · api.ts (typed endpoints)
├── contexts/         # AuthContext (session, roles, theme)
├── lib/web3/         # MetaMask module (connect, chain validation/switch, challenge signing, events)
├── components/ui/    # button, card, field, dialog (native <dialog> + typed confirm), toast, misc
├── components/domain # VerdictBadge/Panel/CheckList/AnchorProof, CertificateCard, QRDisplay, ChainStatusChip…
├── layouts/          # PublicLayout, ConsoleLayout (sidebar→drawer, skip links)
├── routes/           # lazy route-splitting + RequireRole guards
├── pages/            # verify/ student/ issuer/ employer/ admin/ auth/ errors/
└── tests/            # vitest + RTL (verdict system, utils, claim flow)
```

Rules: components consume design tokens only (CSS vars → Tailwind); server state lives in TanStack Query (`staleTime` 30 s, http layer owns retries); UI role checks are cosmetic — the backend RBAC is authoritative; verdicts never rely on color alone (icon + text, tested).

## Accessibility & performance

Skip links, visible focus rings, labelled fields with `aria-describedby` errors, `role=status` verdict announcements, reduced-motion parity (media query + framer `useReducedMotion`), 44 px touch targets, dark theme for every component. Performance: route-level code splitting (initial chunk ~93 kB gz; ethers and recharts load only where used), manual vendor chunks, immutable-asset caching in nginx.

## Web3 scope (per approved architecture)

End users never send transactions or pay gas — the backend relayer owns the chain. The wallet surface is exactly: optional MetaMask **signature login/linking** (nonce challenge, EIP-191, chain validation + switch prompts, typed error taxonomy with actionable messages). Contract reads reach the UI through backend endpoints (`/blockchain/info`, verdict `checks.anchor`), keeping RPC keys and chain complexity server-side.

## Docker

```bash
docker build -t trustchain-frontend .   # multi-stage: node build → nginx
docker run -p 8080:80 trustchain-frontend
```

`nginx.conf` serves the SPA with history-fallback, immutable asset caching, security headers, and an `/api/` proxy to the `backend` service (compose/k8s).

## Testing

`npm test` — 19 tests: verdict-system guarantees (7 distinct labels, role=status announcements, TAMPERED warning copy, check pass/fail rendering), utility behavior, and the claim flow (client validation, success celebration, identity-mismatch guidance) with mocked services. `cypress/e2e/verify.cy.ts` scaffolds the golden E2E path against a seeded stack (`npm run e2e` after `npx cypress install`; Jest-compatible Vitest is the Vite-native runner used in place of Jest).

## Docs

[docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md) — state management, theming, component conventions, troubleshooting. Upstream: [UI/UX spec](../docs/design/TRUSTCHAIN-UIUX-SPEC.md) · [TDD](../docs/architecture/TRUSTCHAIN-TDD.md) · [SRS](../docs/specs/TRUSTCHAIN-PRD-SRS.md).
