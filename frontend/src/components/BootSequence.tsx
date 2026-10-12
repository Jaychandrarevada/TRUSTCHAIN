/**
 * BootSequence — the first-visit brand intro (TrustChain 2.0).
 *
 * Golden particles condense into blockchain nodes, wire into a shield-and-
 * checkmark network, a light beam sweeps the assembled mark, then the
 * wordmark + tagline settle with a soft pulse before fading into the app.
 *
 * Engineering choices:
 * - Canvas 2D, not Three.js: ~20 nodes at 60fps needs no WebGL, and skipping
 *   a 500KB+ dependency keeps the bundle lean (the app must never get SLOWER
 *   to make its intro fancier).
 * - The app is already mounted and interactive underneath this overlay —
 *   it never gates usability. A skip button is present from the first frame,
 *   a hard safety timeout force-finishes if anything stalls, and users who
 *   prefer reduced motion never see it at all (App.tsx decides that before
 *   this component ever mounts).
 * - Runs once per browser (localStorage) — this is a first-visit MOMENT,
 *   not a loading screen.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/lib/motion";

export const BOOT_SEEN_KEY = "tc-boot-seen-v1";

// ── Phase timeline (ms from mount) ───────────────────────────────────────────
const T_PARTICLES_IN = 400; // particles fade in, scattered
const T_CONVERGE = 1100;    // particles ease toward node targets
const T_WIRE = 1600;        // edges draw between nodes
const T_BEAM = 2050;        // golden beam sweeps the assembled mark
const T_LOCK = 2350;        // logo locks; wordmark + tagline settle
const T_PULSE = 2800;       // soft glow pulse
const SAFETY_MS = 3400;     // hard ceiling — always resolves, no matter what

// ── Node/edge geometry — a shield + checkmark, in a 100×100 normalized box ──
const OUTLINE: [number, number][] = [
  [50, 8], [68, 16], [82, 24], [86, 42], [86, 42],
  [78, 64], [64, 80], [50, 92], [36, 80], [22, 64],
  [14, 42], [18, 24], [32, 16],
];
const CHECK: [number, number][] = [[34, 50], [45, 61], [70, 33]];
const NODES: [number, number][] = [...OUTLINE, ...CHECK];
const CHECK_START = OUTLINE.length;

const EDGES: [number, number][] = [
  ...OUTLINE.map((_, i) => [i, (i + 1) % OUTLINE.length] as [number, number]),
  [CHECK_START, CHECK_START + 1],
  [CHECK_START + 1, CHECK_START + 2],
  // A few network cross-links from the checkmark to the nearest rim nodes.
  [CHECK_START, 9], [CHECK_START + 2, 1],
];

interface Particle {
  x: number; y: number; vx: number; vy: number; tx: number; ty: number;
}

export function BootSequence({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"particles" | "wire" | "beam" | "lock" | "pulse" | "out">("particles");
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("out");
    window.setTimeout(onDone, 400); // matches the exit-transition duration
  };

  // Phase clock — coarse React state transitions only at beat boundaries;
  // the canvas itself runs its own high-frequency RAF loop (see below).
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("wire"), T_WIRE),
      window.setTimeout(() => setPhase("beam"), T_BEAM),
      window.setTimeout(() => setPhase("lock"), T_LOCK),
      window.setTimeout(() => setPhase("pulse"), T_PULSE),
      window.setTimeout(finish, SAFETY_MS),
    ];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Canvas particle system — imperative RAF loop, independent of React render.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0, height = 0, box = 0, originX = 0, originY = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      box = Math.min(width, height) * 0.34;
      originX = width / 2 - box / 2;
      originY = height / 2 - box / 2 - height * 0.06;
    };
    resize();
    window.addEventListener("resize", resize);

    const toScreen = (nx: number, ny: number) => ({
      x: originX + (nx / 100) * box,
      y: originY + (ny / 100) * box,
    });

    const particles: Particle[] = NODES.map(([nx, ny]) => {
      const target = toScreen(nx, ny);
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.max(width, height) * (0.35 + Math.random() * 0.25);
      return {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0, vy: 0,
        tx: target.x, ty: target.y,
      };
    });

    let raf = 0;
    const t0 = performance.now();
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const draw = (now: number) => {
      const elapsed = now - t0;
      ctx.clearRect(0, 0, width, height);

      // 1) Particle drift → converge (T_PARTICLES_IN..T_CONVERGE)
      const convergeT = Math.min(1, Math.max(0, (elapsed - T_PARTICLES_IN) / (T_CONVERGE - T_PARTICLES_IN)));
      const ease = easeOutExpo(convergeT);
      const fadeIn = Math.min(1, elapsed / T_PARTICLES_IN);

      particles.forEach((p) => {
        p.x = p.x + (p.tx - p.x) * ease * 0.14 + (1 - ease) * Math.sin(elapsed * 0.001 + p.tx) * 0.3;
        p.y = p.y + (p.ty - p.y) * ease * 0.14 + (1 - ease) * Math.cos(elapsed * 0.001 + p.ty) * 0.3;
      });

      // 2) Edges (draw progressively once wired, T_CONVERGE..T_WIRE)
      const wireT = Math.min(1, Math.max(0, (elapsed - T_CONVERGE) / (T_WIRE - T_CONVERGE)));
      if (wireT > 0) {
        const edgeCount = Math.ceil(EDGES.length * wireT);
        ctx.lineWidth = 1.1;
        for (let i = 0; i < edgeCount; i++) {
          const [a, b] = EDGES[i];
          const pa = particles[a], pb = particles[b];
          const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
          grad.addColorStop(0, "rgba(212,175,55,0.05)");
          grad.addColorStop(0.5, "rgba(212,175,55,0.55)");
          grad.addColorStop(1, "rgba(212,175,55,0.05)");
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }

      // 3) Beam sweep across the assembled mark (T_WIRE..T_BEAM)
      const beamT = Math.min(1, Math.max(0, (elapsed - T_WIRE) / (T_BEAM - T_WIRE)));
      if (beamT > 0 && beamT < 1) {
        const beamX = originX - box * 0.2 + beamT * box * 1.4;
        const beamGrad = ctx.createLinearGradient(beamX - 30, 0, beamX + 30, 0);
        beamGrad.addColorStop(0, "rgba(232,201,107,0)");
        beamGrad.addColorStop(0.5, "rgba(232,201,107,0.9)");
        beamGrad.addColorStop(1, "rgba(232,201,107,0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = beamGrad;
        ctx.fillRect(beamX - 30, originY - box * 0.15, 60, box * 1.3);
        ctx.restore();
      }

      // Nodes on top — brighter for outline, softer for the checkmark.
      particles.forEach((p, i) => {
        const isCheck = i >= CHECK_START;
        const r = isCheck ? 2.6 : 2.2;
        ctx.beginPath();
        ctx.fillStyle = isCheck
          ? `rgba(232,201,107,${fadeIn})`
          : `rgba(212,175,55,${fadeIn})`;
        ctx.shadowColor = "rgba(212,175,55,0.8)";
        ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Fade the whole canvas out once the vector logo takes over.
      if (elapsed > T_LOCK) {
        const fadeOut = Math.min(1, (elapsed - T_LOCK) / 350);
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0,0,0,${fadeOut})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if (elapsed < T_LOCK + 400) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const showVectorLogo = phase === "beam" || phase === "lock" || phase === "pulse" || phase === "out";
  const showWordmark = phase === "lock" || phase === "pulse" || phase === "out";

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-label="TrustChain"
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#070707]"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "out" ? 0 : 1 }}
        transition={{ duration: 0.5, ease: EASE.out }}
      >
          <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />

          {/* Crisp vector shield — crossfades in once the canvas nodes lock. */}
          <motion.div
            className="relative grid place-items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={showVectorLogo ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: EASE.out }}
          >
            <motion.div
              className="absolute inset-0 -m-8 rounded-full"
              animate={phase === "pulse" || phase === "out"
                ? { boxShadow: ["0 0 0px rgba(212,175,55,0)", "0 0 70px rgba(212,175,55,0.55)", "0 0 20px rgba(212,175,55,0.25)"] }
                : {}}
              transition={{ duration: 1.3, ease: "easeOut" }}
              aria-hidden
            />
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={1.6}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3l7 2.5v6c0 4.2-3 8-7 9-4-1-7-4.8-7-9v-6z" fill="#111111" />
              <path d="M8.5 12.2l2.4 2.4 4.6-5" />
            </svg>
          </motion.div>

          <div className="mt-7 text-center">
            <motion.p
              className="font-display text-2xl font-extrabold tracking-[0.14em]"
              initial={{ opacity: 0, y: 10 }}
              animate={showWordmark ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.5, ease: EASE.out }}
            >
              <span className="text-gradient">TRUSTCHAIN</span>
            </motion.p>
            <motion.p
              className="mt-2 text-xs uppercase tracking-[0.2em] text-text-secondary"
              initial={{ opacity: 0, y: 8 }}
              animate={showWordmark ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.12, ease: EASE.out }}
            >
              The Global Trust Infrastructure for Verifiable Credentials
            </motion.p>
          </div>

          <motion.button
            type="button"
            onClick={finish}
            className="fixed bottom-6 right-6 rounded-full border border-border-default/60 glass px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            Skip intro
          </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
