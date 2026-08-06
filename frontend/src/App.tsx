/**
 * App shell — providers (Query, Auth, Toast), offline banner, and a top-level
 * error boundary so an unexpected crash renders the 500 experience instead of
 * a blank page (spec §14).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, useEffect, useState, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/misc";
import { CommandPalette } from "@/components/CommandPalette";
import { AiAssistant } from "@/components/AiAssistant";
import { BootSequence, BOOT_SEEN_KEY } from "@/components/BootSequence";
import { AppRoutes } from "@/routes";

/**
 * Whether to play the first-visit brand intro. Reduced-motion users never see
 * it (WCAG 2.3.3) — the check runs once, synchronously, before first paint,
 * so there is never a flash of the intro that then immediately vanishes.
 */
function shouldPlayBoot(): boolean {
  try {
    if (localStorage.getItem(BOOT_SEEN_KEY)) return false;
  } catch {
    return false; // no storage (private mode edge case) — never loop the intro
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // SWR default; per-query overrides where fresher data matters
      retry: 1,                // http layer already handles 429/refresh retries
      refetchOnWindowFocus: false,
    },
  },
});

/** Offline detection banner (spec §14 offline mode). */
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (!offline) return null;
  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-warning-700 px-4 py-2 text-sm text-white">
      <WifiOff className="h-4 w-4" aria-hidden />
      You're offline — some information may be out of date.
    </div>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <ErrorState
            title="Something went wrong on our side"
            detail="Your work is saved. Reload the page, or contact support if this keeps happening."
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // The app mounts and is fully interactive immediately — the boot sequence,
  // when shown, is a purely additive overlay on top. It never gates usability.
  const [booting, setBooting] = useState(shouldPlayBoot);
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <OfflineBanner />
              <CommandPalette />
              <AiAssistant />
              <AppRoutes />
              {booting && <BootSequence onDone={() => setBooting(false)} />}
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
