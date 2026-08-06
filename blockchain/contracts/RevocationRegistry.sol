// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TrustChainBase} from "./base/TrustChainBase.sol";
import {IRevocationRegistry} from "./interfaces/IRevocationRegistry.sol";
import {IIssuerRegistry} from "./interfaces/IIssuerRegistry.sol";

/**
 * @title RevocationRegistry
 * @author TrustChain Engineering
 * @notice Anchors the current root of each issuer's W3C Bitstring Status List
 *         with strictly monotonic versions. This is the "is it STILL valid?"
 *         trust primitive that survives issuer death — the failure mode that
 *         broke first-generation systems like Blockcerts (planning §2.1.2).
 *
 *         Realizes the requested "CertificateRevocation" responsibilities:
 *           revoke certificates → platform sets the revocation bit in the
 *                                 bitstring and publishes the new root here
 *           restore             → allowed ONLY for the reversible suspension
 *                                 bit; a revocation bit is never cleared
 *                                 (BR-11 — irreversible by policy; the
 *                                 monotonic version + event stream would make
 *                                 any attempt publicly visible)
 *           revocation history  → the {StatusRootUpdated} event stream, plus
 *                                 content-addressed list snapshots at listURI,
 *                                 form a complete, immutable audit trail
 *
 * @dev Security invariants:
 *        S1. Versions are strictly increasing per (issuerId, listId) — a
 *            stale or replayed update can never overwrite a newer root.
 *        S2. Updates require an issuer that exists and is NOT Retired.
 *            Suspended issuers MAY still revoke (safety operation: a
 *            suspended institution must be able to kill bad certificates).
 */
contract RevocationRegistry is TrustChainBase, IRevocationRegistry {
    // ─────────────────────────────── Storage ─────────────────────────────────

    /// @dev issuerId → listId → status list record.
    mapping(uint64 issuerId => mapping(bytes32 listId => StatusList)) private _lists;

    /// @dev Issuer registry consulted for issuer eligibility (invariant S2).
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
     * @param anchorer       ANCHORER_ROLE — the relayer service.
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

    /// @inheritdoc IRevocationRegistry
    function updateStatusRoot(
        uint64 issuerId,
        bytes32 listId,
        bytes32 root,
        uint32 version,
        string calldata listURI
    ) external override onlyRole(ANCHORER_ROLE) whenNotPaused {
        if (root == bytes32(0) || listId == bytes32(0)) revert ZeroBytes32();

        // Invariant S2: issuer must exist and not be retired. Suspended issuers
        // keep the ability to revoke (never to issue — that's CertificateAnchor).
        IIssuerRegistry.Issuer memory issuer = _issuerRegistry.getIssuer(issuerId);
        if (
            issuer.status == IIssuerRegistry.IssuerStatus.None ||
            issuer.status == IIssuerRegistry.IssuerStatus.Retired
        ) revert IssuerNotEligible(issuerId);

        // Invariant S1: strictly monotonic versioning (replay/stale protection).
        StatusList storage list = _lists[issuerId][listId];
        if (version <= list.version) revert NonMonotonicVersion(list.version, version);

        list.root = root;
        list.version = version;
        list.updatedAt = uint40(block.timestamp);
        list.listURI = listURI;

        emit StatusRootUpdated(issuerId, listId, root, version, listURI);
    }

    // ─────────────────────────────── Views ───────────────────────────────────
    // Views are intentionally NOT pausable — revocation checks must always work.

    /// @inheritdoc IRevocationRegistry
    function getStatusList(uint64 issuerId, bytes32 listId)
        external
        view
        override
        returns (StatusList memory)
    {
        StatusList memory list = _lists[issuerId][listId];
        if (list.updatedAt == 0) revert UnknownStatusList(issuerId, listId);
        return list;
    }

    /// @inheritdoc IRevocationRegistry
    function getStatusRoot(uint64 issuerId, bytes32 listId)
        external
        view
        override
        returns (bytes32)
    {
        return _lists[issuerId][listId].root; // zero when list unknown (soft read)
    }

    /// @notice Address of the issuer registry this contract validates against.
    function issuerRegistry() external view returns (address) {
        return address(_issuerRegistry);
    }

    /// @dev Reserved storage gap for future versions (upgrade safety).
    uint256[45] private __gap;
}
