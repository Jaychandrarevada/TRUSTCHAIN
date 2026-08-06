/**
 * TrustChain off-chain Merkle toolkit.
 *
 * MUST produce byte-identical results to contracts/libraries/MerkleLib.sol:
 *   leaf = keccak256(0x00 ‖ salt ‖ contentHash)
 *   node = keccak256(0x01 ‖ min(a,b) ‖ max(a,b))     (sorted-pair)
 * Odd nodes at any level are promoted unchanged (no duplication — duplicating
 * the last node is a known proof-forgery footgun; promotion is unambiguous).
 *
 * Used by: the anchor-worker (batch pipeline), the test suite, and the
 * open-source verifier (packages/verifier consumes this same algorithm).
 */
import { keccak256, concat, hexlify, randomBytes, sha256, toUtf8Bytes } from "ethers";

const LEAF_PREFIX = "0x00";
const NODE_PREFIX = "0x01";

export type Hex32 = string;

/** Computes the SHA-256 content hash of a canonicalized certificate payload. */
export function contentHash(canonicalJson: string): Hex32 {
  return sha256(toUtf8Bytes(canonicalJson));
}

/** Generates a per-certificate random salt (kept off-chain; destroyed on erasure). */
export function generateSalt(): Hex32 {
  return hexlify(randomBytes(32));
}

/** Domain-separated leaf hash — mirrors MerkleLib.hashLeaf. */
export function hashLeaf(salt: Hex32, certContentHash: Hex32): Hex32 {
  return keccak256(concat([LEAF_PREFIX, salt, certContentHash]));
}

/** Sorted-pair node hash — mirrors MerkleLib.hashNode. */
export function hashNode(a: Hex32, b: Hex32): Hex32 {
  const [lo, hi] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  return keccak256(concat([NODE_PREFIX, lo, hi]));
}

export interface MerkleTree {
  root: Hex32;
  /** levels[0] = leaves, levels[last] = [root] */
  levels: Hex32[][];
}

/** Builds the full tree from leaf hashes. Throws on an empty batch. */
export function buildTree(leaves: Hex32[]): MerkleTree {
  if (leaves.length === 0) throw new Error("Merkle tree requires at least one leaf");
  const levels: Hex32[][] = [leaves.slice()];
  let level = leaves.slice();
  while (level.length > 1) {
    const next: Hex32[] = [];
    for (let i = 0; i < level.length; i += 2) {
      // Odd node promotion: carry the last node up unchanged.
      next.push(i + 1 < level.length ? hashNode(level[i], level[i + 1]) : level[i]);
    }
    levels.push(next);
    level = next;
  }
  return { root: level[0], levels };
}

/**
 * Extracts the sibling-path proof for `leafIndex`.
 * Sorted-pair hashing makes the proof position-independent, so the proof is
 * just the ordered list of siblings from leaf level to the root.
 */
export function getProof(tree: MerkleTree, leafIndex: number): Hex32[] {
  const proof: Hex32[] = [];
  let index = leafIndex;
  for (let l = 0; l < tree.levels.length - 1; l++) {
    const level = tree.levels[l];
    const sibling = index % 2 === 0 ? index + 1 : index - 1;
    if (sibling < level.length) proof.push(level[sibling]);
    index = Math.floor(index / 2);
  }
  return proof;
}

/** Local proof verification — mirrors MerkleLib.verifyProof. */
export function verifyProof(leaf: Hex32, proof: Hex32[], root: Hex32): boolean {
  let computed = leaf;
  for (const sibling of proof) computed = hashNode(computed, sibling);
  return computed.toLowerCase() === root.toLowerCase();
}

/** Convenience: full batch pipeline — salts, leaves, tree, and per-cert proofs. */
export function buildBatch(canonicalCerts: string[]): {
  salts: Hex32[];
  contentHashes: Hex32[];
  leaves: Hex32[];
  tree: MerkleTree;
  proofs: Hex32[][];
} {
  const salts = canonicalCerts.map(() => generateSalt());
  const contentHashes = canonicalCerts.map(contentHash);
  const leaves = contentHashes.map((h, i) => hashLeaf(salts[i], h));
  const tree = buildTree(leaves);
  const proofs = leaves.map((_, i) => getProof(tree, i));
  return { salts, contentHashes, leaves, tree, proofs };
}
