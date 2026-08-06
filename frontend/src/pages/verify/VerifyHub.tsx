/**
 * Verify hub /verify — ID lookup + paste-a-payload verification (the
 * file-verification path re-hashes presented content server-side; any
 * alteration yields TAMPERED — spec §4.8/§5.6).
 */
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { aiApi, verifyApi } from "@/services/api";
import { ApiError } from "@/services/http";
import type { VerdictResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { VerdictBody } from "./VerdictPage";

const UID_PATTERN = /^TC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i;

export default function VerifyHub() {
  const navigate = useNavigate();
  const toast = useToast();
  const [uid, setUid] = useState("");
  const [fileUid, setFileUid] = useState("");
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<VerdictResponse>();
  const [advisory, setAdvisory] = useState<{ suspicious: boolean; reasons: string[] } | null>(null);

  const fileVerify = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      // Advisory AI pre-screen — fired in parallel, never awaited before or
      // gating the real check below. Any failure (AI not configured, the
      // visitor isn't signed in, network) is swallowed silently: this is
      // optional color on top of the verdict, never a precondition for it.
      setAdvisory(null);
      void aiApi.detectSuspicious(parsed)
        .then((res) => setAdvisory({ suspicious: res.suspicious, reasons: res.reasons }))
        .catch(() => undefined);
      return verifyApi.byFile(fileUid.trim().toUpperCase(), parsed);
    },
    onSuccess: setResult,
    onError: (err) => {
      if (err instanceof SyntaxError) toast("warning", "That isn't valid JSON — paste the certificate data exactly.");
      else if (err instanceof ApiError) toast("danger", err.problem.detail);
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Verify a certificate</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Free, instant, and no account needed — scan the QR on a certificate, or use the tools below.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Look up by certificate ID</CardTitle>
            <CardDescription>IDs look like TC-XXXX-XXXX-XXXX and appear under the QR code.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                const clean = uid.trim().toUpperCase();
                if (!UID_PATTERN.test(clean)) {
                  toast("warning", "That doesn't look like a certificate ID — check for typos.");
                  return;
                }
                navigate(`/v/${clean}`);
              }}
            >
              <div className="flex-1">
                <TextField label="Certificate ID" placeholder="TC-1A2B-3C4D-5E6F"
                  value={uid} onChange={(e) => setUid(e.target.value)} className="font-mono" required />
              </div>
              <Button type="submit">Verify</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verify a document you received</CardTitle>
            <CardDescription>
              Paste the certificate's data (JSON). We re-compute its fingerprint against the sealed
              record — any alteration is detected instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => { e.preventDefault(); fileVerify.mutate(); }}
            >
              <TextField label="Certificate ID" value={fileUid} className="font-mono"
                onChange={(e) => setFileUid(e.target.value)} placeholder="TC-1A2B-3C4D-5E6F" required />
              <TextAreaField label="Certificate data (JSON)" value={payload}
                onChange={(e) => setPayload(e.target.value)} className="font-mono text-xs"
                placeholder='{"holder_name": "…", "program": "…"}' required />
              <Button type="submit" loading={fileVerify.isPending} className="self-start">
                Check against sealed record
              </Button>
            </form>
          </CardContent>
        </Card>

        {advisory?.suspicious && (
          <div className="rounded-lg border border-warning-400/40 bg-warning-100/60 p-3 text-sm dark:bg-warning-700/10">
            <p className="flex items-center gap-1.5 font-medium text-warning-700 dark:text-warning-400">
              <Sparkles className="h-4 w-4" aria-hidden /> AI advisory — patterns worth a second look
            </p>
            {advisory.reasons.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5 text-xs text-text-secondary">
                {advisory.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            <p className="mt-1.5 text-[11px] text-text-secondary">
              This is a heuristic AI pre-screen, not a verdict — it never blocks or replaces the
              real result below, which is the authoritative check.
            </p>
          </div>
        )}
        {result && <VerdictBody data={result} />}
      </div>
    </div>
  );
}
