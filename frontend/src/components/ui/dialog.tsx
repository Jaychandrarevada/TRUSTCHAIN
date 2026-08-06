/**
 * Dialog — native <dialog>-based modal: browser-managed focus trap + Esc,
 * labelled by its title, scrim click closes (spec §7 Dialog).
 * ConfirmDialog adds the typed-confirmation pattern for irreversible actions
 * (revocation, BR-11 — spec §5.1 "irreversibility is visually loud").
 */
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Dialog({ open, onClose, title, children, size = "md" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // scrim click
      className={cn(
        "w-full rounded-lg border border-border-default bg-raised p-0 text-text-primary shadow-lg",
        "backdrop:bg-black/50",
        { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size],
      )}
    >
      <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="md" className="-mr-2" onClick={onClose} aria-label="Close dialog">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="px-6 py-4">{children}</div>
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  /** When set, user must type this exact word to enable confirm (e.g. REVOKE). */
  typedConfirmation?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, body, confirmLabel, typedConfirmation, loading,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const blocked = !!typedConfirmation && typed !== typedConfirmation;

  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-4 text-sm">
        <div>{body}</div>
        {typedConfirmation && (
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">
              Type <span className="font-mono">{typedConfirmation}</span> to continue
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="h-10 rounded-sm border border-border-default bg-surface px-3 font-mono"
              autoComplete="off"
            />
          </label>
        )}
        <div className="flex justify-end gap-2">
          {/* Cancel is the safe default — danger button is never auto-focused */}
          <Button variant="secondary" onClick={onClose} autoFocus>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={blocked} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
