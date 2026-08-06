/**
 * Admin KYB queue (spec §5.7): pending applications, oldest first; approval
 * triggers on-chain issuer registration — the confirm restates that effect.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { formatDate } from "@/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, Skeleton, Table, Td, Th } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import type { KybApplication } from "@/types";

export default function KybQueue() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<KybApplication>();

  const { data, isLoading } = useQuery({ queryKey: ["admin", "kyb"], queryFn: adminApi.kybQueue });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveKyb(id),
    onSuccess: (res) => {
      toast("success", `Approved — issuer #${res.chain_issuer_id} registered on-chain (tx ${res.tx_hash.slice(0, 10)}…).`);
      setTarget(undefined);
      queryClient.invalidateQueries({ queryKey: ["admin", "kyb"] });
    },
    onError: (err) => err instanceof ApiError && toast("danger", err.problem.detail),
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectKyb(id, "Accreditation could not be confirmed."),
    onSuccess: () => {
      toast("info", "Application rejected with reason.");
      queryClient.invalidateQueries({ queryKey: ["admin", "kyb"] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">KYB queue</h2>
        <p className="text-sm text-text-secondary">
          Approval registers the institution on the blockchain and unlocks issuance — a human
          decision, never automated.
        </p>
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {data && data.data.length === 0 && <EmptyState title="No pending applications" hint="You're all caught up." />}
      {data && data.data.length > 0 && (
        <Table>
          <thead>
            <tr><Th>Institution</Th><Th>Accreditation</Th><Th>Applied</Th><Th><span className="sr-only">Decide</span></Th></tr>
          </thead>
          <tbody>
            {data.data.map((app) => (
              <tr key={app.id}>
                <Td>
                  <p className="font-medium">{app.legal_name}</p>
                  <p className="font-mono text-xs text-text-secondary">{app.slug}</p>
                </Td>
                <Td>{app.accreditation_body ?? "—"}</Td>
                <Td className="text-xs">{formatDate(app.applied_at)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => setTarget(app)}>Approve</Button>
                    <Button size="sm" variant="danger-secondary"
                      loading={reject.isPending}
                      onClick={() => reject.mutate(app.id)}>Reject</Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(undefined)}
        onConfirm={() => target && approve.mutate(target.id)}
        loading={approve.isPending}
        title={`Approve ${target?.legal_name}?`}
        confirmLabel="Approve & register on-chain"
        body={
          <p>
            This registers the institution in the on-chain issuer registry and unlocks certificate
            issuance. Confirm you've checked the accreditation reference against the registry.
          </p>
        }
      />
    </div>
  );
}
