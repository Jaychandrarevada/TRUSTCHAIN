/**
 * Mission Control Center — the platform-admin dashboard (spec §8.4, expanded).
 *
 * Every widget here traces to a real field in `analytics_service.
 * platform_dashboard()` — "Fraud Attempts Prevented" is a genuine count of
 * verifications that resolved to TAMPERED/UNKNOWN_ISSUER, not a modeled
 * estimate; the AI Insights panel is the same deterministic, disclosed
 * rule engine used on the issuer dashboard (components/domain/insights.tsx),
 * never an opaque model call. "Real-time" here means honest short-interval
 * polling (labeled as such) — this app has no websocket/push infrastructure,
 * and claiming one would violate the same "never fake technical data" rule
 * that governs every other surface in this codebase.
 */
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Blocks, Building2, ChevronDown, FileCheck2, Gauge, Network, ScanLine,
  ShieldAlert, ShieldCheck, Users,
} from "lucide-react";
import { adminApi, miscApi } from "@/services/api";
import { SUPPORTED_CHAINS } from "@/constants";
import { formatDate, truncateHash } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, CopyField, EmptyState, ProgressBar, Skeleton, Td, Th } from "@/components/ui/misc";
import { Stagger, StaggerItem } from "@/components/motion";
import { StatCard } from "@/components/domain/certificate";
import { InsightsCard, derivePlatformInsights } from "@/components/domain/insights";
import { NetworkStatusCard } from "@/components/NetworkStatus";
import { computeTrustScore } from "@/lib/trustScore";
import { cn } from "@/utils";
import { Link } from "react-router-dom";

const REFRESH_MS = 10_000;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function VerificationTrendChart({ series }: { series: { date: string; count: number }[] }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  return (
    <div>
      <div aria-label="Area chart: verifications per day, last 14 days" role="img">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={series} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--tc-border-default)" strokeOpacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)}
              axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} domain={[0, max]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value: number) => [`${value} verification${value === 1 ? "" : "s"}`, ""]}
              labelFormatter={(label: string) => formatDate(label)}
            />
            <Area type="monotone" dataKey="count" stroke="var(--tc-chart-accent)" strokeWidth={2}
              fill="var(--tc-chart-accent)" fillOpacity={0.1} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-text-secondary">View as table</summary>
        <table className="mt-2 w-full text-xs">
          <thead><tr><Th>Date</Th><Th>Verifications</Th></tr></thead>
          <tbody>
            {series.map((d) => <tr key={d.date}><Td>{d.date}</Td><Td>{d.count}</Td></tr>)}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function ActivityHeatmap({ cells }: { cells: { weekday: number; hour: number; count: number }[] }) {
  const byKey = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c.count]));
  const max = Math.max(1, ...cells.map((c) => c.count));
  const step = (count: number) => {
    if (count === 0) return null;
    const ratio = count / max;
    if (ratio > 0.75) return "bg-primary-700 text-white";
    if (ratio > 0.5) return "bg-primary-500 text-[#070707]";
    if (ratio > 0.25) return "bg-primary-300 text-[#070707]";
    return "bg-primary-100 text-[#070707]";
  };
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "2.5rem repeat(24, 1.1rem)" }}>
        <span aria-hidden />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center text-[9px] text-text-secondary">{h % 3 === 0 ? h : ""}</span>
        ))}
        {WEEKDAY_LABELS.map((label, wd) => (
          <div key={label} className="contents">
            <span className="text-[10px] text-text-secondary">{label}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const count = byKey.get(`${wd}-${h}`) ?? 0;
              const cls = step(count);
              return (
                <button
                  key={h} type="button" tabIndex={0}
                  title={`${label} ${h}:00 — ${count} verification${count === 1 ? "" : "s"}`}
                  aria-label={`${label} ${h}:00, ${count} verifications`}
                  className={`h-[1.1rem] w-[1.1rem] rounded-[2px] border border-border-default/40 text-[8px] leading-none ${cls ?? "bg-surface"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-secondary">
        <span>Fewer</span>
        <span className="h-2.5 w-2.5 rounded-[2px] bg-surface border border-border-default/40" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-primary-100" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-primary-300" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-primary-500" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-primary-700" />
        <span>More</span>
      </div>
    </div>
  );
}

/**
 * Widget — a collapsible dashboard panel. Open state persists per widget, so
 * an operator's layout survives the 10s refetch and a page reload; a dashboard
 * that silently re-expands everything you closed is worse than one that never
 * collapsed at all.
 */
function Widget({ id, icon: Icon, title, children, defaultOpen = true, className }: {
  id: string; icon: typeof Blocks; title: string; children: ReactNode;
  defaultOpen?: boolean; className?: string;
}) {
  const key = `tc-widget-${id}`;
  const [open, setOpen] = useState(() => {
    try { const v = localStorage.getItem(key); return v === null ? defaultOpen : v === "1"; }
    catch { return defaultOpen; }
  });
  const toggle = () => setOpen((v) => {
    try { localStorage.setItem(key, v ? "0" : "1"); } catch { /* private mode */ }
    return !v;
  });
  return (
    <Card glass hover className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <button type="button" onClick={toggle} aria-expanded={open}
            className="flex w-full items-center gap-2 text-left">
            <Icon className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />
            <span className="flex-1">{title}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-secondary transition-transform duration-standard",
              open && "rotate-180")} aria-hidden />
          </button>
        </CardTitle>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

/** Score bands for the distribution histogram. */
const BANDS = [
  { label: "85–100", min: 85, tone: "bg-success-500" },
  { label: "65–84", min: 65, tone: "bg-primary-500" },
  { label: "40–64", min: 40, tone: "bg-warning-400" },
  { label: "0–39", min: 0, tone: "bg-danger-700" },
];

/**
 * Trust score distribution across every institution.
 *
 * Scores are computed client-side from the same real rows the trust network
 * uses (lib/trustScore.ts) — this is a reputation summary, not a verification
 * result, and it is labelled that way.
 */
function TrustScoreDistribution() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "institutions-network"],
    queryFn: adminApi.institutionsNetwork,
    staleTime: 60_000,
  });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return <EmptyState title="No institutions yet"
      hint="Trust scores appear once an institution completes accreditation review." />;
  }
  const scores = rows.map((r) => computeTrustScore(r).score);
  const buckets = BANDS.map((b, i) => {
    const upper = i === 0 ? Infinity : BANDS[i - 1].min;
    return { ...b, count: scores.filter((s) => s >= b.min && s < upper).length };
  });
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const mean = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return (
    <div className="flex flex-col gap-2.5">
      {buckets.map((b) => (
        <div key={b.label} className="flex items-center gap-3 text-xs">
          <span className="w-14 shrink-0 tabular text-text-secondary">{b.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border-default/60">
            <div className={cn("h-full rounded-full transition-[width] duration-settle ease-out-expo", b.tone)}
              style={{ width: `${(b.count / max) * 100}%` }} />
          </div>
          <span className="w-6 shrink-0 tabular text-right font-medium">{b.count}</span>
        </div>
      ))}
      <p className="border-t border-border-default/50 pt-2 text-[11px] text-text-secondary">
        Mean {mean} across {rows.length} institution{rows.length === 1 ? "" : "s"}. Trust score is a
        reputation signal computed from platform records — it never affects whether a certificate verifies.
      </p>
    </div>
  );
}

export default function PlatformAnalytics() {
  const stats = useQuery({
    queryKey: ["admin", "analytics"], queryFn: adminApi.platformAnalytics,
    refetchInterval: REFRESH_MS,
  });
  const chain = useQuery({ queryKey: ["chain", "info"], queryFn: miscApi.chainInfo, refetchInterval: REFRESH_MS });

  if (stats.isLoading || !stats.data) return <Skeleton className="h-96 w-full" />;
  const s = stats.data;
  const pendingRequests = s.kyb_pending + s.batches_pending_approval;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Mission Control Center</h2>
          <p className="text-sm text-text-secondary">Live platform state across every institution.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="status-dot" data-live={!stats.isFetching} aria-hidden />
          Auto-refreshing every {REFRESH_MS / 1000}s{stats.isFetching && " · updating…"}
        </span>
      </div>

      {/* Live stat tiles */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem><StatCard label="Live credentials" value={s.certificates_live} /></StaggerItem>
        <StaggerItem><StatCard label="Today's verifications" value={s.verifications_today} /></StaggerItem>
        <StaggerItem>
          <StatCard label="Fraud attempts prevented" value={s.fraud_attempts_prevented}
            tone={s.fraud_attempts_prevented > 0 ? "danger" : "default"} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Pending requests" value={pendingRequests}
            tone={pendingRequests > 0 ? "warning" : "default"} />
        </StaggerItem>
      </Stagger>

      {/* Network status / blockchain health + connected institutions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <NetworkStatusCard />
        <Card glass hover>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Connected institutions
              <Link to="/admin/network" className="text-xs font-medium text-primary-800 hover:underline dark:text-primary-400">
                View trust network →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(s.institutions).length === 0 && (
              <p className="text-sm text-text-secondary">No institutions yet.</p>
            )}
            {Object.entries(s.institutions).map(([status, count]) => (
              <Badge key={status}
                tone={status === "active" ? "success" : status === "pending_kyb" ? "warning" : "neutral"}>
                <Building2 className="mr-1 h-3 w-3" aria-hidden /> {status.replace("_", " ")}: {count}
              </Badge>
            ))}
            <Badge tone="info"><Users className="mr-1 h-3 w-3" aria-hidden /> {s.users_total} total users</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Platform health (real ratios, derived from fields above — never
          estimated) + quick actions to the two admin-only decision queues. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card glass hover>
          <CardHeader><CardTitle className="text-base">Platform health</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ProgressBar
              label="Batches anchored"
              value={s.batches_anchored / Math.max(1, s.batches_anchored + s.batches_pending_approval)}
              detail={`${s.batches_anchored} anchored · ${s.batches_pending_approval} awaiting a second approver`}
            />
            <ProgressBar
              label="Certificates live"
              value={s.certificates_live / Math.max(1, s.certificates_total)}
              detail={`${s.certificates_live} of ${s.certificates_total} issued certificates are currently live`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link to="/admin"><Button className="w-full" variant="secondary">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Review KYB queue{s.kyb_pending > 0 ? ` (${s.kyb_pending})` : ""}
            </Button></Link>
            <Link to="/admin/network"><Button className="w-full" variant="secondary">
              <Network className="h-4 w-4" aria-hidden /> Explore trust network
            </Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights — deterministic, disclosed, never a black box */}
      <InsightsCard insights={derivePlatformInsights(s)} />

      {/* Interactive analytics: trend + heatmap */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card glass hover>
          <CardHeader><CardTitle className="text-base">Verifications — last 14 days</CardTitle></CardHeader>
          <CardContent><VerificationTrendChart series={s.verifications_by_day} /></CardContent>
        </Card>
        <Card glass hover>
          <CardHeader><CardTitle className="text-base">Activity heatmap — last 30 days</CardTitle></CardHeader>
          <CardContent><ActivityHeatmap cells={s.verifications_heatmap} /></CardContent>
        </Card>
      </div>

      {/* Verification feed + recent issuance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card glass hover>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-4 w-4 text-primary-500" aria-hidden /> Verification feed</CardTitle></CardHeader>
          <CardContent>
            {s.recent_verifications.length === 0 ? (
              <EmptyState title="No verifications yet" hint="Verification events across every institution will appear here." />
            ) : (
              <ol className="flex flex-col divide-y divide-border-default/60">
                {s.recent_verifications.map((v, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{v.cert_uid}</p>
                      <p className="truncate text-xs text-text-secondary">{v.institution} · {v.channel}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={v.verdict === "VALID" ? "success" : "danger"}>{v.verdict}</Badge>
                      <p className="mt-0.5 text-[10px] text-text-secondary">{formatDate(v.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card glass hover>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileCheck2 className="h-4 w-4 text-primary-500" aria-hidden /> Recent issuance</CardTitle></CardHeader>
          <CardContent>
            {s.recent_batches.length === 0 ? (
              <EmptyState title="No batches anchored yet" hint="Anchored batches from every institution will appear here." />
            ) : (
              <ol className="flex flex-col divide-y divide-border-default/60">
                {s.recent_batches.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.name}</p>
                      <p className="truncate text-xs text-text-secondary">{b.institution} · {b.row_count} certificates</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {b.anchor_tx_hash && (
                        <p className="font-mono text-[10px] text-text-secondary">{truncateHash(b.anchor_tx_hash)}</p>
                      )}
                      <p className="text-[10px] text-text-secondary">{b.anchored_at ? formatDate(b.anchored_at) : "—"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fraud detection feed + trust score distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Widget id="fraud" icon={ShieldAlert} title="Fraud detection feed">
          {(() => {
            // Exactly the backend's own definition of a prevented fraud attempt:
            // a verification that resolved to TAMPERED or UNKNOWN_ISSUER. Filtered
            // from the same real feed, never a separate invented stream.
            const flagged = s.recent_verifications.filter(
              (v) => v.verdict === "TAMPERED" || v.verdict === "UNKNOWN_ISSUER");
            if (flagged.length === 0) {
              return (
                <EmptyState
                  title="No fraud attempts detected"
                  hint={s.fraud_attempts_prevented > 0
                    ? `${s.fraud_attempts_prevented} caught historically — none in the recent window shown here.`
                    : "A verification resolving to tampered or unknown-issuer would appear here."}
                />
              );
            }
            return (
              <ol className="flex flex-col divide-y divide-border-default/60">
                {flagged.map((v, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{v.cert_uid}</p>
                      <p className="truncate text-xs text-text-secondary">{v.institution} · {v.channel}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone="danger">{v.verdict}</Badge>
                      <p className="mt-0.5 text-[10px] text-text-secondary">{formatDate(v.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            );
          })()}
        </Widget>

        <Widget id="trust-dist" icon={Gauge} title="Trust score distribution">
          <TrustScoreDistribution />
        </Widget>
      </div>

      {/* Blockchain configuration (unchanged functionality, kept from the original page) */}
      <Card glass hover>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Blocks className="h-4 w-4 text-primary-500" aria-hidden /> Blockchain configuration</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {chain.data ? (
            <>
              <p>Mode: <Badge tone={chain.data.mode === "web3" ? "success" : "info"}>{chain.data.mode}</Badge></p>
              <p>Network: {SUPPORTED_CHAINS[chain.data.chain_id] ?? `chainId ${chain.data.chain_id}`}</p>
              {Object.entries(chain.data.contracts).map(([name, addr]) => (
                <p key={name} className="flex items-center gap-1 text-xs text-text-secondary">
                  {name}: {addr ? <CopyField value={addr} label={name} /> : "not configured (mock mode)"}
                </p>
              ))}
            </>
          ) : <Skeleton className="h-20 w-full" />}
        </CardContent>
      </Card>
    </div>
  );
}
