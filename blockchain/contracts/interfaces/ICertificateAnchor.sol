// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ICertificateAnchor
 * @notice Public interface of the TrustChain anchoring contract. Answers:
 *         "Did this exact content exist, committed by this issuer, at this
 *         time?" (TDD §7.1).
 *
 * @dev "CertificateRegistry" in the requirements maps here. Individual
 *      certificates are NOT stored on-chain (approved architecture decision:
 *      Merkle batching gives O(1) chain cost per batch and keeps all PII off
 *      the chain — SRS C-1). A single certificate is simply a batch of one
 *      (root == leaf). Metadata URIs (IPFS manifests) travel in the event —
 *      events are ~10× cheaper than storage and are fully indexed by the
 *      subgraph (docs/GAS.md §O5). The `AnchorType.AuditLog` variant realizes
 *      the requested "AuditContract": daily audit-log hash roots are anchored
 *      through the same append-only path (FR-AUD-002).
 */
interface ICertificateAnchor {
    // ───────────────────────────────  Types  ─────────────────────────────────

    /// @notice What a root commits to.
    enum AnchorType {
        Issuance,   // Merkle root over certificate leaf hashes
        StatusList, // integrity root of a revocation status list snapshot
        AuditLog    // daily platform audit-log hash-chain root
    }

    /**
     * @notice On-chain anchor record — packed into a SINGLE storage slot
     *         (uint64 + uint40 + uint8 = 112 bits, TDD §7.3).
     */
    struct AnchorRecord {
        uint64 issuerId;
        uint40 timestamp;
        AnchorType anchorType;
    }

    // ───────────────────────────────  Events  ────────────────────────────────

    /**
     * @notice Emitted once per anchored root ("CertificateIssued" at batch
     *         granularity). `batchRef` is the platform batch UUID (as bytes32)
     *         and `metadataURI` points to the optional IPFS batch manifest.
     */
    event RootAnchored(
        bytes32 indexed root,
        uint64 indexed issuerId,
        bytes32 indexed batchRef,
        AnchorType anchorType,
        uint40 timestamp,
        string metadataURI
    );

    // ───────────────────────────────  Errors  ────────────────────────────────

    error RootAlreadyAnchored(bytes32 root);
    error IssuerNotEligible(uint64 issuerId);
    error EmptyBatch();
    error ArrayLengthMismatch();
    error BatchTooLarge(uint256 size, uint256 max);

    // ─────────────────────────────  Mutations  ───────────────────────────────

    /// @notice Anchors one Merkle root (single batch — also used for batch-of-1).
    function anchorRoot(
        bytes32 root,
        uint64 issuerId,
        bytes32 batchRef,
        AnchorType anchorType,
        string calldata metadataURI
    ) external;

    /// @notice Anchors up to MAX_ROOTS_PER_TX roots in one transaction.
    function anchorRoots(
        bytes32[] calldata roots,
        uint64[] calldata issuerIds,
        bytes32[] calldata batchRefs,
        AnchorType[] calldata anchorTypes,
        string[] calldata metadataURIs
    ) external;

    // ───────────────────────────────  Views  ─────────────────────────────────

    function getAnchor(bytes32 root) external view returns (AnchorRecord memory);

    function isAnchored(bytes32 root) external view returns (bool);

    /**
     * @notice One-call certificate verification helper ("CertificateVerifier"
     *         responsibility): recomputes the leaf from (salt, contentHash) and
     *         proves membership in an anchored root. Pure read — unpausable.
     * @return valid      True iff proof valid AND root anchored.
     * @return anchoredAt Anchor timestamp (0 when not anchored).
     */
    function verifyCertificate(
        bytes32 salt,
        bytes32 contentHash,
        bytes32[] calldata proof,
        bytes32 root
    ) external view returns (bool valid, uint40 anchoredAt);
}
