/**
 * Layouts (spec §5 chrome + §11 responsive):
 *  - PublicLayout: minimal header + footer (landing, verify, auth)
 *  - ConsoleLayout: role-filtered sidebar (→ drawer <lg) + topbar
 * Both include the skip link and theme toggle (spec §12).
 */
import {
  Bell, ChevronRight, Contrast, LogOut, Menu, Moon, MoonStar, PanelLeftClose,
  PanelLeftOpen, ShieldCheck, Sun, User, X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { miscApi } from "@/services/api";
import { cn } from "@/utils";
import { DURATION, EASE, motionSafe, slideInLeft } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { CommandTrigger } from "@/components/CommandPalette";
import { NetworkStatus } from "@/components/NetworkStatus";
import { PageTransition } from "@/components/motion/PageTransition";

/** Shared dropdown-menu behavior (open state + Escape-to-close) so every
 * header menu — theme, notifications, profile — behaves identically instead
 * of each hand-rolling its own keyboard handling. */
function useMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return { open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) };
}

/** Reading-progress bar — a premium orientation cue on long/scrolling pages. */
function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  if (reduced) return null;
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"
    />
  );
}

/**
 * Reset scroll to top and move focus to the main landmark on route change
 * (SPA navigation ergonomics — without this, screen-reader/keyboard users
 * get no signal that the page changed, since the browser's own
 * load-and-focus behavior never fires for client-side routing).
 * Skips the very first mount: initial load already has correct focus.
 */
function useScrollReset() {
  const { pathname } = useLocation();
  const mounted = useRef(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (!mounted.current) { mounted.current = true; return; }
    document.getElementById("main")?.focus();
  }, [pathname]);
}

function Logo() {
  return (
    <Link to="/" className="group inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-b from-primary-400 to-primary-600
        text-[#070707] shadow-glow transition-transform duration-standard ease-spring group-hover:scale-105">
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-gradient">TrustChain</span>
    </Link>
  );
}

const THEME_OPTIONS = [
  { mode: "light" as const, label: "Light", icon: Sun },
  { mode: "dark" as const, label: "Dark", icon: Moon },
  { mode: "oled" as const, label: "OLED black", icon: MoonStar },
  { mode: "hc" as const, label: "High contrast", icon: Contrast },
];

function ThemeToggle() {
  const { theme, setTheme } = useAuth();
  const menu = useMenu();
  const Active = THEME_OPTIONS.find((t) => t.mode === theme)?.icon ?? Sun;
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={menu.toggle}
        aria-haspopup="menu" aria-expanded={menu.open} aria-label="Change theme">
        <Active className="h-4 w-4" aria-hidden />
      </Button>
      {menu.open && (
        <>
          <div className="fixed inset-0 z-40" onClick={menu.close} aria-hidden />
          <div role="menu" className="glass-strong absolute right-0 z-50 mt-1 w-44 rounded-xl p-1 shadow-lg">
            {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => (
              <button key={mode} role="menuitemradio" aria-checked={theme === mode}
                onClick={() => { setTheme(mode); menu.close(); }}
                className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  theme === mode ? "bg-primary-500/15 text-text-primary" : "text-text-secondary hover:bg-surface")}>
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Global notification bell — every console role, reusing the same
 * miscApi.notifications()/markNotificationRead() the wallet activity card
 * already called, just never surfaced outside that one page. */
function NotificationBell() {
  const menu = useMenu();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: miscApi.notifications,
    refetchInterval: 30_000,
  });
  const items = data?.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await miscApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={menu.toggle}
        aria-haspopup="menu" aria-expanded={menu.open} aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}>
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && (
          <span aria-hidden className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-danger-700 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {menu.open && (
        <>
          <div className="fixed inset-0 z-40" onClick={menu.close} aria-hidden />
          <div role="menu" aria-label="Notifications" className="glass-strong absolute right-0 z-50 mt-1 max-h-96 w-80 overflow-y-auto rounded-xl p-1 shadow-lg">
            {items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-text-secondary">No notifications.</p>
            )}
            {items.slice(0, 15).map((n) => (
              <button key={n.id} role="menuitem" onClick={() => !n.read && markRead(n.id)}
                className={cn("flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface",
                  !n.read && "bg-primary-500/10")}>
                <span className="flex w-full items-center gap-1.5 font-medium">
                  {!n.read && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />}
                  {n.title}
                </span>
                <span className="text-xs text-text-secondary">{n.body}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Profile menu — replaces the plain role-text + lone logout icon with a
 * proper menu (who you're signed in as, home, sign out). No new session
 * data: userId/roles already come from the existing decoded JWT claims. */
function ProfileMenu({ homeTo }: { homeTo: string }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const menu = useMenu();
  if (!session) return null;
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={menu.toggle}
        aria-haspopup="menu" aria-expanded={menu.open} aria-label="Account menu">
        <User className="h-4 w-4" aria-hidden />
      </Button>
      {menu.open && (
        <>
          <div className="fixed inset-0 z-40" onClick={menu.close} aria-hidden />
          <div role="menu" className="glass-strong absolute right-0 z-50 mt-1 w-56 rounded-xl p-1 shadow-lg">
            <div className="border-b border-border-default/60 px-3 py-2">
              <p className="truncate text-sm font-medium">{session.userId}</p>
              <p className="text-xs text-text-secondary">{session.roles.join(", ")}</p>
            </div>
            <Link to={homeTo} role="menuitem" onClick={menu.close}
              className="block rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary">
              My home
            </Link>
            <button role="menuitem" onClick={async () => { await logout(); navigate("/login"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger-700 transition-colors hover:bg-danger-700/10 dark:text-danger-400">
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Section + current-page trail, derived from the same `nav` array that
 * drives the sidebar — no new routing data, so it can never drift out of
 * sync with the real route table. Only matches exact/prefixed routes (never
 * a same-segment guess), so it never shows a misleading label on a detail
 * page that isn't itself a nav destination (e.g. a specific batch/cert). */
function Breadcrumbs({ title, nav, homeTo }: { title: string; nav: NavItem[]; homeTo: string }) {
  const { pathname } = useLocation();
  const current = nav.find((item) => pathname === item.to || pathname.startsWith(item.to + "/"));
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link to={homeTo} className="shrink-0 font-display text-lg font-semibold tracking-tight hover:text-primary-800 dark:hover:text-primary-400">
        {title}
      </Link>
      {current && current.to !== homeTo && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-secondary/60" aria-hidden />
          <span className="truncate font-medium text-text-secondary" aria-current="page">{current.label}</span>
        </>
      )}
    </nav>
  );
}

// ── Public layout ─────────────────────────────────────────────────────────────
export function PublicLayout() {
  const { isAuthenticated } = useAuth();
  useScrollReset();
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgress />
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-40 glass border-b border-border-default/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-4 text-sm text-text-secondary sm:gap-6">
            <NavLink to="/verify" className="transition-colors hover:text-text-primary">Verify</NavLink>
            <a href="/#how-it-works" className="hidden transition-colors hover:text-text-primary sm:inline">How it works</a>
            <a href="/#faq" className="hidden transition-colors hover:text-text-primary sm:inline">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <NetworkStatus className="hidden md:inline-flex" />
            <CommandTrigger />
            <ThemeToggle />
            {isAuthenticated ? (
              <Button size="sm" onClick={() => (window.location.href = "/home")}>Open app</Button>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm hover:text-primary-800 dark:hover:text-primary-400 sm:inline">Sign in</Link>
                <Link to="/register"><Button size="sm">Get started</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none"><PageTransition><Outlet /></PageTransition></main>
      <footer className="border-t border-border-default bg-surface py-8 text-sm text-text-secondary">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <p>© 2026 TrustChain — certificates that prove themselves.</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link to="/verify" className="hover:text-text-primary">Verify a certificate</Link>
            <a href="#" className="hover:text-text-primary">Privacy</a>
            <a href="#" className="hover:text-text-primary">Terms</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// ── Console layout ────────────────────────────────────────────────────────────
export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export function ConsoleLayout({ title, nav }: { title: string; nav: NavItem[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("tc-sidebar-collapsed") === "1");
  const reducedDrawer = useReducedMotion();
  const homeTo = nav[0]?.to ?? "/";
  useScrollReset();

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem("tc-sidebar-collapsed", v ? "0" : "1");
      return !v;
    });
  };

  const sidebar = (collapsedLabels: boolean) => (
    <nav aria-label={`${title} navigation`} className="flex flex-col gap-1 p-3">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.split("/").length <= 2}
          title={collapsedLabels ? item.label : undefined}
          onClick={() => setDrawerOpen(false)}
          className={({ isActive }) =>
            cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast",
              isActive ? "bg-primary-600 text-white" : "text-text-secondary hover:bg-page hover:text-text-primary")
          }
        >
          {item.icon}
          <span className={collapsedLabels ? "sr-only" : ""}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="skip-link">Skip to content</a>

      {/* Desktop glass sidebar — collapsible to icon-only, state persisted */}
      <aside className={cn(
        "hidden shrink-0 flex-col border-r border-border-default/60 glass transition-[width] duration-standard ease-out-expo lg:flex",
        collapsed ? "w-16" : "w-60",
      )}>
        <div className="flex h-16 items-center border-b border-border-default/60 px-4">
          {collapsed ? <ShieldCheck className="h-6 w-6 text-primary-500" aria-hidden /> : <Logo />}
        </div>
        <div className="flex-1">{sidebar(collapsed)}</div>
        <div className="flex flex-col gap-2 border-t border-border-default/60 p-3">
          {!collapsed && <NetworkStatus className="w-full justify-center" />}
          <Button variant="ghost" size="sm" onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={collapsed ? "w-full justify-center" : "w-full justify-start gap-2"}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden /> : <PanelLeftClose className="h-4 w-4" aria-hidden />}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer (MICROINTERACTIONS #112: slides from left, scrim blurs behind) */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: DURATION.overlay, ease: EASE.out }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-64 bg-surface shadow-lg"
              variants={motionSafe(reducedDrawer, slideInLeft)}
              initial="hidden" animate="visible" exit="exit"
            >
              <div className="flex h-16 items-center justify-between border-b border-border-default px-4">
                <Logo />
                <Button variant="ghost" size="md" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5" aria-hidden />
                </Button>
              </div>
              {sidebar(false)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-default/60 glass px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="md" className="-ml-2 lg:hidden" aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}>
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
            <Breadcrumbs title={title} nav={nav} homeTo={homeTo} />
          </div>
          <div className="flex items-center gap-2">
            <NetworkStatus className="hidden md:inline-flex lg:hidden" />
            <CommandTrigger />
            <ThemeToggle />
            <NotificationBell />
            <ProfileMenu homeTo={homeTo} />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 outline-none"><PageTransition><Outlet /></PageTransition></main>
      </div>
    </div>
  );
}
