/**
 * Landing page — premium 2026 redesign (Awwwards-grade).
 *
 * Animated gradient-mesh hero, an interactive verdict demo, a bento feature
 * grid with glass + tilt, animated statistics, a blockchain-seal visualization,
 * scroll-storytelling, testimonials, and a premium CTA/footer. Copy is from the
 * UI/UX spec §14.2; all motion is reduced-motion-safe and purpose-driven.
 */
import {
  Award, Building2, CheckCircle2, Fingerprint, Lock, ScanLine, Search,
  ShieldCheck, Sparkles, UploadCloud, Zap,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MeshBackground } from "@/components/motion/MeshBackground";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { TrustMarquee } from "@/components/motion/TrustMarquee";
import { NetworkStatus, NetworkStatusCard } from "@/components/NetworkStatus";
import { Magnetic, Reveal, Spotlight, Stagger, StaggerItem, TiltCard, motion, useReducedMotion } from "@/components/motion";
import { EASE } from "@/lib/motion";

// ── Interactive verdict demo (mirrors the real verdict UI, safe demo data) ───
function VerdictDemo() {
  const reduced = useReducedMotion();
  const checks = ["Content integrity", "Cryptographic proof", "Blockchain record", "Issuer accreditation", "Revocation status", "Validity period"];
  return (
    <TiltCard className="w-full max-w-sm" intensity={6}>
      <Card glass className="relative overflow-hidden p-6 shadow-glass dark:shadow-glass-dark">
        <div className="glow-ambient absolute inset-0" aria-hidden />
        <div className="relative flex flex-col items-center gap-3 text-center">
          {/* Verification pulse */}
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-success-500/15 text-success-700 dark:text-success-400">
            {!reduced && <span className="absolute inset-0 rounded-2xl bg-success-500/30 animate-pulse-ring" aria-hidden />}
            <ShieldCheck className="h-8 w-8" aria-hidden />
          </div>
          <p className="font-display text-lg font-bold">Valid certificate</p>
          <p className="text-xs text-text-secondary">Verified on Polygon · under 3 seconds</p>
        </div>
        <div className="relative mt-5 flex flex-col gap-2">
          {checks.map((c, i) => (
            <motion.div
              key={c}
              className="flex items-center justify-between rounded-lg border border-border-default/60 bg-surface/50 px-3 py-2 text-sm"
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
            >
              <span className="text-text-secondary">{c}</span>
              <CheckCircle2 className="h-4 w-4 text-success-500" aria-hidden />
            </motion.div>
          ))}
        </div>
      </Card>
    </TiltCard>
  );
}

const FEATURES = [
  { icon: Zap, title: "Instant verdicts", body: "Scan a QR and know in seconds, not weeks.", span: "sm:col-span-2" },
  { icon: Lock, title: "Fraud-proof by design", body: "Every certificate is cryptographically sealed on a public blockchain." },
  { icon: Award, title: "Yours for life", body: "Students keep their credentials forever, wherever they go." },
  { icon: Fingerprint, title: "Zero personal data on-chain", body: "Only anonymous fingerprints are recorded — your data stays private.", span: "sm:col-span-2" },
];

const STATS = [
  { value: 3, suffix: "s", label: "Average verification" },
  { value: 100, suffix: "%", label: "Tamper detection" },
  { value: 0, prefix: "$", label: "Cost to verify" },
  { value: 7, label: "Cryptographic checks" },
];

const STEPS = [
  { n: "01", title: "Issue", body: "Institutions issue certificates in bulk, with maker-checker approval controls." },
  { n: "02", title: "Seal", body: "Each certificate is sealed on the Polygon blockchain — tamper-proof forever." },
  { n: "03", title: "Verify", body: "Anyone can check authenticity instantly — free, forever, no account." },
];

// Enterprise platform pillars — the "why us at scale" story (TrustChain 2.0).
const PILLARS = [
  {
    icon: UploadCloud,
    title: "Issue at scale",
    body: "Bulk issuance with dry-run validation, maker-checker approvals, and one-transaction Merkle anchoring for thousands of credentials.",
    points: ["Batch pipeline", "Two-person controls", "On-chain anchoring"],
  },
  {
    icon: ScanLine,
    title: "Verify anywhere",
    body: "A QR scan returns a plain-language verdict in under three seconds — no account, no wallet, no cost, on any device.",
    points: ["7 cryptographic checks", "Public & independent", "QR / ID / file"],
  },
  {
    icon: Building2,
    title: "Govern with control",
    body: "Role-based access, an append-only audit trail, two-person revocation, and tenant isolation — built for institutional governance.",
    points: ["RBAC + audit trail", "Irreversible revocation", "Tenant isolation"],
  },
];

const FAQS = [
  { q: "Do I need a crypto wallet?", a: "No. Students, institutions, and verifiers never touch wallets, gas, or seed phrases — the blockchain works invisibly underneath." },
  { q: "Is my personal data on the blockchain?", a: "Never. Only anonymous cryptographic fingerprints are recorded on-chain; your personal data stays protected off-chain." },
  { q: "What if a certificate has an error?", a: "Institutions issue a corrected version with a transparent link between old and new — nothing is silently edited." },
  { q: "Can verification be faked?", a: "A verdict is backed by public blockchain records that anyone can independently re-check. A fake site can't fake the chain." },
];

export default function Landing() {
  const reduced = useReducedMotion();
  return (
    <div className="overflow-clip">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate">
        <MeshBackground />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-2 lg:py-32">
          <div>
            <motion.div
              className="flex flex-wrap items-center gap-2"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-border-default/60 glass px-3 py-1 text-xs font-medium text-text-secondary">
                <Sparkles className="h-3.5 w-3.5 text-primary-500" aria-hidden />
                The global trust infrastructure for credentials
              </span>
              <NetworkStatus />
            </motion.div>

            <motion.h1
              className="mt-6 font-display text-display-lg font-extrabold"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE.out, delay: 0.05 }}
            >
              Certificates that <span className="text-gradient">prove themselves.</span>
            </motion.h1>

            <motion.p
              className="mt-5 max-w-lg text-lg text-text-secondary"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              TrustChain is the verification layer for academic and professional credentials —
              institutions issue tamper-proof certificates that anyone can verify in seconds. No
              phone calls, no waiting, no doubt.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <Magnetic>
                <LinkButton to="/verify" size="lg"><Search className="h-4 w-4" aria-hidden /> Verify a certificate</LinkButton>
              </Magnetic>
              <LinkButton to="/register" size="lg" variant="secondary">For institutions →</LinkButton>
            </motion.div>

            <motion.div
              className="mt-8 flex items-center gap-2 text-xs text-text-secondary"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            >
              <span className="flex -space-x-1.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-5 w-5 rounded-full border-2 border-page bg-gradient-to-br from-primary-400 to-accent-500" />
                ))}
              </span>
              Trusted by forward-thinking institutions
            </motion.div>
          </div>

          <motion.div
            className="flex justify-center lg:justify-end"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE.out, delay: 0.2 }}
          >
            <VerdictDemo />
          </motion.div>
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────────────────────── */}
      <section className="border-y border-border-default/60 glass">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
          {STATS.map((s) => (
            <Reveal key={s.label} className="text-center">
              <p className="font-display text-4xl font-extrabold">
                <AnimatedCounter value={s.value} suffix={s.suffix} prefix={s.prefix} />
              </p>
              <p className="mt-1 text-sm text-text-secondary">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Trust marquee (standards + tech) ─────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <Reveal className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-text-secondary">
          Built on open standards, not a walled garden
        </Reveal>
        <TrustMarquee />
      </section>

      {/* ── Platform pillars (enterprise story) ──────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display font-bold">One platform, end to end</h2>
          <p className="mt-3 text-text-secondary">
            From bulk issuance to instant public verification — with the governance institutions require.
          </p>
        </Reveal>
        <Stagger className="mt-12 grid gap-4 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body, points }) => (
            <StaggerItem key={title}>
              <TiltCard intensity={4} className="h-full">
                <Spotlight className="h-full rounded-xl">
                <Card glass hover className="flex h-full flex-col p-6">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-500/15 text-primary-600 shadow-glow dark:text-primary-400">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{body}</p>
                  <ul className="mt-4 flex flex-col gap-1.5 border-t border-border-default/50 pt-4">
                    {points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle2 className="h-4 w-4 text-primary-500" aria-hidden /> {p}
                      </li>
                    ))}
                  </ul>
                </Card>
                </Spotlight>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── Bento features ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display font-bold">Trust, engineered end to end</h2>
          <p className="mt-3 text-text-secondary">Every layer is designed to make forgery impossible to hide and verification effortless.</p>
        </Reveal>
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, span }) => (
            <StaggerItem key={title} className={span}>
              <TiltCard intensity={5} className="h-full">
                <Card glass hover className="h-full p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{body}</p>
                </Card>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── How it works (scroll storytelling) ───────────────────────────── */}
      <section id="how-it-works" className="relative border-y border-border-default/60">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <Reveal className="text-center">
            <h2 className="font-display text-display font-bold">Issue. Seal. Verify.</h2>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <div className="relative">
                  <span className="font-display text-6xl font-extrabold text-primary-500/15">{step.n}</span>
                  <h3 className="mt-2 font-display text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{step.body}</p>
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="absolute right-0 top-8 hidden h-px w-16 bg-gradient-to-r from-primary-500/40 to-transparent md:block" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust band ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-24">
        <Reveal>
          <Card glow className="overflow-hidden">
            <CardContent className="grid items-center gap-8 p-8 sm:grid-cols-[1fr_auto] sm:p-10">
              <div>
                <h2 className="font-display text-2xl font-bold">Works even if we disappear</h2>
                <p className="mt-2 text-text-secondary">
                  Verification is backed by public blockchain records and open standards — anyone can
                  re-check a certificate independently, forever. No vendor lock-in, no single point of failure.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-secondary">
                  {["W3C Verifiable Credentials", "Polygon PoS", "Open-source verifier", "Zero PII on-chain"].map((t) => (
                    <span key={t} className="rounded-full border border-border-default/60 bg-surface/50 px-3 py-1">{t}</span>
                  ))}
                </div>
              </div>
              <NetworkStatusCard className="w-full sm:w-80" />
            </CardContent>
          </Card>
        </Reveal>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-24">
        <Reveal className="text-center">
          <h2 className="font-display text-2xl font-bold">Frequently asked questions</h2>
        </Reveal>
        <div className="mt-8 flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 0.05}>
              <details className="group rounded-xl border border-border-default/60 glass">
                <summary className="cursor-pointer px-5 py-4 font-medium marker:content-['']">
                  <span className="flex items-center justify-between">
                    {faq.q}
                    <span aria-hidden className="text-text-secondary transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="border-t border-border-default/60 px-5 py-4 text-sm text-text-secondary">{faq.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-t border-border-default/60">
        <MeshBackground grid={false} />
        <div className="relative mx-auto max-w-2xl px-4 py-24 text-center">
          <Reveal>
            <h2 className="font-display text-display font-bold">Ready to end certificate fraud?</h2>
            <p className="mt-3 text-text-secondary">Join the institutions issuing verifiable credentials on TrustChain.</p>
            <div className="mt-8 flex justify-center gap-3">
              <Magnetic>
                <LinkButton to="/register" size="lg">Get started free</LinkButton>
              </Magnetic>
              <LinkButton to="/verify" size="lg" variant="outline">Try verification</LinkButton>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
