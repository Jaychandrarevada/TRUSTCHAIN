/**
 * Issuer dashboard (spec §8.1): KPI tiles, verdict-mix chart, institution
 * status card (KYB/apply flow entry), notifications.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { issuerApi, miscApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { formatPercent } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { Badge, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { Stagger, StaggerItem } from "@/components/motion";
import { StatCard } from "@/components/domain/certificate";
import { InsightsCard, deriveIssuerInsights } from "@/components/domain/insights";
import { useState } from "react";

/** Shown when the account has no institution yet — the KYB entry (UC-01). */
function ApplyCard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [legalName, setLegalName] = useState("");
  const [slug, setSlug] = useState("");
  const apply = useMutation({
    mutationFn: () => miscApi.createInstitution({ legal_name: legalName, slug }),
    onSuccess: () => {
      toast("success", "Application submitted — most reviews finish within 2 business days.");
      queryClient.invalidateQueries({ queryKey: ["issuer", "institution"] });
    },
    onError: (err) => err instanceof ApiError && toast("warning", err.problem.detail),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Register your institution</CardTitle>
        <CardDescription>
          Issuance unlocks after accreditation review by the platform team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3 sm:max-w-md"
          onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
          <TextField label="Legal name" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
          <TextField label="URL slug" help="3–40 chars: a–z, 0–9, hyphen" value={slug}
            onChange={(e) => setSlug(e.target.value)} required />
          <Button type="submit" loading={apply.isPending} className="self-start">Submit for review</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function IssuerDashboard() {
  const institution = useQuery({
    queryKey: ["issuer", "institution"],
    queryFn: issuerApi.myInstitution,
    retry: false,
  });
  const analytics = useQuery({
    queryKey: ["issuer", "analytics"],
    queryFn: issuerApi.analytics,
    enabled: !!institution.data,
  });

  if (institution.isLoading) return <Skeleton className="h-64 w-full" />;
  if (institution.isError) return <ApplyCard />;

  const inst = institution.data!;
  const stats = analytics.data;
  const verdictData = stats
    ? Object.entries(stats.verifications_by_verdict).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="font-semibold">{inst.legal_name}</p>
            <p className="text-xs text-text-secondary">
              {inst.issuer_did ?? "No on-chain identity yet"}
            </p>
          </div>
          {inst.status === "active" && <Badge tone="success">Active issuer</Badge>}
          {inst.status === "pending_kyb" && <Badge tone="warning">Accreditation review pending</Badge>}
          {inst.status === "suspended" && <Badge tone="danger">Suspended — issuance blocked</Badge>}
        </CardContent>
      </Card>

      {stats && (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><StatCard label="Certificates issued" value={stats.certificates_issued} /></StaggerItem>
          <StaggerItem><StatCard label="Claim rate" value={formatPercent(stats.claim_rate)} /></StaggerItem>
          <StaggerItem><StatCard label="Verifications" value={stats.verifications_total} /></StaggerItem>
          <StaggerItem><StatCard label="Pending approvals" value={stats.batches_pending_approval}
            tone={stats.batches_pending_approval > 0 ? "warning" : "default"} /></StaggerItem>
        </Stagger>
      )}

      {stats && <InsightsCard insights={deriveIssuerInsights(stats)} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card glass>
          <CardHeader><CardTitle className="text-base">Verifications by verdict</CardTitle></CardHeader>
          <CardContent>
            {verdictData.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-secondary">No data for this range.</p>
            ) : (
              <div aria-label="Bar chart: verification counts by verdict" role="img">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={verdictData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--tc-chart-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link to="/issuer/batches/new"><Button className="w-full" disabled={!inst.can_issue}>New batch</Button></Link>
            <Link to="/issuer/certificates"><Button variant="secondary" className="w-full">Browse certificates</Button></Link>
            <Link to="/issuer/audit"><Button variant="ghost" className="w-full">Audit log</Button></Link>
            {!inst.can_issue && (
              <p className="text-xs text-text-secondary">
                Issuance is locked until your institution is approved and registered on-chain.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
