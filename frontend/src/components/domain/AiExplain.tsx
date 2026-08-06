/**
 * AiExplainButton — on-demand plain-language explanation of already-real
 * data (a verdict, an anchor transaction). The fetcher always calls a
 * backend endpoint that recomputes the real data server-side — this
 * component only renders the result and labels it clearly as AI-generated.
 * Never gates or replaces the real verdict/proof already shown alongside it.
 */
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/services/http";

export function AiExplainButton({ label, fetcher }: { label: string; fetcher: () => Promise<string> }) {
  const [text, setText] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      setText(await fetcher());
    } catch (err) {
      setError(err instanceof ApiError && err.problem.status === 503
        ? "The AI assistant isn't configured on this deployment."
        : "Couldn't reach the AI assistant.");
    } finally {
      setPending(false);
    }
  };

  if (text) {
    return (
      <div className="rounded-lg border border-primary-500/30 bg-primary-500/5 p-3 text-sm">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-primary-800 dark:text-primary-400">
          <Sparkles className="h-3 w-3" aria-hidden /> AI-generated explanation
        </p>
        <p className="text-text-primary">{text}</p>
      </div>
    );
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={run} disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </Button>
      {error && <p className="mt-1 text-xs text-text-secondary">{error}</p>}
    </div>
  );
}
