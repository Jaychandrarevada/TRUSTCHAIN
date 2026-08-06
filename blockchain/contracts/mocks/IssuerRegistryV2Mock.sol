// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IssuerRegistry} from "../IssuerRegistry.sol";

/**
 * @title IssuerRegistryV2Mock
 * @notice TEST-ONLY mock of a v2 implementation, used to prove the UUPS
 *         upgrade path preserves storage and remains gated by UPGRADER_ROLE.
 *         Adds one function and NO storage (append-only layout discipline —
 *         the OZ upgrades plugin validates this in the test).
 * @dev Never deployed outside the test suite. The v2 adds no storage and needs
 *      no re-initialization, so the missing-initializer check is waived — the
 *      standard pattern for pure logic upgrades.
 * @custom:oz-upgrades-unsafe-allow missing-initializer
 */
contract IssuerRegistryV2Mock is IssuerRegistry {
    /// @notice New function proving the implementation actually changed.
    function version() external pure returns (string memory) {
        return "2.0.0-mock";
    }
}
