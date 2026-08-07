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
