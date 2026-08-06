/**
 * Small UI primitives: Badge, Skeleton, Spinner, EmptyState, ErrorState,
 * CopyField, ProgressBar, and a minimal accessible data Table. (Spec §7
 * components that don't warrant individual files at current size.)
 */
import { Check, Copy, Inbox, RefreshCw, TriangleAlert } from "lucide-react";
import { useState, type HTMLAttributes, type ReactNode, type TableHTMLAttributes } from "react";
import { cn, truncateHash } from "@/utils";
import { Button } from "./button";

// ── Badge ─────────────────────────────────────────────────────────────────────
const badgeTones = {
  neutral: "bg-page text-text-secondary border-border-default",
  success: "bg-success-100 text-success-700 border-success-100 dark:bg-success-700/20 dark:text-success-400",
  warning: "bg-warning-100 text-warning-700 border-warning-100 dark:bg-warning-700/20 dark:text-warning-400",
  danger: "bg-danger-100 text-danger-700 border-danger-100 dark:bg-danger-700/20 dark:text-danger-400",
  info: "bg-info-100 text-info-700 border-info-100 dark:bg-info-700/20 dark:text-info-400",
} as const;

export function Badge({
  tone = "neutral", className, ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium",
        badgeTones[tone], className)}
      {...props}
    />
  );
}

// ── Skeleton & Spinner ────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-text-secondary">
      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

// ── Empty & error states (spec §14) ──────────────────────────────────────────
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Inbox className="h-10 w-10 text-text-secondary/50" aria-hidden />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-text-secondary">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title, detail, traceId, onRetry }: {
  title: string; detail?: string; traceId?: string; onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-12 text-center">
      <TriangleAlert className="h-10 w-10 text-warning-700" aria-hidden />
      <p className="font-medium">{title}</p>
      {detail && <p className="max-w-sm text-sm text-text-secondary">{detail}</p>}
      {traceId && <p className="font-mono text-xs text-text-secondary">Support code: {traceId}</p>}
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

// ── CopyField (hashes, IDs, links — spec §7 "Misc") ──────────────────────────
export function CopyField({ value, truncate = true, label }: {
  value: string; truncate?: boolean; label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="rounded bg-page px-1.5 py-0.5 font-mono text-xs">
        {truncate ? truncateHash(value) : value}
      </code>
      <button
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${label ?? "value"}`}
        className="text-text-secondary hover:text-text-primary"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success-700" aria-hidden />
                : <Copy className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
/** A labeled, honest ratio (never a fabricated/estimated percentage) — reduced
 * motion is covered by the global transition-duration override, no separate
 * branch needed here. */
export function ProgressBar({ label, value, detail }: { label: string; value: number; detail?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{label}</span>
        <span className="font-medium text-text-primary">{pct}%</span>
      </div>
      <div
        role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-border-default/60"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-[width] duration-settle ease-out-expo"
          style={{ width: `${pct}%` }}
        />
      </div>
      {detail && <p className="mt-1 text-[11px] text-text-secondary">{detail}</p>}
    </div>
  );
}

// ── Table primitives ──────────────────────────────────────────────────────────
/** Row hover applies here once, to every table in the app — rows are almost
 * always tied to a record (open a certificate, decide an application), so a
 * hover affordance is meaningful signal, not decoration. */
export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full text-sm [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-fast [&_tbody_tr]:hover:bg-page", className)}
        {...props}
      />
    </div>
  );
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn("border-b border-border-default px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border-default/60 px-3 py-2.5 align-middle", className)} {...props} />;
}
