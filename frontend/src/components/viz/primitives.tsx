/**
 * Blockchain visualization framework — shared primitives.
 *
 * ── Why SVG, not canvas ───────────────────────────────────────────────────
 * These graphics are structural (nodes, edges, trees, proof paths), and SVG
 * buys three things a canvas would cost real code to reproduce:
 *   1. Responsive scaling for free — every primitive draws into a normalized
 *      viewBox, so the browser scales it. No resize observers, no DPR maths,
 *      no layout hardcoded in pixels.
 *   2. Theme for free — strokes/fills read CSS custom properties, so all four
 *      themes (light / dark / OLED / high-contrast) work without a redraw.
 *   3. Cheap animation — everything animates `transform` and `opacity` only,
 *      which the compositor handles off the main thread. That is the single
 *      biggest win on low-end hardware: no per-frame JavaScript at all.
 * Canvas remains the right tool where element counts explode (the trust-network
 * graph, the boot particles) — this framework is not trying to replace those.
 *
 * ── Reduced motion ────────────────────────────────────────────────────────
 * CSS animation is covered by the global `prefers-reduced-motion` override in
 * globals.css, but SMIL (`<animateMotion>`) is NOT — the override cannot reach
 * it. So motion-bearing primitives take `reduced` from `useReducedMotion()`
 * and simply do not render the animated element, falling back to a meaningful
 * static state. Structure always survives; only movement is dropped.
 *
 * ── Honesty ───────────────────────────────────────────────────────────────
 * Nothing here fabricates chain data. `HashReveal` animates a hash it is
 * GIVEN; with no hash it renders a neutral placeholder rather than inventing
 * plausible-looking hex.
 */
import { useId, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/utils";

// ── Coordinate space ────────────────────────────────────────────────────────

/** Normalized drawing space. Layouts are computed in these units and scaled by
 *  the browser, so no primitive ever hardcodes a pixel position. */
export const VB = { w: 100, h: 100 } as const;

export interface Point { x: number; y: number }

/** Evenly distribute `count` items across a span, centred in their slots. */
export function distribute(count: number, from: number = 0, to: number = VB.w): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(from + to) / 2];
  const step = (to - from) / count;
  return Array.from({ length: count }, (_, i) => from + step * (i + 0.5));
}

/** Points evenly spaced around a circle, starting at 12 o'clock. */
export function ring(count: number, cx: number, cy: number, r: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

/**
 * Pull a segment's endpoints back by the given padding, so an edge stops at
 * the boundary of the nodes it joins instead of running under them. Node fills
 * are semi-transparent, so an untrimmed edge shows through as a slash across
 * the node face.
 */
export function trimSegment(a: Point, b: Point, padA = 0, padB = 0): [Point, Point] {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [a, b];
  const ux = dx / len, uy = dy / len;
  return [
    { x: a.x + ux * padA, y: a.y + uy * padA },
    { x: b.x - ux * padB, y: b.y - uy * padB },
  ];
}

/** Quadratic curve between two points, bowed perpendicular to their axis. */
export function curvePath(a: Point, b: Point, bow = 0): string {
  if (!bow) return `M${a.x} ${a.y} L${b.x} ${b.y}`;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return `M${a.x} ${a.y} Q${mx - (dy / len) * bow} ${my + (dx / len) * bow} ${b.x} ${b.y}`;
}

// ── Surface ─────────────────────────────────────────────────────────────────

/**
 * VizSurface — the responsive drawing surface every primitive composes into.
 * Width is always 100%; height comes from the caller's aspect ratio, and the
 * viewBox does the scaling. Decorative by default: pass `title` to expose it
 * to assistive tech as an image with an accessible name instead.
 */
export function VizSurface({
  children, className, aspect = 2, title, viewBox,
}: {
  children: ReactNode;
  className?: string;
  /** width ÷ height of the drawing area. */
  aspect?: number;
  title?: string;
  viewBox?: string;
}) {
  return (
    <svg
      viewBox={viewBox ?? `0 0 ${VB.w} ${VB.w / aspect}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-auto w-full overflow-visible", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

// ── Node states ─────────────────────────────────────────────────────────────

export type NodeState = "idle" | "active" | "sealed" | "failed";

const NODE_FILL: Record<NodeState, string> = {
  idle: "rgba(var(--tc-node-retired), 0.10)",
  active: "rgba(var(--tc-node-pending), 0.18)",
  sealed: "rgba(var(--tc-node-active), 0.18)",
  failed: "rgba(var(--tc-node-suspended), 0.18)",
};
const NODE_STROKE: Record<NodeState, string> = {
  idle: "rgba(var(--tc-node-retired), 0.55)",
  active: "rgba(var(--tc-node-pending), 0.95)",
  sealed: "rgba(var(--tc-node-active), 0.95)",
  failed: "rgba(var(--tc-node-suspended), 0.95)",
};

/**
 * ChainNode — one block/participant. Rendered as a rounded square (a "block")
 * or a circle (a "peer"); both scale from a single `size` in viewBox units.
 */
export function ChainNode({
  at, size = 9, state = "idle", shape = "block", label, pulse = false,
}: {
  at: Point;
  size?: number;
  state?: NodeState;
  shape?: "block" | "peer";
  label?: string;
  /** Emit a breathing ring — only honoured when motion is allowed. */
  pulse?: boolean;
}) {
  const reduced = useReducedMotion();
  const half = size / 2;
  return (
    <g>
      {pulse && !reduced && state !== "idle" && (
        <circle
          cx={at.x} cy={at.y} r={half}
          fill="none"
          stroke={NODE_STROKE[state]}
          strokeWidth={0.6}
          className="viz-pulse"
        />
      )}
      {shape === "block" ? (
        <rect
          x={at.x - half} y={at.y - half} width={size} height={size} rx={size * 0.22}
          fill={NODE_FILL[state]} stroke={NODE_STROKE[state]} strokeWidth={0.9}
        />
      ) : (
        <circle
          cx={at.x} cy={at.y} r={half}
          fill={NODE_FILL[state]} stroke={NODE_STROKE[state]} strokeWidth={0.9}
        />
      )}
      {label && (
        <text
          x={at.x} y={at.y + half + 4.5}
          textAnchor="middle"
          fill="var(--tc-text-secondary)"
          style={{ fontSize: 3.4, fontFamily: "inherit" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ── Connections ─────────────────────────────────────────────────────────────

/**
 * Connection — an edge between two nodes. `flowing` draws a dashed overlay
 * that marches along the path (pure CSS on `stroke-dashoffset`, so it is
 * compositor-friendly and stops automatically under reduced motion via the
 * global override).
 */
export function Connection({
  from, to, state = "idle", bow = 0, flowing = false, width = 0.7,
}: {
  from: Point;
  to: Point;
  state?: NodeState;
  bow?: number;
  flowing?: boolean;
  width?: number;
}) {
  const d = curvePath(from, to, bow);
  return (
    <g>
      <path d={d} fill="none" strokeWidth={width}
        stroke={state === "idle" ? "rgba(var(--tc-node-retired), 0.35)" : NODE_STROKE[state]} />
      {flowing && (
        <path
          d={d} fill="none" strokeWidth={width * 1.6} strokeLinecap="round"
          stroke={NODE_STROKE[state === "idle" ? "active" : state]}
          strokeDasharray="4 10"
          className="viz-flow"
        />
      )}
    </g>
  );
}

// ── Network pulse ───────────────────────────────────────────────────────────

/** NetworkPulse — expanding rings from a point; the "this network is live" cue. */
export function NetworkPulse({ at, r = 6, rings = 3, state = "sealed" }: {
  at: Point; r?: number; rings?: number; state?: NodeState;
}) {
  const reduced = useReducedMotion();
  // Static fallback keeps the meaning (a source exists) without movement.
  if (reduced) {
    return <circle cx={at.x} cy={at.y} r={r} fill="none" strokeWidth={0.5}
      stroke={NODE_STROKE[state]} opacity={0.5} />;
  }
  return (
    <g>
      {Array.from({ length: rings }, (_, i) => (
        <circle
          key={i} cx={at.x} cy={at.y} r={r} fill="none" strokeWidth={0.6}
          stroke={NODE_STROKE[state]}
          className="viz-pulse"
          style={{ animationDelay: `${(i / rings) * 2.4}s` }}
        />
      ))}
    </g>
  );
}

// ── Transaction flow ────────────────────────────────────────────────────────

/**
 * TransactionFlow — a packet travelling along a path.
 *
 * Uses SMIL `<animateMotion>` so the browser interpolates along the real curve
 * with no JavaScript per frame. SMIL is NOT covered by the CSS reduced-motion
 * override, so it is conditionally not rendered instead.
 */
export function TransactionFlow({
  from, to, bow = 0, duration = 1.8, state = "active",
}: {
  from: Point; to: Point; bow?: number; duration?: number; state?: NodeState;
}) {
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const d = curvePath(from, to, bow);
  if (reduced) return null;
  return (
    <g>
      <path id={`p-${id}`} d={d} fill="none" stroke="none" />
      <circle r={1.6} fill={NODE_STROKE[state]}>
        <animateMotion dur={`${duration}s`} repeatCount="indefinite" rotate="auto">
          <mpath href={`#p-${id}`} />
        </animateMotion>
      </circle>
    </g>
  );
}

// ── Merkle tree ─────────────────────────────────────────────────────────────

export interface MerkleLayout {
  levels: Point[][];
  /** [childIndex, parentIndex] pairs per level boundary. */
  edges: { from: Point; to: Point; level: number; childIndex: number }[];
}

/**
 * Computes a real binary Merkle layout for `leafCount` leaves — levels halve
 * (rounding up) until a single root, exactly as the backend's tree does.
 * Pure geometry, no hardcoded coordinates, so any leaf count lays out.
 */
export function merkleLayout(leafCount: number, height = 50, width = VB.w): MerkleLayout {
  const counts: number[] = [];
  for (let n = Math.max(1, leafCount); ; n = Math.ceil(n / 2)) {
    counts.push(n);
    if (n === 1) break;
  }
  const depth = counts.length;
  const levels: Point[][] = counts.map((n, level) => {
    const y = height - (depth === 1 ? 0 : (level / (depth - 1)) * height);
    // Narrow each level slightly so the tree reads as a triangle, not a grid.
    const inset = (level / depth) * width * 0.18;
    return distribute(n, inset, width - inset).map((x) => ({ x, y }));
  });

  const edges: MerkleLayout["edges"] = [];
  for (let level = 0; level < depth - 1; level++) {
    levels[level].forEach((child, i) => {
      const parent = levels[level + 1][Math.floor(i / 2)];
      if (parent) edges.push({ from: child, to: parent, level, childIndex: i });
    });
  }
  return { levels, edges };
}

/**
 * Returns the indices on the proof path for `leafIndex` — the node touched at
 * each level plus its sibling. This is the genuine Merkle proof shape: to
 * verify a leaf you need one sibling per level up to the root.
 */
export function merkleProofPath(leafCount: number, leafIndex: number) {
  const onPath: number[][] = [];
  const siblings: number[][] = [];
  let idx = leafIndex;
  let n = Math.max(1, leafCount);
  let level = 0;
  while (true) {
    (onPath[level] ??= []).push(idx);
    const sib = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (sib < n) (siblings[level] ??= []).push(sib);
    if (n === 1) break;
    idx = Math.floor(idx / 2);
    n = Math.ceil(n / 2);
    level++;
  }
  return { onPath, siblings };
}

/**
 * MerkleTree — the tree, optionally highlighting the verification path for one
 * leaf. `highlightLeaf` drives both the path and its sibling nodes, so the
 * picture explains *why* a proof is small: one sibling per level, not the
 * whole tree.
 */
export function MerkleTree({
  leafCount, highlightLeaf, animate = true, className,
}: {
  leafCount: number;
  highlightLeaf?: number;
  animate?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const layout = merkleLayout(leafCount, 46, VB.w);
  const proof = highlightLeaf != null
    ? merkleProofPath(leafCount, highlightLeaf) : null;

  const isOnPath = (level: number, i: number) => !!proof?.onPath[level]?.includes(i);
  const isSibling = (level: number, i: number) => !!proof?.siblings[level]?.includes(i);

  return (
    <VizSurface className={className} viewBox={`0 0 ${VB.w} 52`}>
      {layout.edges.map((e, i) => {
        const lit = isOnPath(e.level, e.childIndex);
        const isRootEdge = e.level === layout.levels.length - 2;
        // Stop each edge at the node boundary (half of the node size, plus a
        // hair of breathing room) so it never draws across a node's face.
        const [from, to] = trimSegment(e.from, e.to, 3.1, isRootEdge ? 4.1 : 3.1);
        return (
          <Connection
            key={`e${i}`} from={from} to={to}
            state={lit ? "sealed" : "idle"}
            width={lit ? 0.8 : 0.5}
            flowing={lit && animate && !reduced}
          />
        );
      })}
      {layout.levels.map((nodes, level) =>
        nodes.map((p, i) => {
          const path = isOnPath(level, i);
          const sib = isSibling(level, i);
          return (
            <ChainNode
              key={`n${level}-${i}`}
              at={p}
              size={level === layout.levels.length - 1 ? 7 : 5}
              shape="block"
              state={path ? "sealed" : sib ? "active" : "idle"}
              pulse={path && animate}
            />
          );
        }),
      )}
    </VizSurface>
  );
}

// ── Consensus ───────────────────────────────────────────────────────────────

/**
 * ConsensusRing — validators arranged around a proposer, agreement sweeping
 * around the ring. `agreed` is a count, so the caller can drive it from real
 * progress; with no count it renders the resting state.
 */
export function ConsensusRing({
  validators = 7, agreed = 0, className,
}: {
  validators?: number; agreed?: number; className?: string;
}) {
  const reduced = useReducedMotion();
  const centre = { x: VB.w / 2, y: 30 };
  const peers = ring(validators, centre.x, centre.y, 22);
  return (
    <VizSurface className={className} viewBox={`0 0 ${VB.w} 60`}>
      {peers.map((p, i) => (
        <Connection key={`c${i}`} from={centre} to={p}
          state={i < agreed ? "sealed" : "idle"}
          flowing={i === agreed && !reduced} />
      ))}
      {peers.map((p, i) => (
        <ChainNode key={`v${i}`} at={p} size={7} shape="peer"
          state={i < agreed ? "sealed" : "idle"} />
      ))}
      <ChainNode at={centre} size={11} shape="block"
        state={agreed >= validators ? "sealed" : "active"} pulse />
    </VizSurface>
  );
}

// ── Hash reveal ─────────────────────────────────────────────────────────────

/**
 * HashReveal — reveals a REAL hash character by character.
 *
 * Deliberately has no "scramble" mode that generates random hex: this codebase
 * does not render invented technical data, and a convincing fake hash is
 * exactly that. With no `value`, it renders a neutral placeholder instead.
 */
export function HashReveal({ value, label, className }: {
  value?: string | null; label?: string; className?: string;
}) {
  const reduced = useReducedMotion();
  if (!value) {
    return (
      <p className={cn("font-mono text-xs text-text-secondary", className)}>
        {label ? `${label}: ` : ""}<span className="opacity-60">not yet computed</span>
      </p>
    );
  }
  return (
    <p className={cn("font-mono text-xs text-text-primary", className)}>
      {label && <span className="text-text-secondary">{label}: </span>}
      {reduced ? (
        <span>{value}</span>
      ) : (
        <span className="viz-reveal" aria-label={value}>
          {value.split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${Math.min(i * 12, 600)}ms` }}>{ch}</span>
          ))}
        </span>
      )}
    </p>
  );
}
