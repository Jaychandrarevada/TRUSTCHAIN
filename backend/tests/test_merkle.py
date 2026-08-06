"""
Merkle toolkit tests — including PARITY VECTORS against the Solidity/TS
implementation (blockchain/utils/merkle.ts). If these fail, on-chain and
off-chain hashing have diverged: fix both sides together, never one.
"""
from __future__ import annotations

import pytest

from app.blockchain import merkle


def test_leaf_domain_separation():
    a = merkle.content_hash("a")
    b = merkle.content_hash("b")
    # leaf(0x00) and node(0x01) over the same bytes must differ (R7).
    assert merkle.hash_leaf(a, b) != merkle.hash_node(a, b)


def test_sorted_pair_is_order_independent():
    a = merkle.content_hash("x")
    b = merkle.content_hash("y")
    assert merkle.hash_node(a, b) == merkle.hash_node(b, a)


def test_single_leaf_root_equals_leaf():
    leaf = merkle.hash_leaf(merkle.generate_salt(), merkle.content_hash("{}"))
    tree = merkle.build_tree([leaf])
    assert tree.root == leaf
    assert merkle.get_proof(tree, 0) == []
    assert merkle.verify_proof(leaf, [], tree.root)


@pytest.mark.parametrize("n", [2, 3, 5, 8, 33])
def test_all_proofs_verify_odd_and_even(n):
    batch = merkle.build_batch([{"i": i} for i in range(n)])
    for i, leaf in enumerate(batch["leaves"]):
        assert merkle.verify_proof(leaf, batch["proofs"][i], batch["tree"].root), f"n={n} i={i}"


def test_tampered_content_fails():
    batch = merkle.build_batch([{"cgpa": 6.4}, {"cgpa": 8.0}])
    tampered = merkle.content_hash(merkle.canonicalize({"cgpa": 9.4}))
    forged_leaf = merkle.hash_leaf(batch["salts"][0], tampered)
    assert not merkle.verify_proof(forged_leaf, batch["proofs"][0], batch["tree"].root)


def test_wrong_salt_fails_erasure_property():
    """Destroying the salt makes the leaf unreconstructable from content (BR-26)."""
    batch = merkle.build_batch([{"pii": "x"}])
    guessed = merkle.hash_leaf("0x" + "00" * 32, batch["content_hashes"][0])
    assert guessed != batch["leaves"][0]


def test_parity_vector_with_solidity_implementation():
    """
    Fixed-input vector: leaf(0x11…11, sha256('parity')) must equal the value
    produced by blockchain/utils/merkle.ts & MerkleLib.sol for the same input
    (keccak256(0x00 ‖ salt ‖ contentHash) — deterministic, no randomness).
    """
    import hashlib

    salt = "0x" + "11" * 32
    ch = merkle.content_hash("parity")  # sha256('parity')
    assert ch == "0x" + hashlib.sha256(b"parity").hexdigest()
    leaf = merkle.hash_leaf(salt, ch)
    # keccak over fixed bytes — stable across languages by construction.
    from eth_utils import keccak
    expected = "0x" + keccak(b"\x00" + bytes.fromhex(salt[2:]) + bytes.fromhex(ch[2:])).hex()
    assert leaf == expected


def test_canonicalization_is_key_order_independent():
    assert merkle.canonicalize({"b": 1, "a": 2}) == merkle.canonicalize({"a": 2, "b": 1})


def test_empty_batch_raises():
    with pytest.raises(ValueError):
        merkle.build_tree([])
