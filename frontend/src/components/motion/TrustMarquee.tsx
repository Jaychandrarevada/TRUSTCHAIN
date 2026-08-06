/**
 * TrustMarquee — an infinite, edge-faded row of trust signals.
 *
 * Enterprise SaaS convention: a "trusted by / built on" band that conveys
 * scale and credibility. Reduced-motion-safe — when the user prefers reduced
 * motion the row renders static (no scroll). Pauses on hover so any chip can
 * be read. Pure presentation; no data dependencies.
 */
import { useReducedMotion } from "framer-motion";
import { cn } from "@/utils";

const DEFAULT_ITEMS = [
  "W3C Verifiable Credentials",
  "Polygon PoS",
  "Decentralized Identifiers (DID)",
  "Zero PII on-chain",
  "Open-source verifier",
  "Merkle-anchored proofs",
  "Bitstring Status List",
  "EIP-191 wallet auth",
  "GDPR / DPDP erasure",
  "Tamper-evident by design",
];

function Chip({ label }: { label: string }) {
  return (
    <span className="mx-2 inline-flex shrink-0 items-center gap-2 rounded-full border border-border-default/60 bg-surface/50 px-4 py-1.5 text-sm text-text-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary-500" aria-hidden />
      {label}
    </span>
  );
}

export function TrustMarquee({
  items = DEFAULT_ITEMS,
  className,
}: {
  items?: string[];
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    // Static, wrapped — respects prefers-reduced-motion (WCAG 2.3.3).
    return (
      <div className={cn("flex flex-wrap justify-center gap-y-3 py-2", className)} aria-label="Standards and technology">
        {items.map((it) => <Chip key={it} label={it} />)}
      </div>
    );
  }

  return (
    <div className={cn("marquee-mask group overflow-hidden py-2", className)} aria-label="Standards and technology">
      {/* Track holds two identical copies; -50% shift makes the loop seamless. */}
      <div className="animate-marquee flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            {items.map((it) => <Chip key={it} label={it} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
