/** 404 — neutral, with a way forward (spec §4.16). */
import { SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <SearchX className="h-12 w-12 text-text-secondary/60" aria-hidden />
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-text-secondary">
        The page you're looking for doesn't exist or has moved.
      </p>
      <div className="flex gap-2">
        <Link to="/"><Button variant="secondary">Go home</Button></Link>
        <Link to="/verify"><Button>Verify a certificate</Button></Link>
      </div>
    </div>
  );
}
