/**
 * Issuer certificate admin (spec §4.7/§5): facts panel, timeline, QR,
 * danger zone — two-person revocation (typed REVOKE confirm + separate
 * confirm step surfacing SAME_ACTOR verbatim) and supersede correction.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { issuerApi, miscApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_CHAINS } from "@/constants";
import { humanizeKey } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/field";
import { CopyField, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { statusToVerdict, Timeline } from "@/components/domain/certificate";
import { VerdictBadge } from "@/components/domain/verdict";
import { ChainAction } from "@/components/domain/ChainAction";
import { REVOCATION_PIPELINE, SUPERSEDE_PIPELINE } from "@/components/domain/blockchainStages";

const REASONS = ["fraud", "error", "misconduct", "holder_request"] as const;

export default function CertificateAdmin() {
  const { certUid = "" } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canRevoke = hasPermission("certificates:revoke");
  const canSupersede = hasPermission("certificates:approve");

  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("error");
  const [supersedeOpen, setSupersedeOpen] = useState(false);
  const [corrected, setCorrected] = useState<Record<string, string>>({});
  // Which on-chain pipeline overlay is currently running, if any.
  const [chainAction, setChainAction] = useState<"revoke" | "supersede" | null>(null);
  // Successor UID held until the user dismisses the pipeline, so navigation
  // never yanks the page away while they are still reading the result.
  const supersedeResultRef = useRef<string | null>(null);

  // Real network identity for the pipeline's technical panel — never assumed.
  const chain = useQuery({ queryKey: ["chain", "info"], queryFn: miscApi.chainInfo, staleTime: 300_000 });
  const network = chain.data ? (SUPPORTED_CHAINS[chain.data.chain_id] ?? `chainId ${chain.data.chain_id}`) : null;

  const { data: cert, isLoading } = useQuery({
    queryKey: ["issuer", "certificate", certUid],
    queryFn: () => issuerApi.getCertificate(certUid),
  });
  const { data: qr } = useQuery({
    queryKey: ["issuer", "qr", certUid],
    queryFn: () => issuerApi.getQr(certUid),
    enabled: !!cert,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["issuer", "certificate", certUid] });

  const initiate = useMutation({
    mutationFn: () => issuerApi.initiateRevoke(certUid, reason),
    onSuccess: () => { toast("success", "Revocation recorded — awaiting a second approver."); setRevokeOpen(false); refresh(); },
    onError: (err) => err instanceof ApiError && toast("warning", err.problem.detail),
  });
  // Revocation and superseding both run through the on-chain pipeline overlay
  // (ChainAction) rather than a bare spinner: each one is a real chain write,
  // and the pipeline surfaces the actual transaction it produced.

  if (isLoading || !cert) return <Skeleton className="h-96 w-full" />;
  const subject = cert.subject_data ?? {};
  const pendingRevocation = cert.timeline.some((e) => e.event === "revocation_initiated") &&
    !cert.timeline.some((e) => e.event === "revoked");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{String(subject.holder_name ?? certUid)}</h2>
          <p className="font-mono text-xs text-text-secondary">{certUid}</p>
        </div>
        <VerdictBadge verdict={statusToVerdict(cert.status)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Record</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(subject).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">{humanizeKey(key)}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
            <p>Content hash: <CopyField value={cert.content_hash} label="content hash" /></p>
            {cert.merkle_root && <p>Merkle root: <CopyField value={cert.merkle_root} label="Merkle root" /></p>}
            {cert.superseded_by && <p className="text-info-700">Superseded by a corrected certificate.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Verification QR</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            {qr ? <img src={qr} alt={`QR code for verification of ${certUid}`} className="h-52 w-52 rounded-md bg-white p-2" />
                : <Skeleton className="h-52 w-52" />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lifecycle</CardTitle></CardHeader>
        <CardContent><Timeline events={cert.timeline} /></CardContent>
      </Card>

      {/* Danger zone — irreversibility is visually loud (spec §1.5) */}
      {cert.status !== "revoked" && cert.status !== "superseded" && (canRevoke || canSupersede) && (
        <Card className="border-danger-700/40">
          <CardHeader>
            <CardTitle className="text-base text-danger-700 dark:text-danger-400">Danger zone</CardTitle>
            <CardDescription>
              Revocation cannot be undone and needs two different approvers. For data errors,
              use Correct &amp; reissue instead.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canRevoke && (pendingRevocation ? (
              <Button variant="danger" onClick={() => setChainAction("revoke")}>
                Confirm revocation (second approver)
              </Button>
            ) : (
              <Button variant="danger-secondary" onClick={() => setRevokeOpen(true)}>Revoke certificate…</Button>
            ))}
            {canSupersede && (
              <Button variant="secondary" onClick={() => {
                setCorrected(Object.fromEntries(Object.entries(subject).map(([k, v]) => [k, String(v)])));
                setSupersedeOpen(true);
              }}>
                Correct &amp; reissue
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {cert.status !== "revoked" && cert.status !== "superseded" && !canRevoke && !canSupersede && (
        <p className="text-sm text-text-secondary">
          Revocation and correction need the <b>approver</b> role. Sign in as an approver to manage this certificate.
        </p>
      )}

      <ConfirmDialog
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={() => initiate.mutate()}
        loading={initiate.isPending}
        title="Revoke this certificate?"
        confirmLabel="Initiate revocation"
        typedConfirmation="REVOKE"
        body={
          <div className="flex flex-col gap-3">
            <p>
              This cannot be undone. Within minutes of the second approval, anyone verifying this
              certificate will see it as revoked.
            </p>
            <SelectField label="Reason" value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}>
              {REASONS.map((r) => <option key={r} value={r}>{humanizeKey(r)}</option>)}
            </SelectField>
          </div>
        }
      />

      <Dialog open={supersedeOpen} onClose={() => setSupersedeOpen(false)} title="Correct & reissue">
        <form className="flex flex-col gap-3"
          onSubmit={(e) => { e.preventDefault(); setSupersedeOpen(false); setChainAction("supersede"); }}>
          <p className="text-sm text-text-secondary">
            A new certificate is issued with the corrected data; this one becomes “superseded”
            with a public pointer to the correction — nothing is silently edited.
          </p>
          {Object.entries(corrected).map(([key, value]) => (
            <TextField key={key} label={humanizeKey(key)} value={value}
              onChange={(e) => setCorrected((prev) => ({ ...prev, [key]: e.target.value }))} />
          ))}
          <Button type="submit">Issue corrected certificate</Button>
        </form>
      </Dialog>

      {chainAction === "revoke" && (
        <ChainAction
          preset={REVOCATION_PIPELINE}
          network={network}
          mode={chain.data?.mode}
          run={() => issuerApi.confirmRevoke(certUid)}
          deriveProof={(d) => ({ txHash: d?.tx_hash })}
          onSettled={(o) => {
            refresh();
            if (o.ok) toast("success", "Certificate revoked. The holder has been notified.");
            else if (o.code === "SAME_ACTOR") toast("warning", "A different approver must confirm this revocation.");
          }}
          onClose={() => setChainAction(null)}
        />
      )}

      {chainAction === "supersede" && (
        <ChainAction
          preset={SUPERSEDE_PIPELINE}
          network={network}
          mode={chain.data?.mode}
          run={() => issuerApi.supersede(certUid, corrected)}
          // Supersede returns only the successor UID — there is no transaction
          // yet, so no chain proof is claimed here.
          deriveProof={() => ({})}
          onSettled={(o) => {
            if (o.ok && o.data) {
              supersedeResultRef.current = o.data.successor_uid;
              toast("success", `Corrected certificate ${o.data.successor_uid} issued.`);
            }
          }}
          onClose={() => {
            const uid = supersedeResultRef.current;
            setChainAction(null);
            if (uid) navigate(`/issuer/certificates/${uid}`);
          }}
        />
      )}
    </div>
  );
}
