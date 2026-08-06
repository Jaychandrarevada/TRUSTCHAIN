/**
 * Shared test fixtures. `loadFixture` snapshots the chain after first run,
 * making every test start from an identical, cheap-to-restore state.
 *
 * Actor model mirrors production roles (TDD §7.4):
 *   admin     — DEFAULT_ADMIN + UPGRADER (timelock stand-in)
 *   pauser    — PAUSER_ROLE (Safe stand-in)
 *   registrar — REGISTRAR_ROLE service
 *   anchorer  — ANCHORER_ROLE relayer service
 *   regulator — REGULATOR_ROLE
 *   outsider  — no roles (negative tests)
 */
import { ethers, upgrades } from "hardhat";
import { keccak256, toUtf8Bytes, zeroPadValue, toBeHex } from "ethers";
import type { IssuerRegistry, CertificateAnchor, RevocationRegistry } from "../../typechain-types";

export const ISSUER_ID = 1n;
export const DID_HASH = keccak256(toUtf8Bytes("did:web:xyz-university.edu"));
export const KEY_HASH_1 = keccak256(toUtf8Bytes("issuer-key-1"));
export const KEY_HASH_2 = keccak256(toUtf8Bytes("issuer-key-2"));
export const LIST_ID = keccak256(toUtf8Bytes("status-list-2026"));
export const META_URI = "ipfs://bafybeigdyrmanifest/issuer.json";

/** Deterministic bytes32 batch ref from a number (stand-in for a batch UUID). */
export function batchRef(n: number): string {
  return zeroPadValue(toBeHex(n), 32);
}

export interface TrustChainFixture {
  issuerRegistry: IssuerRegistry;
  certificateAnchor: CertificateAnchor;
  revocationRegistry: RevocationRegistry;
  admin: any;
  pauser: any;
  registrar: any;
  anchorer: any;
  regulator: any;
  outsider: any;
}

/** Deploys all three UUPS proxies with the production wiring. */
export async function deployTrustChain(): Promise<TrustChainFixture> {
  const [admin, pauser, registrar, anchorer, regulator, outsider] = await ethers.getSigners();

  const IssuerRegistryF = await ethers.getContractFactory("IssuerRegistry", admin);
  const issuerRegistry = (await upgrades.deployProxy(
    IssuerRegistryF,
    [admin.address, pauser.address, registrar.address, regulator.address],
    { kind: "uups" },
  )) as unknown as IssuerRegistry;

  const CertificateAnchorF = await ethers.getContractFactory("CertificateAnchor", admin);
  const certificateAnchor = (await upgrades.deployProxy(
    CertificateAnchorF,
    [admin.address, pauser.address, anchorer.address, await issuerRegistry.getAddress()],
    { kind: "uups" },
  )) as unknown as CertificateAnchor;

  const RevocationRegistryF = await ethers.getContractFactory("RevocationRegistry", admin);
  const revocationRegistry = (await upgrades.deployProxy(
    RevocationRegistryF,
    [admin.address, pauser.address, anchorer.address, await issuerRegistry.getAddress()],
    { kind: "uups" },
  )) as unknown as RevocationRegistry;

  return { issuerRegistry, certificateAnchor, revocationRegistry, admin, pauser, registrar, anchorer, regulator, outsider };
}

/** Fixture with one active issuer already registered. */
export async function deployWithIssuer(): Promise<TrustChainFixture> {
  const fx = await deployTrustChain();
  await fx.issuerRegistry
    .connect(fx.registrar)
    .registerIssuer(ISSUER_ID, DID_HASH, KEY_HASH_1, META_URI);
  return fx;
}
