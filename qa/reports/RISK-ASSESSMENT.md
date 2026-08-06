# TrustChain — Risk Assessment (QA view)

Residual risk after testing. Score = Likelihood × Impact (1–5 each). Compared against the planning risk register ([10-risk-analysis.md](../../docs/planning/10-risk-analysis.md)) — this is the *post-test* residual.

| ID | Risk | Pre-test | Residual | Why reduced | Remaining action |
|---|---|---|---|---|---|
| RQ-1 | Forged certificate reads VALID | High (20) | **Low (4)** | 3-language Merkle parity + tamper tests + 7-verdict precedence all green | Keep parity vectors green on any hash change |
| RQ-2 | Cross-tenant data leak | High (16) | **Low (4)** | RBAC + isolation proven by executable security suite (neutral 404) | RLS in production DB (design present) |
| RQ-3 | Revocation bypass / self-approval | High (15) | **Low (3)** | SAME_ACTOR + SELF_APPROVAL_FORBIDDEN tested; monotonic status versions | — |
| RQ-4 | Contract exploit | High (15) | **Low–Med (6)** | Internal review + 54 tests + security suite; Slither configured | **External audits (blocking mainnet)** |
| RQ-5 | Auth compromise | High (12) | **Low (3)** | Lockout + refresh-reuse revocation + wrong-signer tested | — |
| RQ-6 | Chain unavailable → wrong verdict | Med (9) | **Low (3)** | Never-guess-a-verdict (BR-20) design; degraded-state handling | Verify degraded path on staging |
| RQ-7 | Verification surge collapse | Med (12) | **Med (8)** | Read-only cacheable path; queue-buffered writes | **Run load/spike on staging** to confirm |
| RQ-8 | Accessibility failure on verify | Med (9) | **Low (3)** | Built to WCAG 2.2 AA; verdict system tested for non-color signaling | Run axe + manual AT on staging |
| RQ-9 | Dependency vulnerability shipped | Med (9) | **Low (2)** | Prod deps 0 vulns; advisories confined to dev tooling | Track vitest advisory |
| RQ-10 | Data-residency / erasure non-compliance | Med (8) | **Low (4)** | Zero PII on-chain + salt-destruction erasure tested | DPIA sign-off (process) |

## Top residual risks (require staging execution before GA)

1. **RQ-4 (contract exploit)** — mitigated in code but external audits are the non-negotiable mainnet gate.
2. **RQ-7 (surge)** — architecturally sound but must be *measured* under 500/5,000-RPS load on staging, not asserted.

## Aggregate posture

The trust-critical risks (forgery, isolation, revocation, auth) are **driven to Low and proven by tests**. The two meaningful residuals are both *execution/process* gates on provisioned infrastructure, not unresolved design or code weaknesses. Risk trend: strongly downward post-test.
