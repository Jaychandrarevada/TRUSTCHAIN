/**
 * BlockchainPipeline — the reusable visualization layer for every on-chain
 * action (issuance, verification, revocation, superseding, institution
 * registration). Pure presentation over a real async operation: it never
 * performs blockchain work itself and never invents a result.
 *
 * ── The honesty contract ──────────────────────────────────────────────────
 * The frontend makes ONE request per action. It cannot observe the server
 * hashing a payload, building a Merkle tree, or broadcasting — those happen
 * inside that single call. So stages carry a `kind` that says what the UI
 * actually knows:
 *
 *   "local"  — the client genuinely did this (serialised a form, opened a
 *              request). Safe to mark done on its own.
 *   "remote" — a real step the SERVER performs inside the in-flight request.
 *              Rendered under an explicit "server-side" heading and never
 *              given a fabricated per-step duration or hash, because the UI
 *              is not watching them individually — it is describing the
 *              pipeline it triggered while that pipeline runs.
 *   "chain"  — only ever completes when real chain data comes back. If the
 *              response carries no transaction, the stage resolves to its
 *              honest `pendingNote` instead of a green check.
 *
 * A stage NEVER advances past the network gate on a timer. The gate holds for
 * exactly as long as the real request takes, and post-gate stages render only
 * values present in the real response.
 *
 * Failure is never dressed as success: a chain/transport failure renders
 * "Network Temporarily Unavailable", and a business rejection (403/409/422 —
 * e.g. two-person approval refused) renders the server's own message. Neither
 * shows a confirmed block.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ChevronDown, CloudOff, type LucideIcon } from "lucide-react";
import { CopyField } from "@/components/ui/misc";
import { cn } from "@/utils";

// ── Public types ────────────────────────────────────────────────────────────

export type StageKind = "local" | "remote" | "chain";

/** Real chain facts returned by the backend. Every field is optional because
 *  not every operation produces one — supersede, for instance, issues a
 *  corrected certificate whose anchoring only happens at the next batch
 *  approval, so it has no transaction of its own to show. */
export interface ChainProof {
  txHash?: string | null;
  blockNumber?: number | null;
  merkleRoot?: string | null;
  statusRoot?: string | null;
  chainIssuerId?: number | null;
  /** Human network label, e.g. "Polygon Amoy". */
  network?: string | null;
  /** Backend chain mode: "web3" (real node) or "mock" (in-process sandbox). */
  mode?: string | null;
}

export interface PipelineStage {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: StageKind;
  /** Shown under the label once real data exists. Return null to show nothing. */
  detail?: (proof: ChainProof) => ReactNode | null;
  /** For "chain" stages that resolve without a transaction — the honest reason. */
  pendingNote?: string;
}

export type PipelinePhase = "running" | "confirmed" | "rejected" | "unavailable";

// ── Stage row ───────────────────────────────────────────────────────────────

function StageRow({
  stage, state, isLast, proof, showPulse, gateWaiting,
}: {
  stage: PipelineStage;
  state: "pending" | "active" | "done" | "blocked";
  isLast: boolean;
  proof: ChainProof;
  showPulse: boolean;
  gateWaiting: boolean;
}) {
  // A "chain" stage with no transaction is resolved-but-unconfirmed, never a tick.
  const unconfirmed =
    stage.kind === "chain" && state === "done" && !proof.txHash && !!stage.pendingNote;
  const Icon = state === "blocked" ? AlertTriangle : unconfirmed ? AlertTriangle : stage.icon;
  const detail = state === "done" ? stage.detail?.(proof) : null;

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast && (
        <span aria-hidden className={cn(
          "absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px",
          state === "done" ? "bg-gradient-to-b from-primary-500 to-primary-500/40" : "bg-text-secondary/25",
        )}>
          {showPulse && (
            <motion.span
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
        state === "blocked" && "border-danger-700 bg-danger-100 text-danger-700 dark:bg-danger-700/20 dark:text-danger-400",
        unconfirmed && "border-warning-700/60 bg-warning-100 text-warning-700 dark:bg-warning-700/20 dark:text-warning-400",
        !unconfirmed && state === "done" && "border-primary-500 bg-primary-500/15 text-primary-500 shadow-glow",
        state === "active" && "border-primary-400 bg-primary-500/10 text-primary-400",
        state === "pending" && "border-border-default text-text-secondary/50",
      )}>
        {state === "active" && (
          <span className="absolute inset-0 rounded-full bg-primary-500/25 animate-pulse-ring" aria-hidden />
        )}
        <Icon className={cn("h-4 w-4", gateWaiting && "animate-pulse")} aria-hidden />
      </span>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pt-1">
        <p className={cn("text-sm font-medium",
          state === "pending" ? "text-text-secondary/60" : "text-text-primary")}>
          {stage.label}
        </p>
        {unconfirmed && (
          <p className="text-xs text-warning-700 dark:text-warning-400">{stage.pendingNote}</p>
        )}
        {detail && <div className="text-xs text-text-secondary">{detail}</div>}
      </div>
    </li>
  );
}

// ── Collapsible technical details ───────────────────────────────────────────

/**
 * ChainProofPanel — transaction hash, block, network and confirmation status,
 * collapsed by default. Renders only the fields that actually exist; an absent
 * block number stays absent rather than showing a placeholder that reads like
 * a pending confirmation.
 */
export function ChainProofPanel({ proof, defaultOpen = false }: {
  proof: ChainProof; defaultOpen?: boolean;
}) {
  const hasAny = proof.txHash || proof.blockNumber != null || proof.merkleRoot
    || proof.statusRoot || proof.chainIssuerId != null;
  if (!hasAny) return null;

  const sandbox = proof.mode === "mock";

  return (
    <details open={defaultOpen} className="group mt-1 rounded-lg border border-border-default/60 bg-surface/40">
      <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-medium text-text-secondary marker:content-['']">
        <span>Technical details</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-standard group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="flex flex-col gap-2 border-t border-border-default/50 px-3 py-2.5 text-xs">
        {proof.network && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Network</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              {proof.network}
              {/* Mock mode is stated plainly — never dressed up as a public chain. */}
              {sandbox && (
                <span className="rounded-full border border-border-default/60 px-1.5 py-0.5 text-[10px] text-text-secondary">
                  sandbox
                </span>
              )}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Confirmation</dt>
          <dd className={cn("font-medium",
            proof.txHash ? "text-success-700 dark:text-success-400" : "text-warning-700 dark:text-warning-400")}>
            {proof.txHash
              ? (proof.blockNumber != null ? `Confirmed in block ${proof.blockNumber}` : "Transaction accepted")
              : "Not yet anchored"}
          </dd>
        </div>
        {proof.txHash && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Transaction</dt>
            <dd><CopyField value={proof.txHash} label="transaction hash" /></dd>
          </div>
        )}
        {proof.merkleRoot && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Merkle root</dt>
            <dd><CopyField value={proof.merkleRoot} label="Merkle root" /></dd>
          </div>
        )}
        {proof.statusRoot && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Status root</dt>
            <dd><CopyField value={proof.statusRoot} label="status root" /></dd>
          </div>
        )}
        {proof.chainIssuerId != null && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">On-chain issuer</dt>
            <dd className="font-mono font-medium">#{proof.chainIssuerId}</dd>
          </div>
        )}
      </dl>
    </details>
  );
}

// ── Pipeline ────────────────────────────────────────────────────────────────

export function BlockchainPipeline({
  title, stages, gateIndex, phase, activeIndex, proof, message, className,
}: {
  title: string;
  stages: PipelineStage[];
  /** Index of the stage that holds while the real request is in flight. */
  gateIndex: number;
  phase: PipelinePhase;
  activeIndex: number;
  proof: ChainProof;
  /** Server-supplied reason, shown on rejection. */
  message?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const firstRemote = stages.findIndex((s) => s.kind === "remote");

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("glass-strong rounded-2xl p-6 shadow-glow-lg", className)}
    >
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-text-secondary">{title}</p>

      {phase === "unavailable" ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CloudOff className="h-9 w-9 text-warning-700 dark:text-warning-400" aria-hidden />
          <p className="font-display text-lg font-semibold">Network Temporarily Unavailable</p>
          <p className="max-w-sm text-sm text-text-secondary">
            The blockchain network could not be reached, so this action was not recorded.
            Nothing was changed — try again in a moment.
          </p>
          {message && <p className="font-mono text-xs text-text-secondary">{message}</p>}
        </div>
      ) : (
        <>
          <ol className="flex flex-col">
            {stages.map((stage, i) => {
              const state: "pending" | "active" | "done" | "blocked" =
                phase === "rejected" && i === activeIndex ? "blocked"
                  : i < activeIndex ? "done"
                    : i === activeIndex ? (phase === "confirmed" ? "done" : "active")
                      : "pending";

              return (
                <div key={stage.id}>
                  {/* Server-side steps are grouped and labelled, so an advancing
                      row is never mistaken for the client watching each one. */}
                  {i === firstRemote && firstRemote !== -1 && (
                    <div className="mb-3 flex items-center gap-2 pl-11">
                      <span className="text-[10px] uppercase tracking-wider text-text-secondary/70">
                        Server-side · one request
                      </span>
                      <span aria-hidden className="h-px flex-1 bg-border-default/70" />
                    </div>
                  )}
                  <StageRow
                    stage={stage}
                    state={state}
                    isLast={i === stages.length - 1}
                    proof={proof}
                    showPulse={!reduced && phase === "running" && i === activeIndex - 1}
                    gateWaiting={phase === "running" && i === gateIndex && activeIndex === gateIndex}
                  />
                </div>
              );
            })}
          </ol>

          {phase === "rejected" && message && (
            <p className="mt-1 rounded-md border border-danger-700/40 bg-danger-100 px-3 py-2 text-sm text-danger-700 dark:bg-danger-700/10 dark:text-danger-400">
              {message}
            </p>
          )}

          {(phase === "confirmed" || phase === "rejected") && (
            <ChainProofPanel proof={proof} />
          )}
        </>
      )}
    </div>
  );
}

// ── Runner hook ─────────────────────────────────────────────────────────────

export interface PipelineOutcome<T> {
  ok: boolean;
  data?: T;
  /** True only for transport/chain failures — never for business rejections. */
  unavailable?: boolean;
  code?: string;
  message?: string;
}

/**
 * Drives a real async operation through the stage machine.
 *
 * The request fires immediately, in parallel with the intro stages — the
 * animation never delays the actual work. Pre-gate stages step on a short
 * dwell (they represent client-side preparation that has genuinely already
 * happened by then); the gate itself holds until the real promise settles;
 * post-gate stages reveal only after real data is in hand.
 */
export function usePipelineRunner<T>({
  stages, gateIndex, run, onSettled, dwellMs = 320,
}: {
  stages: PipelineStage[];
  gateIndex: number;
  run: () => Promise<T>;
  onSettled?: (outcome: PipelineOutcome<T>) => void;
  dwellMs?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<PipelinePhase>("running");
  const [result, setResult] = useState<T | null>(null);
  const [message, setMessage] = useState<string>();
  /**
   * The in-flight request, created at most once per component instance.
   *
   * This must be separate from any "did the effect already run" flag. Under
   * StrictMode React mounts, cleans up, then mounts again: a guard on the
   * effect body would let the first pass start, the cleanup cancel it, and the
   * second pass refuse to run — freezing the pipeline on its first stage. So
   * the effect is free to re-run and re-drive the animation, while `??=` keeps
   * the real operation firing exactly once. That matters here beyond tidiness:
   * these are chain writes, and issuing one twice is not recoverable.
   */
  const promiseRef = useRef<Promise<T> | null>(null);
  // Keep the latest callbacks without making them effect dependencies.
  const latest = useRef({ run, onSettled });
  latest.current = { run, onSettled };

  useEffect(() => {
    let cancelled = false;
    const dwell = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    (async () => {
      promiseRef.current ??= latest.current.run(); // real work starts once
      const promise = promiseRef.current;
      // Swallow here so an early rejection can't raise an unhandled rejection
      // while the intro stages are still dwelling; it is awaited properly below.
      promise.catch(() => undefined);

      for (let i = 0; i < gateIndex; i++) {
        if (cancelled) return;
        setActiveIndex(i);
        await dwell(dwellMs);
      }
      if (cancelled) return;
      setActiveIndex(gateIndex);

      let data: T;
      try {
        data = await promise;
      } catch (err) {
        if (cancelled) return;
        const e = err as { problem?: { status?: number; detail?: string }; code?: string; message?: string };
        const status = e.problem?.status ?? 0;
        // Transport or server-side chain failure → unavailable. A business
        // rejection (403/409/422) is a real answer, not an outage.
        const unavailable = status === 0 || status >= 500 || e.code === "CHAIN_UNAVAILABLE";
        setPhase(unavailable ? "unavailable" : "rejected");
        setMessage(e.problem?.detail ?? e.message ?? "The action could not be completed.");
        latest.current.onSettled?.({
          ok: false, unavailable, code: e.code,
          message: e.problem?.detail ?? e.message,
        });
        return;
      }

      if (cancelled) return;
      setResult(data);
      for (let i = gateIndex + 1; i < stages.length; i++) {
        if (cancelled) return;
        setActiveIndex(i);
        await dwell(dwellMs);
      }
      if (cancelled) return;
      setPhase("confirmed");
      latest.current.onSettled?.({ ok: true, data });
    })();

    return () => { cancelled = true; };
  }, [gateIndex, stages.length, dwellMs]);

  return { activeIndex, phase, result, message };
}
