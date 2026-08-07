/**
 * IssuanceCeremony — an animated, honest visualization of what actually
 * happens when a batch is approved and anchored on-chain.
 *
 * Ground rule (explicit product requirement): NEVER fake technical data.
 * The real `run()` call fires the instant this opens — in parallel with the
 * animation, not after it — so the ceremony never adds artificial latency.
 * Steps 0–4 are process labels only (no numbers are invented for them).
 * Step 5 ("Mining confirmation") is a real gate: the UI pulses for as long
 * as the actual request takes, however long that is. Steps 6, 8, and 9 only
 * ever render values that came back from the server — anchor block, Merkle
 * root, and transaction hash. If the request fails, the ceremony stops and
 * shows the real error; it never claims success.
 */
import { useEffect, useRef, useState } from "react";
import {
  Blocks, Building2, FileCheck2, Hash, Layers, Loader2, Lock, Radio,
  SendHorizontal, ShieldCheck, Volume2, VolumeX, X, XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import type { Batch } from "@/types";
import { ApiError } from "@/services/http";
import { CopyField } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import {
  isChimeMuted, playErrorChime, playFinalChime, playStepChime, setChimeMuted,
} from "@/lib/chime";

const MINING_STEP = 5; // the real network gate — everything before is presentational pacing
const STEP_DWELL_MS = 420; // pre-gate dwell, per step
const POST_DWELL_MS = 300; // post-gate dwell, once real data is in hand

interface StepDef {
  label: string;
  icon: typeof Building2;
}

const STEPS: StepDef[] = [
  { label: "", icon: Building2 }, // 0 — institution name, filled at render
  { label: "Credential Created", icon: FileCheck2 },
  { label: "Generating SHA-256 Hash", icon: Hash },
  { label: "Creating Blockchain Transaction", icon: SendHorizontal },
  { label: "Broadcasting to Network", icon: Radio },
  { label: "Mining Confirmation", icon: Loader2 },
  { label: "Block Added", icon: Blocks },
  { label: "Consensus Achieved", icon: Layers },
  { label: "Immutable Record Stored", icon: Lock },
  { label: "Credential Permanently Verified", icon: ShieldCheck },
];

type Outcome = { ok: true; batch: Batch } | { ok: false; message: string; code?: string };

export function IssuanceCeremony({
  institutionName, rowCount, run, onSettled, onClose,
}: {
  institutionName: string;
  rowCount: number;
  run: () => Promise<Batch>;
  onSettled: (outcome: Outcome) => void;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"running" | "waiting-chain" | "done" | "error">("running");
  const [result, setResult] = useState<Batch | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState(isChimeMuted());
  /**
   * The in-flight approval, created at most once.
   *
   * Must NOT be an "effect already ran" flag: under StrictMode React mounts,
   * cleans up, then mounts again, so a guard on the effect body lets the first
   * pass start, the cleanup cancel it, and the second pass return early —
   * freezing the ceremony on its first stage and never revealing the result.
   * Memoising the promise lets the effect re-run and re-drive the animation
   * while the real anchoring transaction still fires exactly once, which
   * matters here more than anywhere: a duplicate batch anchor is not
   * recoverable.
   */
  const promiseRef = useRef<Promise<Batch> | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    const dwell = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    async function play() {
      promiseRef.current ??= run(); // real request fires once, alongside the animation
      const promise = promiseRef.current;
      promise.catch(() => undefined); // settled below; avoids an unhandled rejection while stages dwell

      for (let i = 0; i < MINING_STEP; i++) {
        if (cancelled) return;
        setStepIndex(i);
        playStepChime();
        await dwell(STEP_DWELL_MS);
      }
      if (cancelled) return;
      setStepIndex(MINING_STEP);
      setPhase("waiting-chain");
      playStepChime();

      let outcome: Outcome;
      try {
        const batch = await promise;
        outcome = { ok: true, batch };
      } catch (err) {
        const message = err instanceof ApiError ? err.problem.detail : "The request failed unexpectedly.";
        const code = err instanceof ApiError ? err.code : undefined;
        outcome = { ok: false, message, code };
      }
      onSettled(outcome); // parent must always learn the true result, even if this view unmounts

      if (cancelled) return;
      if (!outcome.ok) {
        setPhase("error");
        setErrorMessage(outcome.message);
        playErrorChime();
        return;
      }
      setResult(outcome.batch);
      for (let i = MINING_STEP + 1; i < STEPS.length; i++) {
        if (cancelled) return;
        setStepIndex(i);
        if (i === STEPS.length - 1) playFinalChime(); else playStepChime();
        await dwell(POST_DWELL_MS);
      }
      if (cancelled) return;
      setPhase("done");
    }
    void play();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setChimeMuted(next);
  };

  return (
    <div role="dialog" aria-modal aria-label="Issuance ceremony"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#070707]/85 p-4 backdrop-blur-sm">
      <motion.div
        className="glass-strong relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl p-6 shadow-glow-lg"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE.out }}
      >
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
            {phase === "error" ? "Anchoring failed" : phase === "done" ? "Sealed on-chain" : "Sealing on-chain…"}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"}
              className="rounded-md p-1.5 text-text-secondary hover:text-text-primary">
              {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
            </button>
            {(phase === "done" || phase === "error") && (
              <button type="button" onClick={onClose} aria-label="Close"
                className="rounded-md p-1.5 text-text-secondary hover:text-text-primary">
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto pr-1">
          <ol className="flex flex-col">
            {STEPS.map((step, i) => {
              const isFirst = i === 0;
              const label = isFirst ? institutionName : step.label;
              const state: "pending" | "active" | "complete" | "error" =
                phase === "error" && i === stepIndex ? "error"
                : i < stepIndex || (i === stepIndex && phase === "done") ? "complete"
                : i === stepIndex ? "active"
                : "pending";
              const Icon = state === "error" ? XCircle : step.icon;
              const spin = state === "active" && (i === MINING_STEP);
              return (
                <li key={step.label || "institution"} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < STEPS.length - 1 && (
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
                    state === "complete" && "border-primary-500 bg-primary-500/15 text-primary-500 shadow-glow",
                    state === "active" && "border-primary-400 bg-primary-500/10 text-primary-400",
                    state === "pending" && "border-border-default text-text-secondary/50",
                    state === "error" && "border-danger-700 bg-danger-100 text-danger-700 dark:bg-danger-700/20 dark:text-danger-400",
                  )}>
                    {state === "active" && (
                      <span className="absolute inset-0 rounded-full bg-primary-500/25 animate-pulse-ring" aria-hidden />
                    )}
                    <Icon className={cn("h-4 w-4", spin && "animate-spin")} aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col justify-center pt-1">
                    <p className={cn("truncate text-sm font-medium",
                      state === "pending" ? "text-text-secondary/60" : "text-text-primary")}>
                      {label}
                    </p>
                    {i === 6 && result?.anchor_block != null && (
                      <p className="mt-0.5 font-mono text-xs text-text-secondary">block {result.anchor_block}</p>
                    )}
                    {i === 8 && result?.merkle_root && (
                      <p className="mt-0.5"><CopyField value={result.merkle_root} label="Merkle root" /></p>
                    )}
                    {i === 9 && result?.anchor_tx_hash && (
                      <p className="mt-0.5"><CopyField value={result.anchor_tx_hash} label="transaction hash" /></p>
                    )}
                    {state === "error" && errorMessage && (
                      <p className="mt-0.5 text-xs text-danger-700 dark:text-danger-400">{errorMessage}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-2 border-t border-border-default/50 pt-3 text-xs text-text-secondary">
          {phase === "error"
            ? "Nothing was left in an inconsistent state — the batch can be retried."
            : `Sealing ${rowCount} certificate${rowCount === 1 ? "" : "s"} in one on-chain transaction.`}
        </p>

        {phase === "error" && (
          <Button variant="secondary" className="mt-3 self-start" onClick={onClose}>Close</Button>
        )}
        {phase === "done" && (
          <Button className="mt-3 self-start" onClick={onClose}>Done</Button>
        )}
      </motion.div>
    </div>
  );
}
