/**
 * Shared utilities: class merging (the shadcn `cn` pattern), formatting,
 * and truncation helpers for hashes/addresses.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution (variant composition). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Locale-aware date (viewer's timezone; ISO on hover is the pattern in tables). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** 0x1234…abcd — for hashes and addresses in dense UI. */
export function truncateHash(hash: string | null | undefined, chars = 6): string {
  if (!hash) return "—";
  return hash.length <= chars * 2 + 2 ? hash : `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`;
}

/** Humanize snake_case field keys for certificate field display. */
export function humanizeKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Percentage formatting for analytics tiles. */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}
