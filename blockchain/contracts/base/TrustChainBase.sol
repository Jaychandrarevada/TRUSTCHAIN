// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title TrustChainBase
 * @author TrustChain Engineering
 * @notice Shared upgradeable base for every TrustChain contract. Realizes the
 *         "AccessControl", "Ownership" and "EmergencyPause" responsibilities of
 *         the approved architecture (TDD §7.1/§7.4) in ONE audited surface:
 *
 *           - Role-based access control (OpenZeppelin AccessControl) instead of
 *             single-owner `Ownable`: ownership == DEFAULT_ADMIN_ROLE, held by a
 *             TimelockController (48 h) that is itself controlled by a 3-of-5
 *             Gnosis Safe in production.
 *           - Emergency pause: PAUSER_ROLE may halt all state-CHANGING functions.
 *             View functions are architecturally unpausable — verification must
 *             never be blockable (SRS BR-16 / TDD §7.8).
 *           - UUPS upgradeability with an upgrade gate restricted to
 *             UPGRADER_ROLE (the timelock), plus a storage gap so future base
 *             versions can add variables without colliding with children.
 *
 * @dev Reentrancy: no TrustChain contract performs external calls or value
 *      transfers, so `ReentrancyGuard` would add storage writes for zero
 *      benefit; the security review (docs/SECURITY.md §R1) documents this
 *      decision explicitly rather than cargo-culting a guard.
 */
abstract contract TrustChainBase is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    // ─────────────────────────────── Roles ───────────────────────────────────

    /// @notice May upgrade implementations (held by timelock in production).
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice May pause/unpause state-changing functions (Safe fast path).
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Platform registrar service — issuer admission & key lifecycle.
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /// @notice Relayer service — append-only anchoring writes.
    bytes32 public constant ANCHORER_ROLE = keccak256("ANCHORER_ROLE");

    /// @notice Optional regulator multisig — attestation & suspension.
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");

    // ─────────────────────────────── Errors ──────────────────────────────────

    /// @notice A supplied address parameter was the zero address.
    error ZeroAddress();

    /// @notice A supplied bytes32 parameter was zero.
    error ZeroBytes32();

    // ────────────────────────────── Initializer ──────────────────────────────

    /**
     * @dev Initializes AccessControl/Pausable/UUPS and grants bootstrap roles.
     * @param admin   DEFAULT_ADMIN_ROLE holder (timelock in production).
     * @param pauser  PAUSER_ROLE holder (Safe fast path).
     */
    // solhint-disable-next-line func-name-mixedcase
    function __TrustChainBase_init(address admin, address pauser) internal onlyInitializing {
        if (admin == address(0) || pauser == address(0)) revert ZeroAddress();
        __AccessControl_init();
        __Pausable_init();
        // Note: OZ v5 UUPSUpgradeable is stateless — it has no initializer.

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(PAUSER_ROLE, pauser);
    }

    // ─────────────────────────── Emergency controls ──────────────────────────

    /**
     * @notice Emergency-pauses all state-changing entry points.
     * @dev Emits OpenZeppelin's {Paused} event ("SystemPaused" per event
     *      catalog — see docs/CONTRACTS.md event mapping).
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Resumes normal operation after an emergency pause.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ─────────────────────────────── Upgrades ────────────────────────────────

    /**
     * @dev UUPS upgrade gate. In production the UPGRADER_ROLE is the timelock,
     *      so every upgrade is publicly visible for 48 h before execution
     *      (TDD §7.8). The OZ upgrades plugin additionally validates storage
     *      layout compatibility in CI.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /**
     * @dev Storage gap: reserves 50 slots so future base-contract variables
     *      never shift child storage (upgrade-safety, TDD §7.3).
     */
    uint256[50] private __gap;
}
