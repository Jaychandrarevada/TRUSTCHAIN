/**
 * AiAssistant — global "Ask AI" chat drawer, mounted once app-wide.
 *
 * Advisory only: every reply is labeled AI-generated, and the assistant is
 * explicitly instructed (system prompt, backend app/services/ai_service.py)
 * never to claim it can verify a certificate — the blockchain verification
 * pipeline remains the sole source of truth. Renders nothing when the
 * backend has no ANTHROPIC_API_KEY configured (checked via /ai/status) or
 * when the user isn't signed in — every AI endpoint requires auth to bound
 * the real, billed cost of each call.
 *
 * Open programmatically from anywhere:
 *   window.dispatchEvent(new CustomEvent("tc:ai-open", { detail: { seed: "..." } }))
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/lib/motion";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { aiApi } from "@/services/api";
import { ApiError } from "@/services/http";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

interface Turn { role: "user" | "assistant"; text: string }

export function AiAssistant() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const status = useQuery({ queryKey: ["ai", "status"], queryFn: aiApi.status, staleTime: 5 * 60_000 });
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const seed = (e as CustomEvent<{ seed?: string }>).detail?.seed;
      if (seed) setInput(seed);
    };
    window.addEventListener("tc:ai-open", onOpen);
    return () => window.removeEventListener("tc:ai-open", onOpen);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  if (!isAuthenticated || !status.data?.enabled) return null;

  const send = async () => {
    const message = input.trim();
    if (!message || pending) return;
    setInput("");
    setError(null);
    const nextTurns: Turn[] = [...turns, { role: "user", text: message }];
    setTurns(nextTurns);
    setPending(true);
    try {
      const res = await aiApi.chat(
        message,
        { path: location.pathname },
        nextTurns.slice(-10).map((t) => ({ role: t.role, text: t.text })),
      );
      setTurns((t) => [...t, { role: "assistant", text: res.reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.problem.detail : "The assistant is unavailable right now.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-primary-400 to-primary-600 text-[#070707] shadow-glow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bot className="h-5 w-5" aria-hidden />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            role="dialog" aria-label="AI assistant"
            className="glass-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border-default/60 shadow-glow-lg"
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE.out }}
          >
            <div className="flex items-center justify-between border-b border-border-default/60 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary-500" aria-hidden /> TrustChain Assistant
              </span>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-text-secondary hover:text-text-primary">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <p className="border-b border-border-default/50 bg-primary-500/5 px-4 py-2 text-[11px] text-text-secondary">
              AI-generated guidance — advisory only. The blockchain verification pipeline is
              always the source of truth for whether a certificate is valid.
            </p>

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
              {turns.length === 0 && (
                <p className="text-sm text-text-secondary">
                  Ask how TrustChain works, how to claim a certificate, how issuance and
                  approval work, or anything else about this page. I can't verify a certificate
                  myself — use the real Verify page for that.
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {turns.map((t, i) => (
                  <li key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                      t.role === "user" ? "bg-primary-500/15 text-text-primary" : "glass text-text-primary",
                    )}>
                      {t.role === "assistant" && (
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-primary-800 dark:text-primary-400">
                          AI-generated
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{t.text}</p>
                    </div>
                  </li>
                ))}
                {pending && (
                  <li className="flex justify-start">
                    <div className="glass rounded-xl px-3 py-2 text-sm text-text-secondary">Thinking…</div>
                  </li>
                )}
              </ul>
              {error && <p className="mt-2 text-xs text-danger-700 dark:text-danger-400">{error}</p>}
            </div>

            <form className="flex items-center gap-2 border-t border-border-default/60 p-3"
              onSubmit={(e) => { e.preventDefault(); void send(); }}>
              <input
                value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…" aria-label="Message"
                className="flex-1 rounded-lg border border-border-default/60 bg-surface/60 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              />
              <Button type="submit" size="sm" disabled={pending || !input.trim()}>
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
