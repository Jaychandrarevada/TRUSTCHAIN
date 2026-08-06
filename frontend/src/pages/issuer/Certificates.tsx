/**
 * Issuer certificate list (spec §4.5): status filter + paged table
 * (card-transform on mobile via the responsive Table wrapper).
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { issuerApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { Badge, EmptyState, Skeleton, Table, Td, Th } from "@/components/ui/misc";
import { statusToVerdict } from "@/components/domain/certificate";
import { VerdictBadge } from "@/components/domain/verdict";

const PAGE_SIZE = 25;
const STATUSES = ["", "issued", "claimed", "revoked", "superseded"] as const;

export default function Certificates() {
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["issuer", "certificates", status, offset],
    queryFn: () => issuerApi.listCertificates({ status: status || undefined, limit: PAGE_SIZE, offset }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Certificates</h2>
        <div className="w-40">
          <SelectField label="Status" value={status}
            onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || "All"}</option>)}
          </SelectField>
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {data && data.data.length === 0 && (
        <EmptyState title="No certificates match"
          hint="Issue your first batch and certificates will appear here." />
      )}
      {data && data.data.length > 0 && (
        <>
          <Table>
            <thead>
              <tr><Th>Certificate ID</Th><Th>Type</Th><Th>Status</Th><Th>Claimed</Th><Th><span className="sr-only">Open</span></Th></tr>
            </thead>
            <tbody>
              {data.data.map((cert) => (
                <tr key={cert.cert_uid}>
                  <Td className="font-mono text-xs">{cert.cert_uid}</Td>
                  <Td>{cert.type}</Td>
                  <Td><VerdictBadge verdict={statusToVerdict(cert.status)} /></Td>
                  <Td>{cert.claimed ? <Badge tone="success">Claimed</Badge> : <Badge>Unclaimed</Badge>}</Td>
                  <Td className="text-right">
                    <Link to={`/issuer/certificates/${cert.cert_uid}`}
                      className="text-sm font-medium text-primary-800 hover:underline dark:text-primary-400">Open</Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Newer</Button>
            <Button variant="secondary" size="sm" disabled={data.data.length < PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}>Older</Button>
          </div>
        </>
      )}
    </div>
  );
}
