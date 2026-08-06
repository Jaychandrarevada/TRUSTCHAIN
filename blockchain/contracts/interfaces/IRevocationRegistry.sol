// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRevocationRegistry
 * @notice Public interface of the revocation status-list registry. Answers:
 *         "Is this certificate STILL valid?" (TDD §7.1).
 *
 * @dev "CertificateRevocation" in the requirements maps here. Semantics:
 *       - Revocation state lives in W3C Bitstring Status Lists (off-chain,
 *         content-addressed); this contract anchors each list's current root
 *         with a MONOTONIC version so verifiers can detect stale lists.
 *       - "Revoke" = set the certificate's revocation bit → publish new root.
 *       - "Restore" exists ONLY for the reversible SUSPENSION bit; a
 *         revocation bit can never be cleared (BR-11: revocation is
 *         irreversible; corrections use supersede-and-reissue). The platform
 *         enforces this off-chain, and the on-chain event log preserves the
 *         complete revocation history for auditors.
 */
interface IRevocationRegistry {
    // ───────────────────────────────  Types  ─────────────────────────────────

    struct StatusList {
        bytes32 root;     // integrity root of the current bitstring snapshot
        uint32 version;   // strictly increasing per (issuerId, listId)
        uint40 updatedAt;
        string listURI;   // where the full bitstring credential is served
    }

    // ───────────────────────────────  Events  ────────────────────────────────

    /**
     * @notice Emitted on every status-list update — this event stream IS the
     *         immutable revocation history ("CertificateRevoked" at list
     *         granularity; per-certificate detail resolves via the list diff).
     */
    event StatusRootUpdated(
        uint64 indexed issuerId,
        bytes32 indexed listId,
        bytes32 root,
        uint32 version,
        string listURI
    );

    // ───────────────────────────────  Errors  ────────────────────────────────

    error IssuerNotEligible(uint64 issuerId);
    error NonMonotonicVersion(uint32 current, uint32 supplied);
    error UnknownStatusList(uint64 issuerId, bytes32 listId);

    // ─────────────────────────────  Mutations  ───────────────────────────────

    function updateStatusRoot(
        uint64 issuerId,
        bytes32 listId,
        bytes32 root,
        uint32 version,
        string calldata listURI
    ) external;

    // ───────────────────────────────  Views  ─────────────────────────────────

    function getStatusList(uint64 issuerId, bytes32 listId)
        external
        view
        returns (StatusList memory);

    function getStatusRoot(uint64 issuerId, bytes32 listId) external view returns (bytes32);
}
