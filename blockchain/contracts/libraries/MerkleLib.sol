// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MerkleLib
 * @author TrustChain Engineering
 * @notice Domain-separated Merkle proof verification used by the TrustChain
 *         verification path (on-chain view helpers and the open-source
 *         off-chain verifier both implement this exact scheme — TDD §8.4).
 *
 * @dev Domain separation (why the 0x00 / 0x01 prefixes exist):
 *      Classic Merkle implementations that hash leaves and internal nodes the
 *      same way are vulnerable to second-preimage attacks where an internal
 *      node is presented as a leaf (SWC-relevant, see docs/SECURITY.md §R7).
 *      TrustChain prefixes:
 *        leaf  = keccak256(0x00 ‖ salt ‖ contentHash)
 *        node  = keccak256(0x01 ‖ min(a,b) ‖ max(a,b))
 *      Sorted-pair hashing makes proofs position-independent (smaller proofs,
 *      simpler verifiers) while the prefix byte keeps the two domains disjoint.
 */
library MerkleLib {
    /**
     * @notice Computes a TrustChain leaf hash.
     * @param salt        Per-certificate random salt (32 bytes, kept off-chain;
     *                    destroying it makes the leaf permanently unlinkable —
     *                    the GDPR/DPDP erasure mechanism, SRS BR-26).
     * @param contentHash SHA-256 of the JCS-canonicalized certificate JSON.
     * @return leaf       Domain-separated leaf hash.
     */
    function hashLeaf(bytes32 salt, bytes32 contentHash) internal pure returns (bytes32 leaf) {
        leaf = keccak256(abi.encodePacked(bytes1(0x00), salt, contentHash));
    }

    /**
     * @notice Hashes two child nodes into a parent (sorted-pair, domain 0x01).
     */
    function hashNode(bytes32 a, bytes32 b) internal pure returns (bytes32 parent) {
        (bytes32 lo, bytes32 hi) = a < b ? (a, b) : (b, a);
        parent = keccak256(abi.encodePacked(bytes1(0x01), lo, hi));
    }

    /**
     * @notice Verifies a Merkle membership proof against a root.
     * @param leaf  Leaf hash (see {hashLeaf}).
     * @param proof Sibling hashes from leaf to root.
     * @param root  Expected Merkle root (as anchored on-chain).
     * @return ok   True iff the proof reconstructs `root`.
     *
     * @dev Gas: single storage-free loop over calldata; `unchecked` increment
     *      is safe because `i < proof.length` bounds it (docs/GAS.md §O6).
     */
    function verifyProof(bytes32 leaf, bytes32[] calldata proof, bytes32 root)
        internal
        pure
        returns (bool ok)
    {
        bytes32 computed = leaf;
        uint256 len = proof.length;
        for (uint256 i = 0; i < len; ) {
            computed = hashNode(computed, proof[i]);
            unchecked {
                ++i;
            }
        }
        ok = computed == root;
    }
}
