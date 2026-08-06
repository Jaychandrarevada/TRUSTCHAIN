/**
 * Claim page — binds a certificate to the holder after identity-field match
 * (UC-03/BR-05). Mismatch shows the guided-dispute path, not a dead end.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { PartyPopper } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { walletApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ErrorShake, SuccessPulse } from "@/components/motion/StatusAnim";

const schema = z.object({
  cert_uid: z.string().regex(/^TC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i,
    "Certificate IDs look like TC-XXXX-XXXX-XXXX."),
  holder_email: z.string().email("Enter the email your institution has on record."),
});
type FormValues = z.infer<typeof schema>;

export default function ClaimPage() {
  const [claimed, setClaimed] = useState<string>();
  const [shakeAt, setShakeAt] = useState(0);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await walletApi.claim(values.cert_uid.toUpperCase(), values.holder_email);
      setClaimed(res.cert_uid);
    } catch (err) {
      if (err instanceof ApiError && err.problem.status === 422) {
        setError("holder_email", {
          message: "These details don't match this certificate. Check with your institution — they can correct the record.",
        });
      } else if (err instanceof ApiError) {
        setError("root", { message: err.problem.detail });
      }
      setShakeAt((n) => n + 1); // one corrective shake per failed attempt (MICROINTERACTIONS #9)
    }
  });

  if (claimed) {
    return (
      <SuccessPulse className="mx-auto max-w-sm py-12 text-center">
        <PartyPopper className="mx-auto h-12 w-12 text-success-700" aria-hidden />
        {/* The one exclamation mark in the product (spec §14.6) */}
        <h2 className="mt-4 text-2xl font-bold">Certificate claimed!</h2>
        <p className="mt-2 text-sm text-text-secondary">It's now in your wallet.</p>
        <Link to={`/wallet/certificates/${claimed}`} className="mt-4 inline-block">
          <Button>View my certificate</Button>
        </Link>
      </SuccessPulse>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="text-xl font-semibold">Claim a certificate</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Enter the certificate ID from your notification and the email your institution has on record.
      </p>
      <ErrorShake trigger={shakeAt}>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4" noValidate>
          <TextField label="Certificate ID" className="font-mono" placeholder="TC-1A2B-3C4D-5E6F"
            error={errors.cert_uid?.message} {...register("cert_uid")} required />
          <TextField label="Your email on record" type="email"
            error={errors.holder_email?.message} {...register("holder_email")} required />
          {errors.root && <p role="alert" className="text-sm text-danger-700">{errors.root.message}</p>}
          <Button type="submit" loading={isSubmitting}>Claim certificate</Button>
        </form>
      </ErrorShake>
    </div>
  );
}
