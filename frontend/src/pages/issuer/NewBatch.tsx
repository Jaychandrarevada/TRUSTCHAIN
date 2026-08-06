/**
 * New batch — CSV-paste issuance with dry-run validation (spec §5.3, UC-02).
 * Errors render errors-first with row numbers; a clean batch proceeds to
 * submit-for-approval (maker-checker notice shown).
 */
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { issuerApi } from "@/services/api";
import { ApiError } from "@/services/http";
import type { Batch } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Table, Td, Th } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

function askAiForHelp() {
  window.dispatchEvent(new CustomEvent("tc:ai-open", {
    detail: { seed: "I'm creating a new certificate batch for my institution — what should I know about the issuance and approval process?" },
  }));
}

/** Tiny CSV parser: header row + comma-separated values (quoted commas unsupported —
 *  the production path uses file upload with a real parser; this covers the demo flow). */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

const TEMPLATE = "holder_name,holder_email,program\nAsha Kumar,asha@example.com,B.Tech CSE";

export default function NewBatch() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [csv, setCsv] = useState("");
  const [batch, setBatch] = useState<Batch>();

  const create = useMutation({
    mutationFn: () => issuerApi.createBatch(name, parseCsv(csv)),
    onSuccess: (created) => {
      setBatch(created);
      if (created.status === "validated") toast("success", `${created.row_count} rows validated — ready to submit.`);
    },
    onError: (err) => err instanceof ApiError && toast("warning", err.problem.detail),
  });

  const submit = useMutation({
    mutationFn: () => issuerApi.submitBatch(batch!.id),
    onSuccess: (submitted) => {
      toast("success", "Submitted for approval — an approver (not you) must release it.");
      navigate(`/issuer/batches/${submitted.id}`);
    },
    onError: (err) => err instanceof ApiError && toast("warning", err.problem.detail),
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>New certificate batch</CardTitle>
              <CardDescription>
                Paste CSV with headers <code className="font-mono text-xs">holder_name, holder_email, program</code>.
                Rows are validated before anything is issued — nothing reaches the blockchain without approval.
              </CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={askAiForHelp}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Ask AI for help
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <TextField label="Batch name" placeholder="Convocation 2026"
              value={name} onChange={(e) => setName(e.target.value)} required />
            <TextAreaField label="Recipients (CSV)" className="min-h-48 font-mono text-xs"
              placeholder={TEMPLATE} value={csv} onChange={(e) => setCsv(e.target.value)} required />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={create.isPending}>Run validation</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCsv(TEMPLATE)}>
                Insert template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {batch && batch.error_report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-danger-700 dark:text-danger-400">
              {batch.error_report.errors.length} rows need fixing
            </CardTitle>
            <CardDescription>Fix the rows below and run validation again — no certificates were issued.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <thead><tr><Th>Row</Th><Th>Field</Th><Th>Problem</Th></tr></thead>
              <tbody>
                {batch.error_report.errors.map((e, i) => (
                  <tr key={i}>
                    <Td className="font-mono">{e.row + 2 /* header + 1-indexing for humans */}</Td>
                    <Td className="font-mono">{e.field}</Td>
                    <Td>{e.message}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {batch && batch.status === "validated" && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm">
              <span className="font-semibold">{batch.row_count} rows validated.</span>{" "}
              Submitting sends the batch to an approver — the maker can never self-approve.
            </p>
            <Button loading={submit.isPending} onClick={() => submit.mutate()}>Submit for approval</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
