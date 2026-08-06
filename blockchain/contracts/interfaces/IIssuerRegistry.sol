// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IIssuerRegistry
 * @notice Public interface of the TrustChain issuer (institution) registry.
 *         Answers the trust question: "Is this issuer real, accredited, and
 *         was this signing key valid at issuance time?" (TDD §7.1).
 * @dev "InstitutionRegistry" in the requirements maps to this contract:
 *      register = registerIssuer, verify = attestIssuer + Active status,
 *      suspend = setIssuerStatus(Suspended), remove = setIssuerStatus(Retired).
 *      Retirement (not deletion) is deliberate: history must remain resolvable
 *      so old certificates keep verifying with an honest issuer status.
 */
interface IIssuerRegistry {
    // ───────────────────────────────  Types  ─────────────────────────────────

    /// @notice Lifecycle status of an issuer. `None` = never registered.
    enum IssuerStatus {
        None,
        Active,
        Suspended,
        Retired
    }

    /// @notice Lifecycle status of a signing key.
    enum KeyStatus {
        Active,
        Rotated,
        Revoked
    }

    /**
     * @notice Issuer record. Field packing per TDD §7.3:
     *         (status uint8 + registeredAt uint40 + statusChangedAt uint40 +
     *          attested bool) share one slot; didHash and metadataURI follow.
     */
    struct Issuer {
        IssuerStatus status;      // uint8
        uint40 registeredAt;      // unix seconds — safe until year 36812
        uint40 statusChangedAt;
        bool attested;            // regulator attestation flag
        bytes32 didHash;          // keccak256(bytes(did)) — full DID lives off-chain
        string metadataURI;       // issuer profile document (IPFS/https)
    }

    /**
     * @notice One signing-key epoch. Validity window semantics:
     *         validUntil == 0  → open-ended (current key)
     *         compromisedAt≠0  → signatures at/after this instant are invalid
     *                            even inside [validFrom, validUntil].
     */
    struct KeyRecord {
        bytes32 keyHash;          // keccak256 of the public key / JWK thumbprint
        uint40 validFrom;
        uint40 validUntil;
        uint40 compromisedAt;
        KeyStatus status;         // packs with the three uint40s
    }

    // ───────────────────────────────  Events  ────────────────────────────────

    /// @notice Emitted when an institution is admitted to the registry.
    event IssuerRegistered(
        uint64 indexed issuerId,
        bytes32 indexed didHash,
        bytes32 keyHash,
        string metadataURI
    );

    /// @notice Emitted on scheduled key rotation (old key stays valid until `validUntil`).
    event KeyRotated(
        uint64 indexed issuerId,
        bytes32 oldKeyHash,
        bytes32 newKeyHash,
        uint40 validFrom
    );

    /// @notice Emitted on emergency key revocation with a compromise timestamp fence.
    event KeyRevoked(uint64 indexed issuerId, bytes32 indexed keyHash, uint40 compromisedAt);

    /// @notice Emitted whenever issuer status changes (suspend / restore / retire).
    event IssuerStatusChanged(uint64 indexed issuerId, IssuerStatus status);

    /// @notice Emitted when a regulator attests the issuer ("InstitutionVerified").
    event IssuerAttested(uint64 indexed issuerId, address indexed attestor, string attestorRef);

    /// @notice Emitted when the issuer's off-chain profile URI is updated.
    event IssuerMetadataUpdated(uint64 indexed issuerId, string metadataURI);

    // ───────────────────────────────  Errors  ────────────────────────────────

    error IssuerAlreadyRegistered(uint64 issuerId);
    error IssuerNotRegistered(uint64 issuerId);
    error IssuerNotActive(uint64 issuerId);
    error InvalidStatusTransition(IssuerStatus from, IssuerStatus to);
    error KeyNotFound(uint64 issuerId, bytes32 keyHash);
    error KeyAlreadyExists(uint64 issuerId, bytes32 keyHash);
    error InvalidValidityWindow();

    // ─────────────────────────────  Mutations  ───────────────────────────────

    function registerIssuer(
        uint64 issuerId,
        bytes32 didHash,
        bytes32 initialKeyHash,
        string calldata metadataURI
    ) external;

    function rotateKey(uint64 issuerId, bytes32 newKeyHash, uint40 oldKeyValidUntil) external;

    function revokeKey(uint64 issuerId, bytes32 keyHash, uint40 compromisedAt) external;

    function setIssuerStatus(uint64 issuerId, IssuerStatus newStatus) external;

    function attestIssuer(uint64 issuerId, string calldata attestorRef) external;

    function updateMetadataURI(uint64 issuerId, string calldata metadataURI) external;

    // ───────────────────────────────  Views  ─────────────────────────────────

    function getIssuer(uint64 issuerId) external view returns (Issuer memory);

    function getKeyHistory(uint64 issuerId) external view returns (KeyRecord[] memory);

    /// @notice True iff `issuerId` exists and is Active.
    function isActiveIssuer(uint64 issuerId) external view returns (bool);

    /**
     * @notice Core verification primitive: was `keyHash` a valid signing key of
     *         `issuerId` at `timestamp`? Respects rotation windows and the
     *         compromise fence (UC-12).
     */
    function isKeyValidAt(uint64 issuerId, bytes32 keyHash, uint40 timestamp)
        external
        view
        returns (bool);
}
