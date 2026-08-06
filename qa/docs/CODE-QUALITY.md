# Code Quality Analysis (PART 14)

Tooling per module; run in CI ([qa.yml](../../.github/workflows/qa.yml)).

## Toolchain

| Module | Lint | Format | Types | Security | Complexity |
|---|---|---|---|---|---|
| Blockchain | solhint | prettier-solidity | solc | Slither, Echidna (fuzz) | forge/hardhat gas |
| Backend | ruff (Flake8 rules) | black | (typed via annotations) | bandit, pip-audit | radon (cc/mi) |
| Frontend | ESLint | prettier | tsc strict | npm audit | eslint-plugin-complexity |

## Standards enforced

- **TypeScript strict** (frontend): no implicit any on exported surfaces; `noUnusedLocals/Parameters`.
- **Ruff/black** (backend): line length 120, import sorting, no dead code.
- **Solhint** (contracts): custom-errors required, compiler-version pinned, func-visibility explicit.
- **Boundary rules**: services never import infrastructure directly (DIP); UI components consume tokens only.

## Measured this cycle

| Metric | Value | Notes |
|---|---|---|
| Backend LOC (app) | 2,489 | bandit-measured |
| Backend security findings | 0 H / 0 M / 0 L | bandit clean |
| Backend test coverage | 89% | pytest-cov (exit floor 85%) |
| Frontend prod-dep vulns | 0 | npm audit --omit=dev |
| Frontend dev-tooling advisories | 6 (2 crit/1 high/3 mod) | vite/vitest/esbuild chain — **not shipped** (build-time only); tracked, upgrade when a patched vitest lands |
| Frontend build | clean | tsc -b + vite build, no type errors |
| Contract tests | 54/54 | incl. fuzz-style edge + security suite |

## Cyclomatic complexity & maintainability

Run `radon cc backend/app -a` and `radon mi backend/app` for scores; the target is **CC ≤ 10 per function** (the verdict engine's precedence ladder and the anchor FSM are the highest, ~8, and are deliberately explicit rather than clever). Frontend: no component over ~200 lines; the batch wizard and certificate-admin pages are the largest and are candidates for extraction if they grow.

## Technical debt register (known, accepted this cycle)

| Item | Rationale | Plan |
|---|---|---|
| Frontend dev-tooling npm advisories | esbuild/vite dev-server advisories don't affect the shipped static bundle | Upgrade vitest when a patched release is available |
| Backend real-RPC Web3 paths uncovered (~11% gap) | Needs a live node; mock covers all business semantics | Cover at staging with a testnet node in CI |
| Full RFC 8785 JCS canonicalization | Current sorted-key canonicalization matches across all 3 languages; edge cases (unicode/number forms) deferred | Harden all 3 impls together with shared vectors |
| External contract audits | Internal review + Slither only in this cycle | Two independent audits before mainnet (hard gate) |
