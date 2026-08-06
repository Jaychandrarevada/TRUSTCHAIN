/**
 * Verdict components — the flagship trust UI (UI/UX spec §5.1–5.2, §7):
 *  - VerdictBadge: compact icon+label chip (7 distinct states, never color-only)
 *  - VerdictPanel: hero verdict with explanation (role=status announce)
 *  - CheckList: the seven checks with plain-language labels
 *  - AnchorProof: collapsed blockchain details (progressive disclosure)
 */
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import { CHECK_LABELS, VERDICTS, type Verdict } from "@/constants";
import type { VerdictResponse } from "@/types";
import { cn, humanizeKey } from "@/utils";
import { CopyField } from "@/components/ui/misc";

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const config = VERDICTS[verdict];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
      config.className, className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {config.label}
    </span>
  );
}

export function VerdictPanel({ verdict }: { verdict: Verdict }) {
  const config = VERDICTS[verdict];
  const Icon = config.icon;
  const reduced = useReducedMotion();
  const isValid = verdict === "VALID";
  return (
    // role=status → screen readers announce the verdict on resolution (spec §5.1)
    <div
      role="status"
      className={cn(
        "relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl p-8 text-center",
        config.className,
      )}
    >
      <div className="relative">
        {/* Verification pulse — a single confidence beat for VALID (spec §13) */}
        {isValid && !reduced && (
          <span aria-hidden className="absolute inset-0 rounded-full bg-current opacity-20 animate-pulse-ring" />
        )}
        <motion.div
          initial={reduced ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }} // gentle overshoot, plays once
        >
          <Icon className="h-20 w-20" strokeWidth={1.5} aria-hidden />
        </motion.div>
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{config.label}</h1>
      <p className="max-w-md text-sm opacity-90">{config.explanation}</p>
    </div>
  );
}

export function CheckList({ checks }: { checks: VerdictResponse["checks"] }) {
  const reduced = useReducedMotion();
  return (
    <ol className="flex flex-col divide-y divide-border-default/60" aria-label="Verification checks">
      {Object.entries(checks).map(([key, result], i) => (
        <motion.li
          key={key}
          className="flex items-center justify-between gap-2 py-2.5 text-sm"
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07, duration: 0.35 }}
        >
          <span>{CHECK_LABELS[key] ?? humanizeKey(key)}</span>
          {result.pass ? (
            <span className="inline-flex items-center gap-1 text-success-700 dark:text-success-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Passed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-danger-700 dark:text-danger-400">
              <XCircle className="h-4 w-4" aria-hidden /> Failed
            </span>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

/** Blockchain evidence — collapsed <details>: optional depth, never a prerequisite. */
export function AnchorProof({ checks }: { checks: VerdictResponse["checks"] }) {
  const anchor = checks.anchor ?? {};
  return (
    <details className="group rounded-md border border-border-default">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
        Proof & blockchain details
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="grid gap-2 border-t border-border-default px-4 py-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-secondary">Merkle root</dt>
          <dd>{anchor.root ? <CopyField value={String(anchor.root)} label="Merkle root" /> : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-secondary">Transaction</dt>
          <dd>{anchor.tx_hash ? <CopyField value={String(anchor.tx_hash)} label="transaction hash" /> : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-secondary">Block</dt>
          <dd className="font-mono text-xs">{anchor.block ? String(anchor.block) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-secondary">What does this prove?</dt>
          <dd className="text-xs text-text-secondary">
            The certificate's fingerprint is permanently recorded on a public blockchain —
            any alteration would be detected instantly.
          </dd>
        </div>
      </dl>
    </details>
  );
}
