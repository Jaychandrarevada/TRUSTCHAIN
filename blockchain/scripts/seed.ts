/**
 * Local/testnet seeding — registers a demo issuer and anchors a demo batch so
 * frontend/backend teams have real chain data to develop against.
 *
 * Usage: npm run seed:local   (after `npm run node:local` + `npm run deploy:local`)
 */
import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes, zeroPadValue, toBeHex } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { buildBatch } from "../utils/merkle";

async function main(): Promise<void> {
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  const [signer] = await ethers.getSigners(); // deployer holds all roles locally

  const issuerRegistry = await ethers.getContractAt(
    "IssuerRegistry",
    record.contracts.IssuerRegistry.proxy,
    signer,
  );
  const certificateAnchor = await ethers.getContractAt(
    "CertificateAnchor",
    record.contracts.CertificateAnchor.proxy,
    signer,
  );

  // 1) Demo issuer.
  const issuerId = 1n;
  const didHash = keccak256(toUtf8Bytes("did:web:demo-university.test"));
  const keyHash = keccak256(toUtf8Bytes("demo-issuer-key-1"));
  const existing = await issuerRegistry.getIssuer(issuerId);
  if (existing.status === 0n) {
    await (
      await issuerRegistry.registerIssuer(issuerId, didHash, keyHash, "ipfs://demo/issuer.json")
    ).wait();
    console.log("Registered demo issuer #1 (Demo University)");
  }

  // 2) Demo batch of 10 certificates.
  const certs = Array.from({ length: 10 }, (_, i) =>
    JSON.stringify({
      certUid: `TC-DEMO-${i + 1}`,
      holder: `Demo Student ${i + 1}`,
      program: "B.Tech Computer Science",
      cgpa: 7.5 + i * 0.2,
      issuedOn: "2026-06-30",
    }),
  );
  const batch = buildBatch(certs);
  const batchRef = zeroPadValue(toBeHex(1001), 32);
  await (
    await certificateAnchor.anchorRoot(batch.tree.root, issuerId, batchRef, 0, "ipfs://demo/manifest")
  ).wait();

  // 3) Persist the off-chain evidence (what the platform DB would hold).
  const out = {
    issuerId: issuerId.toString(),
    merkleRoot: batch.tree.root,
    certificates: certs.map((c, i) => ({
      canonicalJson: c,
      salt: batch.salts[i],
      contentHash: batch.contentHashes[i],
      leaf: batch.leaves[i],
      proof: batch.proofs[i],
    })),
  };
  const outFile = path.join(__dirname, "..", "deployments", `${network.name}.seed.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`Anchored demo batch (root ${batch.tree.root}).`);
  console.log(`Off-chain evidence → ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
