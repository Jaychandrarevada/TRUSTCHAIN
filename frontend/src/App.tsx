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
import { AnimatePresence } from "framer-motion";
import { BootSequence } from "@/components/BootSequence";
import { RouteLoadingOverlay } from "@/components/motion/RouteLoadingOverlay";
import { AppRoutes } from "@/routes";

/**
 * Whether to play the brand intro animation on the landing page.
 * Honors WCAG 2.3.3 reduced motion preferences.
 */
function shouldPlayBoot(): boolean {
  if (typeof window === "undefined") return false;
  const isLanding = window.location.pathname === "/" || window.location.pathname === "";
  if (!isLanding) return false;
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
  const isLanding = typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "");
  const [booting, setBooting] = useState(() => isLanding && shouldPlayBoot());
  const [initializingRoute, setInitializingRoute] = useState(() => !isLanding);

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
              <AnimatePresence mode="wait">
                {booting && <BootSequence key="boot" onDone={() => setBooting(false)} />}
                {initializingRoute && (
                  <RouteLoadingOverlay key="route-init" onDone={() => setInitializingRoute(false)} />
                )}
              </AnimatePresence>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
