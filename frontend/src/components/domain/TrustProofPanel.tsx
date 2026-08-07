/**
 * TrustProofPanel — the full "why is this trusted?" record for a verdict.
 *
 * Every value comes from the real verification response or the real chain-info
 * endpoint. Where the payload does not carry something, the panel says so
 * rather than filling the gap: the verdict does not include the Merkle
 * sibling-hash array, so the Merkle section reports the proof *result* and the
 * scheme used, and states plainly that the sibling hashes are not part of this
 * response.
 *
 * The verification timestamp is the moment THIS check ran, in the reader's own
 * clock — it is labelled that way and never presented as an on-chain time,
 * which is a different thing entirely.
 *
 * Cryptographic details mirror backend/app/blockchain/merkle.py exactly:
 *   contentHash = sha256(canonical JSON)
 *   leaf        = keccak256(0x00 ‖ salt ‖ contentHash)
 *   node        = keccak256(0x01 ‖ min(a,b) ‖ max(a,b))
 * The 0x00/0x01 domain prefixes and the sorted pair are what stop an internal
 * node being replayed as a leaf — worth stating, because it is the actual
 * reason the proof is sound.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Building2, CalendarClock, Check, ChevronsDownUp, ChevronsUpDown, Copy, Download,
  FileText, Fingerprint, Globe2, Hash, HelpCircle, ListChecks, Receipt, ShieldCheck,
} from "lucide-react";
import type { VerdictResponse } from "@/types";
import { VERDICTS } from "@/constants";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/misc";
import { cn } from "@/utils";

// ── Term tooltip ────────────────────────────────────────────────────────────

/**
 * Term — an inline glossary hint. Hover or keyboard-focus reveals it; Escape
 * dismisses. The explanation is wired through aria-describedby so screen
 * readers get it as the field's description rather than as stray text.
 */
export function Term({ label, explain }: { label: string; explain: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      <span aria-describedby={open ? id : undefined}>{label}</span>
      <button
        type="button"
        aria-label={`What does "${label}" mean?`}
        aria-expanded={open}
        className="rounded-full text-text-secondary/70 transition-colors hover:text-primary-800 focus-visible:outline-2 dark:hover:text-primary-400"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <HelpCircle className="h-3 w-3" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="glass-strong absolute bottom-full left-0 z-30 mb-1.5 w-64 rounded-lg p-2.5 text-xs font-normal leading-relaxed text-text-primary shadow-lg"
        >
          {explain}
        </span>
      )}
    </span>
  );
}

// ── Section + row ───────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, open, onToggle, children,
}: {
  icon: typeof ShieldCheck; title: string; open: boolean;
  onToggle: () => void; children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-default/60 bg-surface/40">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-surface/60"
        >
          <Icon className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />
          <span className="flex-1">{title}</span>
          <ChevronsUpDown className={cn("h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform duration-standard",
            open && "rotate-180")} aria-hidden />
        </button>
      </h3>
      {open && (
        <dl className="flex flex-col gap-2 border-t border-border-default/50 px-3 py-2.5 text-xs">
          {children}
        </dl>
      )}
    </div>
  );
}

function Row({ label, explain, children }: {
  label: string; explain?: string; children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-text-secondary">
        {explain ? <Term label={label} explain={explain} /> : label}
      </dt>
      <dd className="min-w-0 break-words text-right font-medium">{children}</dd>
    </div>
  );
}

/** Reads a field off a check result without asserting its shape. */
function f(check: unknown, key: string): string | number | null {
  if (!check || typeof check !== "object" || !(key in check)) return null;
  const v = (check as Record<string, unknown>)[key];
  return typeof v === "string" || typeof v === "number" ? v : null;
}

const PassMark = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => (
  <span className={ok ? "text-success-700 dark:text-success-400" : "text-danger-700 dark:text-danger-400"}>
    {ok ? yes : no}
  </span>
);

// ── Panel ───────────────────────────────────────────────────────────────────

const SECTION_IDS = [
  "identity", "issuer", "anchor", "merkle", "revocation",
  "timestamp", "method", "crypto", "network", "transaction",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

export function TrustProofPanel({
  data, chain, verifiedAt, className,
}: {
  data: VerdictResponse;
  /** Real chain info; omitted when the endpoint has not resolved. */
  chain?: { mode: string; chain_id: number; contracts: Record<string, string> } | null;
  /** When this verification ran. Defaults to mount time. */
  verifiedAt?: Date;
  className?: string;
}) {
  // Identity and issuer open by default: the two things a reader wants first.
  const [open, setOpen] = useState<Set<SectionId>>(new Set(["identity", "issuer"]));
  const [copied, setCopied] = useState(false);
  const stamp = useMemo(() => verifiedAt ?? new Date(), [verifiedAt]);

  const anchor = data.checks.anchor;
  const network = chain
    ? (chain.chain_id === 80002 ? "Polygon Amoy"
      : chain.chain_id === 137 ? "Polygon"
        : chain.chain_id === 31337 ? "Local Hardhat"
          : `chainId ${chain.chain_id}`)
    : null;
  const sandbox = chain?.mode === "mock";

  const toggle = (id: SectionId) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /** The downloadable/copyable record — real values only. */
  const proofRecord = useMemo(() => ({
    certificate_id: data.certificate.cert_uid,
    verdict: data.verdict,
    verified_at: stamp.toISOString(),
    verified_by: "TrustChain public verification",
    issuer: {
      name: data.certificate.issuer.name,
      status: data.certificate.issuer.status,
      recognised: data.checks.issuer?.pass ?? null,
    },
    checks: data.checks,
    network: chain ? { chain_id: chain.chain_id, mode: chain.mode, label: network } : null,
    disclosed_fields: data.certificate.disclosed_fields,
    note: "Merkle sibling hashes are not included in the public verdict response.",
  }), [data, stamp, chain, network]);

  const copyAll = async () => {
    await navigator.clipboard.writeText(JSON.stringify(proofRecord, null, 2)).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(proofRecord, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trustchain-proof-${data.certificate.cert_uid}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allOpen = open.size === SECTION_IDS.length;

  return (
    <section className={cn("rounded-xl border border-border-default bg-surface p-4", className)}
      aria-label="Trust proof">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold">Trust proof</h2>
          <p className="text-xs text-text-secondary">
            Every value below came from this verification — nothing is inferred.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm"
            onClick={() => setOpen(allOpen ? new Set() : new Set(SECTION_IDS))}>
            {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden />
              : <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />}
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
          <Button variant="ghost" size="sm" onClick={copyAll}>
            {copied ? <Check className="h-3.5 w-3.5 text-success-700 dark:text-success-400" aria-hidden />
              : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="secondary" size="sm" onClick={download}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Download
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Section icon={FileText} title="Certificate identity"
          open={open.has("identity")} onToggle={() => toggle("identity")}>
          <Row label="Certificate ID"
            explain="The public reference for this certificate. It identifies the record but reveals nothing private on its own.">
            <span className="font-mono">{data.certificate.cert_uid}</span>
          </Row>
          <Row label="Verdict">{VERDICTS[data.verdict].label}</Row>
          {Object.entries(data.certificate.disclosed_fields ?? {}).map(([k, v]) => (
            <Row key={k} label={k.replace(/_/g, " ")}>{String(v)}</Row>
          ))}
          {data.certificate.superseded_by && (
            <Row label="Superseded by"
              explain="A corrected certificate replaced this one. The original is kept and publicly linked rather than edited or deleted.">
              <span className="font-mono">{data.certificate.superseded_by}</span>
            </Row>
          )}
        </Section>

        <Section icon={Building2} title="Issuer"
          open={open.has("issuer")} onToggle={() => toggle("issuer")}>
          <Row label="Institution">{data.certificate.issuer.name ?? "Not recognised"}</Row>
          <Row label="Registry status"
            explain="Whether this institution is currently an approved issuer in the on-chain registry. Approval follows an accreditation review by the platform.">
            {data.certificate.issuer.status ?? "unknown"}
          </Row>
          <Row label="Recognised issuer">
            <PassMark ok={!!data.checks.issuer?.pass} yes="Yes" no="No" />
          </Row>
        </Section>

        <Section icon={ShieldCheck} title="Blockchain anchor"
          open={open.has("anchor")} onToggle={() => toggle("anchor")}>
          <Row label="Anchored"
            explain="The certificate's batch fingerprint was written to the blockchain. Once written it cannot be altered or removed by anyone, including the issuer.">
            <PassMark ok={!!anchor?.pass} yes="Confirmed on-chain" no="Not anchored" />
          </Row>
          {f(anchor, "root") && (
            <Row label="Merkle root"
              explain="One fingerprint representing an entire batch of certificates. This single value is what gets stored on the blockchain.">
              <CopyField value={String(f(anchor, "root"))} label="Merkle root" />
            </Row>
          )}
          {f(anchor, "block") != null && (
            <Row label="Block"
              explain="The numbered batch of blockchain transactions this anchor was recorded in. Later blocks build on it, which is what makes rewriting history impractical.">
              <span className="font-mono">{f(anchor, "block")}</span>
            </Row>
          )}
        </Section>

        <Section icon={Hash} title="Merkle proof"
          open={open.has("merkle")} onToggle={() => toggle("merkle")}>
          <Row label="Proof result"
            explain="A Merkle proof lets you confirm one certificate belongs to an anchored batch using only a handful of hashes, instead of publishing every certificate.">
            <PassMark ok={!!data.checks.merkle_proof?.pass}
              yes="Leaf reconciles to the anchored root" no="Did not reconcile" />
          </Row>
          <Row label="Leaf construction"
            explain="Each certificate becomes a leaf: keccak256 over a 0x00 prefix, a per-certificate random salt, and the content hash. The salt keeps the leaf from being guessed from public data.">
            <span className="font-mono text-[11px]">keccak256(0x00 ‖ salt ‖ contentHash)</span>
          </Row>
          <Row label="Sibling hashes">
            <span className="text-text-secondary">Not included in the public response</span>
          </Row>
        </Section>

        <Section icon={ListChecks} title="Revocation status"
          open={open.has("revocation")} onToggle={() => toggle("revocation")}>
          <Row label="Current status"
            explain="Institutions can revoke a certificate after issuing it. Revocation needs two different approvers and is recorded on-chain, so it cannot be quietly undone.">
            <span className="font-mono">{String(f(data.checks.revocation, "status") ?? "unknown")}</span>
          </Row>
          <Row label="Usable">
            <PassMark ok={!!data.checks.revocation?.pass} yes="Not revoked" no="Revoked or suspended" />
          </Row>
          <Row label="Expiry"
            explain="Some credentials are issued with an end date, such as a licence that must be renewed.">
            {f(data.checks.expiry, "expires_at")
              ? new Date(String(f(data.checks.expiry, "expires_at"))).toLocaleDateString()
              : "No expiry set"}
          </Row>
        </Section>

        <Section icon={CalendarClock} title="Verification timestamp"
          open={open.has("timestamp")} onToggle={() => toggle("timestamp")}>
          <Row label="Checked at"
            explain="When this verification ran, using your device's clock. This is not the time the certificate was issued or anchored.">
            {stamp.toLocaleString()}
          </Row>
          <Row label="Freshness"
            explain="Revocation and issuer status are read live on every check, so a verdict is never served from a stale cache.">
            Checked live, not cached
          </Row>
        </Section>

        <Section icon={Fingerprint} title="Verification method"
          open={open.has("method")} onToggle={() => toggle("method")}>
          <Row label="Mode">
            {String(f(data.checks.integrity, "note") ?? "presented-content verification")}
          </Row>
          <Row label="Account required"
            explain="Public verification is open by design. Requiring a login would let the platform decide who may check a credential.">
            None
          </Row>
          <Row label="Independent re-check"
            explain="The anchored root is public on the blockchain, so anyone can repeat this check without trusting this website.">
            Possible from the chain record
          </Row>
        </Section>

        <Section icon={Hash} title="Cryptographic summary"
          open={open.has("crypto")} onToggle={() => toggle("crypto")}>
          <Row label="Content hash"
            explain="The certificate's fields are serialised deterministically (sorted keys, no incidental whitespace) and hashed with SHA-256, so the same data always produces the same fingerprint.">
            <span className="font-mono text-[11px]">sha256(canonical JSON)</span>
          </Row>
          <Row label="Tree node"
            explain="Parent nodes hash their two children under a 0x01 prefix with the pair sorted. The differing prefixes stop an internal node being replayed as a leaf — the classic forged-proof attack.">
            <span className="font-mono text-[11px]">keccak256(0x01 ‖ min ‖ max)</span>
          </Row>
          <Row label="Integrity"
            explain="Whether the certificate's content still matches the fingerprint that was sealed. Any change to any field breaks this.">
            <PassMark ok={!!data.checks.integrity?.pass} yes="Content matches the seal" no="Content altered" />
          </Row>
          <Row label="Personal data on-chain"
            explain="Only fingerprints are written to the blockchain. Names and other details stay off-chain, because a public chain is permanent and could never be corrected or erased.">
            None
          </Row>
        </Section>

        <Section icon={Globe2} title="Network information"
          open={open.has("network")} onToggle={() => toggle("network")}>
          {network ? (
            <>
              <Row label="Network">
                {network}{sandbox && <span className="ml-1.5 rounded-full border border-border-default/60 px-1.5 py-0.5 text-[10px] font-normal text-text-secondary">sandbox</span>}
              </Row>
              <Row label="Chain ID"
                explain="The number that identifies a specific blockchain network, so a record from a test network is never mistaken for a production one.">
                <span className="font-mono">{chain!.chain_id}</span>
              </Row>
              {Object.entries(chain!.contracts).map(([name, addr]) => (
                <Row key={name} label={name.replace(/_/g, " ")}>
                  {addr ? <CopyField value={addr} label={name} />
                    : <span className="text-text-secondary">not configured</span>}
                </Row>
              ))}
            </>
          ) : (
            <Row label="Network">
              <span className="text-text-secondary">Not available</span>
            </Row>
          )}
        </Section>

        <Section icon={Receipt} title="Transaction details"
          open={open.has("transaction")} onToggle={() => toggle("transaction")}>
          {f(anchor, "tx_hash") ? (
            <>
              <Row label="Transaction hash"
                explain="The unique reference for the blockchain transaction that recorded this batch. Anyone can look it up independently.">
                <CopyField value={String(f(anchor, "tx_hash"))} label="transaction hash" />
              </Row>
              <Row label="Confirmation">
                {f(anchor, "block") != null
                  ? <span className="font-mono">included in block {f(anchor, "block")}</span>
                  : "accepted"}
              </Row>
            </>
          ) : (
            <Row label="Transaction">
              <span className="text-text-secondary">No anchoring transaction on this record</span>
            </Row>
          )}
        </Section>
      </div>
    </section>
  );
}
