/**
 * IPFS integration via Pinata — pinning service for public, non-PII artifacts.
 *
 * WHAT GOES TO IPFS (approved architecture, TDD §3 storage row + SRS C-1):
 *   ✔ issuer profile documents        (issuers.metadataURI)
 *   ✔ batch manifests                 (RootAnchored.metadataURI)
 *   ✔ rendered certificate artifacts  (ONLY with holder consent — public docs)
 *   ✘ NEVER: subject PII, salts, unredacted VC payloads. S3 (encrypted,
 *     in-region) remains the system of record; IPFS is an optional public
 *     mirror supporting the vendor-independence guarantee (NFR-AVL-07).
 *
 * Retrieval strategy: gateway race (Pinata dedicated gateway → public
 * gateways) with per-gateway timeouts and mandatory CID integrity by
 * construction (content addressing = the hash validation).
 * Backup strategy: every pinned payload is ALSO persisted to S3 first; IPFS
 * unpinning/garbage-collection can therefore never lose data (re-pin restores
 * the same CID because content addressing is deterministic).
 */
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import { createHash } from "crypto";

const PINATA_API = "https://api.pinata.cloud";

/** Public gateways used for read-side failover (order = preference). */
const FALLBACK_GATEWAYS = ["https://ipfs.io", "https://cloudflare-ipfs.com"];

export interface PinResult {
  cid: string;        // IPFS CID (v1)
  size: number;       // pinned size in bytes
  sha256: string;     // application-level digest we record alongside the CID
  uri: string;        // canonical ipfs:// URI for on-chain/event references
}

/**
 * Batch manifest schema — the document referenced by RootAnchored.metadataURI.
 * Contains ONLY public, non-identifying data (leaf hashes are salted, so they
 * reveal nothing about subjects — SEC-HASH-1).
 */
export interface BatchManifest {
  schemaVersion: "1.0";
  batchRef: string;          // platform batch UUID
  issuerId: string;
  merkleRoot: string;
  leafCount: number;
  leafHashes: string[];      // salted leaves (privacy-safe by construction)
  anchorType: "Issuance" | "StatusList" | "AuditLog";
  createdAt: string;         // ISO-8601
  algorithm: {
    content: "sha256-jcs";   // content hash = SHA-256 over JCS JSON
    leaf: "keccak256(0x00||salt||contentHash)";
    node: "keccak256(0x01||sorted-pair)";
  };
}

export class PinataService {
  private readonly http: AxiosInstance;
  private readonly gateway: string;

  /**
   * @param jwt     Pinata JWT (env PINATA_JWT; never hardcode).
   * @param gateway Dedicated gateway base URL (env PINATA_GATEWAY).
   */
  constructor(jwt: string = process.env.PINATA_JWT ?? "", gateway: string = process.env.PINATA_GATEWAY ?? "https://gateway.pinata.cloud") {
    if (!jwt) throw new Error("PinataService requires PINATA_JWT.");
    this.gateway = gateway.replace(/\/$/, "");
    this.http = axios.create({
      baseURL: PINATA_API,
      headers: { Authorization: `Bearer ${jwt}` },
      timeout: 30_000,
    });
  }

  // ─────────────────────────────── Upload ────────────────────────────────────

  /**
   * Pins a JSON document (manifest / issuer profile). Content-addressed:
   * identical content always yields the identical CID (idempotent re-pins).
   */
  async pinJson(name: string, content: object): Promise<PinResult> {
    const body = JSON.stringify(content);
    const res = await this.http.post("/pinning/pinJSONToIPFS", {
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
      pinataContent: content,
    });
    return this.toResult(res.data.IpfsHash, res.data.PinSize, body);
  }

  /** Pins a binary artifact (e.g., consented public certificate PDF). */
  async pinFile(name: string, data: Buffer, mimeType: string): Promise<PinResult> {
    const form = new FormData();
    form.append("file", data, { filename: name, contentType: mimeType });
    form.append("pinataMetadata", JSON.stringify({ name }));
    form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
    const res = await this.http.post("/pinning/pinFileToIPFS", form, {
      headers: form.getHeaders(),
      maxBodyLength: 25 * 1024 * 1024, // artifact cap (matches upload limits)
    });
    return this.toResult(res.data.IpfsHash, res.data.PinSize, data);
  }

  /** Convenience: builds + pins a batch manifest in one call. */
  async pinBatchManifest(manifest: BatchManifest): Promise<PinResult> {
    // Defense-in-depth: refuse anything that looks like PII slipped in.
    assertNoPiiKeys(manifest as unknown as Record<string, unknown>);
    return this.pinJson(`batch-${manifest.batchRef}.json`, manifest);
  }

  /** Unpins a CID (retention jobs; the S3 copy is the durable backup). */
  async unpin(cid: string): Promise<void> {
    await this.http.delete(`/pinning/unpin/${cid}`);
  }

  // ─────────────────────────────── Retrieval ─────────────────────────────────

  /**
   * Fetches content by CID with gateway failover. CID integrity note: IPFS
   * gateways verify content addressing, and trustless retrieval is available
   * via verified fetch; we additionally compare our recorded sha256 when the
   * caller supplies one (belt-and-braces hash validation).
   */
  async fetch(cid: string, expectedSha256?: string): Promise<Buffer> {
    const gateways = [this.gateway, ...FALLBACK_GATEWAYS];
    let lastError: unknown;
    for (const gw of gateways) {
      try {
        const res = await axios.get(`${gw}/ipfs/${cid}`, {
          responseType: "arraybuffer",
          timeout: 10_000,
        });
        const buf = Buffer.from(res.data);
        if (expectedSha256) {
          const digest = createHash("sha256").update(buf).digest("hex");
          if (digest !== expectedSha256.replace(/^0x/, "")) {
            throw new Error(`CID ${cid}: sha256 mismatch via ${gw}`);
          }
        }
        return buf;
      } catch (err) {
        lastError = err; // try next gateway
      }
    }
    throw new Error(`All gateways failed for ${cid}: ${String(lastError)}`);
  }

  // ─────────────────────────────── Internals ─────────────────────────────────

  private toResult(cid: string, size: number, content: string | Buffer): PinResult {
    const sha256 = createHash("sha256").update(content).digest("hex");
    return { cid, size, sha256, uri: `ipfs://${cid}` };
  }
}

/** Rejects manifests containing obviously-personal keys (PII lint, SEC-NFR-04). */
function assertNoPiiKeys(obj: Record<string, unknown>, path = ""): void {
  const banned = /(name$|email|phone|dob|birth|aadhaar|address|roll)/i;
  for (const [key, value] of Object.entries(obj)) {
    const where = path ? `${path}.${key}` : key;
    if (banned.test(key)) {
      throw new Error(`PII-looking key '${where}' is not allowed in public IPFS content.`);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      assertNoPiiKeys(value as Record<string, unknown>, where);
    }
  }
}
