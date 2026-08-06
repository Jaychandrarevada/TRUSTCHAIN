/**
 * BlockchainLoader — the signature loading animation: real 3D-projected cubes
 * linking into a chain, sealing one after another.
 *
 * Genuinely 3D, not a CSS fake: eight cube corners are rotated on two axes and
 * run through a perspective projection each frame, faces are depth-sorted
 * (painter's algorithm) so the geometry reads as solid, and the linking beam
 * travels along the chain in world space. One canvas, one rAF loop — cheap
 * enough to sit in a route-level Suspense fallback without costing a frame
 * budget anyone will notice.
 *
 * Honesty rule (same one that governs the ceremonies): this animation shows
 * NO hashes, block numbers, or transaction data. A loading state has nothing
 * real to display yet, and inventing plausible-looking hex to make the moment
 * feel more technical is exactly the kind of fake technical data this codebase
 * refuses everywhere else. The blocks are a metaphor; every real value in the
 * product arrives from the API and renders only once it exists.
 *
 * Reduced motion: the rAF loop never starts — a single static frame renders
 * with all blocks sealed, so the visual meaning ("this is a chain") survives
 * with no movement at all.
 */
import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/utils";

interface V3 { x: number; y: number; z: number }

const BLOCK_COUNT = 5;
const CUBE = 21;   // cube half-extent in world units
const GAP = 74;    // distance between adjacent block centers along X
const SEAL_RATE = 1.15; // blocks sealed per second

/** Unit-cube corners (±1 on each axis). */
const CORNERS: readonly V3[] = [
  { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 },  { x: 1, y: -1, z: 1 },  { x: 1, y: 1, z: 1 },  { x: -1, y: 1, z: 1 },
];

/** Six faces as corner-index quads — used for depth-sorted fills. */
const FACES: readonly (readonly number[])[] = [
  [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4],
];

/** Twelve edges as corner-index pairs — the gold wireframe. */
const EDGES: readonly (readonly number[])[] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
];

function rotateY(p: V3, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c };
}

function rotateX(p: V3, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

/** Reads the live theme tokens so the loader matches Light/Dark/OLED/HC. */
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const gold = cs.getPropertyValue("--tc-node-active").trim() || "212, 175, 55";
  return { gold, dim: cs.getPropertyValue("--tc-text-secondary").trim() || "#a9a08c" };
}

export function BlockchainLoader({
  label = "Establishing secure connection",
  className,
  compact = false,
}: {
  /** Announced to screen readers and shown beneath the chain. */
  label?: string;
  className?: string;
  /** Smaller footprint for inline/in-card use. */
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0, height = 0;

    const resize = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let palette = readPalette();
    const mo = new MutationObserver(() => { palette = readPalette(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    /**
     * Fit the rig to BOTH axes. Width alone isn't enough: the cubes are drawn
     * with perspective, so the nearest one is meaningfully larger than its
     * base size and will clip the top edge of a short canvas if only the
     * horizontal span is considered.
     */
    const rigScale = () => {
      const spanX = (BLOCK_COUNT - 1) * GAP + CUBE * 4;
      const spanY = CUBE * 5; // cube height + tilt + near-block magnification
      return Math.min(1, width / spanX, height / spanY);
    };

    const draw = (elapsed: number) => {
      const s = rigScale();
      // A long lens (high camZ relative to the rig's depth) keeps the blocks
      // close to equal size. A short one magnified the near block ~2.6x, which
      // read as a receding tunnel rather than a chain of equal blocks.
      const fov = 780;
      const camZ = 860;
      const spin = elapsed * 0.42;
      const tilt = -0.30 + Math.sin(elapsed * 0.7) * 0.05;

      // How many blocks have sealed — cycles with a pause once the chain completes.
      const cycle = (elapsed * SEAL_RATE) % (BLOCK_COUNT + 1.4);

      ctx.clearRect(0, 0, width, height);

      const project = (p: V3) => {
        const d = fov / Math.max(1, camZ + p.z);
        return { x: p.x * d * s + width / 2, y: p.y * d * s + height / 2, d };
      };

      // World-space transform shared by every block, so the chain moves as one rig.
      const toWorld = (local: V3, centerX: number): V3 =>
        rotateX(rotateY({ x: local.x + centerX, y: local.y, z: local.z }, spin), tilt);

      const originX = -((BLOCK_COUNT - 1) * GAP) / 2;

      interface Drawable { z: number; paint: () => void }
      const queue: Drawable[] = [];

      for (let b = 0; b < BLOCK_COUNT; b++) {
        const centerX = originX + b * GAP;
        const sealAmount = Math.max(0, Math.min(1, cycle - b));
        const sealed = sealAmount >= 1;
        // A brief flare as each block locks in.
        const flare = sealAmount > 0 && sealAmount < 1 ? Math.sin(sealAmount * Math.PI) : 0;

        const world = CORNERS.map((c) =>
          toWorld({ x: c.x * CUBE, y: c.y * CUBE, z: c.z * CUBE }, centerX));
        const screen = world.map(project);
        const avgZ = world.reduce((sum, p) => sum + p.z, 0) / world.length;

        // ── Connector to the previous block (the "chain" itself) ──────────────
        if (b > 0) {
          const prevX = originX + (b - 1) * GAP;
          const a = project(toWorld({ x: CUBE, y: 0, z: 0 }, prevX));
          const c = project(toWorld({ x: -CUBE, y: 0, z: 0 }, centerX));
          const linkLive = cycle - (b - 1) >= 1;
          queue.push({
            z: avgZ + 1,
            paint: () => {
              ctx.strokeStyle = `rgba(${palette.gold},${linkLive ? 0.75 : 0.16})`;
              ctx.lineWidth = linkLive ? 2 : 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(c.x, c.y);
              ctx.stroke();
            },
          });
        }

        // ── Faces, depth-sorted within the block ─────────────────────────────
        for (const face of FACES) {
          const faceZ = face.reduce((sum, i) => sum + world[i].z, 0) / face.length;
          queue.push({
            z: faceZ,
            paint: () => {
              const base = sealed ? 0.17 : 0.05;
              ctx.fillStyle = `rgba(${palette.gold},${base + flare * 0.3})`;
              ctx.beginPath();
              ctx.moveTo(screen[face[0]].x, screen[face[0]].y);
              for (let i = 1; i < face.length; i++) ctx.lineTo(screen[face[i]].x, screen[face[i]].y);
              ctx.closePath();
              ctx.fill();
            },
          });
        }

        // ── Wireframe edges ──────────────────────────────────────────────────
        queue.push({
          z: avgZ,
          paint: () => {
            ctx.strokeStyle = `rgba(${palette.gold},${sealed ? 0.95 : 0.34})`;
            ctx.lineWidth = sealed ? 1.6 : 1;
            ctx.shadowColor = `rgba(${palette.gold},${flare * 0.9})`;
            ctx.shadowBlur = flare * 18;
            ctx.beginPath();
            for (const [i, j] of EDGES) {
              ctx.moveTo(screen[i].x, screen[i].y);
              ctx.lineTo(screen[j].x, screen[j].y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          },
        });
      }

      // Painter's algorithm: far geometry first.
      queue.sort((a, b) => a.z - b.z);
      for (const item of queue) item.paint();
    };

    if (reduced) {
      // Static frame, chain complete — meaning without motion.
      draw(BLOCK_COUNT / SEAL_RATE);
      const redrawOnResize = () => draw(BLOCK_COUNT / SEAL_RATE);
      const ro2 = new ResizeObserver(redrawOnResize);
      ro2.observe(wrap);
      return () => { ro.disconnect(); ro2.disconnect(); mo.disconnect(); };
    }

    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); };
  }, [reduced]);

  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-3", className)}>
      <div
        ref={wrapRef}
        aria-hidden
        className={cn("w-full", compact ? "h-24 max-w-[260px]" : "h-40 max-w-md")}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <p className={cn(
        "font-medium tracking-wide text-text-secondary",
        compact ? "text-xs" : "text-sm",
      )}>
        {label}
        <span aria-hidden className="loader-ellipsis" />
      </p>
    </div>
  );
}
