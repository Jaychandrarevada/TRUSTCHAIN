/** 403 — states who you are and offers account switching (spec §4.16). */
import { Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <Lock className="h-12 w-12 text-warning-700" aria-hidden />
      <h1 className="text-2xl font-bold">You don't have access</h1>
      <p className="text-sm text-text-secondary">
        {session
          ? `Signed in with roles: ${session.roles.join(", ")}. This area needs different permissions.`
          : "You need to sign in to view this page."}
      </p>
      <div className="flex gap-2">
        <Link to="/home"><Button variant="secondary">My home</Button></Link>
        <Button onClick={async () => { await logout(); navigate("/login"); }}>Switch account</Button>
      </div>
    </div>
  );
}
