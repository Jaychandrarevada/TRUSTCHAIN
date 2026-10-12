/**
 * API services — one typed function per backend endpoint, grouped by domain.
 * Components never call axios directly; TanStack Query wraps these (PART 11).
 */
import type {
  AiChatResponse,
  AiExplainCertificateResponse,
  AiExplainTransactionResponse,
  AiSuspiciousResponse,
  AuditRow,
  Batch,
  CertificateDetail,
  CertificateSummary,
  InstitutionNetworkRow,
  IssuerAnalytics,
  KybApplication,
  NotificationItem,
  PlatformDashboard,
  ShareLink,
  TokenPair,
  VerdictResponse,
  VerificationHistoryRow,
  WalletProfile,
} from "@/types";
import { http, setTokens } from "./http";

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  async register(body: { email: string; password: string; full_name: string; role?: string }) {
    return (await http.post<{ id: string; email: string }>("/auth/register", body)).data;
  },
  async verifyEmail(token: string) {
    await http.post("/auth/verify-email", { token });
  },
  async login(email: string, password: string): Promise<TokenPair> {
    const pair = (await http.post<TokenPair>("/auth/login", { email, password })).data;
    setTokens(pair);
    return pair;
  },
  async logout(refresh: string | null) {
    try {
      if (refresh) await http.post("/auth/logout", null, { headers: { Authorization: `Bearer ${refresh}` } });
    } finally {
      setTokens(null);
    }
  },
  async forgotPassword(email: string) {
    await http.post("/auth/password/forgot", { email });
  },
  async resetPassword(token: string, password: string) {
    await http.post("/auth/password/reset", { token, password });
  },
  // MetaMask (challenge → sign in wallet → login/link)
  async walletChallenge(address: string) {
    return (await http.post<{ nonce: string; message: string; expires_at: string }>(
      "/auth/wallet/challenge", { address })).data;
  },
  async walletLogin(nonce: string, signature: string): Promise<TokenPair> {
    const pair = (await http.post<TokenPair>("/auth/wallet/login", { nonce, signature })).data;
    setTokens(pair);
    return pair;
  },
  async walletLink(nonce: string, signature: string, chain_id: number) {
    return (await http.post<{ address: string; chain_id: number }>(
      "/auth/wallet/link", { nonce, signature, chain_id })).data;
  },
};

// ── Public verification ───────────────────────────────────────────────────────
export const verifyApi = {
  async byUid(certUid: string, viaQr = false): Promise<VerdictResponse> {
    return (await http.get<VerdictResponse>(`/verify/${certUid}`, { params: viaQr ? { qr: 1 } : {} })).data;
  },
  async byShare(token: string, pin?: string): Promise<VerdictResponse> {
    return (await http.get<VerdictResponse>(`/verify/share/${token}`,
      { headers: pin ? { "X-Share-Pin": pin } : {} })).data;
  },
  async byFile(certUid: string, payload: Record<string, unknown>): Promise<VerdictResponse> {
    return (await http.post<VerdictResponse>("/verify/file", { cert_uid: certUid, payload })).data;
  },
  async uploadPdf(file: File): Promise<VerdictResponse & {
    upload_analysis?: {
      detected_cert_uid: string;
      extracted_payload: Record<string, unknown>;
      filename: string;
      pdf_pages: number;
      tamper_detected: boolean;
      field_discrepancies?: Record<string, { original_on_chain: unknown; modified_in_file: unknown }>;
    };
  }> {
    const formData = new FormData();
    formData.append("file", file);
    return (await http.post("/verify/upload-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })).data;
  },
  async demoCerts(): Promise<{ demo_certificates: {
    cert_uid: string;
    institution_name: string;
    institution_slug: string;
    student_name: string;
    program: string;
    cgpa: string;
    hall_ticket_no: string;
    content_hash: string;
    batch_id: string;
    merkle_root: string;
    tx_hash: string;
    pdf_url: string;
    pdf_tampered_url: string;
    verify_url: string;
  }[] }> {
    return (await http.get("/verify/demo-certs")).data;
  },
};

// ── Issuer console ────────────────────────────────────────────────────────────
export const issuerApi = {
  async createBatch(name: string, rows: Record<string, unknown>[]): Promise<Batch> {
    return (await http.post<Batch>("/certificates/batches", { name, rows })).data;
  },
  async listBatches(status?: string): Promise<{ data: Batch[] }> {
    return (await http.get<{ data: Batch[] }>("/certificates/batches", { params: status ? { status } : {} })).data;
  },
  async getBatch(id: string): Promise<Batch> {
    return (await http.get<Batch>(`/certificates/batches/${id}`)).data;
  },
  async submitBatch(id: string): Promise<Batch> {
    return (await http.post<Batch>(`/certificates/batches/${id}/submit`)).data;
  },
  async approveBatch(id: string): Promise<Batch> {
    return (await http.post<Batch>(`/certificates/batches/${id}/approve`)).data;
  },
  async listCertificates(params: { status?: string; limit?: number; offset?: number } = {}) {
    return (await http.get<{ data: CertificateSummary[] }>("/certificates", { params })).data;
  },
  async getCertificate(uid: string): Promise<CertificateDetail> {
    return (await http.get<CertificateDetail>(`/certificates/${uid}`)).data;
  },
  async getQr(uid: string): Promise<string> {
    return (await http.get<{ qr: string }>(`/certificates/${uid}/qr`)).data.qr;
  },
  async initiateRevoke(uid: string, reason_code: string, visibility = "public") {
    await http.post(`/certificates/${uid}/revoke`, { reason_code, visibility });
  },
  async confirmRevoke(uid: string) {
    return (await http.post<{ status: string; tx_hash: string }>(`/certificates/${uid}/revoke/confirm`)).data;
  },
  async supersede(uid: string, corrected_row: Record<string, unknown>) {
    return (await http.post<{ successor_uid: string }>(`/certificates/${uid}/supersede`, { corrected_row })).data;
  },
  async analytics(): Promise<IssuerAnalytics> {
    return (await http.get<IssuerAnalytics>("/analytics/issuer")).data;
  },
  async myInstitution() {
    return (await http.get<{ id: string; legal_name: string; status: string; can_issue: boolean;
      chain_issuer_id: number | null; issuer_did: string | null }>("/institutions/me")).data;
  },
  async auditLogs(action?: string) {
    return (await http.get<{ data: AuditRow[] }>("/audit-logs", { params: action ? { action } : {} })).data;
  },
};

// ── Holder wallet ─────────────────────────────────────────────────────────────
export const walletApi = {
  async credentials() {
    return (await http.get<{ data: CertificateSummary[] }>("/wallet/credentials")).data;
  },
  async claim(cert_uid: string, holder_email: string) {
    return (await http.post<{ cert_uid: string; status: string }>("/wallet/claim", { cert_uid, holder_email })).data;
  },
  async createShare(body: { cert_uid: string; disclosed_fields?: string[]; expires_in_days?: number | null;
    max_views?: number | null; pin?: string | null }) {
    return (await http.post<{ share_id: string; url: string; token: string }>("/wallet/shares", body)).data;
  },
  async listShares() {
    return (await http.get<{ data: ShareLink[] }>("/wallet/shares")).data;
  },
  async revokeShare(id: string) {
    await http.delete(`/wallet/shares/${id}`);
  },
  async verifications() {
    return (await http.get<{ data: VerificationHistoryRow[] }>("/wallet/verifications")).data;
  },
};

// ── Employer ──────────────────────────────────────────────────────────────────
export const employerApi = {
  async bulkVerify(cert_uids: string[]) {
    return (await http.post<{ summary: Record<string, number>;
      results: { cert_uid: string; verdict: string }[] }>("/employers/verify/bulk", { cert_uids })).data;
  },
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  async kybQueue() {
    return (await http.get<{ data: KybApplication[] }>("/admin/kyb")).data;
  },
  async approveKyb(id: string) {
    return (await http.post<{ status: string; chain_issuer_id: number; tx_hash: string }>(
      `/admin/kyb/${id}/approve`)).data;
  },
  async rejectKyb(id: string, reason: string) {
    await http.post(`/admin/kyb/${id}/reject`, { reason });
  },
  async setTenantStatus(id: string, status: "active" | "suspended" | "retired") {
    return (await http.post<{ status: string }>(`/admin/tenants/${id}/status`, { status })).data;
  },
  async platformAnalytics() {
    return (await http.get<PlatformDashboard>("/analytics/platform")).data;
  },
  async institutionsNetwork() {
    return (await http.get<{ data: InstitutionNetworkRow[] }>("/admin/institutions")).data;
  },
  async institutionAuditLog(institutionId: string) {
    return (await http.get<{ data: AuditRow[] }>("/audit-logs",
      { params: { institution_id: institutionId, limit: 30 } })).data;
  },
};

// ── Shared ────────────────────────────────────────────────────────────────────
export const miscApi = {
  async notifications() {
    return (await http.get<{ data: NotificationItem[] }>("/me/notifications")).data;
  },
  async markRead(id: string) {
    await http.post(`/me/notifications/${id}/read`);
  },
  async profile() {
    return (await http.get<WalletProfile>("/me/profile")).data;
  },
  async createInstitution(body: { legal_name: string; slug: string; institution_type?: string;
    accreditation_body?: string; accreditation_ref?: string }) {
    return (await http.post<{ id: string; slug: string; status: string }>("/institutions", body)).data;
  },
  async chainInfo() {
    return (await http.get<{ mode: string; chain_id: number; contracts: Record<string, string> }>(
      "/blockchain/info")).data;
  },
};

// ── AI assistant — advisory only, never a source of truth ───────────────────
export const aiApi = {
  async status() {
    return (await http.get<{ enabled: boolean }>("/ai/status")).data;
  },
  async explainCertificate(certUid: string) {
    return (await http.get<AiExplainCertificateResponse>(`/ai/explain/certificate/${certUid}`)).data;
  },
  async explainTransaction(certUid: string) {
    return (await http.get<AiExplainTransactionResponse>(`/ai/explain/transaction/${certUid}`)).data;
  },
  async chat(message: string, context?: Record<string, unknown>, history?: { role: string; text: string }[]) {
    return (await http.post<AiChatResponse>("/ai/chat", { message, context, history })).data;
  },
  async detectSuspicious(payload: Record<string, unknown>) {
    return (await http.post<AiSuspiciousResponse>("/ai/detect-suspicious", { payload })).data;
  },
};
