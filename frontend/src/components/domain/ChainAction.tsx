/**
 * ChainAction — drops the BlockchainPipeline into a focused overlay for any
 * on-chain action. One component covers revocation, superseding and
 * institution registration; each caller supplies a stage preset and the real
 * async operation to run.
 *
 * The overlay never blocks on the animation: the request fires as the pipeline
 * mounts, and the dismiss control only appears once the operation has actually
 * settled, so a user cannot close mid-flight believing it finished.
 */
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, motionSafe, scaleIn } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import {
  BlockchainPipeline, usePipelineRunner,
  type ChainProof, type PipelineOutcome,
} from "./BlockchainPipeline";
import type { StagePreset } from "./blockchainStages";

export function ChainAction<T>({
  preset, run, deriveProof, network, mode, onSettled, onClose,
}: {
  preset: StagePreset;
  /** The real operation. Fires once, immediately. */
  run: () => Promise<T>;
  /** Maps the real response onto the chain facts the pipeline may display. */
  deriveProof: (data: T | null) => ChainProof;
  network?: string | null;
  mode?: string | null;
  onSettled?: (outcome: PipelineOutcome<T>) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  const { activeIndex, phase, result, message } = usePipelineRunner<T>({
    stages: preset.stages,
    gateIndex: preset.gateIndex,
    run,
    onSettled,
  });

  const settled = phase !== "running";
  const proof: ChainProof = { ...deriveProof(result), network, mode };

  // Move focus to the dismiss control the moment it appears, so keyboard users
  // are not left tabbing through a finished pipeline to find the way out.
  useEffect(() => { if (settled) closeRef.current?.focus(); }, [settled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && settled) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settled, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-label={preset.title}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE.out }}
      />
      <motion.div
        className="relative w-full max-w-md"
        variants={motionSafe(reduced, scaleIn)}
        initial="hidden"
        animate="visible"
      >
        <BlockchainPipeline
          title={preset.title}
          stages={preset.stages}
          gateIndex={preset.gateIndex}
          phase={phase}
          activeIndex={activeIndex}
          proof={proof}
          message={message}
        />
        {settled && (
          <div className="mt-3 flex justify-end">
            <Button ref={closeRef} variant="secondary" onClick={onClose}>
              {phase === "confirmed" ? "Done" : "Close"}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
