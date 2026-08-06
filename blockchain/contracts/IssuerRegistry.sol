// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TrustChainBase} from "./base/TrustChainBase.sol";
import {IIssuerRegistry} from "./interfaces/IIssuerRegistry.sol";

/**
 * @title IssuerRegistry
 * @author TrustChain Engineering
 * @notice On-chain registry of accredited certificate issuers (institutions)
 *         and the full history of their signing keys. This is the trust root
 *         for "who may issue" — the answer to fake universities (SRS §2.6).
 *
 *         Realizes the requested "InstitutionRegistry" responsibilities:
 *           register  → {registerIssuer} (after off-chain KYB approval, UC-01)
 *           verify    → {attestIssuer} (regulator) + Active status
 *           suspend   → {setIssuerStatus}(Suspended) — reversible
 *           remove    → {setIssuerStatus}(Retired)  — terminal, NOT deletion:
 *                       history must keep resolving so decades of already-
 *                       issued certificates verify with honest status.
 *
 * @dev Security invariants (tested in test/IssuerRegistry.test.ts and the
 *      invariant suite):
 *        I1. An issuerId, once registered, can never be re-registered.
 *        I2. Key history is append-only; records are amended (validUntil /
 *            compromisedAt) but never deleted.
 *        I3. Retired is terminal — no transition out.
 *        I4. Only REGISTRAR_ROLE mutates; REGULATOR_ROLE may attest & suspend.
 */
contract IssuerRegistry is TrustChainBase, IIssuerRegistry {
    // ─────────────────────────────── Storage ─────────────────────────────────
    // Append-only discipline: mappings grow, entries are never deleted.

    /// @dev issuerId → issuer record.
    mapping(uint64 issuerId => Issuer) private _issuers;

    /// @dev issuerId → chronological key history (index 0 = first key).
    mapping(uint64 issuerId => KeyRecord[]) private _keyHistory;

    /// @dev issuerId → keyHash → (index + 1) into _keyHistory; 0 = absent.
    ///      The +1 offset lets us use the default 0 as a sentinel cheaply.
    mapping(uint64 issuerId => mapping(bytes32 keyHash => uint256)) private _keyIndex;

    // ───────────────────────────── Initializer ───────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // implementation contract must never be initialized
    }

    /**
     * @notice Proxy initializer.
     * @param admin     DEFAULT_ADMIN + UPGRADER (timelock in production).
     * @param pauser    PAUSER_ROLE (Safe fast path).
     * @param registrar REGISTRAR_ROLE service address (KMS-backed).
     * @param regulator REGULATOR_ROLE address (zero = dormant, grantable later).
     */
    function initialize(address admin, address pauser, address registrar, address regulator)
        external
        initializer
    {
        __TrustChainBase_init(admin, pauser);
        if (registrar == address(0)) revert ZeroAddress();
        _grantRole(REGISTRAR_ROLE, registrar);
        if (regulator != address(0)) {
            _grantRole(REGULATOR_ROLE, regulator);
        }
    }

    // ────────────────────────────── Modifiers ────────────────────────────────

    /// @dev Reverts unless the issuer exists (status != None).
    modifier issuerExists(uint64 issuerId) {
        if (_issuers[issuerId].status == IssuerStatus.None) {
            revert IssuerNotRegistered(issuerId);
        }
        _;
    }

    // ────────────────────────────── Mutations ────────────────────────────────

    /// @inheritdoc IIssuerRegistry
    function registerIssuer(
        uint64 issuerId,
        bytes32 didHash,
        bytes32 initialKeyHash,
        string calldata metadataURI
    ) external override onlyRole(REGISTRAR_ROLE) whenNotPaused {
        if (didHash == bytes32(0) || initialKeyHash == bytes32(0)) revert ZeroBytes32();
        if (_issuers[issuerId].status != IssuerStatus.None) {
            revert IssuerAlreadyRegistered(issuerId); // invariant I1
        }

        uint40 nowTs = uint40(block.timestamp);
        _issuers[issuerId] = Issuer({
            status: IssuerStatus.Active,
            registeredAt: nowTs,
            statusChangedAt: nowTs,
            attested: false,
            didHash: didHash,
            metadataURI: metadataURI
        });

        _appendKey(issuerId, initialKeyHash, nowTs);

        emit IssuerRegistered(issuerId, didHash, initialKeyHash, metadataURI);
    }

    /// @inheritdoc IIssuerRegistry
    function rotateKey(uint64 issuerId, bytes32 newKeyHash, uint40 oldKeyValidUntil)
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        issuerExists(issuerId)
    {
        if (newKeyHash == bytes32(0)) revert ZeroBytes32();
        if (_keyIndex[issuerId][newKeyHash] != 0) revert KeyAlreadyExists(issuerId, newKeyHash);
        // Overlap window must not end in the past (in-flight batches keep verifying).
        if (oldKeyValidUntil < uint40(block.timestamp)) revert InvalidValidityWindow();

        // Close the current active key with the overlap window.
        KeyRecord[] storage history = _keyHistory[issuerId];
        KeyRecord storage current = history[history.length - 1];
        bytes32 oldKeyHash = current.keyHash;
        current.validUntil = oldKeyValidUntil;
        current.status = KeyStatus.Rotated;

        uint40 nowTs = uint40(block.timestamp);
        _appendKey(issuerId, newKeyHash, nowTs);

        emit KeyRotated(issuerId, oldKeyHash, newKeyHash, nowTs);
    }

    /// @inheritdoc IIssuerRegistry
    function revokeKey(uint64 issuerId, bytes32 keyHash, uint40 compromisedAt)
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        issuerExists(issuerId)
    {
        uint256 idxPlusOne = _keyIndex[issuerId][keyHash];
        if (idxPlusOne == 0) revert KeyNotFound(issuerId, keyHash);
        // The compromise fence may be in the past (attacker window) but never zero.
        if (compromisedAt == 0) revert InvalidValidityWindow();

        KeyRecord storage rec = _keyHistory[issuerId][idxPlusOne - 1];
        rec.status = KeyStatus.Revoked;
        rec.compromisedAt = compromisedAt;
        // A revoked key is also hard-closed going forward.
        if (rec.validUntil == 0 || rec.validUntil > compromisedAt) {
            rec.validUntil = compromisedAt;
        }

        emit KeyRevoked(issuerId, keyHash, compromisedAt);
    }

    /// @inheritdoc IIssuerRegistry
    function setIssuerStatus(uint64 issuerId, IssuerStatus newStatus)
        external
        override
        whenNotPaused
        issuerExists(issuerId)
    {
        // Suspension may come from the registrar OR a regulator; retirement is
        // registrar-only (platform offboarding decision).
        if (newStatus == IssuerStatus.Suspended || newStatus == IssuerStatus.Active) {
            if (!hasRole(REGISTRAR_ROLE, msg.sender) && !hasRole(REGULATOR_ROLE, msg.sender)) {
                revert AccessControlUnauthorizedAccount(msg.sender, REGISTRAR_ROLE);
            }
        } else {
            _checkRole(REGISTRAR_ROLE);
        }

        Issuer storage issuer = _issuers[issuerId];
        IssuerStatus from = issuer.status;

        // Transition rules (invariant I3): None is unreachable here; Retired is terminal.
        bool allowed = (from == IssuerStatus.Active &&
            (newStatus == IssuerStatus.Suspended || newStatus == IssuerStatus.Retired)) ||
            (from == IssuerStatus.Suspended &&
                (newStatus == IssuerStatus.Active || newStatus == IssuerStatus.Retired));
        if (!allowed) revert InvalidStatusTransition(from, newStatus);

        issuer.status = newStatus;
        issuer.statusChangedAt = uint40(block.timestamp);

        emit IssuerStatusChanged(issuerId, newStatus);
    }

    /// @inheritdoc IIssuerRegistry
    function attestIssuer(uint64 issuerId, string calldata attestorRef)
        external
        override
        onlyRole(REGULATOR_ROLE)
        whenNotPaused
        issuerExists(issuerId)
    {
        _issuers[issuerId].attested = true;
        emit IssuerAttested(issuerId, msg.sender, attestorRef);
    }

    /// @inheritdoc IIssuerRegistry
    function updateMetadataURI(uint64 issuerId, string calldata metadataURI)
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        issuerExists(issuerId)
    {
        _issuers[issuerId].metadataURI = metadataURI;
        emit IssuerMetadataUpdated(issuerId, metadataURI);
    }

    // ─────────────────────────────── Views ───────────────────────────────────
    // Views are intentionally NOT pausable: verification must always work.

    /// @inheritdoc IIssuerRegistry
    function getIssuer(uint64 issuerId) external view override returns (Issuer memory) {
        return _issuers[issuerId];
    }

    /// @inheritdoc IIssuerRegistry
    function getKeyHistory(uint64 issuerId) external view override returns (KeyRecord[] memory) {
        return _keyHistory[issuerId];
    }

    /// @inheritdoc IIssuerRegistry
    function isActiveIssuer(uint64 issuerId) public view override returns (bool) {
        return _issuers[issuerId].status == IssuerStatus.Active;
    }

    /// @inheritdoc IIssuerRegistry
    function isKeyValidAt(uint64 issuerId, bytes32 keyHash, uint40 timestamp)
        external
        view
        override
        returns (bool)
    {
        uint256 idxPlusOne = _keyIndex[issuerId][keyHash];
        if (idxPlusOne == 0) return false;
        KeyRecord storage rec = _keyHistory[issuerId][idxPlusOne - 1];

        if (timestamp < rec.validFrom) return false;
        if (rec.validUntil != 0 && timestamp > rec.validUntil) return false;
        // Compromise fence: signatures at/after the compromise instant are invalid (UC-12).
        if (rec.compromisedAt != 0 && timestamp >= rec.compromisedAt) return false;
        return true;
    }

    // ─────────────────────────────── Internal ────────────────────────────────

    /// @dev Appends a new active key record and indexes it (invariant I2).
    function _appendKey(uint64 issuerId, bytes32 keyHash, uint40 validFrom) private {
        if (_keyIndex[issuerId][keyHash] != 0) revert KeyAlreadyExists(issuerId, keyHash);
        _keyHistory[issuerId].push(
            KeyRecord({
                keyHash: keyHash,
                validFrom: validFrom,
                validUntil: 0,
                compromisedAt: 0,
                status: KeyStatus.Active
            })
        );
        _keyIndex[issuerId][keyHash] = _keyHistory[issuerId].length; // index + 1
    }

    /// @dev Reserved storage gap for future versions (upgrade safety).
    uint256[45] private __gap;
}
