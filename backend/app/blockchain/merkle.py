"""
Merkle toolkit — Python port of blockchain/utils/merkle.ts.

MUST stay byte-identical with contracts/libraries/MerkleLib.sol:
    contentHash = sha256(canonical_json)          (application digest)
    leaf        = keccak256(0x00 ‖ salt ‖ contentHash)
    node        = keccak256(0x01 ‖ min(a,b) ‖ max(a,b))   (sorted-pair)
Odd nodes are PROMOTED (never duplicated). Parity is pinned by
tests/test_merkle.py against vectors from the Hardhat suite.

Canonicalization: sorted-key compact JSON. This matches the issuing pipeline;
full RFC 8785 JCS (unicode/number edge cases) is the documented production
hardening step — both sides must change together (parity contract).
"""
from __future__ import annotations

import hashlib
import json
import secrets
from dataclasses import dataclass

from eth_utils import keccak

LEAF_PREFIX = b"\x00"
NODE_PREFIX = b"\x01"


def canonicalize(payload: dict) -> str:
    """Deterministic JSON: sorted keys, compact separators, UTF-8."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def content_hash(canonical_json: str) -> str:
    """SHA-256 over the canonical payload → 0x-hex."""
    return "0x" + hashlib.sha256(canonical_json.encode()).hexdigest()


def generate_salt() -> str:
    """Per-certificate random 32-byte salt (destroyed on erasure, BR-26)."""
    return "0x" + secrets.token_bytes(32).hex()


def _b(hexstr: str) -> bytes:
    return bytes.fromhex(hexstr.removeprefix("0x"))


def hash_leaf(salt: str, cert_content_hash: str) -> str:
    """Domain-separated leaf — mirrors MerkleLib.hashLeaf."""
    return "0x" + keccak(LEAF_PREFIX + _b(salt) + _b(cert_content_hash)).hex()


def hash_node(a: str, b: str) -> str:
    """Sorted-pair node — mirrors MerkleLib.hashNode."""
    lo, hi = sorted((a.lower(), b.lower()))
    return "0x" + keccak(NODE_PREFIX + _b(lo) + _b(hi)).hex()


@dataclass
class MerkleTree:
    root: str
    levels: list[list[str]]  # levels[0] = leaves


def build_tree(leaves: list[str]) -> MerkleTree:
    """Builds the full tree; raises on an empty batch."""
    if not leaves:
        raise ValueError("Merkle tree requires at least one leaf")
    levels = [list(leaves)]
    level = list(leaves)
    while len(level) > 1:
        nxt: list[str] = []
        for i in range(0, len(level), 2):
            if i + 1 < len(level):
                nxt.append(hash_node(level[i], level[i + 1]))
            else:
                nxt.append(level[i])  # odd promotion
        levels.append(nxt)
        level = nxt
    return MerkleTree(root=level[0], levels=levels)


def get_proof(tree: MerkleTree, leaf_index: int) -> list[str]:
    """Sibling path from leaf to root (position-free thanks to sorted pairs)."""
    proof: list[str] = []
    index = leaf_index
    for level in tree.levels[:-1]:
        sibling = index + 1 if index % 2 == 0 else index - 1
        if sibling < len(level):
            proof.append(level[sibling])
        index //= 2
    return proof


def verify_proof(leaf: str, proof: list[str], root: str) -> bool:
    computed = leaf
    for sibling in proof:
        computed = hash_node(computed, sibling)
    return computed.lower() == root.lower()


def build_batch(payloads: list[dict]) -> dict:
    """Full pipeline for a batch: salts, hashes, leaves, tree, per-cert proofs."""
    canon = [canonicalize(p) for p in payloads]
    salts = [generate_salt() for _ in payloads]
    hashes = [content_hash(c) for c in canon]
    leaves = [hash_leaf(salts[i], hashes[i]) for i in range(len(payloads))]
    tree = build_tree(leaves)
    proofs = [get_proof(tree, i) for i in range(len(leaves))]
    return {"salts": salts, "content_hashes": hashes, "leaves": leaves, "tree": tree, "proofs": proofs}
