/**
 * Public verdict page /v/:certUid — the flagship (spec §5.1).
 * Single column ≤720px, verdict hero, issuer identity, disclosed fields,
 * seven-check breakdown, collapsed blockchain proof. No login, ever (BR-16).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { ApiError } from "@/services/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/misc";
import { CheckList, VerdictPanel } from "@/components/domain/verdict";
import { VerificationCeremony } from "@/components/domain/VerificationCeremony";
import { LuxuryCredential } from "@/components/domain/LuxuryCredential";
import { AiExplainButton } from "@/components/domain/AiExplain";
import { TrustProofPanel } from "@/components/domain/TrustProofPanel";
import { MeshBackground } from "@/components/motion/MeshBackground";
import { aiApi, miscApi } from "@/services/api";
import type { VerdictResponse } from "@/types";
import { Link } from "react-router-dom";

const VERIFY_BASE = import.meta.env.VITE_VERIFY_BASE_URL ?? window.location.origin;

export function VerdictBody({ data }: { data: VerdictResponse }) {
  // Real network identity for the trust proof — never assumed.
  const chain = useQuery({ queryKey: ["chain", "info"], queryFn: miscApi.chainInfo, staleTime: 300_000 });
  const fields = data.certificate.disclosed_fields ?? {};
  const { program, holder_name, ...restFields } = fields as Record<string, unknown>;
  const certUid = data.certificate.cert_uid;

  return (
    <div className="flex flex-col gap-4">
      {/* Accessible verdict announcement (role=status) — kept separate from the
          credential's compact badge so screen readers get the full explanation. */}
      <VerdictPanel verdict={data.verdict} />

      {/* Cryptographic Tamper Analysis if tampered or discrepancies detected */}
      {(data.verdict === "TAMPERED" || (data.upload_analysis?.field_discrepancies && Object.keys(data.upload_analysis.field_discrepancies).length > 0)) && (
        <div className="overflow-hidden rounded-xl border border-danger-500/50 bg-danger-500/10 p-5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-danger-700 dark:text-danger-400">
            <span className="text-lg">⚠️</span>
            <span>Cryptographic Tamper Analysis — Blockchain Seal Mismatch</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            The presented document content was re-hashed using SHA-256. The resulting cryptographic digest
            does not match the immutable Merkle leaf anchored on the blockchain ledger.
          </p>

          {data.upload_analysis?.field_discrepancies && Object.keys(data.upload_analysis.field_discrepancies).length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-danger-300/40 bg-background-elevated p-3 text-xs">
              <div className="mb-2 font-semibold text-text-primary">Detected Alterations vs Blockchain Record:</div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-default/60 text-text-secondary">
                    <th className="py-1 pr-3">Field</th>
                    <th className="py-1 pr-3 text-success-600 dark:text-success-400">Blockchain Record (Authentic)</th>
                    <th className="py-1 font-bold text-danger-600 dark:text-danger-400">Presented File (Forged)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/40 font-mono">
                  {Object.entries(data.upload_analysis.field_discrepancies).map(([field, diff]) => (
                    <tr key={field}>
                      <td className="py-1.5 pr-3 font-sans font-medium capitalize text-text-primary">
                        {field.replace(/_/g, " ")}
                      </td>
                      <td className="py-1.5 pr-3 text-success-600 dark:text-success-400">
                        {String((diff as any).original_on_chain ?? "—")}
                      </td>
                      <td className="py-1.5 font-bold text-danger-600 dark:text-danger-400">
                        {String((diff as any).modified_in_file ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs font-mono">
            <div className="rounded-md border border-border-default bg-background-elevated p-2.5">
              <div className="text-[10px] uppercase font-sans font-semibold text-text-secondary">
                Expected On-Chain Hash (SHA-256)
              </div>
              <div className="mt-1 truncate text-success-600 dark:text-success-400" title={String(data.checks?.integrity?.expected_hash ?? "")}>
                {String(data.checks?.integrity?.expected_hash ?? "0x...")}
              </div>
            </div>
            <div className="rounded-md border border-border-default bg-background-elevated p-2.5">
              <div className="text-[10px] uppercase font-sans font-semibold text-text-secondary">
                Presented Document Hash (SHA-256)
              </div>
              <div className="mt-1 truncate text-danger-600 dark:text-danger-400" title={String(data.checks?.integrity?.presented_hash ?? "")}>
                {String(data.checks?.integrity?.presented_hash ?? "Mismatch / Rejected")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Download Actions for Demo / Testing */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-background-elevated px-4 py-2.5 text-xs">
        <span className="font-medium text-text-secondary">Official Degree PDF:</span>
        <div className="flex items-center gap-2">
          <a
            href={`/api/v1/verify/${certUid}/pdf`}
            download
            className="inline-flex items-center gap-1 rounded bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 transition"
          >
            <span>📥 Download Original PDF</span>
          </a>
          <a
            href={`/api/v1/verify/${certUid}/pdf-tampered`}
            download
            className="inline-flex items-center gap-1 rounded border border-danger-500/50 bg-danger-500/10 px-2.5 py-1 text-xs font-medium text-danger-600 hover:bg-danger-500/20 transition dark:text-danger-400"
          >
            <span>⚠️ Download Tampered PDF</span>
          </a>
        </div>
      </div>

      {data.verdict === "SUPERSEDED" && data.certificate.superseded_by && (
        <p className="rounded-md bg-info-100 p-3 text-sm text-info-700 dark:bg-info-700/20 dark:text-info-400">
          A corrected certificate exists —{" "}
          <Link className="font-medium underline" to={`/v/${data.certificate.superseded_by}`}>
            view the current certificate
          </Link>.
        </p>
      )}

      <LuxuryCredential
        certUid={certUid}
        program={program ? String(program) : certUid}
        holderName={holder_name ? String(holder_name) : undefined}
        fields={restFields}
        verdict={data.verdict}
        issuerName={data.certificate.issuer.name}
        issuerStatus={data.certificate.issuer.status}
        checks={data.checks}
        qrValue={`${VERIFY_BASE}/v/${certUid}?qr`}
        verifyUrl={`${VERIFY_BASE}/v/${certUid}`}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Verification checks</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CheckList checks={data.checks} />
          <AiExplainButton
            label="Explain this result in plain language"
            fetcher={async () => (await aiApi.explainCertificate(certUid)).explanation}
          />
        </CardContent>
      </Card>

      <TrustProofPanel data={data} chain={chain.data ?? null} />
    </div>
  );
}

export default function VerdictPage() {
  const { certUid = "" } = useParams();
  const [params] = useSearchParams();
  const viaQr = params.has("qr");

  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<VerdictResponse | null>(null);
  const [attempt, setAttempt] = useState(0); // bump to remount the ceremony on retry
  const reduced = useReducedMotion();

  return (
    <div className="relative isolate mx-auto max-w-2xl px-4 py-12">
      {/* Ambient mesh behind the verdict — subtle, never over content */}
      <MeshBackground grid={false} className="opacity-70" />
      {!error && !result && (
        <VerificationCeremony
          key={attempt}
          certUid={certUid}
          viaQr={viaQr}
          onError={setError}
          onVerified={setResult}
        />
      )}
      {result && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: EASE.out }}
        >
          <VerdictBody data={result} />
        </motion.div>
      )}
      {error && (
        <ErrorState
          title={error.problem.status === 404 ? "No certificate found for this ID" : error.problem.title}
          detail={error.problem.status === 404
            ? "Check for typos — certificate IDs look like TC-XXXX-XXXX-XXXX."
            : error.problem.detail}
          traceId={error.problem.traceId}
          onRetry={() => { setError(null); setResult(null); setAttempt((a) => a + 1); }}
        />
      )}
    </div>
  );
}
