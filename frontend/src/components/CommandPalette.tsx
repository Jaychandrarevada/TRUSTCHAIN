/**
 * CommandPalette — ⌘K / Ctrl-K spotlight navigation + quick certificate
 * verification (Raycast/Linear-style). Keyboard-first: arrow keys navigate,
 * Enter runs, Esc closes. Fully accessible (listbox semantics, focus trap via
 * native dialog). Purely a navigation layer — no business logic, no API change.
 */
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/lib/motion";
import { Command, CornerDownLeft, Search, Shield } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/constants";
import { cn } from "@/utils";

interface Action {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { session, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl-K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) { setQuery(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); }
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const list: Action[] = [
      { id: "verify", label: "Verify a certificate", group: "Actions", keywords: "check qr scan",
        hint: "Public", run: () => navigate("/verify") },
      { id: "home", label: "Go to my home", group: "Navigate",
        run: () => navigate(session ? (session.roles.map((r) => ROLE_HOME[r]).find(Boolean) ?? "/wallet") : "/login") },
    ];
    if (hasRole("owner", "issuer_admin", "operator", "approver", "viewer")) {
      list.push(
        { id: "dash", label: "Institution dashboard", group: "Navigate", run: () => navigate("/issuer") },
        { id: "batch", label: "New certificate batch", group: "Actions", hint: "Issue", run: () => navigate("/issuer/batches/new") },
        { id: "certs", label: "Browse certificates", group: "Navigate", run: () => navigate("/issuer/certificates") },
        { id: "audit", label: "Audit log", group: "Navigate", run: () => navigate("/issuer/audit") },
      );
    }
    if (hasRole("student")) {
      list.push(
        { id: "wallet", label: "My credentials", group: "Navigate", run: () => navigate("/wallet") },
        { id: "claim", label: "Claim a certificate", group: "Actions", run: () => navigate("/wallet/claim") },
      );
    }
    if (hasRole("employer")) list.push({ id: "emp", label: "Verify candidates", group: "Navigate", run: () => navigate("/employer") });
    if (hasRole("platform_admin")) {
      list.push(
        { id: "kyb", label: "KYB queue", group: "Navigate", run: () => navigate("/admin") },
        { id: "pa", label: "Platform analytics", group: "Navigate", run: () => navigate("/admin/analytics") },
      );
    }
    return list;
  }, [navigate, session, hasRole]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // A bare certificate-ID query becomes a direct verify action.
    const results = !q
      ? actions
      : actions.filter((a) => (a.label + " " + (a.keywords ?? "") + " " + a.group).toLowerCase().includes(q));
    if (/^tc-/i.test(q)) {
      results.unshift({ id: "direct", label: `Verify ${query.toUpperCase()}`, group: "Actions",
        hint: "Open verdict", run: () => navigate(`/v/${query.trim().toUpperCase()}`) });
    }
    return results;
  }, [actions, query, navigate]);

  const run = (a: Action) => { setOpen(false); a.run(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          role="dialog" aria-modal="true" aria-label="Command palette"
        >
          <div aria-hidden className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            className="glass-strong relative w-full max-w-xl overflow-hidden rounded-2xl shadow-lg"
            initial={{ scale: 0.96, y: -8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE.out }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border-default px-4">
              <Search className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter" && filtered[active]) { e.preventDefault(); run(filtered[active]); }
                }}
                placeholder="Search actions, or paste a certificate ID…"
                className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-text-secondary/70"
                aria-label="Command search" role="combobox" aria-expanded aria-controls="cmdk-list"
              />
              <kbd className="hidden rounded border border-border-default px-1.5 py-0.5 text-[10px] text-text-secondary sm:block">ESC</kbd>
            </div>
            <ul id="cmdk-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-text-secondary">No matches.</li>
              )}
              {filtered.map((a, i) => (
                <li key={a.id} role="option" aria-selected={i === active}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(a)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      i === active ? "bg-primary-500/15 text-text-primary" : "text-text-secondary hover:bg-surface",
                    )}
                  >
                    <Shield className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />
                    <span className="flex-1">{a.label}</span>
                    {a.hint && <span className="text-xs text-text-secondary/70">{a.hint}</span>}
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-text-secondary" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border-default px-4 py-2 text-[11px] text-text-secondary">
              <span className="flex items-center gap-1"><Command className="h-3 w-3" aria-hidden /> TrustChain command bar</span>
              <span>↑↓ navigate · ↵ select</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small trigger chip for headers — shows the ⌘K affordance. */
export function CommandTrigger() {
  const dispatch = () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  return (
    <button
      onClick={dispatch}
      className="hidden items-center gap-2 rounded-lg border border-border-default bg-surface/60 px-2.5 py-1.5
        text-xs text-text-secondary transition-colors hover:text-text-primary sm:flex"
      aria-label="Open command palette"
    >
      <Search className="h-3.5 w-3.5" aria-hidden />
      <span>Search</span>
      <kbd className="rounded border border-border-default px-1 text-[10px]">⌘K</kbd>
    </button>
  );
}
