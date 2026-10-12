/**
 * API types — mirror the Flask backend's response shapes (backend/app/api/*).
 * One source of truth for every service and component.
 */
import type { Verdict } from "@/constants";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  roles: string[];
}

export interface ApiProblem {
  status: number;
  code: string;
  title: string;
  detail: string;
  errors: { field: string; messages: string[] }[];
  traceId: string;
}

export interface CheckResult {
  pass: boolean;
  [key: string]: unknown;
}

export interface VerdictResponse {
  verdict: Verdict;
  checks: Record<string, CheckResult>;
  certificate: {
    cert_uid: string;
    disclosed_fields: Record<string, unknown>;
    issuer: { name: string | null; status: string | null };
    superseded_by?: string | null;
  };
  upload_analysis?: {
    detected_cert_uid: string;
    extracted_payload?: Record<string, unknown>;
    filename?: string;
    pdf_pages?: number;
    tamper_detected?: boolean;
    field_discrepancies?: Record<string, { original_on_chain: unknown; modified_in_file: unknown }>;
  };
}

export interface CertificateSummary {
  cert_uid: string;
  status: string;
  type: string;
  batch_id?: string;
  claimed?: boolean;
  subject_data?: Record<string, unknown>;
  anchor_tx_hash?: string | null;
  claimed_at?: string | null;
}

export interface CertificateDetail extends CertificateSummary {
  content_hash: string;
  leaf_index: number;
  merkle_root: string | null;
  supersedes?: string | null;
  superseded_by?: string | null;
  timeline: { event: string; at?: string; reason?: string | null; tx?: string | null; count?: number }[];
}

export interface Batch {
  id: string;
  name: string;
  status: "draft" | "validated" | "pending_approval" | "approved" | "anchoring" | "anchored" | "failed";
  row_count: number;
  error_report: { errors: { row: number; field: string; message: string }[] } | null;
  merkle_root: string | null;
  anchor_tx_hash: string | null;
  anchor_block: number | null;
  created_by: string;
  approved_by: string | null;
  created_at?: string | null;
  certificates?: { cert_uid: string; status: string; type: string; subject_data: Record<string, unknown> }[];
}

export interface ShareLink {
  id: string;
  certificate_id: string;
  active: boolean;
  view_count: number;
  max_views: number | null;
  expires_at: string | null;
}

export interface IssuerAnalytics {
  certificates_issued: number;
  claim_rate: number;
  revoked: number;
  batches_pending_approval: number;
  verifications_by_verdict: Record<string, number>;
  verifications_total: number;
}

export interface KybApplication {
  id: string;
  legal_name: string;
  slug: string;
  accreditation_body: string | null;
  applied_at: string;
}

/** Real identity signals for the Digital Academic Identity Wallet — never a fabricated score. */
export interface WalletProfile {
  full_name: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  wallets: { address: string; chain_id: number; linked_at: string }[];
}

export interface VerificationHistoryRow {
  cert_uid: string;
  verdict: string;
  channel: string;
  at: string;
}

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string;
  read: boolean;
  at: string;
}

/** One row of the Global Trust Network — real aggregates, no invented fields. */
export interface InstitutionNetworkRow {
  id: string;
  legal_name: string;
  slug: string;
  institution_type: string;
  status: "pending_kyb" | "active" | "suspended" | "retired";
  accreditation_body: string | null;
  chain_issuer_id: number | null;
  issuer_did: string | null;
  registration_tx_hash: string | null;
  created_at: string;
  certificates_issued: number;
  claim_rate: number;
  revoked: number;
  verifications_total: number;
  last_activity_at: string | null;
}

/**
 * AI assistant — advisory only, never a source of truth (see backend
 * app/services/ai_service.py for the hard rule this mirrors). Every response
 * carries `ai_generated: true` so the UI can label it distinctly from real
 * verified data.
 */
export interface AiExplainCertificateResponse {
  cert_uid: string;
  verdict: string;
  explanation: string;
  ai_generated: true;
}
export interface AiExplainTransactionResponse {
  cert_uid: string;
  explanation: string;
  ai_generated: true;
}
export interface AiChatResponse {
  reply: string;
  ai_generated: true;
}
export interface AiSuspiciousResponse {
  suspicious: boolean;
  reasons: string[];
  ai_generated: true;
  advisory_only: true;
}

/** Mission Control — the platform-admin dashboard. Every field is a real
 * aggregate from `analytics_service.platform_dashboard()`; nothing here is
 * modeled or estimated. */
export interface PlatformDashboard {
  institutions: Record<string, number>;
  users_total: number;
  certificates_total: number;
  certificates_live: number;
  batches_anchored: number;
  batches_pending_approval: number;
  kyb_pending: number;
  verifications_total: number;
  verifications_today: number;
  fraud_attempts_prevented: number;
  verifications_by_day: { date: string; count: number }[];
  verifications_heatmap: { weekday: number; hour: number; count: number }[];
  recent_batches: {
    id: string; name: string; institution: string; row_count: number;
    anchored_at: string | null; anchor_tx_hash: string | null;
  }[];
  recent_verifications: {
    cert_uid: string; institution: string; verdict: string; channel: string; at: string;
  }[];
}

export interface AuditRow {
  at: string;
  actor: string | null;
  action: string;
  resource: string;
  before: unknown;
  after: unknown;
  trace_id: string | null;
}
