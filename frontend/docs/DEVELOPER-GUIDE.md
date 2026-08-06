# Frontend Developer Guide

## State management (spec §11.2 adapted to this stack)

| State kind | Where | Rules |
|---|---|---|
| Server data | TanStack Query | Keys namespaced `[domain, resource, params]`; invalidate on mutation success; never copy into useState |
| Session | AuthContext | Roles decoded from JWT claims (display only — server authoritative); `tc:session-expired` event clears it |
| Theme | AuthContext + `.dark` class | Bootstrapped pre-render in index.html script (no flash); persisted to localStorage |
| Forms | React Hook Form + Zod | Schema per form; server field errors merged via `setError`; root errors for non-field failures |
| URL | React Router params/search | Filters and pagination live in component state here (small app); promote to searchParams if sharing links matters |

## API layer contract

- All HTTP goes through `services/http.ts`: Bearer attach → 401 single-flight refresh + one retry → 429 Retry-After retry → everything else throws `ApiError` with the backend problem document.
- `error.code` values are STABLE (backend catalog): branch on `SELF_APPROVAL_FORBIDDEN`, `SAME_ACTOR`, `ACCOUNT_LOCKED`, etc. — never on message text.
- `error.fieldErrors()` maps validation errors onto form fields.

## Theming & tokens

CSS variables in `styles/globals.css` (light + `.dark` remaps) → Tailwind semantic colors (`bg-page`, `text-text-primary`, `border-border-default`, palette scales). Never hardcode hex in components. Verdict styling comes exclusively from `constants/VERDICTS` — new verdict states are added there once and everywhere renders correctly.

## Component conventions

- Primitives in `components/ui`; domain compositions in `components/domain`; pages compose, never restyle primitives.
- Variants via `cva` unions (`variant="danger"`), not boolean props.
- Every interactive component: keyboard path, visible focus, aria labels; icons always `aria-hidden` with adjacent text.
- Destructive actions use `ConfirmDialog`; irreversible ones add `typedConfirmation`.
- Loading = skeletons (layout-stable); empty and error states are required, with `traceId` shown on errors.

## Adding an endpoint/page

1. Type the response in `types/index.ts` (mirror the Flask handler).
2. Add the typed function in `services/api.ts`.
3. Consume via `useQuery`/`useMutation`; wire toast/error handling from `ApiError`.
4. Lazy-add the route in `routes/index.tsx` under the right guard + nav config.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Property 'env' does not exist on ImportMeta` | `src/vite-env.d.ts` must be included (don't exclude it from tsconfig) |
| 401 loops on dev | Backend not running on :5000, or seed users unverified — run `python -m scripts.seed` |
| Wallet button missing | No injected provider — `isWalletAvailable()` hides it without MetaMask |
| `WRONG_CHAIN` on wallet connect | MetaMask on an unsupported network — the module offers `switchChain`; supported IDs in `constants/SUPPORTED_CHAINS` |
| Dialog tests fail in jsdom | jsdom lacks `<dialog>.showModal` — test dialog content via integration/E2E, not unit render |
| Dark-mode flash on load | The inline script in `index.html` must stay before the bundle |
| Verdict page blank behind proxy | SPA fallback missing — nginx `try_files $uri /index.html` (see nginx.conf) |
