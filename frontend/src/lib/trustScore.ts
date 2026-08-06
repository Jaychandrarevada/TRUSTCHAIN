/**
 * Trust score — a deterministic, explainable composite of real signals.
 *
 * This is NOT a black-box AI score and never invents a number: every input
 * is a field the platform actually recorded (status, on-chain registration,
 * claim rate, revocation rate). The breakdown is exposed so the UI can show
 * its work — consistent with the "never fake technical data" rule that
 * governs every other data-facing surface in this app.
 */
import type { CertificateSummary, InstitutionNetworkRow } from "@/types";

const STATUS_POINTS: Record<InstitutionNetworkRow["status"], number> = {
  active: 40, pending_kyb: 15, suspended: 5, retired: 0,
};

export interface TrustScoreBreakdown {
  score: number; // 0–100
  label: "Excellent" | "Good" | "Fair" | "New" | "Attention needed";
  statusPoints: number;
  chainPoints: number;
  claimPoints: number;
  integrityPoints: number;
}

export function computeTrustScore(row: InstitutionNetworkRow): TrustScoreBreakdown {
  const statusPoints = STATUS_POINTS[row.status];
  const chainPoints = row.chain_issuer_id != null ? 15 : 0;
  const claimPoints = Math.round(row.claim_rate * 20);
  const revokedRatio = row.certificates_issued > 0 ? row.revoked / row.certificates_issued : 0;
  const integrityPoints = row.certificates_issued > 0 ? Math.round((1 - revokedRatio) * 25) : 12; // neutral midpoint until issuance begins

  const score = Math.min(100, statusPoints + chainPoints + claimPoints + integrityPoints);
  const label: TrustScoreBreakdown["label"] =
    row.status === "suspended" || row.status === "retired" ? "Attention needed"
    : row.certificates_issued === 0 ? "New"
    : score >= 85 ? "Excellent"
    : score >= 65 ? "Good"
    : "Fair";

  return { score, label, statusPoints, chainPoints, claimPoints, integrityPoints };
}

// ── Holder (Identity Wallet) trust score ─────────────────────────────────────

export interface HolderTrustBreakdown {
  score: number; // 0–100
  label: "Excellent" | "Good" | "Fair" | "New";
  identityPoints: number;
  credentialPoints: number;
  integrityPoints: number;
  verificationPoints: number;
}

export function computeHolderTrustScore(
  credentials: CertificateSummary[],
  emailVerified: boolean,
  walletLinked: boolean,
  verificationCount: number,
): HolderTrustBreakdown {
  const identityPoints = (emailVerified ? 15 : 0) + (walletLinked ? 10 : 0);
  const credentialPoints = Math.min(40, credentials.length * 8);
  const revoked = credentials.filter((c) => c.status === "revoked").length;
  const integrityPoints = credentials.length > 0
    ? Math.round((1 - revoked / credentials.length) * 25)
    : 12; // neutral midpoint until any credential is held
  const verificationPoints = verificationCount > 0 ? 10 : 0;

  const score = Math.min(100, identityPoints + credentialPoints + integrityPoints + verificationPoints);
  const label: HolderTrustBreakdown["label"] =
    credentials.length === 0 ? "New"
    : score >= 85 ? "Excellent"
    : score >= 60 ? "Good"
    : "Fair";

  return { score, label, identityPoints, credentialPoints, integrityPoints, verificationPoints };
}
