/**
 * Insights — plain-language observations derived from live metrics.
 *
 * This is the honest form of "AI-assisted insights": deterministic, rule-based
 * summaries computed from the SAME numbers already on screen. Nothing is
 * predicted, invented, or auto-actioned — every insight links to a human
 * decision, preserving the human-in-the-loop invariant (AI never auto-revokes
 * or auto-approves). Labeled clearly so it is never mistaken for a verdict.
 */
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils";
import type { PlatformDashboard } from "@/types";

export type InsightTone = "positive" | "attention" | "info";

export interface Insight {
  tone: InsightTone;
  text: string;
}

const TONE_STYLES: Record<InsightTone, { icon: typeof Info; className: string }> = {
  positive: { icon: CheckCircle2, className: "text-success-500" },
  attention: { icon: AlertTriangle, className: "text-warning-700 dark:text-warning-400" },
  info: { icon: TrendingUp, className: "text-primary-500" },
};

export function InsightsCard({ insights, className }: { insights: Insight[]; className?: string }) {
  if (insights.length === 0) return null;
  return (
    <Card glass hover className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-500/15 text-primary-600 dark:text-primary-400">
            <Lightbulb className="h-4 w-4" aria-hidden />
          </span>
          Smart insights
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2.5">
          {insights.map((ins, i) => {
            const { icon: Icon, className: iconClass } = TONE_STYLES[ins.tone];
            return (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden />
                <span className="text-text-secondary">{ins.text}</span>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border-default/50 pt-3 text-xs text-text-secondary">
          Generated from your live metrics · always reviewed by a human before action.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Derive issuer-console insights from the analytics payload. Pure function —
 * every branch maps a real metric to an actionable observation.
 */
export function deriveIssuerInsights(stats: {
  certificates_issued?: number;
  claim_rate?: number;
  verifications_total?: number;
  batches_pending_approval?: number;
  verifications_by_verdict?: Record<string, number>;
}): Insight[] {
  const out: Insight[] = [];
  const issued = stats.certificates_issued ?? 0;
  const claim = stats.claim_rate ?? 0;
  const pending = stats.batches_pending_approval ?? 0;
  const verifications = stats.verifications_total ?? 0;
  const byVerdict = stats.verifications_by_verdict ?? {};

  if (pending > 0) {
    out.push({
      tone: "attention",
      text: `${pending} batch${pending > 1 ? "es" : ""} awaiting a second approver — maker-checker keeps issuance safe, but these are blocked until confirmed.`,
    });
  }

  const problems = (byVerdict.TAMPERED ?? 0) + (byVerdict.UNKNOWN_ISSUER ?? 0);
  if (problems > 0) {
    out.push({
      tone: "attention",
      text: `${problems} verification${problems > 1 ? "s" : ""} returned a problem verdict (tampered / unknown issuer). Worth reviewing recent activity.`,
    });
  }

  if (issued === 0) {
    out.push({ tone: "info", text: "No certificates issued yet — create your first batch to begin anchoring credentials on-chain." });
  } else if (claim < 0.5) {
    out.push({
      tone: "info",
      text: `Only ${Math.round(claim * 100)}% of issued certificates have been claimed by holders. A reminder nudge typically lifts claim rate.`,
    });
  }

  if (verifications > 0 && problems === 0 && pending === 0) {
    out.push({ tone: "positive", text: `${verifications} verification${verifications > 1 ? "s" : ""} served with no problem verdicts. Issuance and verification are healthy.` });
  }

  if (out.length === 0) {
    out.push({ tone: "positive", text: "All systems nominal — no items need your attention right now." });
  }
  return out;
}

/**
 * Derive Mission Control insights from the platform dashboard payload.
 * Same rule as above: deterministic, rule-based, every branch traces to a
 * real field — never a modeled "AI" number.
 */
export function derivePlatformInsights(stats: PlatformDashboard): Insight[] {
  const out: Insight[] = [];

  if (stats.fraud_attempts_prevented > 0) {
    out.push({
      tone: "attention",
      text: `${stats.fraud_attempts_prevented} verification${stats.fraud_attempts_prevented > 1 ? "s" : ""} resolved to a tampered document or unrecognized issuer — the platform caught these automatically.`,
    });
  }
  if (stats.kyb_pending > 0) {
    out.push({
      tone: "attention",
      text: `${stats.kyb_pending} institution${stats.kyb_pending > 1 ? "s" : ""} awaiting KYB review in the queue.`,
    });
  }
  if (stats.batches_pending_approval > 0) {
    out.push({
      tone: "info",
      text: `${stats.batches_pending_approval} batch${stats.batches_pending_approval > 1 ? "es" : ""} platform-wide awaiting a second approver.`,
    });
  }

  const series = stats.verifications_by_day;
  if (series.length >= 2) {
    const avg = series.reduce((s, d) => s + d.count, 0) / series.length;
    const today = series[series.length - 1].count;
    if (avg > 0 && today > avg * 1.5) {
      out.push({ tone: "info", text: `Today's verification volume (${today}) is well above the 14-day average (${avg.toFixed(1)}).` });
    } else if (avg > 0 && today < avg * 0.5 && today === 0) {
      out.push({ tone: "info", text: `No verifications yet today, vs a 14-day average of ${avg.toFixed(1)}.` });
    }
  }

  if (out.length === 0) {
    out.push({ tone: "positive", text: "All systems nominal — no fraud caught, no pending reviews, nothing blocked." });
  }
  return out;
}
