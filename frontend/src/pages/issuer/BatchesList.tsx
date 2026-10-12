/**
 * Issuer Batches & Approvals list (/issuer/batches)
 * Maker-checker review queue and batch lifecycle history.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Boxes,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { issuerApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, Skeleton, Table, Th, Td } from "@/components/ui/misc";

const STATUS_CONFIG: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Draft", tone: "neutral" },
  validated: { label: "Validated", tone: "info" },
  pending_approval: { label: "Pending Approval", tone: "warning" },
  anchoring: { label: "Anchoring on Chain", tone: "warning" },
  anchored: { label: "Anchored on Blockchain", tone: "success" },
  failed: { label: "Anchoring Failed", tone: "danger" },
};

export default function BatchesList() {
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("status") || "all";
  const { hasPermission, session } = useAuth();
  const canApprove = hasPermission("certificates:approve");

  const { data, isLoading } = useQuery({
    queryKey: ["issuer", "batches", activeTab],
    queryFn: () => issuerApi.listBatches(activeTab === "all" ? undefined : activeTab),
  });

  const batches = data?.data ?? [];
  const pendingCount = batches.filter((b) => b.status === "pending_approval").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary-500" />
            Certificate Batches & Approval Queue
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage batches, maker-checker governance, and cryptographic blockchain anchoring.
          </p>
        </div>
        <Link to="/issuer/batches/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> New Batch
          </Button>
        </Link>
      </div>

      {/* Governance Explainer Card */}
      <Card glass className="border-primary-500/20 bg-primary-500/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary-500/10 p-2 text-primary-600 dark:text-primary-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-text-primary">
                  Maker-Checker (4-Eyes) Blockchain Governance
                </p>
                <p className="text-text-secondary">
                  <strong>1. Operator (Maker)</strong> uploads student records and creates the batch.
                  <br />
                  <strong>2. Registrar/Approver (Checker)</strong> audits student details and authorizes the smart contract transaction.
                  <br />
                  The creator cannot approve their own batch (prevents insider fraud).
                </p>
              </div>
            </div>
            {canApprove && (
              <Badge tone="success" className="self-start sm:self-center shrink-0">
                ✓ Authorized Approver
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-default/60 pb-2">
        <button
          onClick={() => setParams({})}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            activeTab === "all"
              ? "bg-primary-500 text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
          }`}
        >
          All Batches
        </button>
        <button
          onClick={() => setParams({ status: "pending_approval" })}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            activeTab === "pending_approval"
              ? "bg-warning-500 text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Awaiting Approval
          {pendingCount > 0 && (
            <span className="rounded-full bg-warning-700/80 px-1.5 py-0.2 text-[10px] text-white ml-0.5">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setParams({ status: "anchored" })}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            activeTab === "anchored"
              ? "bg-success-600 text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Anchored on Blockchain
        </button>
        <button
          onClick={() => setParams({ status: "draft" })}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            activeTab === "draft"
              ? "bg-text-secondary text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
          }`}
        >
          Drafts
        </button>
      </div>

      {/* Table / List */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            <Boxes className="h-10 w-10 mx-auto text-text-secondary/40 mb-3" />
            <p className="font-semibold text-text-primary">No batches found</p>
            <p className="text-xs mt-1">
              {activeTab === "pending_approval"
                ? "No batches currently awaiting approval. Great job!"
                : "Create a new batch to start issuing certificates."}
            </p>
            <Link to="/issuer/batches/new" className="mt-4 inline-block">
              <Button size="sm">Create First Batch</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Batch Name</Th>
              <Th>Certificates</Th>
              <Th>Status</Th>
              <Th>Blockchain Evidence</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || { label: b.status, tone: "neutral" };
              const isPending = b.status === "pending_approval";
              const isCreator = session?.userId === b.created_by;

              return (
                <tr key={b.id} className={isPending ? "bg-warning-500/5 font-medium" : ""}>
                  <Td>
                    <div className="font-semibold text-text-primary">{b.name}</div>
                    <div className="text-[11px] text-text-secondary font-mono">
                      ID: {b.id.slice(0, 8)}...
                      {isCreator && (
                        <span className="ml-1 text-primary-600 dark:text-primary-400 font-sans font-medium">
                          (Created by you)
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs font-bold">{b.row_count}</span>
                    <span className="text-xs text-text-secondary ml-1">recipients</span>
                  </Td>
                  <Td>
                    <Badge tone={cfg.tone}>{cfg.label}</Badge>
                  </Td>
                  <Td>
                    {b.status === "anchored" ? (
                      <div className="text-xs font-mono space-y-0.5">
                        <div className="text-success-600 dark:text-success-400 font-medium">
                          Block #{b.anchor_block ?? "N/A"}
                        </div>
                        <div className="truncate max-w-[140px] text-text-secondary text-[11px]" title={b.anchor_tx_hash || ""}>
                          Tx: {b.anchor_tx_hash ? `${b.anchor_tx_hash.slice(0, 10)}...` : "—"}
                        </div>
                      </div>
                    ) : isPending ? (
                      <span className="text-xs text-warning-700 dark:text-warning-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Awaiting Approver Signature
                      </span>
                    ) : (
                      <span className="text-xs text-text-secondary">Not anchored</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link to={`/issuer/batches/${b.id}`}>
                      {isPending && canApprove && !isCreator ? (
                        <Button size="sm" variant="primary" className="text-xs font-semibold gap-1">
                          Review & Approve <ArrowRight className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs">
                          View Details
                        </Button>
                      )}
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
