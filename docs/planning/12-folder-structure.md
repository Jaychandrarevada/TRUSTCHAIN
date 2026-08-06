# 12. Folder Structure Recommendation

Monorepo (pnpm workspaces + Turborepo). One repo for apps, services, contracts, packages, and infra — atomic cross-cutting changes, shared types, single CI.

```
trustchain/
├── README.md
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json                      # build/test pipeline graph
├── .github/
│   ├── workflows/                  # ci.yml, contracts.yml, deploy.yml, security.yml, e2e.yml
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── .devcontainer/                  # one-command onboarding (NFR-MNT-05)
│
├── apps/                           # deployable frontends
│   ├── verify-web/                 # public verification page (Next.js SSR/ISR)
│   │   └── src/{app,components,features,lib,styles}/
│   ├── wallet-web/                 # holder wallet PWA
│   ├── issuer-web/                 # institution console
│   └── admin-web/                  # platform admin console
│
├── services/                       # deployable backends
│   ├── api/                        # NestJS modular monolith
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── modules/
│   │   │   │   ├── identity/       # auth, sessions, RBAC, API keys
│   │   │   │   ├── tenants/        # institutions, KYB, departments, settings
│   │   │   │   ├── schemas/        # credential schemas & templates
│   │   │   │   ├── issuance/       # batches, validation, approval, signing
│   │   │   │   ├── anchoring/      # merkle, queue producers, anchor state
│   │   │   │   ├── verification/   # verdict engine, share links, proof bundles
│   │   │   │   ├── revocation/     # status lists, lifecycle, disputes
│   │   │   │   ├── holders/        # wallet, claims, consents
│   │   │   │   ├── employers/      # orgs, watch lists, bulk verify
│   │   │   │   ├── notifications/  # email/sms/in-app orchestration
│   │   │   │   ├── webhooks/       # subscriptions, signing, delivery log
│   │   │   │   ├── analytics/      # events, dashboards, exports
│   │   │   │   ├── billing/        # plans, metering, invoicing
│   │   │   │   ├── audit/          # append-only log, DSR console
│   │   │   │   └── admin/          # platform-admin operations
│   │   │   ├── common/             # guards, interceptors, filters, pagination
│   │   │   └── config/             # typed env config, feature flags client
│   │   ├── prisma/                 # schema.prisma + /migrations (raw SQL)
│   │   └── test/                   # unit + integration (module-scoped)
│   ├── anchor-worker/              # relayer: batch → tx → confirmation FSM
│   ├── notify-worker/              # queue consumers for email/sms/webhooks
│   ├── render-service/             # HTML→PDF certificate rendering farm
│   └── ai-service/                 # Python FastAPI: OCR, forgery scoring, anomaly jobs
│       └── {app,models,evals,tests}/
│
├── contracts/                      # Solidity workspace (Foundry + Hardhat)
│   ├── src/
│   │   ├── IssuerRegistry.sol
│   │   ├── CertificateAnchor.sol
│   │   ├── RevocationRegistry.sol
│   │   ├── interfaces/
│   │   └── libraries/              # MerkleLib, domain-separated hashing
│   ├── test/                       # Foundry: unit/, fuzz/, invariant/
│   ├── script/                     # deploy + upgrade scripts (per env)
│   ├── audits/                     # audit reports, remediation logs
│   └── foundry.toml / hardhat.config.ts
│
├── packages/                       # shared libraries (versioned internally)
│   ├── core-types/                 # zod schemas + TS types shared FE/BE
│   ├── vc-toolkit/                 # VC issuance/verification, JCS, SD-JWT, merkle proofs
│   ├── chain-client/               # viem wrappers, chain adapters, TypeChain types
│   ├── verifier/                   # OSS standalone verifier lib + CLI (published to npm)
│   ├── ui/                         # design system (tokens, components, a11y primitives)
│   ├── api-client/                 # generated OpenAPI client + SDK source
│   └── config/                     # shared eslint/tsconfig/prettier presets
│
├── infra/
│   ├── terraform/
│   │   ├── modules/                # vpc, eks, rds, redis, s3, cloudfront, kms, waf
│   │   └── envs/{dev,staging,prod}/
│   ├── k8s/                        # helm charts / kustomize overlays, ArgoCD apps
│   └── policies/                   # OPA/Conftest policy-as-code (incl. region pinning)
│
├── subgraph/                       # The Graph indexing of registry/anchor/revocation events
│
├── docs/
│   ├── planning/                   # ← this documentation set
│   ├── adr/                        # architecture decision records
│   ├── api/                        # OpenAPI spec (source of truth) + changelogs
│   ├── runbooks/                   # ops runbooks (anchor failure, key compromise, …)
│   ├── security/                   # threat model, DPIA, key ceremony docs
│   └── compliance/                 # SOC2 control mapping, DPDP/GDPR artifacts
│
├── e2e/                            # Playwright golden-path + persona suites
├── load/                           # k6 scenarios (verification burst, bulk issuance)
└── scripts/                        # seed data, fixtures, local bootstrap (dev-up.ps1/sh)
```

## Conventions

- **Dependency direction:** `apps → packages ← services`; services never import from apps; contracts consumed only via `chain-client`/TypeChain artifacts.
- **Module boundaries in `services/api`** enforced by ESLint import rules — a module talks to another module only via its public interface (prepares clean future extraction to microservices).
- **`packages/verifier` is open-source** (separate license header, published build) — the vendor-independence artifact (UC-14).
- **Every directory with operational behavior has a `README.md`** and, where relevant, an ADR link.
- **Secrets never in repo**; `.env.example` documents required config per app/service.
- **Migrations are append-only** and reviewed like code; destructive DDL requires a documented rollback plan.
