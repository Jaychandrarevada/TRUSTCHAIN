/**
 * Off-chain Merkle toolkit tests — edge cases and on-chain parity guarantees.
 * (On-chain parity itself is exercised in CertificateAnchor.test.ts; these
 * tests pin the pure-TS algorithm: odd trees, single leaves, determinism.)
 */
import { expect } from "chai";
import { buildBatch, buildTree, getProof, hashLeaf, hashNode, verifyProof, contentHash, generateSalt } from "../utils/merkle";

describe("utils/merkle", () => {
  it("single-leaf tree: root == leaf, proof is empty", () => {
    const leaf = hashLeaf(generateSalt(), contentHash("{}"));
    const tree = buildTree([leaf]);
    expect(tree.root).to.equal(leaf);
    expect(getProof(tree, 0)).to.deep.equal([]);
    expect(verifyProof(leaf, [], tree.root)).to.equal(true);
  });

  it("odd leaf counts: promotion (not duplication) — every proof verifies", () => {
    for (const n of [3, 5, 7, 9, 33]) {
      const { leaves, tree, proofs } = buildBatch(
        Array.from({ length: n }, (_, i) => `{"i":${i}}`),
      );
      leaves.forEach((leaf, i) => {
        expect(verifyProof(leaf, proofs[i], tree.root), `n=${n} leaf=${i}`).to.equal(true);
      });
    }
  });

  it("sorted-pair hashing is order-independent; domains are separated", () => {
    const a = contentHash("a");
    const b = contentHash("b");
    expect(hashNode(a, b)).to.equal(hashNode(b, a));
    // Leaf(0x00) and node(0x01) over identical bytes must differ.
    expect(hashLeaf(a, b)).to.not.equal(hashNode(a, b));
  });

  it("wrong leaf / wrong proof / wrong root all fail", () => {
    const { leaves, tree, proofs } = buildBatch(['{"x":1}', '{"x":2}', '{"x":3}', '{"x":4}']);
    expect(verifyProof(leaves[0], proofs[1], tree.root)).to.equal(false);
    expect(verifyProof(leaves[0], proofs[0], leaves[1])).to.equal(false);
    const tampered = [...proofs[0]];
    tampered[0] = contentHash("evil");
    expect(verifyProof(leaves[0], tampered, tree.root)).to.equal(false);
  });

  it("is deterministic for identical inputs (salts fixed)", () => {
    const salts = ["0x" + "11".repeat(32), "0x" + "22".repeat(32)];
    const hashes = [contentHash("one"), contentHash("two")];
    const l1 = hashes.map((h, i) => hashLeaf(salts[i], h));
    const l2 = hashes.map((h, i) => hashLeaf(salts[i], h));
    expect(buildTree(l1).root).to.equal(buildTree(l2).root);
  });

  it("erasure property: destroying the salt breaks linkability, not the tree", () => {
    const { salts, contentHashes, leaves, tree, proofs } = buildBatch(['{"pii":"x"}', '{"pii":"y"}']);
    // Without the salt, an attacker who guesses the content cannot reproduce the leaf.
    const guessedLeaf = hashLeaf("0x" + "00".repeat(32), contentHashes[0]);
    expect(guessedLeaf).to.not.equal(leaves[0]);
    // Other certificates in the batch remain verifiable after cert 0's erasure.
    expect(verifyProof(leaves[1], proofs[1], tree.root)).to.equal(true);
  });

  it("empty batch throws", () => {
    expect(() => buildTree([])).to.throw("at least one leaf");
  });
});
