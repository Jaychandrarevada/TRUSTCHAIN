/**
 * TrustScorePanel — the reputation view for one institution.
 *
 * ── What a Trust Score is, and what it is not ─────────────────────────────
 * It is a REPUTATION signal: a deterministic, fully-shown-working composite of
 * platform records (registry status, on-chain registration, claim rate,
 * revocation rate). It is NOT a cryptographic result and it never gates a
 * verdict. A certificate from a low-scoring institution can still be
 * cryptographically perfect, and a high score can never make a tampered
 * certificate verify. The panel states this rather than leaving it implied.
 *
 * ── Where the number comes from ───────────────────────────────────────────
 * Computed in the client, in lib/trustScore.ts, from fields the API returns.
 * There is deliberately no server-side trust score, so nothing here is
 * "authoritative" in the way a chain record is — the panel says so, because a
 * reputation number presented with borrowed authority is exactly the kind of
 * thing that gets over-trusted.
 *
 * ── Why there is no trend chart ───────────────────────────────────────────
 * The API returns point-in-time aggregates only; no score history is stored.
 * Drawing a trend line would mean inventing the past, so the panel shows the
 * real metrics it does have and names what would be needed for history.
 */
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Activity, CalendarDays, FileCheck2, Info, ScanLine, ShieldAlert,
} from "lucide-react";
import type { InstitutionNetworkRow } from "@/types";
import { computeTrustScore } from "@/lib/trustScore";
import { formatPercent } from "@/utils";
import { Term } from "./TrustProofPanel";
import { cn } from "@/utils";

/** Score bands — also used for the gauge colour, so colour and label agree. */
function band(score: number, label: string) {
  if (label === "Attention needed") return { stroke: "rgb(var(--tc-node-suspended))", text: "text-danger-700 dark:text-danger-400" };
  if (label === "New") return { stroke: "rgb(var(--tc-node-retired))", text: "text-text-secondary" };
  if (score >= 85) return { stroke: "rgb(var(--tc-node-active))", text: "text-success-700 dark:text-success-400" };
  if (score >= 65) return { stroke: "rgb(var(--tc-node-active))", text: "text-primary-800 dark:text-primary-400" };
  return { stroke: "rgb(var(--tc-node-pending))", text: "text-warning-700 dark:text-warning-400" };
}

/**
 * ScoreGauge — a circular gauge drawn as a stroked SVG arc.
 *
 * The sweep animates via stroke-dashoffset (a compositor-friendly property),
 * and the numeric value is rendered final from the first frame rather than
 * counting up: a trust figure is a value to read, not a slot machine, and
 * counting it up would also break the "trust values never animate" rule the
 * motion system already applies to verdicts and hashes.
 */
export function ScoreGauge({ score, label, size = 128 }: {
  score: number; label: string; size?: number;
}) {
  const reduced = useReducedMotion();
  const [sweep, setSweep] = useState(reduced ? score : 0);
  const r = 45, circ = 2 * Math.PI * r;
  const tone = band(score, label);

  useEffect(() => {
    if (reduced) { setSweep(score); return; }
    const t = setTimeout(() => setSweep(score), 60); // let the arc transition run
    return () => clearTimeout(t);
  }, [score, reduced]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden focusable="false">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8"
          stroke="rgb(var(--tc-node-retired))" strokeOpacity={0.25} />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          stroke={tone.stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * sweep) / 100}
          style={{ transition: reduced ? undefined : "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display text-2xl font-extrabold tabular", tone.text)}>{score}</span>
        <span className="text-[10px] uppercase tracking-wide text-text-secondary">out of 100</span>
      </div>
    </div>
  );
}

/** One weighted component of the score, shown as a proportion of its maximum. */
function Component({ name, points, max, explain }: {
  name: string; points: number; max: number; explain: string;
}) {
  const pct = Math.round((points / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary"><Term label={name} explain={explain} /></span>
        <span className="tabular font-medium">{points}<span className="text-text-secondary">/{max}</span></span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border-default/60"
        role="progressbar" aria-label={name} aria-valuenow={points} aria-valuemin={0} aria-valuemax={max}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-[width] duration-settle ease-out-expo"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }: {
  icon: typeof Activity; label: string; value: string; hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border-default/50 bg-surface/40 p-2.5">
      <Icon className="h-3.5 w-3.5 text-primary-500" aria-hidden />
      <p className="mt-1 tabular text-sm font-semibold">{value}</p>
      <p className="text-[11px] leading-tight text-text-secondary">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-text-secondary/70">{hint}</p>}
    </div>
  );
}

/** Whole months between a date and now, floored. */
function monthsSince(iso: string): number {
  const then = new Date(iso), now = new Date();
  return Math.max(0, (now.getFullYear() - then.getFullYear()) * 12 + now.getMonth() - then.getMonth());
}

export function TrustScorePanel({ row, className }: {
  row: InstitutionNetworkRow; className?: string;
}) {
  const trust = computeTrustScore(row);
  const age = monthsSince(row.created_at);
  const revokedRatio = row.certificates_issued > 0 ? row.revoked / row.certificates_issued : 0;

  return (
    <section className={cn("rounded-xl border border-border-default/50 bg-surface/40 p-4", className)}
      aria-label="Trust score">
      <div className="flex items-center gap-4">
        <ScoreGauge score={trust.score} label={trust.label} />
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold">
            <Term label="Trust score"
              explain="A reputation signal built from this institution's record on the platform. It is a summary of behaviour over time — not a cryptographic check, and not part of any verdict." />
          </h3>
          <p className={cn("text-sm font-medium", band(trust.score, trust.label).text)}>{trust.label}</p>
          <p className="mt-1 text-xs text-text-secondary">
            Computed from four recorded signals, shown in full below.
          </p>
        </div>
      </div>

      {/* The distinction that matters most, stated up front rather than implied. */}
      <div className="mt-4 flex gap-2 rounded-lg border border-info-400/30 bg-info-100/50 p-2.5 text-xs dark:bg-info-700/10">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info-700 dark:text-info-400" aria-hidden />
        <p className="text-text-secondary">
          <span className="font-medium text-text-primary">This score never decides whether a certificate is genuine.</span>{" "}
          Authenticity comes from the cryptographic checks and the blockchain anchor, which either pass or fail
          on their own. A certificate from a new, low-scoring institution can be perfectly valid; a high score
          can never make a tampered one verify. The score tells you about the <em>issuer's track record</em>,
          the verdict tells you about the <em>certificate</em>.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <p className="text-xs font-medium text-text-secondary">
          <Term label="How this score is built"
            explain="Every point is traceable to a recorded field. There is no model and no hidden weighting — the same institution record always produces the same score." />
        </p>
        <Component name="Registry status" points={trust.statusPoints} max={40}
          explain="Whether the institution is an approved, active issuer. Approval follows an accreditation review; suspended or retired issuers score far lower." />
        <Component name="On-chain registration" points={trust.chainPoints} max={15}
          explain="Whether the institution holds an issuer identity in the on-chain registry. Without it, the platform cannot anchor anything on their behalf." />
        <Component name="Claim rate" points={trust.claimPoints} max={20}
          explain="How many issued certificates their holders have actually claimed. Consistently unclaimed batches can indicate stale or incorrect recipient records." />
        <Component name="Integrity record" points={trust.integrityPoints} max={25}
          explain="Derived from how much of their issuance has been revoked. Institutions with no issuance yet get a neutral middle value rather than a perfect score they have not earned." />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric icon={FileCheck2} label="Credentials issued" value={String(row.certificates_issued)} />
        <Metric icon={ScanLine} label="Verification requests" value={String(row.verifications_total)} />
        <Metric icon={CalendarDays} label="Institution age"
          value={age === 0 ? "< 1 mo" : `${age} mo`}
          hint={new Date(row.created_at).toLocaleDateString()} />
        <Metric icon={ShieldAlert} label="Revoked" value={String(row.revoked)}
          hint={row.certificates_issued > 0 ? `${formatPercent(revokedRatio)} of issuance` : "no issuance yet"} />
        <Metric icon={FileCheck2} label="Claim rate" value={formatPercent(row.claim_rate)} />
        <Metric icon={Activity} label="Last activity"
          value={row.last_activity_at ? new Date(row.last_activity_at).toLocaleDateString() : "None"} />
      </div>

      {/* Naming the gap is more useful than drawing a line through invented points. */}
      <p className="mt-3 border-t border-border-default/50 pt-2.5 text-[11px] leading-relaxed text-text-secondary">
        <span className="font-medium">No historical trend is shown.</span> The platform records these figures
        as current totals and does not store score snapshots over time, so any movement line here would be
        invented. Per-institution history would need periodic snapshots kept server-side. Verification
        requests are likewise a total — outcomes are not broken down per institution, so no success rate is
        claimed.
      </p>
    </section>
  );
}
