/**
 * Admin KYB queue (spec §5.7): pending applications, oldest first; approval
 * triggers on-chain issuer registration — the confirm restates that effect.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, miscApi } from "@/services/api";
import { formatDate } from "@/utils";
import { SUPPORTED_CHAINS } from "@/constants";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, Skeleton, Table, Td, Th } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import type { KybApplication } from "@/types";
import { ChainAction } from "@/components/domain/ChainAction";
import { REGISTRATION_PIPELINE } from "@/components/domain/blockchainStages";

export default function KybQueue() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<KybApplication>();

  const { data, isLoading } = useQuery({ queryKey: ["admin", "kyb"], queryFn: adminApi.kybQueue });

  // Approval is a real on-chain write (it registers the issuer), so it runs
  // through the shared blockchain pipeline instead of a bare spinner.
  const [registering, setRegistering] = useState<KybApplication>();

  const chain = useQuery({ queryKey: ["chain", "info"], queryFn: miscApi.chainInfo, staleTime: 300_000 });
  const network = chain.data ? (SUPPORTED_CHAINS[chain.data.chain_id] ?? `chainId ${chain.data.chain_id}`) : null;

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
        onConfirm={() => { setRegistering(target); setTarget(undefined); }}
        title={`Approve ${target?.legal_name}?`}
        confirmLabel="Approve & register on-chain"
        body={
          <p>
            This registers the institution in the on-chain issuer registry and unlocks certificate
            issuance. Confirm you've checked the accreditation reference against the registry.
          </p>
        }
      />

      {registering && (
        <ChainAction
          preset={REGISTRATION_PIPELINE}
          network={network}
          mode={chain.data?.mode}
          run={() => adminApi.approveKyb(registering.id)}
          deriveProof={(d) => ({ txHash: d?.tx_hash, chainIssuerId: d?.chain_issuer_id })}
          onSettled={(o) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "kyb"] });
            if (o.ok) toast("success", `${registering.legal_name} is now an active issuer.`);
          }}
          onClose={() => setRegistering(undefined)}
        />
      )}
    </div>
  );
}
