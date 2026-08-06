/**
 * Wallet certificate detail (spec §5.5/§9): field list, live verdict badge,
 * QR code, and the share builder (field selection + expiry/views/PIN guards
 * with a live "verifier will see" preview — spec §9.8).
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyApi, walletApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { humanizeKey } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { CopyField, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { QRDisplay, Timeline } from "@/components/domain/certificate";
import { LuxuryCredential } from "@/components/domain/LuxuryCredential";

const VERIFY_BASE = import.meta.env.VITE_VERIFY_BASE_URL ?? window.location.origin;

/** Fields a holder may hide; core identity fields always share (BR-17 defaults). */
const ALWAYS_SHARED = new Set(["holder_name", "program"]);

export default function WalletCertificate() {
  const { certUid = "" } = useParams();
  const toast = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [expiresDays, setExpiresDays] = useState("30");
  const [maxViews, setMaxViews] = useState("");
  const [pin, setPin] = useState("");
  const [shareUrl, setShareUrl] = useState<string>();

  // Live verdict doubles as the credential detail source (public data + status).
  const { data: verdict, isLoading } = useQuery({
    queryKey: ["verdict", certUid],
    queryFn: () => verifyApi.byUid(certUid),
  });
  const { data: wallet } = useQuery({ queryKey: ["wallet", "credentials"], queryFn: walletApi.credentials });
  const mine = wallet?.data.find((c) => c.cert_uid === certUid);
  const subject = mine?.subject_data ?? {};

  const shareableFields = useMemo(
    () => Object.keys(subject).filter((k) => k !== "holder_email"),
    [subject],
  );
  const disclosed = shareableFields.filter((k) => ALWAYS_SHARED.has(k) || !hidden.has(k));

  const createShare = useMutation({
    mutationFn: () =>
      walletApi.createShare({
        cert_uid: certUid,
        disclosed_fields: disclosed,
        expires_in_days: expiresDays ? Number(expiresDays) : null,
        max_views: maxViews ? Number(maxViews) : null,
        pin: pin || null,
      }),
    onSuccess: async (res) => {
      setShareUrl(`${VERIFY_BASE}/share/${res.token}`);
      await navigator.clipboard.writeText(`${VERIFY_BASE}/share/${res.token}`).catch(() => undefined);
      toast("success", "Link created and copied.");
    },
    onError: (err) => err instanceof ApiError && toast("danger", err.problem.detail),
  });

  if (isLoading || !verdict) return <Skeleton className="h-96 w-full" />;

  const detailFields = Object.fromEntries(
    Object.entries(subject).filter(([k]) => k !== "holder_email" && k !== "holder_name" && k !== "program"),
  );

  return (
    <div className="flex flex-col gap-4">
      <LuxuryCredential
        certUid={certUid}
        program={String(subject.program ?? verdict.certificate.cert_uid)}
        holderName={subject.holder_name ? String(subject.holder_name) : undefined}
        fields={detailFields}
        verdict={verdict.verdict}
        issuerName={verdict.certificate.issuer.name}
        issuerStatus={verdict.certificate.issuer.status}
        checks={verdict.checks}
        qrValue={`${VERIFY_BASE}/v/${certUid}?qr`}
        verifyUrl={`${VERIFY_BASE}/v/${certUid}`}
        actions={<Button size="sm" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" aria-hidden /> Share</Button>}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Verification checks</CardTitle></CardHeader>
        <CardContent><Timeline events={[{ event: "issued" }, { event: "claimed" }]} />
          <p className="mt-2 text-xs text-text-secondary">
            Full history is available on the public verdict page.
          </p>
        </CardContent>
      </Card>

      {/* Share builder (spec §9.8) */}
      <Dialog open={shareOpen} onClose={() => { setShareOpen(false); setShareUrl(undefined); }} title="Share this certificate">
        {shareUrl ? (
          <div className="flex flex-col items-center gap-4">
            <QRDisplay value={shareUrl} label="share link" />
            <CopyField value={shareUrl} truncate={false} label="share link" />
            <p className="text-center text-xs text-text-secondary">
              This link shows {disclosed.length} of {shareableFields.length} fields
              {expiresDays ? ` and expires in ${expiresDays} days` : ""}. Revoke it anytime from your wallet.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); createShare.mutate(); }}>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">What the verifier will see</legend>
              <div className="flex flex-col gap-2">
                {shareableFields.map((field) => (
                  <label key={field} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-primary-500"
                      checked={ALWAYS_SHARED.has(field) || !hidden.has(field)}
                      disabled={ALWAYS_SHARED.has(field)}
                      onChange={(e) => {
                        const next = new Set(hidden);
                        e.target.checked ? next.delete(field) : next.add(field);
                        setHidden(next);
                      }}
                    />
                    {humanizeKey(field)}
                    {ALWAYS_SHARED.has(field) && <span className="text-xs text-text-secondary">(always shared)</span>}
                    {hidden.has(field) && !ALWAYS_SHARED.has(field) && (
                      <span className="text-xs text-text-secondary">— hidden from verifier</span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Expires in (days)" type="number" min={1} max={365}
                value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
              <TextField label="Max views" type="number" min={1} placeholder="Unlimited"
                value={maxViews} onChange={(e) => setMaxViews(e.target.value)} />
              <TextField label="PIN (optional)" inputMode="numeric" placeholder="4–12 digits"
                value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
            <Button type="submit" loading={createShare.isPending}>Create share link</Button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
