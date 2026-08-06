# Backend Architecture Notes

## Layering (Clean Architecture, pragmatic Flask)

```
api/          controllers: RESTX namespaces — HTTP concerns only
  ↓ marshmallow schemas (validation boundary)
services/     use cases: business rules, FSMs, two-person controls, audit
  ↓ ports
models/ + blockchain/client.py     infrastructure: SQLAlchemy, Web3|mock
```

Rules: controllers never touch models directly for writes (services own transactions); services never import Flask request objects (context arrives via `g`-populated decorators); the blockchain client is a **port** (`BlockchainClient` ABC) resolved from the DI container `app.services` — tests and dev run `MockChainClient`, staging/prod run `Web3ChainClient` (DIP).

## The DI container

Deliberately minimal: a dict on the app object built in the factory. With one swappable dependency (the chain client) a framework would be ceremony; the seam that matters — *nothing imports a concrete chain client* — is enforced by convention and tests (`test_mock_chain_reproduces_contract_invariants` pins mock/contract semantic parity).

## Verdict engine (services/verification_service.py)

Order of checks mirrors SRS BR-15 precedence exactly:

```
TAMPERED (integrity/proof/anchor fail)
  > UNKNOWN_ISSUER > SUSPENDED_ISSUER
  > REVOKED > SUPERSEDED > EXPIRED > VALID
```

Design invariants: existence (Merkle proof) and status (revocation) are independent questions — a revoked certificate still *proves*; verification never blocks on tenant state (BR-09); every verification writes an immutable snapshot (BR-19); disclosure = public defaults ∩ holder selection, and `holder_email` never leaves the server (BR-17).

## Chain integration contract

The backend NEVER trusts itself about chain state: `is_anchored`/`get_status_root` reads go to the client (mock or RPC). Writes are idempotent by contract design — `RootAlreadyAnchored` from a retry is success, `NonMonotonicVersion` protects against stale status publishes. The hash pipeline (`blockchain/merkle.py`) is byte-locked to `MerkleLib.sol`; the parity test is the tripwire.

## Two-person controls

Maker-checker is enforced in three places (defense in depth): service checks (`SelfApprovalError`/`SameActorError`), the DB CHECK constraint on `certificate_history` (actor ≠ actor2), and the API layer passing true maker identity (e.g., supersede uses the original batch creator as maker of record).

## What production adds (documented deltas)

- PII column encryption (pgcrypto/KMS envelope) on `certificates.subject_data`, `users.email/phone` — the SQLite-portable model uses plain JSON with the encryption boundary documented at each column.
- Full RFC 8785 JCS canonicalization (current: sorted-key compact JSON, same on both sides of the parity contract).
- Redis-backed rate limiting + BullMQ-equivalent async workers (anchoring is synchronous here; the mock confirms instantly, a real relayer worker consumes a queue per TDD §2.8).
- KMS signing for the relayer instead of `RELAYER_PRIVATE_KEY`.
- Real mailer behind `MAIL_MODE=smtp` (mock logs to stdout and exposes test hooks).
