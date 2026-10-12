/**
 * Routing — lazy route-splitting per portal (PART 15) + role guards.
 * Guards are UX-level redirects; the server is the authoritative RBAC
 * enforcement (spec §11.3 — UI checks are cosmetic).
 */
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  BarChart3, Boxes, Building2, FileCheck2, LayoutDashboard, ListChecks,
  Network, ScrollText, Search, Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/constants";
import { ConsoleLayout, PublicLayout } from "@/layouts";
import { BlockchainLoader } from "@/components/motion/BlockchainLoader";

// ── Lazy pages (route-level code splitting) ──────────────────────────────────
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const VerifyHub = lazy(() => import("@/pages/verify/VerifyHub"));
const VerdictPage = lazy(() => import("@/pages/verify/VerdictPage"));
const SharePage = lazy(() => import("@/pages/verify/SharePage"));
const WalletHome = lazy(() => import("@/pages/student/WalletHome"));
const WalletCertificate = lazy(() => import("@/pages/student/WalletCertificate"));
const ClaimPage = lazy(() => import("@/pages/student/ClaimPage"));
const IssuerDashboard = lazy(() => import("@/pages/issuer/Dashboard"));
const BatchesList = lazy(() => import("@/pages/issuer/BatchesList"));
const NewBatch = lazy(() => import("@/pages/issuer/NewBatch"));
const BatchDetail = lazy(() => import("@/pages/issuer/BatchDetail"));
const Certificates = lazy(() => import("@/pages/issuer/Certificates"));
const CertificateAdmin = lazy(() => import("@/pages/issuer/CertificateAdmin"));
const AuditLogs = lazy(() => import("@/pages/issuer/AuditLogs"));
const EmployerVerify = lazy(() => import("@/pages/employer/EmployerVerify"));
const AdminKyb = lazy(() => import("@/pages/admin/KybQueue"));
const AdminAnalytics = lazy(() => import("@/pages/admin/PlatformAnalytics"));
const TrustNetwork = lazy(() => import("@/pages/admin/TrustNetwork"));
const NotFound = lazy(() => import("@/pages/errors/NotFound"));
const Forbidden = lazy(() => import("@/pages/errors/Forbidden"));

// ── Guard ─────────────────────────────────────────────────────────────────────
function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { isAuthenticated, hasRole } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasRole(...roles)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

/** Post-login landing: routes users to their portal by highest role. */
function HomeRedirect() {
  const { session, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const home = session!.roles.map((r) => ROLE_HOME[r]).find(Boolean) ?? "/wallet";
  return <Navigate to={home} replace />;
}

// ── Portal nav configs (role-filtered sidebars, spec §2.2) ───────────────────
const issuerNav = [
  { to: "/issuer", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" aria-hidden /> },
  { to: "/issuer/batches", label: "Batches & Approvals", icon: <Boxes className="h-4 w-4" aria-hidden /> },
  { to: "/issuer/batches/new", label: "New batch", icon: <FileCheck2 className="h-4 w-4" aria-hidden /> },
  { to: "/issuer/certificates", label: "Certificates", icon: <ListChecks className="h-4 w-4" aria-hidden /> },
  { to: "/issuer/audit", label: "Audit log", icon: <ScrollText className="h-4 w-4" aria-hidden /> },
];
const walletNav = [
  { to: "/wallet", label: "My credentials", icon: <Wallet className="h-4 w-4" aria-hidden /> },
  { to: "/wallet/claim", label: "Claim a certificate", icon: <FileCheck2 className="h-4 w-4" aria-hidden /> },
];
const employerNav = [
  { to: "/employer", label: "Verify", icon: <Search className="h-4 w-4" aria-hidden /> },
];
const adminNav = [
  { to: "/admin", label: "KYB queue", icon: <Building2 className="h-4 w-4" aria-hidden /> },
  { to: "/admin/network", label: "Trust network", icon: <Network className="h-4 w-4" aria-hidden /> },
  { to: "/admin/analytics", label: "Mission Control", icon: <BarChart3 className="h-4 w-4" aria-hidden /> },
];

const ISSUER_ROLES = ["owner", "issuer_admin", "approver", "operator", "viewer"];

export function AppRoutes() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center px-4">
        <BlockchainLoader label="Preparing your secure session" />
      </div>
    }>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/verify" element={<VerifyHub />} />
          <Route path="/v/:certUid" element={<VerdictPage />} />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/403" element={<Forbidden />} />
        </Route>

        <Route path="/home" element={<HomeRedirect />} />

        {/* Student wallet */}
        <Route element={<RequireRole roles={["student"]}><ConsoleLayout title="My wallet" nav={walletNav} /></RequireRole>}>
          <Route path="/wallet" element={<WalletHome />} />
          <Route path="/wallet/claim" element={<ClaimPage />} />
          <Route path="/wallet/certificates/:certUid" element={<WalletCertificate />} />
        </Route>

        {/* Issuer console */}
        <Route element={<RequireRole roles={ISSUER_ROLES}><ConsoleLayout title="Institution console" nav={issuerNav} /></RequireRole>}>
          <Route path="/issuer" element={<IssuerDashboard />} />
          <Route path="/issuer/batches" element={<BatchesList />} />
          <Route path="/issuer/batches/new" element={<NewBatch />} />
          <Route path="/issuer/batches/:batchId" element={<BatchDetail />} />
          <Route path="/issuer/certificates" element={<Certificates />} />
          <Route path="/issuer/certificates/:certUid" element={<CertificateAdmin />} />
          <Route path="/issuer/audit" element={<AuditLogs />} />
        </Route>

        {/* Employer portal */}
        <Route element={<RequireRole roles={["employer"]}><ConsoleLayout title="Employer portal" nav={employerNav} /></RequireRole>}>
          <Route path="/employer" element={<EmployerVerify />} />
        </Route>

        {/* Platform admin */}
        <Route element={<RequireRole roles={["platform_admin"]}><ConsoleLayout title="Platform admin" nav={adminNav} /></RequireRole>}>
          <Route path="/admin" element={<AdminKyb />} />
          <Route path="/admin/network" element={<TrustNetwork />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
        </Route>

        <Route path="*" element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
