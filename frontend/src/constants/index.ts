/**
 * Application constants — most importantly the VERDICT system (UI/UX spec
 * §5.2): every verdict pairs a distinct icon + label + explanation so meaning
 * never relies on color alone (NFR-ACC-03).
 */
import {
  ArrowRightCircle,
  Clock,
  HelpCircle,
  PauseCircle,
  ShieldCheck,
  ShieldOff,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type Verdict =
  | "VALID"
  | "REVOKED"
  | "SUPERSEDED"
  | "EXPIRED"
  | "TAMPERED"
  | "UNKNOWN_ISSUER"
  | "SUSPENDED_ISSUER";

export interface VerdictConfig {
  icon: LucideIcon;
  label: string;
  explanation: string;
  /** Tailwind classes: fg + bg pairs tuned per theme (spec §5.2 color table) */
  className: string;
}

export const VERDICTS: Record<Verdict, VerdictConfig> = {
  VALID: {
    icon: ShieldCheck,
    label: "Valid certificate",
    explanation: "Issued by the institution below and cryptographically verified on the blockchain.",
    className: "text-success-700 bg-success-100 dark:text-success-400 dark:bg-success-700/20",
  },
  REVOKED: {
    icon: XCircle,
    label: "Revoked certificate",
    explanation: "The issuer revoked this certificate. Do not rely on it.",
    className: "text-danger-700 bg-danger-100 dark:text-danger-400 dark:bg-danger-700/20",
  },
  SUPERSEDED: {
    icon: ArrowRightCircle,
    label: "Superseded certificate",
    explanation: "A corrected version of this certificate exists.",
    className: "text-info-700 bg-info-100 dark:text-info-400 dark:bg-info-700/20",
  },
  EXPIRED: {
    icon: Clock,
    label: "Expired certificate",
    explanation: "This certificate's validity period has ended.",
    className: "text-warning-700 bg-warning-100 dark:text-warning-400 dark:bg-warning-700/20",
  },
  TAMPERED: {
    icon: ShieldOff,
    label: "Certificate doesn't match records",
    explanation: "This document has been altered or is not the original. Do not rely on it.",
    className: "text-danger-800 bg-danger-100 dark:text-danger-400 dark:bg-danger-700/25",
  },
  UNKNOWN_ISSUER: {
    icon: HelpCircle,
    label: "Issuer not recognized",
    explanation: "The issuer isn't in the TrustChain registry. Verify with the institution directly.",
    className: "text-warning-700 bg-warning-100 dark:text-warning-400 dark:bg-warning-700/20",
  },
  SUSPENDED_ISSUER: {
    icon: PauseCircle,
    label: "Issuer currently suspended",
    explanation: "The certificate checks pass, but the issuing institution is suspended.",
    className: "text-warning-700 bg-warning-100 dark:text-warning-400 dark:bg-warning-700/20",
  },
};

/** Human labels for the seven verification checks (spec §5.1 CheckList). */
export const CHECK_LABELS: Record<string, string> = {
  integrity: "Content integrity",
  merkle_proof: "Cryptographic proof",
  anchor: "Blockchain record",
  issuer: "Issuer identity & accreditation",
  revocation: "Revocation status",
  expiry: "Validity period",
};

/**
 * Role → permission map — mirrors the backend ROLE_MATRIX (app/auth/rbac.py).
 * Used to gate UI actions so users never see buttons they can't use (the 403
 * "Missing permission(s)" toast was caused by ungated Approve/Revoke buttons).
 * The server remains authoritative; this is cosmetic gating only.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  student: ["wallet:own", "verify:read", "notifications:own"],
  employer: ["verify:read", "analytics:read", "notifications:own"],
  viewer: ["certificates:read", "analytics:read", "notifications:own"],
  operator: ["certificates:read", "certificates:issue", "analytics:read", "notifications:own"],
  approver: ["certificates:read", "certificates:approve", "certificates:revoke",
             "analytics:read", "notifications:own"],
  issuer_admin: ["certificates:read", "certificates:issue", "certificates:approve",
                 "certificates:revoke", "institution:manage", "analytics:read",
                 "audit:read", "notifications:own"],
  owner: ["certificates:read", "certificates:issue", "certificates:approve",
          "certificates:revoke", "institution:manage", "analytics:read",
          "audit:read", "notifications:own"],
  platform_admin: ["institution:kyb", "tenants:manage", "audit:read", "analytics:read",
                   "settings:manage", "blockchain:ops", "verify:read", "notifications:own"],
};

/** Roles → home route (post-login redirect). */
export const ROLE_HOME: Record<string, string> = {
  platform_admin: "/admin",
  owner: "/issuer",
  issuer_admin: "/issuer",
  approver: "/issuer",
  operator: "/issuer",
  viewer: "/issuer",
  employer: "/employer",
  student: "/wallet",
};

/**
 * Credential category grouping for the Digital Academic Identity Wallet.
 * `certificate_type` is free text (backend/app/schemas — load_default="degree",
 * any institution may issue any string), so these are the platform's known
 * buckets; anything unmapped falls into "Other credentials" rather than being
 * hidden or forced into a category it doesn't belong to.
 */
export const CREDENTIAL_CATEGORIES = [
  "Degrees", "Certificates", "Internships", "Licenses", "Skills", "Achievements", "Projects",
] as const;
export type CredentialCategory = (typeof CREDENTIAL_CATEGORIES)[number] | "Other credentials";

const CATEGORY_BY_TYPE: Record<string, CredentialCategory> = {
  degree: "Degrees", diploma: "Degrees", bachelor: "Degrees", master: "Degrees", phd: "Degrees",
  certificate: "Certificates", certification: "Certificates", course: "Certificates",
  internship: "Internships", apprenticeship: "Internships",
  license: "Licenses", licence: "Licenses", permit: "Licenses",
  skill: "Skills", badge: "Skills", competency: "Skills",
  achievement: "Achievements", award: "Achievements", honor: "Achievements",
  project: "Projects", capstone: "Projects", portfolio: "Projects",
};

export function categoryForType(certificateType: string): CredentialCategory {
  return CATEGORY_BY_TYPE[certificateType.trim().toLowerCase()] ?? "Other credentials";
}

export const SUPPORTED_CHAINS: Record<number, string> = {
  137: "Polygon PoS",
  80002: "Polygon Amoy (testnet)",
  11155111: "Ethereum Sepolia (testnet)",
  31337: "Local chain",
};
