/**
 * Global Trust Network — every institution rendered as a node in a live,
 * explorable graph (replaces the plain institutions list).
 *
 * Honesty constraint (same rule as the issuance ceremony): every number shown
 * comes from `/admin/institutions` (real aggregates — certificates issued,
 * claim rate, revocations, verifications, last activity). Nothing here is
 * fabricated to make the graph look busier than the real tenant base.
 *
 * "Connected organizations" specifically means institutions that share the
 * same recorded accreditation body — a real field on the Institution record,
 * not an invented social graph. Clusters are laid out around that real
 * relationship; unaccredited institutions form an honestly-labeled
 * "Independent" cluster rather than being hidden or paired arbitrarily.
 *
 * Performance: this renders on a single canvas (not one DOM node per
 * institution), and clustering is O(n) placement — cluster centers on a
 * circle, members on a sub-circle sized by sqrt(count) — rather than an
 * O(n²) force simulation. That keeps 60fps whether there are 5 institutions
 * or 500.
 */
import {
  useEffect, useMemo, useRef, useState,
  type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Clock, Hash, Landmark, Link2, Search, ShieldCheck, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { adminApi } from "@/services/api";
import type { InstitutionNetworkRow } from "@/types";
import { TrustScorePanel } from "@/components/domain/TrustScorePanel";
import { Badge, CopyField, Skeleton, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn, formatPercent } from "@/utils";

// ── Layout math (pure, no physics simulation — see file header) ─────────────

interface Placed {
  row: InstitutionNetworkRow;
  x: number; y: number; r: number;
}
interface Cluster {
  key: string;
  label: string;
  cx: number; cy: number;
  members: Placed[];
}

/** Every status a tenant can hold, in the order they appear in the filter. */
const ALL_STATUSES = ["active", "pending_kyb", "suspended", "retired"] as const;
const STATUS_LABEL: Record<InstitutionNetworkRow["status"], string> = {
  active: "Active", pending_kyb: "Pending KYB", suspended: "Suspended", retired: "Retired",
};

const LAYOUT_W = 900;
const LAYOUT_H = 640;

/**
 * Canvas can't consume CSS custom properties directly (unlike every other
 * component in the app, which reads them through Tailwind semantic classes),
 * so node/hub colors are read from the DOM at draw time instead of being
 * hardcoded — the graph adapts to Light/Dark/OLED/High-contrast the same as
 * everything else. Re-read whenever the theme class on <html> changes.
 */
function readNetworkColors() {
  const cs = getComputedStyle(document.documentElement);
  const rgb = (name: string) => cs.getPropertyValue(name).trim();
  return {
    active: rgb("--tc-node-active"),
    pending_kyb: rgb("--tc-node-pending"),
    suspended: rgb("--tc-node-suspended"),
    retired: rgb("--tc-node-retired"),
    hubRgb: rgb("--tc-node-active"),
    labelHex: cs.getPropertyValue("--tc-text-secondary").trim(),
  } satisfies Record<InstitutionNetworkRow["status"], string> & { hubRgb: string; labelHex: string };
}

function buildLayout(rows: InstitutionNetworkRow[]): Cluster[] {
  const groups = new Map<string, InstitutionNetworkRow[]>();
  for (const row of rows) {
    const key = row.accreditation_body?.trim() || "Independent";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  const keys = [...groups.keys()];
  const cx0 = LAYOUT_W / 2, cy0 = LAYOUT_H / 2;
  const ringR = keys.length <= 1 ? 0 : Math.min(LAYOUT_W, LAYOUT_H) * 0.32;

  return keys.map((key, gi) => {
    const members = groups.get(key)!;
    const angle = (gi / Math.max(1, keys.length)) * Math.PI * 2 - Math.PI / 2;
    const cx = cx0 + Math.cos(angle) * ringR;
    const cy = cy0 + Math.sin(angle) * ringR;
    const subR = 26 + Math.sqrt(members.length) * 22;
    const placed: Placed[] = members.map((row, mi) => {
      const a = (mi / members.length) * Math.PI * 2;
      const dist = members.length === 1 ? 0 : subR;
      const certScale = Math.log2(row.certificates_issued + 1);
      return {
        row,
        x: cx + Math.cos(a) * dist,
        y: cy + Math.sin(a) * dist,
        r: 7 + Math.min(10, certScale * 2.2),
      };
    });
    return { key, label: key, cx, cy, members: placed };
  });
}

// ── Draw-loop hook ────────────────────────────────────────────────────────

function useNetworkCanvas(
  canvasRef: { current: HTMLCanvasElement | null },
  wrapRef: { current: HTMLDivElement | null },
  clusters: Cluster[],
  placedAll: Placed[],
  query: string,
  /** Statuses currently shown; anything outside it is dimmed, not removed —
   *  a filtered network still shows its full shape, so you can see what you
   *  are excluding rather than being handed a silently smaller graph. */
  statuses: Set<InstitutionNetworkRow["status"]>,
  view: { current: { scale: number; panX: number; panY: number } },
) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0, height = 0;
    const resize = () => {
      width = wrap.clientWidth; height = wrap.clientHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      view.current.panX = width / 2 - LAYOUT_W / 2;
      view.current.panY = height / 2 - LAYOUT_H / 2;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let colors = readNetworkColors();
    const mo = new MutationObserver(() => { colors = readNetworkColors(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const q = query.trim().toLowerCase();
    let raf = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - t0) / 1000;
      const { scale, panX, panY } = view.current;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      // Cluster hubs — a real shared-accreditor label, never an invented institution.
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      for (const c of clusters) {
        ctx.strokeStyle = `rgba(${colors.hubRgb},0.12)`;
        ctx.lineWidth = 1;
        for (const m of c.members) {
          ctx.beginPath();
          ctx.moveTo(c.cx, c.cy);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(${colors.hubRgb},0.5)`;
        ctx.beginPath();
        ctx.moveTo(c.cx, c.cy - 5); ctx.lineTo(c.cx + 5, c.cy); ctx.lineTo(c.cx, c.cy + 5); ctx.lineTo(c.cx - 5, c.cy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = colors.labelHex;
        ctx.fillText(c.label, c.cx + 9, c.cy + 4);
      }

      // Institution nodes
      for (const p of placedAll) {
        const missesQuery = q.length > 0
          && !p.row.legal_name.toLowerCase().includes(q)
          && !p.row.slug.toLowerCase().includes(q);
        const dim = missesQuery || !statuses.has(p.row.status);
        const breathe = reduced ? 1 : Math.sin(elapsed * 1.4 + p.x * 0.01) * 0.15 + 0.85;
        const rgb = colors[p.row.status];
        const alpha = dim ? 0.15 : 0.95;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.shadowColor = `rgba(${rgb},${dim ? 0 : 0.7 * breathe})`;
        ctx.shadowBlur = dim ? 0 : 14;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (!dim && p.r > 9) {
          ctx.fillStyle = "rgba(7,7,7,0.85)";
          ctx.font = `600 ${Math.min(10, p.r)}px Inter, system-ui, sans-serif`;
          const initials = p.row.legal_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
          const tw = ctx.measureText(initials).width;
          ctx.fillText(initials, p.x - tw / 2, p.y + 3);
        }
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, placedAll, query, statuses, reduced]);
}

// ── Profile drawer ────────────────────────────────────────────────────────

function ProfileDrawer({
  row, allRows, onClose,
}: {
  row: InstitutionNetworkRow;
  allRows: InstitutionNetworkRow[];
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const connected = useMemo(
    () => row.accreditation_body
      ? allRows.filter((r) => r.id !== row.id && r.accreditation_body === row.accreditation_body)
      : [],
    [row, allRows],
  );
  const activity = useQuery({
    queryKey: ["admin", "institution-audit", row.id],
    queryFn: () => adminApi.institutionAuditLog(row.id),
  });

  const statusTone = row.status === "active" ? "success" : row.status === "pending_kyb" ? "warning"
    : row.status === "suspended" ? "danger" : "neutral";

  return (
    <motion.aside
      role="dialog" aria-label={`${row.legal_name} profile`}
      className="glass-strong fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-y-auto border-l border-border-default/60 p-6 shadow-glow-lg"
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: EASE.out }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Institution profile</p>
          <h3 className="mt-0.5 font-display text-xl font-bold">{row.legal_name}</h3>
          <p className="text-xs text-text-secondary">{row.slug} · {row.institution_type}</p>
        </div>
        <button onClick={onClose} aria-label="Close profile" className="rounded-md p-1.5 text-text-secondary hover:text-text-primary">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Badge tone={statusTone}>{row.status.replace("_", " ")}</Badge>
        {row.chain_issuer_id != null && <Badge tone="info">On-chain issuer #{row.chain_issuer_id}</Badge>}
      </div>

      {/* Trust score — gauge, weighted breakdown, real metrics, and the
          explicit statement that this is reputation, not verification. */}
      <TrustScorePanel row={row} className="mt-5" />

      {/* Blockchain identity — real fields only */}
      <div className="mt-4 rounded-xl border border-border-default/50 bg-surface/40 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary-500" aria-hidden /> Blockchain identity</p>
        {row.issuer_did ? (
          <div className="flex flex-col gap-1.5 text-xs">
            <p>DID: <CopyField value={row.issuer_did} label="issuer DID" truncate={false} /></p>
            {row.registration_tx_hash && <p>Registration tx: <CopyField value={row.registration_tx_hash} label="registration transaction" /></p>}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Not yet registered on-chain — issuance is locked until KYB approval anchors an issuer identity.</p>
        )}
      </div>

      {/* Volume + reputation signals */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border-default/50 bg-surface/40 p-3 text-center">
          <p className="font-display text-xl font-bold">{row.certificates_issued}</p>
          <p className="text-[11px] text-text-secondary">Credentials issued</p>
        </div>
        <div className="rounded-xl border border-border-default/50 bg-surface/40 p-3 text-center">
          <p className="font-display text-xl font-bold">{row.verifications_total}</p>
          <p className="text-[11px] text-text-secondary">Verification requests</p>
        </div>
        <div className="rounded-xl border border-border-default/50 bg-surface/40 p-3 text-center">
          <p className="font-display text-xl font-bold">{formatPercent(row.claim_rate)}</p>
          <p className="text-[11px] text-text-secondary">Claim rate</p>
        </div>
        <div className="rounded-xl border border-border-default/50 bg-surface/40 p-3 text-center">
          <p className="font-display text-xl font-bold">{row.revoked}</p>
          <p className="text-[11px] text-text-secondary">Revoked</p>
        </div>
      </div>

      {/* Connected organizations — real shared-accreditor grouping */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Link2 className="h-4 w-4 text-primary-500" aria-hidden /> Connected organizations</p>
        {connected.length === 0 ? (
          <p className="text-xs text-text-secondary">
            {row.accreditation_body ? "No other institutions share this accreditor yet." : "Not linked to a shared accreditation body."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {connected.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-border-default/50 bg-surface/40 px-3 py-2 text-xs">
                <span>{c.legal_name}</span>
                <Badge tone={c.status === "active" ? "success" : "neutral"}>{c.status.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        )}
        {row.accreditation_body && (
          <p className="mt-1.5 text-[11px] text-text-secondary">Shared accreditor: {row.accreditation_body}</p>
        )}
      </div>

      {/* Activity timeline — real audit trail */}
      <div className="mt-4 flex-1">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Clock className="h-4 w-4 text-primary-500" aria-hidden /> Recent activity</p>
        {activity.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !activity.data || activity.data.data.length === 0 ? (
          <p className="text-xs text-text-secondary">No recorded activity yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {activity.data.data.slice(0, 12).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.action}</p>
                  <p className="text-text-secondary">{new Date(a.at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </motion.aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function TrustNetwork() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "institutions-network"],
    queryFn: adminApi.institutionsNetwork,
  });
  const rows = useMemo(() => data?.data ?? [], [data]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<InstitutionNetworkRow | null>(null);
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Set<InstitutionNetworkRow["status"]>>(
    () => new Set(ALL_STATUSES));
  const [, forceTick] = useState(0); // re-renders the zoom buttons' surrounding UI after a ref-only zoom change

  const view = useRef({ scale: 1, panX: 0, panY: 0 });
  const dragOrigin = useRef<{ x: number; y: number } | null>(null); // pointer-down screen pos, for click-vs-drag
  const panOrigin = useRef<{ x: number; y: number } | null>(null);  // pan offset at pointer-down

  const clusters = useMemo(() => buildLayout(rows), [rows]);
  const placedAll = useMemo(() => clusters.flatMap((c) => c.members), [clusters]);

  useNetworkCanvas(canvasRef, wrapRef, clusters, placedAll, query, statuses, view);

  const zoomBy = (factor: number) => {
    view.current.scale = Math.min(3, Math.max(0.4, view.current.scale * factor));
    forceTick((t) => t + 1);
  };

  const onWheel = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.08 : 0.93);
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { x: view.current.panX, y: view.current.panY };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragOrigin.current || !panOrigin.current) return;
    view.current.panX = panOrigin.current.x + (e.clientX - dragOrigin.current.x);
    view.current.panY = panOrigin.current.y + (e.clientY - dragOrigin.current.y);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const start = dragOrigin.current;
    const moved = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : Infinity;
    dragOrigin.current = null;
    panOrigin.current = null;
    if (moved >= 4) return; // was a drag, not a click

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { scale, panX, panY } = view.current;
    const wx = (e.clientX - rect.left - panX) / scale;
    const wy = (e.clientY - rect.top - panY) / scale;
    let hit: Placed | null = null;
    let best = Infinity;
    for (const p of placedAll) {
      const d = Math.hypot(p.x - wx, p.y - wy);
      if (d <= p.r + 4 && d < best) { hit = p; best = d; }
    }
    if (hit) setSelected(hit.row);
  };

  if (isLoading) return <Skeleton className="h-[640px] w-full" />;
  if (rows.length === 0) {
    return <EmptyState title="No institutions yet" hint="Once an institution completes KYB, it appears here as a node in the trust network." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Global Trust Network</h2>
          <p className="text-sm text-text-secondary">{rows.length} institution{rows.length === 1 ? "" : "s"} · clustered by shared accreditation body</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" aria-hidden />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search institutions…" aria-label="Search institutions"
              className="glass rounded-lg border border-border-default/60 py-1.5 pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => zoomBy(1.2)} aria-label="Zoom in"><ZoomIn className="h-4 w-4" aria-hidden /></Button>
          <Button variant="ghost" size="sm" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out"><ZoomOut className="h-4 w-4" aria-hidden /></Button>
        </div>
      </div>

      {/* Status filter — counts come from the real rows, so a status with no
          institutions reads 0 rather than being hidden. */}
      <div role="group" aria-label="Filter by status" className="flex flex-wrap items-center gap-2">
        {ALL_STATUSES.map((st) => {
          const on = statuses.has(st);
          const count = rows.filter((r) => r.status === st).length;
          return (
            <button
              key={st}
              type="button"
              aria-pressed={on}
              onClick={() => setStatuses((prev) => {
                const next = new Set(prev);
                next.has(st) ? next.delete(st) : next.add(st);
                return next;
              })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                on ? "border-primary-500/60 bg-primary-500/15 text-text-primary"
                  : "border-border-default/60 text-text-secondary hover:text-text-primary",
              )}
            >
              <span aria-hidden className="h-2 w-2 rounded-full"
                style={{ background: `rgb(var(--tc-node-${st === "pending_kyb" ? "pending" : st}))`, opacity: on ? 1 : 0.4 }} />
              {STATUS_LABEL[st]}
              <span className="tabular text-text-secondary">{count}</span>
            </button>
          );
        })}
        {statuses.size < ALL_STATUSES.length && (
          <button type="button" onClick={() => setStatuses(new Set(ALL_STATUSES))}
            className="text-xs text-primary-800 hover:underline dark:text-primary-400">
            Show all
          </button>
        )}
      </div>

      <div ref={wrapRef} className="glass relative h-[640px] w-full overflow-hidden rounded-2xl border border-border-default/60">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full touch-none cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { dragOrigin.current = null; panOrigin.current = null; }}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-lg border border-border-default/50 bg-surface/60 px-3 py-1.5 text-[11px] text-text-secondary backdrop-blur">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "rgb(var(--tc-node-active))" }} /> Active</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "rgb(var(--tc-node-pending))" }} /> Pending KYB</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "rgb(var(--tc-node-suspended))" }} /> Suspended</span>
          <span className="flex items-center gap-1"><Landmark className="h-3 w-3" aria-hidden /> Accreditor</span>
          <span className="flex items-center gap-1"><Hash className="h-3 w-3" aria-hidden /> Size = credentials issued</span>
        </div>
      </div>

      {/* Keyboard/screen-reader path — the canvas above is pointer-only (mouse
          drag/wheel), so this list is the only way assistive tech or a
          keyboard-only user can browse institutions and open a profile.
          Same "view as list" fallback idiom as PlatformAnalytics' charts. */}
      <details className="rounded-xl border border-border-default/60 glass p-4">
        <summary className="cursor-pointer text-sm font-medium">View institutions as a list</summary>
        <ul className="mt-3 flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setSelected(row)}
                className="flex w-full items-center justify-between rounded-lg border border-border-default/50 bg-surface/40 px-3 py-2 text-left text-sm hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span>{row.legal_name}</span>
                <Badge tone={row.status === "active" ? "success" : row.status === "pending_kyb" ? "warning" : row.status === "suspended" ? "danger" : "neutral"}>
                  {row.status.replace("_", " ")}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </details>

      {selected && (
        <ProfileDrawer row={selected} allRows={rows} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
