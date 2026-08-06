/**
 * VerificationCeremony — replaces the plain loading spinner on the flagship
 * verdict page with a multi-stage, honest verification experience.
 *
 * Same ground rule as the issuance ceremony (components/domain/IssuanceCeremony):
 * NEVER fake technical data. The real `verifyApi.byUid()` call fires the
 * instant this mounts, in parallel with the animation — never delayed by it.
 * "Connecting to Trust Network" is a real gate: it pulses for exactly as long
 * as the actual request takes. Every later stage only ever displays a value
 * that came back in the real `checks` object (issuer name, Merkle root, tx
 * hash, block, revocation status, expiry) — nothing is invented to make the
 * pipeline look more elaborate than what the server actually checked.
 *
 * A resolved-but-bad verdict (REVOKED, TAMPERED, …) is NOT a ceremony failure:
 * the pipeline still runs to completion, the specific failing check is shown
 * red and honest, and the real verdict is what gets revealed at the end — no
 * false cheer. Only a genuine request failure (404, network, server error)
 * stops the ceremony early; that case is handed back to the caller via
 * `onError` so the page's existing error/retry UI handles it unchanged.
 */
import { useEffect, useRef, useState } from "react";
import {
  Blocks, Building2, Fingerprint, Hash, ListChecks, Radio, ScanLine, ShieldCheck, XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { VerdictResponse } from "@/types";
import { verifyApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { VERDICTS } from "@/constants";
import { CopyField } from "@/components/ui/misc";
import { cn } from "@/utils";

const GATE_STEP = 1; // "Connecting to Trust Network" — the real network call
const PRE_DWELL_MS = 380;
const POST_DWELL_MS = 300;

type CheckKey = "issuer" | "integrity" | "anchor" | "revocation" | "merkle_proof" | null;

const STAGES: { label: string; icon: typeof Radio; checkKey: CheckKey }[] = [
  { label: "Scanning credential…", icon: ScanLine, checkKey: null },
  { label: "Connecting to Trust Network…", icon: Radio, checkKey: null },
  { label: "Resolving Issuer Identity…", icon: Building2, checkKey: "issuer" },
  { label: "Checking Digital Signature…", icon: Fingerprint, checkKey: "integrity" },
  { label: "Validating Blockchain Record…", icon: Blocks, checkKey: "anchor" },
  { label: "Checking Revocation Registry…", icon: ListChecks, checkKey: "revocation" },
  { label: "Generating Cryptographic Proof…", icon: Hash, checkKey: "merkle_proof" },
  { label: "Verification Complete", icon: ShieldCheck, checkKey: null },
];

export function VerificationCeremony({
  certUid, viaQr, onError, onVerified,
}: {
  certUid: string;
  viaQr: boolean;
  onError: (err: ApiError) => void;
  /** Fired once the ceremony finishes — the caller renders the certificate reveal. */
  onVerified: (data: VerdictResponse) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [waitingChain, setWaitingChain] = useState(false);
  const [result, setResult] = useState<VerdictResponse | null>(null);
  const startedRef = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    const dwell = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    async function play() {
      const promise = verifyApi.byUid(certUid, viaQr); // real request fires now

      setStepIndex(0);
      await dwell(PRE_DWELL_MS);
      if (cancelled) return;

      setStepIndex(GATE_STEP);
      setWaitingChain(true);

      let data: VerdictResponse;
      try {
        data = await promise;
      } catch (err) {
        if (cancelled) return;
        onError(err instanceof ApiError ? err : new ApiError({
          status: 0, code: "NETWORK_ERROR", title: "Network error",
          detail: "Could not reach the verification service.", errors: [], traceId: "",
        }));
        return;
      }
      if (cancelled) return;
      setWaitingChain(false);
      setResult(data);

      for (let i = GATE_STEP + 1; i < STAGES.length; i++) {
        if (cancelled) return;
        setStepIndex(i);
        await dwell(POST_DWELL_MS);
      }
      if (cancelled) return;
      await dwell(250); // let "Verification Complete" register before the reveal
      if (cancelled) return;
      onVerified(data);
    }
    void play();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div role="status" aria-live="polite" aria-label="Verifying certificate"
      className="glass-strong rounded-2xl p-6 shadow-glow-lg">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-text-secondary">
        Verifying {certUid}
      </p>
      <ol className="flex flex-col">
        {STAGES.map((stage, i) => {
          const state: "pending" | "active" | "complete" =
            i < stepIndex ? "complete" : i === stepIndex ? "active" : "pending";
          const checkResult = stage.checkKey && result ? result.checks[stage.checkKey] : undefined;
          const failed = state !== "pending" && checkResult && checkResult.pass === false;
          const Icon = failed ? XCircle : stage.icon;
          const isGateWaiting = i === GATE_STEP && waitingChain;

          return (
            <li key={stage.label} className="relative flex gap-3 pb-5 last:pb-0">
              {i < STAGES.length - 1 && (
                <span aria-hidden className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px",
                  i < stepIndex ? "bg-gradient-to-b from-primary-500 to-primary-500/40" : "bg-border-default/60",
                )}>
                  {!reduced && i === stepIndex - 1 && (
                    <motion.span
                      key={stepIndex}
                      className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary-300 shadow-glow"
                      initial={{ top: "0%", opacity: 0 }}
                      animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    />
                  )}
                </span>
              )}
              <span className={cn(
                "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors duration-standard",
                failed && "border-danger-700 bg-danger-100 text-danger-700 dark:bg-danger-700/20 dark:text-danger-400",
                !failed && state === "complete" && "border-primary-500 bg-primary-500/15 text-primary-500 shadow-glow",
                !failed && state === "active" && "border-primary-400 bg-primary-500/10 text-primary-400",
                !failed && state === "pending" && "border-border-default text-text-secondary/50",
              )}>
                {state === "active" && (
                  <span className="absolute inset-0 rounded-full bg-primary-500/25 animate-pulse-ring" aria-hidden />
                )}
                <Icon className={cn("h-4 w-4", isGateWaiting && "animate-pulse")} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pt-1">
                <p className={cn("truncate text-sm font-medium",
                  state === "pending" ? "text-text-secondary/60" : "text-text-primary")}>
                  {stage.label}
                </p>

                {/* Technical metadata — only ever real values from the response */}
                {stage.checkKey === "issuer" && checkResult && (
                  <p className="text-xs text-text-secondary">
                    {result!.certificate.issuer.name ?? "Unknown issuer"}
                    {result!.certificate.issuer.status && ` · ${result!.certificate.issuer.status}`}
                  </p>
                )}
                {stage.checkKey === "anchor" && checkResult && (
                  <div className="flex flex-col gap-0.5 text-xs text-text-secondary">
                    {"root" in checkResult && checkResult.root != null && (
                      <span>Root: <CopyField value={String(checkResult.root)} label="Merkle root" /></span>
                    )}
                    {"block" in checkResult && checkResult.block != null && (
                      <span className="font-mono">block {String(checkResult.block)}</span>
                    )}
                    {result!.checks.expiry && (
                      <span>
                        {result!.checks.expiry.expires_at
                          ? `Valid until ${new Date(String(result!.checks.expiry.expires_at)).toLocaleDateString()}`
                          : "No expiry set"}
                      </span>
                    )}
                  </div>
                )}
                {stage.checkKey === "revocation" && checkResult && "status" in checkResult && (
                  <p className="font-mono text-xs text-text-secondary">status: {String(checkResult.status)}</p>
                )}
                {stage.checkKey === "merkle_proof" && checkResult && (
                  <p className="text-xs text-text-secondary">
                    {checkResult.pass ? "Leaf verified against the anchored root" : "Proof did not reconcile"}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {result && (
        <p className="mt-1 border-t border-border-default/50 pt-3 text-xs text-text-secondary">
          Final verdict: <span className="font-medium text-text-primary">{VERDICTS[result.verdict].label}</span>
        </p>
      )}
    </div>
  );
}
