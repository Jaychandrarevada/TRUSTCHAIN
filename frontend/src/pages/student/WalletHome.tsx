/**
 * Digital Academic Identity Wallet — the holder's lifelong credential hub.
 * NOT a cryptocurrency wallet: it stores verified credentials, not tokens.
 *
 * Sections: Profile, category-filtered credentials (Degrees/Certificates/
 * Internships/Licenses/Skills/Achievements/Projects), Verification History,
 * Trust Score, Identity Status, Recent Activity, plus the existing share-link
 * manager (unchanged functionality).
 *
 * Honesty constraint (same rule as every other surface in this app):
 * `certificate_type` is a real free-text field institutions set at issuance
 * (backend/app/schemas.py) — the seven categories above are the platform's
 * known buckets for that real field, not invented data. An institution has
 * never issued, say, a "skill" credential yet? That section shows a real
 * empty state explaining exactly that, not fake placeholder cards. The Trust
 * Score is a disclosed, deterministic composite (lib/trustScore.ts) computed
 * from real signals — never a black-box or fabricated number.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Award, BadgeCheck, Briefcase, Clock, FolderKanban, GraduationCap, LayoutGrid,
  Mail, Search, Sparkles, Trophy, Wallet as WalletIcon,
} from "lucide-react";
import { miscApi, walletApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { formatDate, truncateHash } from "@/utils";
import { CREDENTIAL_CATEGORIES, categoryForType, type CredentialCategory } from "@/constants";
import { computeHolderTrustScore } from "@/lib/trustScore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState, Skeleton, Table, Td, Th } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { Stagger, StaggerItem } from "@/components/motion";
import { CertificateCard, StatCard, Timeline } from "@/components/domain/certificate";
import type { CertificateSummary } from "@/types";

const CATEGORY_ICON: Record<CredentialCategory, typeof GraduationCap> = {
  Degrees: GraduationCap, Certificates: Award, Internships: Briefcase, Licenses: BadgeCheck,
  Skills: Sparkles, Achievements: Trophy, Projects: FolderKanban, "Other credentials": LayoutGrid,
};

export default function WalletHome() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<CredentialCategory | "All">("All");
  const [query, setQuery] = useState("");

  const credentials = useQuery({ queryKey: ["wallet", "credentials"], queryFn: walletApi.credentials });
  const shares = useQuery({ queryKey: ["wallet", "shares"], queryFn: walletApi.listShares });
  const profile = useQuery({ queryKey: ["wallet", "profile"], queryFn: miscApi.profile });
  const verifications = useQuery({ queryKey: ["wallet", "verifications"], queryFn: walletApi.verifications });
  const notifications = useQuery({ queryKey: ["wallet", "notifications"], queryFn: miscApi.notifications });

  const revokeShare = useMutation({
    mutationFn: walletApi.revokeShare,
    onSuccess: () => {
      toast("success", "Link revoked. Viewers lose access within a minute.");
      queryClient.invalidateQueries({ queryKey: ["wallet", "shares"] });
    },
    onError: (err) => err instanceof ApiError && toast("danger", err.problem.detail),
  });

  const all = credentials.data?.data ?? [];
  const byCategory = useMemo(() => {
    const map = new Map<CredentialCategory, CertificateSummary[]>();
    for (const cert of all) {
      const cat = categoryForType(cert.type);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(cert);
    }
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    const base = activeCategory === "All" ? all : (byCategory.get(activeCategory) ?? []);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => {
      const program = String(c.subject_data?.program ?? "").toLowerCase();
      const name = String(c.subject_data?.holder_name ?? "").toLowerCase();
      return c.cert_uid.toLowerCase().includes(q) || program.includes(q) || name.includes(q);
    });
  }, [all, activeCategory, byCategory, query]);

  const validCount = all.filter((c) => c.status === "issued" || c.status === "claimed").length;
  const walletLinked = (profile.data?.wallets.length ?? 0) > 0;
  const trust = computeHolderTrustScore(
    all, profile.data?.email_verified ?? false, walletLinked, verifications.data?.data.length ?? 0,
  );

  const tabs: ("All" | CredentialCategory)[] = ["All", ...CREDENTIAL_CATEGORIES, "Other credentials"];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <Card glass hover className="p-6">
        {profile.isLoading ? <Skeleton className="h-16 w-full" /> : profile.data && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold">{profile.data.full_name || "Your identity wallet"}</h1>
              <p className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Mail className="h-3.5 w-3.5" aria-hidden /> {profile.data.email}
                {profile.data.email_verified && <Badge tone="success">Verified</Badge>}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Member since {formatDate(profile.data.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-extrabold text-primary-500">{trust.score}</p>
              <p className="text-xs text-text-secondary">Trust score · {trust.label}</p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Animated statistics ─────────────────────────────────────────── */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem><StatCard label="Total credentials" value={all.length} /></StaggerItem>
        <StaggerItem><StatCard label="Active & valid" value={validCount} /></StaggerItem>
        <StaggerItem><StatCard label="Verification requests" value={verifications.data?.data.length ?? 0} /></StaggerItem>
        <StaggerItem><StatCard label="Trust score" value={trust.score} suffix="/100" /></StaggerItem>
      </Stagger>

      {/* ── Identity Status ─────────────────────────────────────────────── */}
      <Card glass>
        <CardHeader><CardTitle className="text-base">Identity status</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-primary-500" aria-hidden />
            Email {profile.data?.email_verified
              ? <Badge tone="success">Verified</Badge>
              : <Badge tone="warning">Unverified</Badge>}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <WalletIcon className="h-4 w-4 text-primary-500" aria-hidden />
            {walletLinked
              ? <span className="font-mono text-xs">{truncateHash(profile.data!.wallets[0].address)}</span>
              : <Badge>No wallet linked</Badge>}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="h-4 w-4" aria-hidden />
            Score breakdown: {trust.identityPoints} identity · {trust.credentialPoints} credentials ·{" "}
            {trust.integrityPoints} integrity · {trust.verificationPoints} verified
          </div>
        </CardContent>
      </Card>

      {/* ── Credential organization: search + category filter ──────────── */}
      <section aria-labelledby="creds-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="creds-heading" className="font-display text-lg font-semibold tracking-tight">My credentials</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" aria-hidden />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search credentials…" aria-label="Search credentials"
              className="glass rounded-lg border border-border-default/60 py-1.5 pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            />
          </div>
        </div>

        <div role="tablist" aria-label="Credential category" className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const count = tab === "All" ? all.length : (byCategory.get(tab)?.length ?? 0);
            const Icon = tab === "All" ? LayoutGrid : CATEGORY_ICON[tab];
            const active = activeCategory === tab;
            return (
              <button
                key={tab} role="tab" aria-selected={active}
                onClick={() => setActiveCategory(tab)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary-500 bg-primary-500/15 text-text-primary shadow-glow"
                    : "border-border-default/60 text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden /> {tab} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {credentials.isLoading && (
          <div className="flex flex-col gap-3" aria-busy>
            <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
          </div>
        )}
        {credentials.data && all.length === 0 && (
          <EmptyState
            title="No credentials yet"
            hint="When an institution issues you a certificate, it will appear here. Got a claim link?"
            action={<Link to="/wallet/claim"><Button size="sm">Claim a certificate</Button></Link>}
          />
        )}
        {credentials.data && all.length > 0 && filtered.length === 0 && (
          <EmptyState
            title={`No ${activeCategory === "All" ? "" : activeCategory.toLowerCase() + " "}credentials match`}
            hint={activeCategory !== "All"
              ? `No institution has issued you a ${activeCategory.toLowerCase()} credential yet — this section fills in automatically the moment one is.`
              : "Try a different search term."}
          />
        )}
        <Stagger className="grid gap-3 md:grid-cols-2">
          {filtered.map((cert) => (
            <StaggerItem key={cert.cert_uid}>
              <CertificateCard cert={cert} to={`/wallet/certificates/${cert.cert_uid}`} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── Verification History (timeline) ─────────────────────────────── */}
      <Card glass>
        <CardHeader><CardTitle className="text-base">Verification history</CardTitle></CardHeader>
        <CardContent>
          {verifications.isLoading && <Skeleton className="h-24 w-full" />}
          {verifications.data && verifications.data.data.length === 0 && (
            <p className="text-sm text-text-secondary">No one has verified any of your credentials yet.</p>
          )}
          {verifications.data && verifications.data.data.length > 0 && (
            <Timeline events={verifications.data.data.slice(0, 15).map((v) => ({
              event: `${v.cert_uid} · ${v.verdict}`, at: v.at, reason: v.channel,
            }))} />
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      <Card glass>
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent>
          {notifications.isLoading && <Skeleton className="h-20 w-full" />}
          {notifications.data && notifications.data.data.length === 0 && (
            <p className="text-sm text-text-secondary">No recent activity.</p>
          )}
          {notifications.data && notifications.data.data.length > 0 && (
            <ul className="flex flex-col divide-y divide-border-default/60">
              {notifications.data.data.slice(0, 10).map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-text-secondary">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-secondary">{formatDate(n.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Share links (unchanged) ──────────────────────────────────────── */}
      <Card glass>
        <CardHeader><CardTitle className="text-base">My share links</CardTitle></CardHeader>
        <CardContent>
          {shares.data && shares.data.data.length === 0 && (
            <p className="text-sm text-text-secondary">
              No active shares. Open a credential and choose Share to create a link.
            </p>
          )}
          {shares.data && shares.data.data.length > 0 && (
            <Table>
              <thead><tr><Th>Status</Th><Th>Views</Th><Th>Expires</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
              <tbody>
                {shares.data.data.map((share) => (
                  <tr key={share.id}>
                    <Td>{share.active ? <Badge tone="success">Active</Badge> : <Badge>Expired</Badge>}</Td>
                    <Td>{share.view_count}{share.max_views ? ` / ${share.max_views}` : ""}</Td>
                    <Td>{share.expires_at ? formatDate(share.expires_at) : "Never"}</Td>
                    <Td className="text-right">
                      {share.active && (
                        <Button variant="danger-secondary" size="sm"
                          loading={revokeShare.isPending}
                          onClick={() => revokeShare.mutate(share.id)}>
                          Revoke link
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
