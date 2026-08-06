# 5. Non-Functional Requirements

All NFRs are testable and tied to monitoring/alerting; each has an owner (Eng/DevOps/Security) and is verified in the QA gate before GA.

## 5.1 Security

| ID | Requirement | Target / Verification |
|---|---|---|
| NFR-SEC-01 | OWASP ASVS Level 2 compliance for all web surfaces | Independent pentest before GA; re-test annually |
| NFR-SEC-02 | All traffic TLS 1.2+ (TLS 1.3 preferred); HSTS; no mixed content | SSL Labs A+ on all public endpoints |
| NFR-SEC-03 | Encryption at rest: AES-256 for datastores; field-level encryption for PII columns (name, DOB, contact, ID numbers) | DB snapshot inspection reveals no plaintext PII |
| NFR-SEC-04 | Zero PII on-chain, ever — only salted hashes, Merkle roots, DIDs, status roots | Automated pre-anchor content linting; manual audit of contract payloads |
| NFR-SEC-05 | Secrets in a vault (AWS KMS/Secrets Manager); no secrets in code, env files, or CI logs | Secret-scanning in CI; quarterly rotation |
| NFR-SEC-06 | Issuer/relayer private keys in HSM-backed KMS; signing via service API only; keys non-exportable | Key export attempt fails; access audit-logged |
| NFR-SEC-07 | Smart contracts: 2 independent audits + ≥90% branch test coverage + static analysis (Slither) + fuzzing (Echidna/Foundry) clean before mainnet | Audit reports with zero unresolved high/critical |
| NFR-SEC-08 | Least-privilege IAM; production access via SSO + MFA + just-in-time elevation | Quarterly access review; no standing admin creds |
| NFR-SEC-09 | Rate limiting and bot protection on all unauthenticated endpoints | Load test confirms limits; enumeration attack blocked |
| NFR-SEC-10 | Dependency and container scanning in CI (SCA + image scan); critical CVEs patched ≤ 72 h | CI gate blocks builds with critical vulns |
| NFR-SEC-11 | Security logging: authN events, privilege changes, key usage to SIEM with alerting | Simulated attack generates alert ≤ 5 min |
| NFR-SEC-12 | Vulnerability disclosure policy + bug bounty (post-GA) | security.txt published; triage SLA 48 h |

## 5.2 Performance & Latency

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-01 | Public verification page verdict | p50 < 1 s, p95 < 3 s, p99 < 5 s |
| NFR-PERF-02 | Verification API response | p95 < 500 ms (cached chain state), p99 < 1.5 s |
| NFR-PERF-03 | Dashboard page loads (issuer/holder) | p95 < 2 s TTI on 4G |
| NFR-PERF-04 | Bulk validation of 50,000-row CSV | < 5 min to validated preview |
| NFR-PERF-05 | Certificate rendering (PDF) | < 2 s per artifact; batch parallelized ≥ 100/min/worker |
| NFR-PERF-06 | Anchoring latency (batch approved → on-chain confirmed) | p95 < 15 min under normal gas conditions |
| NFR-PERF-07 | Revocation propagation (action → verification reflects) | ≤ 5 min worst case, ≤ 60 s typical |
| NFR-PERF-08 | Webhook delivery latency | p95 < 30 s from event |
| NFR-PERF-09 | Search (certs, holders) within tenant | p95 < 800 ms at 10M certificates |

## 5.3 Scalability

| ID | Requirement | Target |
|---|---|---|
| NFR-SCA-01 | Certificates under management | 50M without architecture change (design headroom 500M via partitioning) |
| NFR-SCA-02 | Verification throughput | 500 RPS sustained, 5,000 RPS burst (convocation/result days) via CDN + cache |
| NFR-SCA-03 | Concurrent issuance batches | 100 tenants anchoring simultaneously without queue starvation |
| NFR-SCA-04 | Horizontal scaling: all services stateless behind LB; queue-based async for heavy work | Kill-node test shows zero dropped jobs |
| NFR-SCA-05 | Database: read replicas for verification path; partition certificates table by tenant + time | Load test at 10× current volume passes SLOs |
| NFR-SCA-06 | Chain cost scaling: amortized gas per certificate must fall as volume grows (bigger Merkle batches) | Cost model verified monthly |
| NFR-SCA-07 | Multi-region readiness (phase 2): region-pinned tenant data for data-sovereignty | Architecture review sign-off; no cross-region PII replication |

## 5.4 Availability & Reliability

| ID | Requirement | Target |
|---|---|---|
| NFR-AVL-01 | Verification path availability (page + API) | 99.9% monthly (≤ 43 min downtime); degrades gracefully to cached chain state if DB down |
| NFR-AVL-02 | Issuance path availability | 99.5% monthly (queued work survives outages) |
| NFR-AVL-03 | RPO / RTO | RPO ≤ 5 min (PITR); RTO ≤ 1 h for full platform |
| NFR-AVL-04 | Chain RPC redundancy: ≥ 2 independent RPC providers with automatic failover | Provider-kill test transparent to users |
| NFR-AVL-05 | Backups: automated daily + continuous WAL; restore tested monthly | Documented successful restore drill |
| NFR-AVL-06 | Zero-downtime deploys (rolling/blue-green); DB migrations backward-compatible | Deploy during load test causes no 5xx spike |
| NFR-AVL-07 | Vendor-independence guarantee: credentials verifiable via open-source verifier + public chain even if TrustChain is fully offline | Annual "vendor death drill" verification exercise |

## 5.5 Maintainability & Operability

| ID | Requirement | Target |
|---|---|---|
| NFR-MNT-01 | Code quality gates: lint, type-checks, ≥80% unit coverage on core services, mandatory review | CI enforced |
| NFR-MNT-02 | Architecture documentation (ADRs) for every significant decision | ADR log current at each release |
| NFR-MNT-03 | Feature flags for all risky changes; kill switches for chain writes, AI features, webhooks | Flag flip verified in staging |
| NFR-MNT-04 | Runbooks for top 10 operational scenarios (anchor failure, gas spike, RPC outage, key compromise, data breach) | On-call executes runbook in game-day drill |
| NFR-MNT-05 | Mean time to onboard a new engineer to first merged PR | < 5 working days (devcontainer + seeded env) |
| NFR-MNT-06 | API backward compatibility within a major version; 6-month deprecation policy | Contract tests across versions |

## 5.6 Compliance & Legal

| ID | Requirement | Target |
|---|---|---|
| NFR-CMP-01 | India DPDP Act 2023: consent, purpose limitation, breach notification, data-principal rights | DPIA complete; DPO appointed; grievance channel live |
| NFR-CMP-02 | GDPR (EU tenants/holders): lawful basis mapping, SCCs, erasure ≤ 30 days | Records of processing maintained |
| NFR-CMP-03 | Data residency: Indian tenant PII stored in-region (ap-south-1); region pinning per tenant | Infrastructure policy-as-code check |
| NFR-CMP-04 | IT Act / evidence readiness: verification bundles suitable as electronic evidence (s.65B certificate workflow) | Legal review sign-off |
| NFR-CMP-05 | W3C VC 2.0, DID Core, Bitstring Status List, Open Badges 3.0 conformance | Pass public test suites where they exist |
| NFR-CMP-06 | UGC/AICTE & NAD alignment for Indian academic records | Gap analysis + DigiLocker requester/issuer agreements |
| NFR-CMP-07 | SOC 2 Type II (enterprise sales requirement) | Type I by month 9, Type II by month 18 |
| NFR-CMP-08 | Accessibility legal compliance (RPwD Act India / ADA where sold) | Covered by NFR-ACC |

## 5.7 Accessibility

| ID | Requirement | Target |
|---|---|---|
| NFR-ACC-01 | WCAG 2.2 AA for public verification page and holder wallet (highest-traffic, most diverse users) | Automated (axe) + manual audit; zero AA violations |
| NFR-ACC-02 | WCAG 2.2 AA for issuer/admin consoles | Audit before GA |
| NFR-ACC-03 | Verification verdicts never rely on color alone (icons + text) | Design-system rule; reviewed per component |
| NFR-ACC-04 | Keyboard-only and screen-reader flows for all critical journeys (claim, share, verify) | Assistive-tech test pass per release |
| NFR-ACC-05 | Localization framework: English + Hindi at GA; Telugu and others post-GA; RTL-ready | Pseudo-localization test in CI |
| NFR-ACC-06 | Low-bandwidth mode: verification page functional < 100 KB critical path | Lighthouse perf budget enforced |

## 5.8 Auditability

| ID | Requirement | Target |
|---|---|---|
| NFR-AUD-01 | Every state-changing action attributable to an authenticated principal (user, API key, or system job) | No anonymous mutations in audit sample |
| NFR-AUD-02 | Audit logs immutable (append-only store, WORM retention 7 years) with daily on-chain hash anchor | Tamper test detects modification |
| NFR-AUD-03 | Distributed tracing across services (issuance request traceable UI → queue → chain tx) | Trace ID present end-to-end for 100% of requests |
| NFR-AUD-04 | Clock discipline: NTP-synced; all timestamps UTC ISO-8601 | Skew alarm > 100 ms |
| NFR-AUD-05 | Reproducibility: any historical verification verdict reconstructable from stored evidence | Spot-check drill quarterly |

## 5.9 NFR Verification Matrix (summary)

| Category | Verified by | Gate |
|---|---|---|
| Security | Pentest, contract audits, CI scanning | Before mainnet + annually |
| Performance/Latency | k6/Gatling load tests in staging with prod-shaped data | Every release candidate |
| Scalability | Quarterly capacity test at 10× | Quarterly |
| Availability | Chaos drills, restore drills, SLO dashboards | Monthly |
| Compliance | DPIA, legal review, conformance suites | Before GA + on change |
| Accessibility | axe CI + manual AT audit | Every release |
| Auditability | Trace/log sampling, tamper drill | Quarterly |
