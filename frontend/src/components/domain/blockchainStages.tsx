/**
 * Stage presets for the BlockchainPipeline, one per on-chain action.
 *
 * Each preset describes what the backend genuinely does for that action —
 * mirroring the real service code (backend/app/services/*) — and marks which
 * stages can only complete with real chain data. Nothing here invents a step
 * the server does not perform, and no stage displays a value the response did
 * not carry.
 *
 * `gateIndex` marks the stage that holds until the real request settles. The
 * "remote" stages before it advance while that request is genuinely in flight;
 * the "chain" stages after it render only once real data is in hand.
 */
import {
  Blocks, Boxes, Building2, FileJson2, Fingerprint, Hash, Landmark, ListChecks,
  Radio, ScrollText, ShieldCheck, Stamp, Timer,
} from "lucide-react";
import type { ChainProof, PipelineStage } from "./BlockchainPipeline";

export interface StagePreset {
  title: string;
  stages: PipelineStage[];
  gateIndex: number;
}

const txDetail = (p: ChainProof) =>
  p.txHash ? <span className="font-mono">tx {p.txHash.slice(0, 10)}…</span> : null;

/** Revocation — backend/app/services/revocation_service.confirm_revocation().
 *  Returns a real tx_hash and the rebuilt status root; no block number. */
export const REVOCATION_PIPELINE: StagePreset = {
  title: "Revoking certificate",
  stages: [
    { id: "prepare", kind: "local", label: "Preparing revocation request", icon: ScrollText },
    { id: "approvers", kind: "remote", label: "Verifying two-person approval", icon: ShieldCheck },
    { id: "statuslist", kind: "remote", label: "Updating revocation status list", icon: ListChecks },
    { id: "root", kind: "remote", label: "Rebuilding status Merkle root", icon: Hash },
    { id: "submit", kind: "remote", label: "Submitting transaction", icon: Radio },
    { id: "confirm", kind: "chain", label: "Waiting for confirmation", icon: Timer,
      detail: txDetail, pendingNote: "No transaction was returned for this revocation." },
    { id: "public", kind: "chain", label: "Revocation is now publicly verifiable", icon: Blocks },
  ],
  gateIndex: 5,
};

/** Institution registration — backend/app/services/institution_service.approve_kyb().
 *  Returns a real tx_hash and the on-chain issuerId; no block number. */
export const REGISTRATION_PIPELINE: StagePreset = {
  title: "Registering institution on-chain",
  stages: [
    { id: "review", kind: "local", label: "Recording accreditation decision", icon: Landmark },
    { id: "issuerid", kind: "remote", label: "Deriving deterministic issuer ID", icon: Fingerprint },
    { id: "did", kind: "remote", label: "Generating issuer DID and key hash", icon: Building2 },
    { id: "submit", kind: "remote", label: "Submitting registration transaction", icon: Radio },
    { id: "confirm", kind: "chain", label: "Waiting for confirmation", icon: Timer,
      detail: txDetail, pendingNote: "No transaction was returned for this registration." },
    { id: "active", kind: "chain", label: "Issuer active — issuance unlocked", icon: ShieldCheck,
      detail: (p) => p.chainIssuerId != null
        ? <span className="font-mono">issuerId {p.chainIssuerId}</span> : null },
  ],
  gateIndex: 4,
};

/**
 * Supersede — backend/app/services/certificate_service.supersede().
 *
 * Deliberately ends WITHOUT a confirmed block. Superseding issues a corrected
 * certificate into a fresh batch; that batch is anchored later, at approval.
 * The response carries only the successor's UID, so claiming a transaction
 * here would be inventing one. The final stage says so plainly.
 */
export const SUPERSEDE_PIPELINE: StagePreset = {
  title: "Issuing corrected certificate",
  stages: [
    { id: "collect", kind: "local", label: "Collecting corrected fields", icon: FileJson2 },
    { id: "canonical", kind: "remote", label: "Building canonical JSON", icon: FileJson2 },
    { id: "hash", kind: "remote", label: "Computing SHA-256 content hash", icon: Hash },
    { id: "link", kind: "remote", label: "Linking original → successor", icon: Boxes },
    { id: "issue", kind: "chain", label: "Corrected certificate issued", icon: Stamp,
      pendingNote: "Awaiting batch approval — it is anchored on-chain when that batch is sealed." },
  ],
  gateIndex: 4,
};
