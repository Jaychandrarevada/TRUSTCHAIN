/**
 * Employer portal (spec §5.6/§8.3): single verify (mega-input) + bulk
 * verification with exceptions-first results and a verdict summary strip.
 */
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { employerApi } from "@/services/api";
import { ApiError } from "@/services/http";
import type { Verdict } from "@/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Badge, Table, Td, Th } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { VerdictBadge } from "@/components/domain/verdict";

const OK_VERDICTS = new Set(["VALID"]);

export default function EmployerVerify() {
  const navigate = useNavigate();
  const toast = useToast();
  const [single, setSingle] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [results, setResults] = useState<{ cert_uid: string; verdict: string }[]>();
  const [summary, setSummary] = useState<Record<string, number>>();

  const bulk = useMutation({
    mutationFn: () => {
      const uids = bulkInput.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
      return employerApi.bulkVerify(uids);
    },
    onSuccess: (res) => {
      // Exceptions-first ordering (spec §5.6): problems on top.
      const sorted = [...res.results].sort(
        (a, b) => Number(OK_VERDICTS.has(a.verdict)) - Number(OK_VERDICTS.has(b.verdict)));
      setResults(sorted);
      setSummary(res.summary);
    },
    onError: (err) => err instanceof ApiError && toast("warning", err.problem.detail),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card glass hover>
        <CardHeader>
          <CardTitle className="text-base">Verify a candidate</CardTitle>
          <CardDescription>Paste a certificate ID from a resume or scan the printed QR with your phone.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => { e.preventDefault(); navigate(`/v/${single.trim().toUpperCase()}`); }}>
            <div className="flex-1">
              <TextField label="Certificate ID" className="font-mono" placeholder="TC-1A2B-3C4D-5E6F"
                value={single} onChange={(e) => setSingle(e.target.value)} required />
            </div>
            <Button type="submit">Verify</Button>
          </form>
        </CardContent>
      </Card>

      <Card glass hover>
        <CardHeader>
          <CardTitle className="text-base">Bulk verify</CardTitle>
          <CardDescription>Paste up to 1,000 certificate IDs (one per line or comma-separated).</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3"
            onSubmit={(e) => { e.preventDefault(); bulk.mutate(); }}>
            <TextAreaField label="Certificate IDs" className="min-h-32 font-mono text-xs"
              value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} required />
            <Button type="submit" loading={bulk.isPending} className="self-start">Run bulk verification</Button>
          </form>
        </CardContent>
      </Card>

      {summary && results && (
        <Card glass hover>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(summary).map(([verdict, count]) => (
                <Badge key={verdict}
                  tone={verdict === "VALID" ? "success" : verdict === "NOT_FOUND" ? "neutral" : "danger"}>
                  {verdict}: {count}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <thead><tr><Th>Certificate</Th><Th>Verdict</Th><Th><span className="sr-only">Open</span></Th></tr></thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.cert_uid}>
                    <Td className="font-mono text-xs">{row.cert_uid}</Td>
                    <Td>
                      {row.verdict === "NOT_FOUND"
                        ? <Badge>Not found</Badge>
                        : <VerdictBadge verdict={row.verdict as Verdict} />}
                    </Td>
                    <Td className="text-right">
                      {row.verdict !== "NOT_FOUND" && (
                        <a href={`/v/${row.cert_uid}`} target="_blank" rel="noreferrer"
                          className="text-sm font-medium text-primary-800 hover:underline dark:text-primary-400">
                          Full verdict ↗
                        </a>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
