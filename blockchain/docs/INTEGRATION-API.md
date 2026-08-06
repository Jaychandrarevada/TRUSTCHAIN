# Backend Integration Specification

How the platform backend (`services/api` + `anchor-worker`, TDD §2) drives this layer, and the REST surface it exposes. Full API conventions (auth, idempotency, RFC 9457 errors, rate limits): SRS §S4.5/TDD §9.1 — normative here.

## Service-to-chain responsibilities

| Backend component | Uses | Contract call |
|---|---|---|
| Registrar service | issuer admission (post-KYB, UC-01) | `IssuerRegistry.registerIssuer / rotateKey / revokeKey / setIssuerStatus` |
| Anchor worker (relayer) | batch + status + audit anchoring | `CertificateAnchor.anchorRoot(s)`, `RevocationRegistry.updateStatusRoot` |
| Chain indexer | verification hot path | event subscriptions + `view` reads at confirmation depth |
| Verification engine | verdict composition | indexer cache → direct RPC `view` fallback |

## Endpoint specifications

### 1. Issue Certificate(s) — `POST /v1/batches` → approval → anchoring

Request (after upload/validation; abbreviated):

```json
{ "schemaId": "…", "templateVersionId": "…", "rows": "s3://…/batch.csv", "source": "api" }
```

Pipeline (UC-02): validate → approve (maker≠checker) → per cert: JCS canonicalize → salt → SHA-256 → sign VC (KMS) → build Merkle tree (`utils/merkle.ts`) → enqueue root. Anchor worker response fields surfaced on `GET /v1/batches/{id}`:

```json
{
  "status": "anchored",
  "anchor": { "chainId": 137, "contract": "0x…", "merkleRoot": "0x…",
              "txHash": "0x…", "blockNumber": 58211044, "finality": "finalized",
              "anchoredAt": "2026-07-10T12:03:11Z", "manifestUri": "ipfs://…" }
}
```

Errors: `422 VALIDATION_INCOMPLETE`, `403 SELF_APPROVAL_FORBIDDEN`, `409` idempotency conflict; anchoring failures never surface as batch loss — status stays `anchoring` with retries (FSM §2.11).

### 2. Verify Certificate — `GET /v1/verify/{certUid}` (public)

Response (verdict object; identical across web/API/CLI):

```json
{
  "verdict": "VALID",
  "checks": {
    "integrity":  { "pass": true,  "contentHash": "0x…" },
    "merkleProof":{ "pass": true,  "root": "0x…", "leafIndex": 41 },
    "anchor":     { "pass": true,  "txHash": "0x…", "block": 58211044, "finality": "finalized" },
    "issuer":     { "pass": true,  "issuerId": "1", "status": "Active", "attested": true,
                    "keyValidAtSigning": true },
    "revocation": { "pass": true,  "listVersion": 6, "statusRoot": "0x…" },
    "expiry":     { "pass": true }
  },
  "certificate": { "disclosedFields": { "…": "…" } },
  "meta": { "verifiedAt": "…", "staleness": null, "traceId": "…" }
}
```

Status: 200 always when found (verdict carries the outcome); 404 neutral (anti-enumeration); 503 `CHAIN_UNAVAILABLE` only when both indexer cache and RPC fail (never a guessed verdict, BR-20).

### 3. Fetch Blockchain Record — `GET /v1/certificates/{uid}/proof-bundle`

Returns the portable evidence pack consumed by the OSS verifier:

```json
{
  "vc": { "…signed VC (disclosed form)…" },
  "salt": "0x…", "contentHash": "0x…",
  "merkleProof": ["0x…"], "merkleRoot": "0x…", "leafIndex": 41,
  "anchor": { "chainId": 137, "contract": "0x…", "txHash": "0x…", "block": 58211044 },
  "issuer": { "issuerId": "1", "did": "did:web:…", "registry": "0x…" },
  "statusList": { "listId": "0x…", "registry": "0x…", "uri": "https://…" },
  "algorithms": { "content": "sha256-jcs", "leaf": "keccak256(0x00||salt||h)", "node": "keccak256(0x01||sorted)" }
}
```

### 4. Revoke Certificate — `POST /v1/certificates/{uid}/revoke` + `POST /v1/revocations/{id}/confirm`

Two-person flow (UC-05). On second confirmation: platform sets the bitstring bit → `updateStatusRoot(issuerId, listId, newRoot, version+1, uri)` via the priority lane. Response after confirm:

```json
{ "status": "revocation_recorded", "propagation": "≤5m",
  "statusList": { "version": 7, "txHash": "0x…" } }
```

Errors: `403 SAME_ACTOR` (BR-21), `409 ALREADY_REVOKED`, `422 UNSUPPORTED_REASON`.

### 5. Institution Verification — `GET /v1/issuers/{issuerId}` (public)

```json
{ "issuerId": "1", "did": "did:web:xyz-university.edu", "status": "Active",
  "attested": true, "attestations": [{ "attestor": "0x…", "ref": "UGC/2026/777", "at": "…" }],
  "registeredAt": "…", "keyHistory": [ { "keyHash": "0x…", "validFrom": "…", "validUntil": null, "status": "Active" } ],
  "metadataUri": "ipfs://…" }
```

### 6. Wallet Verification — `POST /v1/me/wallets/challenge` + `POST /v1/me/wallets/link`

Challenge: `{ "address": "0x…" }` → `{ "nonce", "origin", "issuedAt", "expiresAt" }` (5-min TTL, single-use).
Link: `{ "address", "nonce", "signature" }` → server runs `verifyChallengeSignature` (`integration/wallet/metamask.ts`) + nonce/origin checks → `201 { "did": "did:pkh:eip155:137:0x…" }`. Errors: `401 SIGNATURE_INVALID`, `410 CHALLENGE_EXPIRED`, `409 WALLET_ALREADY_LINKED`.

### 7. Transaction Status — `GET /v1/anchors/{txHashOrRoot}`

```json
{ "merkleRoot": "0x…", "anchorType": "Issuance", "status": "confirmed",
  "confirmations": 18, "target": 32, "txHash": "0x…", "block": 58211044,
  "finality": { "checkpointed": false }, "gas": { "used": 68565, "costWei": "…" } }
```

FSM states: `queued | submitted | confirmed | finalized | reorged | failed` (§2.11). Webhook `batch.anchored` fires on `confirmed`; `finalized` updates follow.
