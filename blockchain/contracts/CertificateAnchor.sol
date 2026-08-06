// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TrustChainBase} from "./base/TrustChainBase.sol";
import {ICertificateAnchor} from "./interfaces/ICertificateAnchor.sol";
import {IIssuerRegistry} from "./interfaces/IIssuerRegistry.sol";
import {MerkleLib} from "./libraries/MerkleLib.sol";

/**
 * @title CertificateAnchor
 * @author TrustChain Engineering
 * @notice Append-only registry of Merkle roots committing to certificate
 *         batches, revocation-status-list snapshots, and daily audit-log
 *         chains. This is the "did this exist?" trust primitive (TDD §7.1).
 *
 *         Realizes the requested "CertificateRegistry" + "AuditContract" +
 *         "CertificateVerifier" responsibilities:
 *           issue certificate   → {anchorRoot} / {anchorRoots} (batch-of-1 OK)
 *           store hash          → the Merkle root IS the hash commitment;
 *                                 per-cert hashes stay off-chain (zero PII)
 *           store metadata URI  → `metadataURI` in the {RootAnchored} event
 *                                 (IPFS batch manifest; event >> storage, gas)
 *           ownership           → certificates are NON-transferable
 *                                 attestations bound to a holder DID inside
 *                                 the signed VC (BR-07); there is deliberately
 *                                 no on-chain owner to transfer
 *           lookup/verification → {getAnchor} / {isAnchored} /
 *                                 {verifyCertificate}
 *           audit logging       → AnchorType.AuditLog (FR-AUD-002)
 *
 * @dev Security invariants (fuzz/invariant-tested):
 *        A1. A root can be anchored exactly once (duplicate → revert). This is
 *            also the relayer's idempotency backstop (BR-03).
 *        A2. Anchors are never mutated or deleted — no function exists that
 *            writes to an existing record.
 *        A3. Issuance/StatusList anchors require an ACTIVE issuer; AuditLog
 *            anchors are platform-scoped (issuerId 0 allowed).
 */
contract CertificateAnchor is TrustChainBase, ICertificateAnchor {
    // ─────────────────────────────── Constants ───────────────────────────────

    /// @notice Upper bound on roots per multi-anchor call. Bounds the loop so a
    ///         relayer bug can never produce an unminable/DoS-sized transaction
    ///         (docs/SECURITY.md §R9). ~25k gas per root → ~2.6M gas at cap.
    uint256 public constant MAX_ROOTS_PER_TX = 100;

    // ─────────────────────────────── Storage ─────────────────────────────────

    /// @dev merkleRoot → packed anchor record (single slot each, TDD §7.3).
    mapping(bytes32 root => AnchorRecord) private _anchors;

    /// @dev Issuer registry consulted for issuer eligibility (invariant A3).
    IIssuerRegistry private _issuerRegistry;

    // ───────────────────────────── Initializer ───────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Proxy initializer.
     * @param admin          DEFAULT_ADMIN + UPGRADER (timelock in production).
     * @param pauser         PAUSER_ROLE.
     * @param anchorer       ANCHORER_ROLE — the relayer service (hot, KMS-backed).
     * @param issuerRegistry_ Deployed {IssuerRegistry} proxy address.
     */
    function initialize(address admin, address pauser, address anchorer, address issuerRegistry_)
        external
        initializer
    {
        __TrustChainBase_init(admin, pauser);
        if (anchorer == address(0) || issuerRegistry_ == address(0)) revert ZeroAddress();
        _grantRole(ANCHORER_ROLE, anchorer);
        _issuerRegistry = IIssuerRegistry(issuerRegistry_);
    }

    // ────────────────────────────── Mutations ────────────────────────────────

    /// @inheritdoc ICertificateAnchor
    function anchorRoot(
        bytes32 root,
        uint64 issuerId,
        bytes32 batchRef,
        AnchorType anchorType,
        string calldata metadataURI
    ) external override onlyRole(ANCHORER_ROLE) whenNotPaused {
        _anchor(root, issuerId, batchRef, anchorType, metadataURI);
    }

    /// @inheritdoc ICertificateAnchor
    function anchorRoots(
        bytes32[] calldata roots,
        uint64[] calldata issuerIds,
        bytes32[] calldata batchRefs,
        AnchorType[] calldata anchorTypes,
        string[] calldata metadataURIs
    ) external override onlyRole(ANCHORER_ROLE) whenNotPaused {
        uint256 len = roots.length;
        if (len == 0) revert EmptyBatch();
        if (len > MAX_ROOTS_PER_TX) revert BatchTooLarge(len, MAX_ROOTS_PER_TX);
        if (
            issuerIds.length != len ||
            batchRefs.length != len ||
            anchorTypes.length != len ||
            metadataURIs.length != len
        ) revert ArrayLengthMismatch();

        // Bounded loop over calldata; unchecked increment is safe (i < len).
        for (uint256 i = 0; i < len; ) {
            _anchor(roots[i], issuerIds[i], batchRefs[i], anchorTypes[i], metadataURIs[i]);
            unchecked {
                ++i;
            }
        }
    }

    // ─────────────────────────────── Views ───────────────────────────────────
    // Views are intentionally NOT pausable — verification must always work.

    /// @inheritdoc ICertificateAnchor
    function getAnchor(bytes32 root) external view override returns (AnchorRecord memory) {
        return _anchors[root];
    }

    /// @inheritdoc ICertificateAnchor
    function isAnchored(bytes32 root) public view override returns (bool) {
        return _anchors[root].timestamp != 0;
    }

    /// @inheritdoc ICertificateAnchor
    function verifyCertificate(
        bytes32 salt,
        bytes32 contentHash,
        bytes32[] calldata proof,
        bytes32 root
    ) external view override returns (bool valid, uint40 anchoredAt) {
        AnchorRecord storage rec = _anchors[root];
        anchoredAt = rec.timestamp;
        if (anchoredAt == 0) return (false, 0);

        bytes32 leaf = MerkleLib.hashLeaf(salt, contentHash);
        valid = MerkleLib.verifyProof(leaf, proof, root);
        if (!valid) anchoredAt = 0;
    }

    /// @notice Address of the issuer registry this contract validates against.
    function issuerRegistry() external view returns (address) {
        return address(_issuerRegistry);
    }

    // ─────────────────────────────── Internal ────────────────────────────────

    /**
     * @dev Core anchor write. Checks-effects order:
     *      1. root non-zero, 2. not already anchored (A1), 3. issuer active
     *      when the type requires one (A3), 4. single-slot store, 5. event.
     */
    function _anchor(
        bytes32 root,
        uint64 issuerId,
        bytes32 batchRef,
        AnchorType anchorType,
        string calldata metadataURI
    ) private {
        if (root == bytes32(0)) revert ZeroBytes32();
        if (_anchors[root].timestamp != 0) revert RootAlreadyAnchored(root);

        // AuditLog roots are platform-level (issuerId 0). Everything that
        // commits certificate or status data must come from an ACTIVE issuer.
        if (anchorType != AnchorType.AuditLog) {
            if (!_issuerRegistry.isActiveIssuer(issuerId)) revert IssuerNotEligible(issuerId);
        }

        uint40 nowTs = uint40(block.timestamp);
        _anchors[root] = AnchorRecord({issuerId: issuerId, timestamp: nowTs, anchorType: anchorType});

        emit RootAnchored(root, issuerId, batchRef, anchorType, nowTs, metadataURI);
    }

    /// @dev Reserved storage gap for future versions (upgrade safety).
    uint256[45] private __gap;
}
