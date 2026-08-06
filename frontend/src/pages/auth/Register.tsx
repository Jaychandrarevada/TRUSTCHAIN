/**
 * Registration — student/employer self-serve (staff are invited; institutions
 * apply via KYB after registering). Password policy mirrors the backend
 * (≥12 chars); the mock-mail flow surfaces the verification step honestly.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { authApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { MeshBackground } from "@/components/motion/MeshBackground";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

const schema = z.object({
  full_name: z.string().min(1, "Enter your name.").max(200),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(12, "Password must be at least 12 characters."),
  role: z.enum(["student", "employer"]),
});
type FormValues = z.infer<typeof schema>;

export default function Register() {
  const [done, setDone] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: "student" } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.register(values);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.problem.status === 409) {
        setError("email", { message: "An account with this email already exists." });
      } else if (err instanceof ApiError) {
        const fields = err.fieldErrors();
        Object.entries(fields).forEach(([field, message]) =>
          setError(field as keyof FormValues, { message }));
        if (!Object.keys(fields).length) setError("root", { message: err.problem.detail });
      }
    }
  });

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-success-700" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm text-text-secondary">
          We sent a verification link. Verify your address, then{" "}
          <Link to="/login" className="font-medium text-primary-800 hover:underline dark:text-primary-400">sign in</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <MeshBackground />
      <motion.div
        className="glass-strong relative w-full max-w-sm rounded-2xl p-8 shadow-glass dark:shadow-glass-dark"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE.out }}
      >
      <h1 className="font-display text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-text-secondary">Certificates that prove themselves.</p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <TextField label="Full name" autoComplete="name" autoFocus
          error={errors.full_name?.message} {...register("full_name")} required />
        <TextField label="Email" type="email" autoComplete="email"
          error={errors.email?.message} {...register("email")} required />
        <TextField label="Password" type="password" autoComplete="new-password"
          help="At least 12 characters." error={errors.password?.message} {...register("password")} required />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium">I am a…</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" value="student" className="accent-primary-500" {...register("role")} /> Student / credential holder
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="employer" className="accent-primary-500" {...register("role")} /> Employer / verifier
            </label>
          </div>
        </fieldset>
        {errors.root && <p role="alert" className="text-sm text-danger-700">{errors.root.message}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">Create account</Button>
        <p className="text-xs text-text-secondary">
          Representing an institution? Create an account first, then apply from inside the app —
          issuance unlocks after accreditation review.
        </p>
      </form>
      </motion.div>
    </div>
  );
}
