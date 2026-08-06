/**
 * Card primitives — spec §15 tokens, elevated for the premium system.
 *
 * The base Card API is UNCHANGED. New optional props are additive:
 *   - `glass`  → frosted glass surface (glassmorphism)
 *   - `hover`  → lift + shadow interaction on hover
 *   - `glow`   → animated gradient border (featured cards)
 * Existing call sites that pass none of these render the standard solid card.
 */
import { type HTMLAttributes } from "react";
import { cn } from "@/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ className, glass, hover, glow, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        glass ? "glass shadow-glass dark:shadow-glass-dark" : "border border-border-default bg-surface shadow-sm",
        glow && "border-gradient",
        hover && "lift hover:shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-6 pb-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-secondary", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-2", className)} {...props} />;
}
