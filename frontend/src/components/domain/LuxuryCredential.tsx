/**
 * LuxuryCredential — the certificate itself, presented as a credential object
 * rather than a scanned PDF. Shared by the holder's wallet view (full detail
 * + share builder) and the public verdict page (read-only, no login).
 *
 * Honesty constraint (same rule as every other ceremony in this app): the
 * "digital signature" and both seals only ever render real values —
 * the Merkle root, transaction hash, and anchor status returned by the
 * actual verification response. There is no PKI signature in this
 * architecture to fabricate, so the digital-signature panel is labeled and
 * explained for what it actually is: the certificate's on-chain cryptographic
 * seal (BR-01..09 in the SRS), not an invented signature blob.
 *
 * Printing: `.print-credential` + the print rules in globals.css isolate this
 * card on the page and strip the glass blur (which doesn't render well on
 * paper) in favor of solid, high-contrast surfaces — "Export PDF" is the
 * browser's native print-to-PDF, not a new client-side rendering dependency.
 */
import { type ReactNode } from "react";
import { Blocks, Copy, Printer } from "lucide-react";
import type { Verdict } from "@/constants";
import type { VerdictResponse } from "@/types";
import { cn, humanizeKey, truncateHash } from "@/utils";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { VerdictBadge } from "@/components/domain/verdict";
import { QRDisplay } from "@/components/domain/certificate";
import { AiExplainButton } from "@/components/domain/AiExplain";
import { aiApi } from "@/services/api";

function InstitutionSeal({ name, status }: { name: string | null; status?: string | null }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        aria-hidden
        className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-primary-400 to-primary-600
          text-[#070707] shadow-glow ring-2 ring-primary-300/40"
      >
        <span className="font-display text-xl font-extrabold">{initial}</span>
      </div>
      <span className="sr-only">Institution seal for {name ?? "unknown issuer"}</span>
      <p className="max-w-[9rem] truncate text-center text-[11px] font-medium text-text-secondary">
        {name ?? "Unknown issuer"}
      </p>
      {status && (
        <p className="text-[10px] uppercase tracking-wide text-text-secondary/80">{status}</p>
      )}
    </div>
  );
}

function BlockchainSeal({ anchored }: { anchored: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        aria-hidden
        className={cn(
          "grid h-14 w-14 place-items-center rounded-2xl ring-2 [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]",
          anchored
            ? "bg-gradient-to-b from-primary-400 to-primary-600 text-[#070707] shadow-glow ring-primary-300/40"
            : "bg-surface text-text-secondary ring-border-default",
        )}
      >
        <Blocks className="h-6 w-6" />
      </div>
      <span className="sr-only">{anchored ? "Sealed on the blockchain" : "Blockchain seal pending"}</span>
      <p className="text-[11px] font-medium text-text-secondary">
        {anchored ? "Blockchain sealed" : "Pending"}
      </p>
    </div>
  );
}

export function LuxuryCredential({
  certUid, program, holderName, fields, verdict, issuerName, issuerStatus, checks,
  qrValue, verifyUrl, actions,
}: {
  certUid: string;
  program: string;
  holderName?: string | null;
  fields: Record<string, unknown>;
  verdict: Verdict;
  issuerName: string | null;
  issuerStatus?: string | null;
  checks: VerdictResponse["checks"];
  qrValue: string;
  verifyUrl: string;
  /** Holder-only actions (e.g. Share) — omitted entirely on the public verdict page. */
  actions?: ReactNode;
}) {
  const toast = useToast();
  const anchor = checks.anchor ?? { pass: false };
  const anchored = anchor.pass === true;
  const root: string | undefined = "root" in anchor && anchor.root != null ? String(anchor.root) : undefined;
  const txHash: string | undefined = "tx_hash" in anchor && anchor.tx_hash != null ? String(anchor.tx_hash) : undefined;

  const copyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    toast("success", "Verification link copied.");
  };

  return (
    <div className="print-credential relative isolate">
      <Card glass glow className="relative overflow-hidden p-0">
        {/* Micro reflections — a slow diagonal gloss sweep, decorative only */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r
            from-transparent via-white/[0.06] to-transparent
            animate-sheen motion-reduce:hidden print:hidden"
        />

        <div className="relative flex flex-col gap-7 p-6 sm:p-10">
          {/* Header — dual seals + live verdict */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <InstitutionSeal name={issuerName} status={issuerStatus} />
            <div className="flex flex-col items-center gap-2 sm:items-end">
              <VerdictBadge verdict={verdict} />
              <BlockchainSeal anchored={anchored} />
            </div>
          </div>

          {/* Embossed title */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-secondary">
              Certificate of
            </p>
            <h1 className="emboss mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {program}
            </h1>
            {holderName && <p className="emboss mt-1.5 text-lg text-text-primary">{holderName}</p>}
            <p className="mt-2 font-mono text-xs text-text-secondary">{certUid}</p>
          </div>

          {/* Credential metadata */}
          {Object.keys(fields).length > 0 && (
            <dl className="grid gap-4 border-t border-border-default/50 pt-6 sm:grid-cols-2">
              {Object.entries(fields).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">{humanizeKey(key)}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* QR + digital signature */}
          <div className="grid gap-6 border-t border-border-default/50 pt-6 sm:grid-cols-2">
            <div className="flex flex-col items-center gap-2 print:hidden">
              <QRDisplay value={qrValue} label={`verification page for ${certUid}`} />
              <p className="text-center text-xs text-text-secondary">
                Scan to see the live public verdict.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Digital signature</p>
              <p className="text-xs text-text-secondary">
                This credential's cryptographic seal — not a scanned signature, a mathematical one —
                is permanently recorded on-chain. Anyone can independently re-verify it.
              </p>
              {root ? (
                <div className="flex flex-col gap-2 text-xs">
                  <span>Root: <CopyField value={root} label="Merkle root" /></span>
                  {txHash && <span>Tx: <CopyField value={txHash} label="transaction hash" /></span>}
                  <AiExplainButton
                    label="Explain this transaction"
                    fetcher={async () => (await aiApi.explainTransaction(certUid)).explanation}
                  />
                </div>
              ) : (
                <p className="font-mono text-xs text-text-secondary">Not yet sealed on-chain</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default/50 pt-6 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4" aria-hidden /> Copy verification link
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden /> Print / Export PDF
              </Button>
            </div>
            {actions}
          </div>

          {/* Print-only footer: the QR is hidden in print (a physical page can't be scanned
              the same way) — swap in the plain URL + Merkle root so the printed page still
              carries real, independently-checkable proof. */}
          <div className="hidden print:block print:border-t print:border-black print:pt-4 print:text-xs">
            <p>Verify at: {verifyUrl}</p>
            {root && <p className="font-mono">Merkle root: {truncateHash(root, 10)}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
