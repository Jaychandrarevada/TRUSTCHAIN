/**
 * AuthContext — session state (JWT claims), login/logout, and theme.
 *
 * Session model: roles come from the access token's claims (decoded locally —
 * display only; the SERVER is authoritative, SEC-AUTHZ-1). A `tc:session-
 * expired` event from the http layer clears state and routes to login.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ROLE_PERMISSIONS } from "@/constants";
import { authApi } from "@/services/api";
import { getAccessToken, setTokens } from "@/services/http";

interface Session {
  userId: string;
  roles: string[];
  institutionId: string | null;
}

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<Session>;
  loginWithTokens: (roles: string[]) => Session; // wallet login path
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export type ThemeMode = "light" | "dark" | "oled" | "hc";

/** Applies a theme mode by toggling root classes (globals.css reads them). */
function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark" || mode === "oled");
  root.classList.toggle("oled", mode === "oled");
  root.classList.toggle("hc", mode === "hc");
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Decode a JWT payload without verification (display-only claims). */
function decodeClaims(token: string | null): Session | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return {
      userId: payload.sub,
      roles: payload.roles ?? [],
      institutionId: payload.institution_id ?? null,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => decodeClaims(getAccessToken()));
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (localStorage.getItem("tc-theme") as ThemeMode) ?? "dark",
  );

  // Session-expiry signal from the http layer (refresh family revoked).
  useEffect(() => {
    const onExpired = () => setSession(null);
    window.addEventListener("tc:session-expired", onExpired);
    return () => window.removeEventListener("tc:session-expired", onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    const next = decodeClaims(getAccessToken());
    if (!next) throw new Error("Malformed session token");
    setSession(next);
    return next;
  }, []);

  const loginWithTokens = useCallback((_roles: string[]) => {
    const next = decodeClaims(getAccessToken());
    if (!next) throw new Error("Malformed session token");
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout(sessionStorage.getItem("tc-rt"));
    setTokens(null);
    setSession(null);
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => !!session && roles.some((r) => session.roles.includes(r)),
    [session],
  );

  const hasPermission = useCallback(
    (permission: string) =>
      !!session && session.roles.some((r) => (ROLE_PERMISSIONS[r] ?? []).includes(permission)),
    [session],
  );

  const setTheme = useCallback((mode: ThemeMode) => {
    applyTheme(mode);
    localStorage.setItem("tc-theme", mode);
    setThemeState(mode);
  }, []);

  // Ensure DOM classes match state on mount (boot script only sets dark).
  useEffect(() => { applyTheme(theme); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ session, isAuthenticated: !!session, login, loginWithTokens, logout, hasRole, hasPermission, theme, setTheme, toggleTheme }),
    [session, login, loginWithTokens, logout, hasRole, hasPermission, theme, setTheme, toggleTheme],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
