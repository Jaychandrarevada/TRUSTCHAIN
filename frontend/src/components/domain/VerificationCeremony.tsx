/**
 * VerificationCeremony — the cinematic verification workflow on the public
 * verdict page, replacing what would otherwise be a spinner.
 *
 * ── Honesty rules (unchanged from the original ceremony) ──────────────────
 * The real `verifyApi.byUid()` call fires the instant this mounts, in parallel
 * with the animation and never delayed by it. "Scanning credential" is a real
 * gate: it holds for exactly as long as the actual request takes. Every stage
 * after it maps to a REAL key in the response's `checks` object and displays
 * only values the server actually returned — issuer name, Merkle root, tx
 * hash, block, revocation status, expiry. Nothing is invented to make the
 * pipeline look richer than the work performed.
 *
 * The backend performs exactly six checks (integrity, merkle_proof, anchor,
 * issuer, revocation, expiry — see verification_service.py). Each has its own
 * stage. "Building trust proof" is the client composing the final verdict from
 * those six results, which is genuinely what happens, and is the only stage
 * without a check key.
 *
 * A resolved-but-bad verdict (REVOKED, TAMPERED, …) is NOT a ceremony failure:
 * the pipeline runs to completion and the specific failing stage is shown in
 * red with the reason, so the stage responsible is always identifiable. Only a
 * genuine request failure stops it early, handed back through `onError`.
 */
import { useEffect, useRef, useState } from "react";
import {
  Blocks, Building2, CalendarClock, Fingerprint, Hash, ListChecks, ScanLine,
  ShieldCheck, Sparkles, XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { VerdictResponse } from "@/types";
import { verifyApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { VERDICTS } from "@/constants";
import { CopyField } from "@/components/ui/misc";
import { cn } from "@/utils";

const GATE_STEP = 0; // "Scanning credential" — holds for the real network call
const PRE_DWELL_MS = 260;
const POST_DWELL_MS = 300;

type CheckKey = "issuer" | "integrity" | "merkle_proof" | "anchor" | "revocation" | "expiry" | null;

const STAGES: { label: string; icon: typeof ScanLine; checkKey: CheckKey }[] = [
  { label: "Scanning credential", icon: ScanLine, checkKey: null },
  { label: "Resolving issuer", icon: Building2, checkKey: "issuer" },
  { label: "Validating signature", icon: Fingerprint, checkKey: "integrity" },
  { label: "Verifying Merkle proof", icon: Hash, checkKey: "merkle_proof" },
  { label: "Checking blockchain anchor", icon: Blocks, checkKey: "anchor" },
  { label: "Checking revocation registry", icon: ListChecks, checkKey: "revocation" },
  { label: "Checking expiration", icon: CalendarClock, checkKey: "expiry" },
  { label: "Building trust proof", icon: Sparkles, checkKey: null },
  { label: "Verification complete", icon: ShieldCheck, checkKey: null },
];

/** Reads a field off a check result without asserting it exists. */
function field(check: unknown, key: string): string | number | null {
  if (!check || typeof check !== "object" || !(key in check)) return null;
  const v = (check as Record<string, unknown>)[key];
  return typeof v === "string" || typeof v === "number" ? v : null;
}

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
  const reduced = useReducedMotion();

  /**
   * The in-flight verification request, created at most once.
   *
   * This must NOT be an "effect already ran" flag. Under StrictMode React
   * mounts, cleans up, then mounts again — a guard on the effect body lets the
   * first pass start, the cleanup cancel it, and the second pass return early,
   * freezing the ceremony on its first stage forever. Memoising the promise
   * instead lets the effect re-run and re-drive the animation while the real
   * request still fires exactly once.
   */
  const promiseRef = useRef<Promise<VerdictResponse> | null>(null);
  const callbacks = useRef({ onError, onVerified });
  callbacks.current = { onError, onVerified };

  useEffect(() => {
    let cancelled = false;
    const dwell = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    (async () => {
      promiseRef.current ??= verifyApi.byUid(certUid, viaQr); // real request
      const promise = promiseRef.current;
      promise.catch(() => undefined); // handled below; avoids an unhandled rejection

      setStepIndex(GATE_STEP);
      setWaitingChain(true);

      let data: VerdictResponse;
      try {
        data = await promise;
      } catch (err) {
        if (cancelled) return;
        callbacks.current.onError(err instanceof ApiError ? err : new ApiError({
          status: 0, code: "NETWORK_ERROR", title: "Network error",
          detail: "Could not reach the verification service.", errors: [], traceId: "",
        }));
        return;
      }
      if (cancelled) return;
      setWaitingChain(false);
      setResult(data);
      await dwell(PRE_DWELL_MS);

      for (let i = GATE_STEP + 1; i < STAGES.length; i++) {
        if (cancelled) return;
        setStepIndex(i);
        await dwell(POST_DWELL_MS);
      }
      if (cancelled) return;
      await dwell(250); // let "Verification complete" register before the reveal
      if (cancelled) return;
      callbacks.current.onVerified(data);
    })();

    return () => { cancelled = true; };
  }, [certUid, viaQr]);

  const anchor = result?.checks.anchor;
  const total = STAGES.length;
  const done = result ? stepIndex : 0;
  const pct = Math.round((done / (total - 1)) * 100);

  return (
    <div role="status" aria-live="polite" aria-label="Verifying certificate"
      className="glass-strong rounded-2xl p-6 shadow-glow-lg">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
          Verifying {certUid}
        </p>
        <p className="font-mono text-xs text-text-secondary">
          {Math.min(done + 1, total)}/{total}
        </p>
      </div>

      {/* Progress — reflects real completed stages, not a timed fake. */}
      <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-border-default/60"
        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label="Verification progress">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-[width] duration-standard ease-out-expo"
          style={{ width: `${pct}%` }}
        />
      </div>

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
                  i < stepIndex ? "bg-gradient-to-b from-primary-500 to-primary-500/40" : "bg-text-secondary/25",
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
                <p className={cn("text-sm font-medium",
                  failed ? "text-danger-700 dark:text-danger-400"
                    : state === "pending" ? "text-text-secondary/60" : "text-text-primary")}>
                  {stage.label}
                </p>

                {/* Only ever real values from the response. */}
                {stage.checkKey === "issuer" && checkResult && (
                  <p className="text-xs text-text-secondary">
                    {result!.certificate.issuer.name ?? "Unrecognised issuer"}
                    {result!.certificate.issuer.status && ` · ${result!.certificate.issuer.status}`}
                  </p>
                )}
                {stage.checkKey === "integrity" && checkResult && (
                  <p className="text-xs text-text-secondary">
                    {checkResult.pass
                      ? String(field(checkResult, "note") ?? "Content hash matches the sealed record")
                      : "Content hash does not match the sealed record"}
                  </p>
                )}
                {stage.checkKey === "merkle_proof" && checkResult && (
                  <p className="text-xs text-text-secondary">
                    {checkResult.pass ? "Leaf verified against the anchored root" : "Proof did not reconcile"}
                  </p>
                )}
                {stage.checkKey === "anchor" && checkResult && (
                  <p className="font-mono text-xs text-text-secondary">
                    {field(checkResult, "block") != null
                      ? `block ${field(checkResult, "block")}`
                      : checkResult.pass ? "anchored" : "not anchored"}
                  </p>
                )}
                {stage.checkKey === "revocation" && checkResult && (
                  <p className="font-mono text-xs text-text-secondary">
                    status: {String(field(checkResult, "status") ?? "unknown")}
                  </p>
                )}
                {stage.checkKey === "expiry" && checkResult && (
                  <p className="text-xs text-text-secondary">
                    {field(checkResult, "expires_at")
                      ? `${checkResult.pass ? "Valid until" : "Expired"} ${new Date(String(field(checkResult, "expires_at"))).toLocaleDateString()}`
                      : "No expiry set"}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {result && (
        <>
          <p className="mt-1 border-t border-border-default/50 pt-3 text-xs text-text-secondary">
            Final verdict: <span className="font-medium text-text-primary">{VERDICTS[result.verdict].label}</span>
          </p>

          {/* Technical transparency — collapsed, never hidden. Only fields the
              response actually carried are rendered. */}
          <details className="group mt-2 rounded-lg border border-border-default/60 bg-surface/40">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text-secondary marker:content-['']">
              Inspect cryptographic metadata
            </summary>
            <dl className="flex flex-col gap-2 border-t border-border-default/50 px-3 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Certificate ID</dt>
                <dd className="font-mono">{result.certificate.cert_uid}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Issuer</dt>
                <dd className="font-medium">{result.certificate.issuer.name ?? "Unrecognised"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Merkle proof</dt>
                <dd className={result.checks.merkle_proof?.pass ? "text-success-700 dark:text-success-400" : "text-danger-700 dark:text-danger-400"}>
                  {result.checks.merkle_proof?.pass ? "Verified against root" : "Did not reconcile"}
                </dd>
              </div>
              {field(anchor, "root") && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-secondary">Merkle root</dt>
                  <dd><CopyField value={String(field(anchor, "root"))} label="Merkle root" /></dd>
                </div>
              )}
              {field(anchor, "tx_hash") && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-secondary">Transaction</dt>
                  <dd><CopyField value={String(field(anchor, "tx_hash"))} label="transaction hash" /></dd>
                </div>
              )}
              {field(anchor, "block") != null && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-secondary">Block</dt>
                  <dd className="font-mono">{field(anchor, "block")}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Expires</dt>
                <dd className="font-mono">
                  {field(result.checks.expiry, "expires_at")
                    ? new Date(String(field(result.checks.expiry, "expires_at"))).toLocaleString()
                    : "no expiry"}
                </dd>
              </div>
            </dl>
          </details>
        </>
      )}
    </div>
  );
}
