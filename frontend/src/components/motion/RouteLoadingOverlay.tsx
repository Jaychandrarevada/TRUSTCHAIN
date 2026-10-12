import { useEffect } from "react";
import { motion } from "framer-motion";
import { BlockchainLoader } from "@/components/motion/BlockchainLoader";
import { EASE } from "@/lib/motion";

export function RouteLoadingOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    let active = true;
    const start = performance.now();

    const init = async () => {
      try {
        if ("fonts" in document) {
          await document.fonts.ready;
        }
      } catch {
        // Continue safely if fonts API is unavailable
      }
      const elapsed = performance.now() - start;
      const minDisplayDuration = 800; // Sane visual pacing to prevent sub-frame flicker
      const remaining = Math.max(0, minDisplayDuration - elapsed);

      window.setTimeout(() => {
        if (active) onDone();
      }, remaining);
    };

    init();
    return () => {
      active = false;
    };
  }, [onDone]);

  return (
    <motion.div
      role="status"
      aria-label="Initializing TrustChain cryptographic session"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#070707]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE.out }}
    >
      <div className="mb-6 flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={1.8} aria-hidden>
          <path d="M12 3l7 2.5v6c0 4.2-3 8-7 9-4-1-7-4.8-7-9v-6z" fill="#111111" />
          <path d="M8.5 12.2l2.4 2.4 4.6-5" />
        </svg>
        <span className="font-display text-xl font-extrabold tracking-wider text-gradient">TRUSTCHAIN</span>
      </div>
      <BlockchainLoader label="Establishing cryptographic trust channel" />
    </motion.div>
  );
}
