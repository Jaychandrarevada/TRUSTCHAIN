/**
 * Login — password login + MetaMask signature login (spec §4.2; PART 2).
 * Wallet login only works for previously linked wallets (backend rule).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { useAuth } from "@/contexts/AuthContext";
import { connectWallet, isWalletAvailable, signChallenge, WalletError } from "@/lib/web3/metamask";
import { MeshBackground } from "@/components/motion/MeshBackground";
import { ROLE_HOME } from "@/constants";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login, loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [walletBusy, setWalletBusy] = useState(false);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const goHome = (roles: string[]) => {
    navigate(roles.map((r) => ROLE_HOME[r]).find(Boolean) ?? "/wallet");
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await login(values.email, values.password);
      goHome(session.roles);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ACCOUNT_LOCKED") {
        setError("root", { message: "Too many attempts — try again in a few minutes." });
      } else if (err instanceof ApiError) {
        setError("root", { message: err.problem.detail || "Email or password didn't match. Try again, or reset your password." });
      } else {
        setError("root", { message: "Couldn't reach the server. Check your connection." });
      }
    }
  });

  const walletLogin = async () => {
    setWalletBusy(true);
    try {
      const { address } = await connectWallet();
      const challenge = await authApi.walletChallenge(address);
      const signature = await signChallenge(address, challenge.message);
      const pair = await authApi.walletLogin(challenge.nonce, signature);
      goHome(loginWithTokens(pair.roles).roles);
    } catch (err) {
      if (err instanceof WalletError && err.code === "USER_REJECTED") return; // not an error state
      if (err instanceof ApiError) toast("warning", err.problem.detail);
      else if (err instanceof WalletError) toast("warning", err.message);
      else toast("danger", "Wallet sign-in failed. Try again.");
    } finally {
      setWalletBusy(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <MeshBackground />
      <motion.div
        className="glass-strong relative w-full max-w-sm rounded-2xl p-8 shadow-glass dark:shadow-glass-dark"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE.out }}
      >
      <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-text-secondary">Welcome back to TrustChain.</p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <TextField label="Email" type="email" autoComplete="email" autoFocus
          error={errors.email?.message} {...register("email")} required />
        <TextField label="Password" type="password" autoComplete="current-password"
          error={errors.password?.message} {...register("password")} required />
        {errors.root && <p role="alert" className="text-sm text-danger-700 dark:text-danger-400">{errors.root.message}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">Sign in</Button>
      </form>

      {isWalletAvailable() && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-text-secondary">
            <span className="h-px flex-1 bg-border-default" aria-hidden /> or
            <span className="h-px flex-1 bg-border-default" aria-hidden />
          </div>
          <Button variant="secondary" className="w-full" onClick={walletLogin} loading={walletBusy}>
            <Wallet className="h-4 w-4" aria-hidden /> Sign in with wallet
          </Button>
          <p className="mt-2 text-center text-xs text-text-secondary">
            Works for wallets you've linked to your account. Signing proves ownership — it never
            sends a transaction.
          </p>
        </>
      )}

      <p className="mt-6 text-center text-sm text-text-secondary">
        New here? <Link to="/register" className="font-medium text-primary-800 hover:underline dark:text-primary-400">Create account</Link>
      </p>
      </motion.div>
    </div>
  );
}
