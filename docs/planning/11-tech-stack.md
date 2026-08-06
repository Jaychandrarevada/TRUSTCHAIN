# 11. Recommended Tech Stack

Principles: boring-where-possible (TypeScript everywhere off-chain), managed services for undifferentiated heavy lifting, abstraction layers where vendor risk is real (chain RPC, email, SMS), and everything reproducible via IaC.

## 11.1 Frontend

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (React 19) + TypeScript** | SSR/ISR for the public verification page (SEO + < 3 s verdict + cacheable), SPA feel for dashboards; one framework for all four apps |
| Apps | Verification (public), Holder wallet (PWA), Issuer console, Platform admin | Separate deployments, shared design system |
| UI system | Tailwind CSS + shadcn/ui + custom design tokens | Speed + accessibility primitives (Radix) for WCAG 2.2 AA |
| State/data | TanStack Query + Zustand | Server-cache-first; minimal client state |
| Forms/validation | React Hook Form + Zod (schemas shared with backend) | One validation source of truth |
| i18n | next-intl (EN + HI at GA) | NFR-ACC-05 |
| PWA/offline | Workbox service worker (wallet app) | FR-STU-014 |
| Charts | Recharts (per dataviz design standards) | Issuer/admin analytics |

## 11.2 Backend

| Concern | Choice | Rationale |
|---|---|---|
| Runtime/framework | **Node.js 22 LTS + NestJS (TypeScript)** | Structured modules/DI suits a multi-service platform; TS types shared end-to-end with frontend and contract typings (TypeChain) |
| Architecture | Modular monolith → split later | Modules: identity, tenants, credentials, anchoring, verification, revocation, notifications, billing, analytics. Anchoring worker + notification worker separate processes from day one (queue-driven) |
| API | REST (public, OpenAPI 3.1) + GraphQL (dashboards, Apollo, persisted queries) | Section 13 |
| Async/queues | **BullMQ on Redis** (jobs), transition path to SQS/Kafka at scale | Issuance pipeline, anchoring, webhooks, notifications |
| Credential crypto | `@digitalbazaar/vc` (Data Integrity), `sd-jwt` libraries, JCS canonicalization, Node `crypto` SHA-256 | W3C VC 2.0 + SD-JWT selective disclosure |
| PDF rendering | Playwright-driven HTML→PDF render farm (containerized) | Template designer output fidelity |
| OCR/AI services | Python (FastAPI) microservice: Tesseract/PaddleOCR + custom models; Claude API for extraction/assistant features | AI FRs isolated from core trust path |

## 11.3 Blockchain

| Concern | Choice | Rationale |
|---|---|---|
| Chain | **Polygon PoS** (Amoy testnet for sandbox) | Section 9 decision |
| Contract language/toolchain | Solidity 0.8.x + **Foundry** (build/test/fuzz/invariants) + Hardhat for deployment scripting | Foundry's fuzzing/invariant testing is the strongest available; Hardhat ecosystem for ops |
| Contract libraries | OpenZeppelin (AccessControl, UUPS, Pausable) | Audited primitives only |
| Client library | viem + TypeChain types | Modern, typed, testable |
| Relayer | Self-built relayer service (KMS-signed via AWS KMS secp256k1) with OpenZeppelin Defender as monitoring/backup option | Keys never leave KMS |
| RPC | Alchemy (primary) + QuickNode (secondary) + fallback self-hosted node (phase 2) | NFR-AVL-04 |
| Indexing | **The Graph subgraph** (public) + internal Postgres indexer for verification hot path | Open data (FR-BC-011) + latency control |
| Contract verification | Sourcify + Polygonscan verify in CI | FR-BC-015 |

## 11.4 Database & Storage

| Concern | Choice | Rationale |
|---|---|---|
| Primary DB | **PostgreSQL 16 (AWS RDS/Aurora)** — row-level-security-backed multi-tenancy, partitioned certificate tables | Section 14 |
| ORM/migrations | Prisma (app) + raw SQL migrations reviewed in PR | Type safety + explicit DDL control |
| Cache | Redis (ElastiCache) — sessions, rate limits, verification hot cache, BullMQ | One infra piece, many uses |
| Search | Postgres FTS at launch; OpenSearch when tenant search outgrows it | Defer complexity |
| Object storage | **S3** (artifacts, exports, KYB docs) with lifecycle policies + SSE-KMS | Cheap, durable |
| Decentralized storage | **IPFS via Pinata/web3.storage** — optional artifact pinning (hash-addressed public artifacts only, never PII-bearing docs unless holder opts in) | Vendor-independence story |
| Analytics store | Postgres read replica → ClickHouse when event volume demands | ANA FRs |
| Audit log | Append-only Postgres table + S3 WORM (Object Lock) archival + daily on-chain hash | NFR-AUD-02 |

## 11.5 Authentication & Identity

| Concern | Choice | Rationale |
|---|---|---|
| IdP | **Keycloak (self-hosted)** — OIDC provider, tenant SSO brokering (SAML/OIDC), MFA/TOTP | Avoids per-MAU pricing at student scale; data-residency control. (Auth0 acceptable fallback if ops budget is tight) |
| Tokens | Short-lived JWT access (≤15 min) + rotating refresh; JWKS published | AUTH-006 |
| API keys | Platform-managed, scoped, hashed at rest | AUTH-014/015 |
| DIDs | did:web (issuers) + did:key (holders) initially; resolver service | AUTH-012, INST-005 |
| Secrets/keys | AWS KMS (issuer + relayer signing), Secrets Manager, HSM (CloudHSM) for BYO-key tier | NFR-SEC-05/06 |

## 11.6 Cloud & DevOps

| Concern | Choice | Rationale |
|---|---|---|
| Cloud | **AWS ap-south-1 (Mumbai)** primary — data residency for India; multi-region later | NFR-CMP-03 |
| Compute | EKS (Kubernetes) with Karpenter autoscaling; render/OCR jobs on spot | NFR-SCA-04 |
| Edge | CloudFront + WAF + Shield for public verification | RS-09, NFR-PERF-01 |
| IaC | **Terraform** (+ Terragrunt env layering); policy-as-code via OPA/Conftest | US-Q-005 |
| CI/CD | **GitHub Actions**: lint → typecheck → unit → contract tests (Anvil) → E2E (Playwright) → SCA/secret scan → image build/sign (cosign) → ArgoCD GitOps deploy | NFR-MNT-01, US-Q-011 |
| Environments | dev → staging (Amoy testnet) → prod (mainnet); ephemeral PR previews (phase 2) | INST-015 |
| Release | Feature flags (Unleash/Flagsmith self-hosted), canary rollouts | NFR-MNT-03 |

## 11.7 Testing

| Layer | Tooling |
|---|---|
| Unit | Vitest/Jest (TS), pytest (AI services) |
| Contracts | Foundry (unit, fuzz, invariant, gas snapshots), Slither + Echidna in CI, fork tests vs Amoy |
| API contract | OpenAPI schema validation (Spectral + Schemathesis), Pact for internal consumers |
| E2E | Playwright golden-path suite (issue → anchor → claim → share → verify → revoke) per PR |
| Load | k6 — verification burst (5k RPS), bulk issuance (50k rows) scenarios |
| Accessibility | axe-core in CI + manual NVDA/VoiceOver audits per release |
| Security | OWASP ZAP baseline in CI; external pentest pre-GA; contract audits ×2 |
| Chaos/DR | Monthly restore drills; RPC-kill and node-kill game days |

## 11.8 Monitoring, Logging & Observability

| Concern | Choice |
|---|---|
| Metrics/alerting | Prometheus + Grafana (SLO dashboards, burn-rate alerts); PagerDuty on-call |
| Logging | Structured JSON → Loki (or OpenSearch); PII-redaction at the logger; 7-year WORM archive for audit class |
| Tracing | OpenTelemetry end-to-end (UI → API → queue → chain tx correlation) — NFR-AUD-03 |
| Errors | Sentry (frontend + backend) |
| Chain-specific | Anchor-queue depth, wallet balances, tx confirmation lag, RPC provider health, gas spend — custom Grafana board (ADM-005) |
| Synthetic | Checkly/heartbeat probes on verification page from 3 geographies |
| Status page | Public status page (verification-path SLA transparency) |

## 11.9 Stack Summary Diagram (logical)

```
[Verifier browser]──CDN/WAF──▶ Verification app (Next.js SSR/ISR)
[Holder PWA] [Issuer console] [Admin console]      │
        │            │             │               ▼
        └──────┬─────┴───────┬─────┘        REST /v1 + GraphQL (NestJS)
               │             │                     │
        Keycloak OIDC   API keys/scopes      ┌─────┴──────────┐
                                             │ Modular services│
                                             │ identity·tenant │
                                             │ credential·verif│
                                             │ revocation·bill │
                                             └───┬────────┬────┘
                    Redis (cache/rate/BullMQ) ◀──┤        ├──▶ PostgreSQL 16 (RLS, partitions)
                    S3 + IPFS (artifacts)     ◀──┤        ├──▶ Audit store (append-only + WORM)
                                                 ▼
                                    Anchoring worker (relayer, KMS-signed)
                                                 ▼
                              Polygon PoS ── IssuerRegistry · CertificateAnchor · RevocationRegistry
                                                 ▲
                        The Graph subgraph ──────┘   (public open data + OSS verifier CLI)
```
