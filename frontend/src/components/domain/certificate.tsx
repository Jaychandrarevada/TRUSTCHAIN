/**
 * Certificate domain components (spec §7/§9): CertificateCard, Timeline,
 * ChainStatusChip, StatCard, QRDisplay (client-side QR for share links).
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Award, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Verdict } from "@/constants";
import type { CertificateSummary } from "@/types";
import { cn, formatDate, humanizeKey } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { VerdictBadge } from "./verdict";

/** Map DB certificate status → display verdict for badges (wallet/issuer lists). */
export function statusToVerdict(status: string): Verdict {
  switch (status) {
    case "revoked": return "REVOKED";
    case "superseded": return "SUPERSEDED";
    case "expired": return "EXPIRED";
    case "suspended": return "SUSPENDED_ISSUER";
    default: return "VALID";
  }
}

export function CertificateCard({ cert, to }: { cert: CertificateSummary; to: string }) {
  const subject = cert.subject_data ?? {};
  return (
    // Single composed link (spec §5.5 a11y note)
    <Link to={to} className="group block focus-visible:outline-2">
      <Card className={cn("flex items-start gap-4 p-4 transition-shadow duration-fast group-hover:shadow-md",
        cert.status === "revoked" && "opacity-70")}>
        <div className="rounded-md bg-primary-50 p-3 text-primary-600 dark:bg-primary-900/30">
          <Award className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{String(subject.program ?? cert.type)}</p>
          <p className="truncate text-sm text-text-secondary">
            {String(subject.holder_name ?? "")}
          </p>
          <p className="mt-1 font-mono text-xs text-text-secondary">{cert.cert_uid}</p>
        </div>
        <VerdictBadge verdict={statusToVerdict(cert.status)} />
      </Card>
    </Link>
  );
}

export function IssuerChip({ name, status }: { name: string | null; status?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Building2 className="h-4 w-4 text-text-secondary" aria-hidden />
      <span className="font-medium">{name ?? "Unknown issuer"}</span>
      {status === "active" && <Badge tone="success">Accredited</Badge>}
      {status === "suspended" && <Badge tone="warning">Suspended</Badge>}
    </span>
  );
}

/** Certificate lifecycle timeline (spec §9.5). */
export function Timeline({ events }: {
  events: { event: string; at?: string; reason?: string | null; tx?: string | null; count?: number }[];
}) {
  return (
    <ol className="relative ml-2 flex flex-col gap-4 border-l border-border-default pl-4">
      {events.map((e, i) => (
        <li key={i} className="relative text-sm">
          <span aria-hidden className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-500" />
          <p className="font-medium">
            {humanizeKey(e.event)}
            {e.count !== undefined && ` × ${e.count}`}
          </p>
          <p className="text-xs text-text-secondary">
            {e.at ? formatDate(e.at) : ""}
            {e.reason ? ` · ${e.reason}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Blockchain anchoring state chip (spec §7 BlockchainStatusBadge). */
export function ChainStatusChip({ anchored, txHash }: { anchored: boolean; txHash?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span aria-hidden className={cn("h-2 w-2 rounded-full",
        anchored ? "bg-success-700" : "bg-warning-400 animate-pulse motion-reduce:animate-none")} />
      {anchored ? "Sealed on blockchain" : "Anchoring…"}
      {anchored && txHash && (
        <span className="font-mono text-text-secondary">{txHash.slice(0, 10)}…</span>
      )}
    </span>
  );
}

/** KPI stat tile (spec §8). Numeric values count up on view; glass + lift. */
export function StatCard({ label, value, tone, suffix, prefix }: {
  label: string; value: string | number; tone?: "default" | "warning" | "danger";
  suffix?: string; prefix?: string;
}) {
  return (
    <Card glass hover className="p-5">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className={cn("mt-1 font-display text-3xl font-bold tabular-nums",
        tone === "warning" && "text-warning-700 dark:text-warning-400",
        tone === "danger" && "text-danger-700 dark:text-danger-400")}>
        {typeof value === "number"
          ? <AnimatedCounter value={value} suffix={suffix} prefix={prefix} />
          : value}
      </p>
    </Card>
  );
}

/** Client-side QR (share links). Issuer certificate QRs come from the API. */
export function QRDisplay({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 4, width: 240 })
      .then(setSrc)
      .catch(() => setSrc(undefined));
  }, [value]);
  if (!src) return <div className="skeleton h-60 w-60" />;
  return (
    <img
      src={src}
      alt={`QR code: ${label}`}
      className="h-60 w-60 rounded-md border border-border-default bg-white p-2"
    />
  );
}
