/**
 * Batch detail — FSM status, approval action (approver role; the backend
 * rejects self-approval with 403 SELF_APPROVAL_FORBIDDEN which we surface
 * verbatim), and anchoring evidence once sealed (spec §5.4).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { issuerApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, CopyField, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ChainStatusChip } from "@/components/domain/certificate";
import { IssuanceCeremony } from "@/components/domain/IssuanceCeremony";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral", validated: "info", pending_approval: "warning",
  anchoring: "warning", anchored: "success", failed: "danger",
};

export default function BatchDetail() {
  const { batchId = "" } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasPermission, session } = useAuth();
  const canApprove = hasPermission("certificates:approve");

  const { data: batch, isLoading } = useQuery({
    queryKey: ["issuer", "batch", batchId],
    queryFn: () => issuerApi.getBatch(batchId),
  });
  const institution = useQuery({
    queryKey: ["issuer", "institution"],
    queryFn: issuerApi.myInstitution,
    staleTime: 60_000,
  });

  const [ceremonyOpen, setCeremonyOpen] = useState(false);

  if (isLoading || !batch) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{batch.name}</h2>
          <p className="text-sm text-text-secondary">{batch.row_count} certificates</p>
        </div>
        <Badge tone={STATUS_TONE[batch.status]}>{batch.status.replace("_", " ")}</Badge>
      </div>

      {batch.status === "pending_approval" && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="max-w-lg text-sm">
              Approving will seal all {batch.row_count} certificates on the blockchain.
              This is the maker-checker gate: a different person with the <b>approver</b> role
              must release it — the batch creator cannot approve their own batch.
            </p>
            {canApprove ? (
              <Button onClick={() => setCeremonyOpen(true)}>Approve batch</Button>
            ) : (
              <p className="rounded-md bg-warning-100 px-3 py-2 text-sm text-warning-700 dark:bg-warning-700/20 dark:text-warning-400">
                Your role can't approve. Sign in as an <b>approver</b> (e.g. registrar@demo-university.local).
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {batch.status === "pending_approval" && canApprove && session && batch.created_by === session.userId && (
        <p className="text-sm text-warning-700 dark:text-warning-400">
          You created this batch, so you can't approve it. A different approver must release it.
        </p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Anchoring evidence</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ChainStatusChip anchored={batch.status === "anchored"} txHash={batch.anchor_tx_hash} />
          {batch.merkle_root && (
            <p>Merkle root: <CopyField value={batch.merkle_root} label="Merkle root" /></p>
          )}
          {batch.anchor_tx_hash && (
            <p>Transaction: <CopyField value={batch.anchor_tx_hash} label="transaction hash" />
              {batch.anchor_block && <span className="ml-2 font-mono text-xs">block {batch.anchor_block}</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {ceremonyOpen && (
        <IssuanceCeremony
          institutionName={institution.data?.legal_name ?? "Your institution"}
          rowCount={batch.row_count}
          run={() => issuerApi.approveBatch(batchId)}
          onSettled={(outcome) => {
            queryClient.invalidateQueries({ queryKey: ["issuer", "batch", batchId] });
            if (outcome.ok) {
              toast("success", "Batch approved — sealed on the blockchain. Recipients can now claim.");
            } else if (outcome.code === "SELF_APPROVAL_FORBIDDEN") {
              toast("warning", "You created this batch — a different approver must release it.");
            } else {
              toast("danger", outcome.message);
            }
          }}
          onClose={() => setCeremonyOpen(false)}
        />
      )}
    </div>
  );
}
