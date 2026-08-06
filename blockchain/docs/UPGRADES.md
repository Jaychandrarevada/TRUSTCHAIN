# Upgrade Guide (UUPS)

## Pattern

All three contracts are **UUPS proxies** (ERC-1967 storage slots, upgrade logic in the implementation, gated by `UPGRADER_ROLE`). Chosen over Transparent proxies for lower per-call overhead and a single audited admin path; over Beacons because the three contracts version independently (TDD §7.8).

## Storage layout rules (non-negotiable)

1. **Append-only:** new variables go after existing ones; never reorder, retype, or delete.
2. **Gaps:** `TrustChainBase` reserves `__gap[50]`; each child reserves `__gap[45]`. Adding a variable to a child consumes from ITS gap (`uint256[45]` → new var + `uint256[44]`).
3. **No constructor state:** implementations use initializers; constructors only `_disableInitializers()`.
4. **Validation is automated:** `upgrades.validateUpgrade` runs in `scripts/upgrade.ts` and the upgrade test — a layout-breaking change cannot reach the chain through our tooling.

## Upgrade process

| Step | Testnet | Mainnet |
|---|---|---|
| 1. Implement `ContractV2` (append-only storage, `@custom:oz-upgrades-unsafe-allow missing-initializer` if no re-init; else a `reinitializer(n)`) | dev branch | audited branch |
| 2. Tests: full suite + upgrade-preservation test against a fork with real state | `npm test` | + fork test vs mainnet state |
| 3. Validate + stage | `CONTRACT=X NEW_IMPL=XV2 npm run upgrade -- --network amoy` | `DRY_RUN=true … --network polygon` → deploys impl, prints the Safe call |
| 4. Execute | script does it | Safe proposes `upgradeToAndCall(newImpl, 0x)` → 48 h timelock (public status-page notice) → execute |
| 5. Post-checks | version()/state spot-checks | invariant re-run vs fork, monitored bake, update `deployments/polygon.json` + `/system/contracts` |

## Versioning

- Implementations: semver in NatSpec `@custom:version` + git tags (`IssuerRegistry@1.1.0`).
- **Breaking semantics** (e.g., new hash scheme) never mutate an existing contract — deploy a **sibling** (`CertificateAnchorV2` at a new address); verifiers dual-read; old anchors verify against old code forever.
- The immutable-history invariant (anchored roots, key history, status versions never rewritten) is asserted by tests that run against every upgrade candidate; an upgrade that violates it cannot pass CI.

## Emergency path

`pause()` (Safe fast path, no timelock) stops all writes immediately; reads — the entire verification surface — cannot be paused by construction. Fix-forward only; there is no downgrade with state rollback on a public chain.
