/**
 * Shared-verdict page /share/:token — verdict via a holder share link:
 * disclosed fields only; PIN prompt when protected; expired links get a
 * clear "ask for a fresh link" state (spec §5.1 E-4, §14).
 */
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyApi } from "@/services/api";
import { ApiError } from "@/services/http";
import type { VerdictResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { VerdictBody } from "./VerdictPage";

export default function SharePage() {
  const { token = "" } = useParams();
  const [pin, setPin] = useState("");
  const [needsPin, setNeedsPin] = useState(false);
  const [data, setData] = useState<VerdictResponse>();
  const [terminalError, setTerminalError] = useState<ApiError>();

  const { mutate: load, isPending } = useMutation({
    mutationFn: (sharePin?: string) => verifyApi.byShare(token, sharePin),
    onSuccess: setData,
    onError: (err) => {
      if (err instanceof ApiError && err.problem.status === 403) {
        setNeedsPin(true); // PIN-protected link → prompt, not error
      } else if (err instanceof ApiError) {
        setTerminalError(err);
      }
    },
  });

  useEffect(() => { load(undefined); }, [load]);

  if (terminalError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ErrorState
          title="This share link has expired"
          detail="Ask the certificate holder for a fresh link."
          traceId={terminalError.problem.traceId}
        />
      </div>
    );
  }

  if (needsPin && !data) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); load(pin); }}
        >
          <h1 className="text-xl font-semibold">This link is PIN-protected</h1>
          <p className="text-sm text-text-secondary">
            The certificate holder set a PIN for this share. Enter it to view the verdict.
          </p>
          <TextField label="PIN" value={pin} onChange={(e) => setPin(e.target.value)}
            inputMode="numeric" autoComplete="off" required />
          <Button type="submit" loading={isPending}>Unlock</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {isPending && !data && <Skeleton className="h-96 w-full" />}
      {data && <VerdictBody data={data} />}
    </div>
  );
}
