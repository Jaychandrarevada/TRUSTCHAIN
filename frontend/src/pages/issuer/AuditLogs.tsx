/**
 * Audit log viewer (spec §4.15) — append-only trail with action filter;
 * every row carries its trace id for support correlation.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { issuerApi } from "@/services/api";
import { formatDate } from "@/utils";
import { EmptyState, Skeleton, Table, Td, Th } from "@/components/ui/misc";
import { TextField } from "@/components/ui/field";

export default function AuditLogs() {
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["issuer", "audit", filter],
    queryFn: () => issuerApi.auditLogs(filter || undefined),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Audit log</h2>
          <p className="text-sm text-text-secondary">
            Every privileged action, append-only — entries can never be edited or deleted.
          </p>
        </div>
        <div className="w-56">
          <TextField label="Filter by action" placeholder="batch / certificate…"
            value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {data && data.data.length === 0 && <EmptyState title="No audit entries match" />}
      {data && data.data.length > 0 && (
        <Table>
          <thead><tr><Th>When</Th><Th>Action</Th><Th>Resource</Th><Th>Trace</Th></tr></thead>
          <tbody>
            {data.data.map((row, i) => (
              <tr key={i}>
                <Td className="whitespace-nowrap text-xs">{formatDate(row.at)}</Td>
                <Td className="font-mono text-xs">{row.action}</Td>
                <Td className="font-mono text-xs">{row.resource}</Td>
                <Td className="font-mono text-xs text-text-secondary">{row.trace_id?.slice(0, 8) ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
