/**
 * Batch detail — FSM status, approval action (approver role; the backend
 * rejects self-approval with 403 SELF_APPROVAL_FORBIDDEN which we surface
 * verbatim), and anchoring evidence once sealed (spec §5.4).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
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
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <Link to="/issuer/batches" className="hover:text-text-primary hover:underline">
          ← Back to Batches
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{batch.name}</h2>
          <p className="text-sm text-text-secondary">
            {batch.row_count} certificates · Created: {batch.created_at ? new Date(batch.created_at).toLocaleDateString() : "Recently"}
          </p>
        </div>
        <Badge tone={STATUS_TONE[batch.status]}>{batch.status.replace("_", " ")}</Badge>
      </div>

      {batch.status === "pending_approval" && (
        <Card className="border-warning-500/40 bg-warning-500/5">
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-warning-800 dark:text-warning-300">
                  Awaiting Checker Approval & Blockchain Sealing
                </p>
                <p className="max-w-xl text-xs text-text-secondary mt-1">
                  Approving this batch will compute the cryptographic Merkle Tree and anchor the Merkle Root
                  on the blockchain ledger. Once anchored, all certificates become publicly <b>VALID</b> and tamper-proof.
                </p>
              </div>
              {canApprove && (!session || batch.created_by !== session.userId) ? (
                <Button variant="primary" className="gap-1.5" onClick={() => setCeremonyOpen(true)}>
                  Approve & Anchor to Blockchain
                </Button>
              ) : null}
            </div>

            {session && batch.created_by === session.userId && (
              <div className="rounded-lg border border-warning-400/40 bg-warning-100/60 p-3 text-xs text-warning-800 dark:bg-warning-700/20 dark:text-warning-300">
                <strong>Maker-Checker Policy (4-Eyes Principle):</strong> You created this batch as Operator (Maker).
                Under strict university audit rules, a different user with the <b>Approver</b> role (such as the Registrar) must review and approve it.
                <div className="mt-1 font-mono text-[11px]">
                  💡 For Demo: Log out and log in as an approver (e.g. <code>registrar@osmania.ac.in</code> or <code>approver2@demo-university.local</code>, password: <code>ChangeMe-Demo-123!</code>).
                </div>
              </div>
            )}

            {!canApprove && (
              <div className="rounded-lg border border-border-default bg-background p-3 text-xs text-text-secondary">
                Your current role cannot approve batches. Please sign in with an <b>Approver</b> account to execute the blockchain signing transaction.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staged Certificates in Batch */}
      {batch.certificates && batch.certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Certificates in this Batch ({batch.certificates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default/60 text-text-secondary font-semibold">
                    <th className="py-2 pr-3">Recipient Name</th>
                    <th className="py-2 pr-3">Program</th>
                    <th className="py-2 pr-3">Hall Ticket / ID</th>
                    <th className="py-2 pr-3">Marks / CGPA</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 text-right">Certificate UID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/40">
                  {batch.certificates.map((c) => {
                    const subj = c.subject_data || {};
                    return (
                      <tr key={c.cert_uid}>
                        <td className="py-2 pr-3 font-medium text-text-primary">
                          {String(subj.holder_name || "Student")}
                        </td>
                        <td className="py-2 pr-3 text-text-secondary">
                          {String(subj.program || c.type)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-text-secondary">
                          {String(subj.hall_ticket_no || "—")}
                        </td>
                        <td className="py-2 pr-3 font-mono text-primary-600 dark:text-primary-400 font-semibold">
                          {String(subj.cgpa ? `CGPA: ${subj.cgpa}` : "—")}
                        </td>
                        <td className="py-2 pr-3">
                          {batch.status === "anchored" ? (
                            <Badge tone="success">Issued & Anchored</Badge>
                          ) : (
                            <Badge tone="warning">Awaiting Approval</Badge>
                          )}
                        </td>
                        <td className="py-2 text-right font-mono text-[11px]">
                          {batch.status === "anchored" ? (
                            <Link
                              to={`/v/${c.cert_uid}`}
                              className="text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              {c.cert_uid}
                            </Link>
                          ) : (
                            <span className="text-text-secondary">{c.cert_uid}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Blockchain Anchoring Evidence</CardTitle></CardHeader>
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
