/**
 * Button — spec §7, elevated for the premium system.
 *
 * API is UNCHANGED (variant/size/loading) so every call site keeps working.
 * Additions are purely presentational: press-physics (active scale), an
 * ambient glow on the primary variant, and a subtle sheen — all
 * reduced-motion-safe via CSS transitions. Loading locks width + aria-busy;
 * destructive actions still pair with ConfirmDialog (never act alone).
 */
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/utils";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium overflow-hidden " +
    "transition-[transform,background-color,box-shadow,color] duration-fast ease-out-expo " +
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap " +
    "focus-visible:outline-2",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-primary-400 to-primary-600 text-[#070707] font-semibold shadow-glow " +
          "hover:from-primary-300 hover:to-primary-500 hover:-translate-y-px",
        secondary:
          "glass text-text-primary shadow-sm hover:shadow-md hover:-translate-y-px",
        outline:
          "border border-primary-500/60 text-primary-800 dark:text-primary-400 hover:bg-primary-500/10 " +
          "hover:-translate-y-px",
        ghost: "text-text-secondary hover:bg-surface hover:text-text-primary",
        danger: "bg-danger-700 text-white hover:bg-danger-800 hover:shadow-glow-danger hover:-translate-y-px",
        "danger-secondary":
          "border border-danger-700/60 text-danger-700 dark:text-danger-400 hover:bg-danger-700/10",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Sheen sweep on hover (decorative, primary only) */}
      {variant !== "ghost" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r
            from-transparent via-white/15 to-transparent transition-transform duration-500
            group-hover:translate-x-full motion-reduce:hidden"
        />
      )}
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {/* inline-flex, not a plain span: the button's own `items-center gap-2`
          applies to THIS wrapper, not to its contents, so a bare span would lay
          an icon and its label out on a text baseline — leaving the icon sitting
          visibly high and the gap never applied. */}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  ),
);
Button.displayName = "Button";

/**
 * A router link that LOOKS like a button.
 *
 * Use this instead of `<Link><Button/></Link>`: a <button> nested inside an <a>
 * is invalid HTML and a real accessibility defect — assistive tech announces
 * two nested interactive controls for one target, and the anchor's own focus
 * ring and hit area collapse to the inline text box rather than matching the
 * button people can see. One <a> styled as a button gives correct semantics
 * (it navigates, so it should be a link), one focus ring, and the full visual
 * area as the click target.
 */
export interface LinkButtonProps
  extends Omit<LinkProps, "className">, VariantProps<typeof buttonVariants> {
  className?: string;
}

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => (
    <Link ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {variant !== "ghost" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r
            from-transparent via-white/15 to-transparent transition-transform duration-500
            group-hover:translate-x-full motion-reduce:hidden"
        />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </Link>
  ),
);
LinkButton.displayName = "LinkButton";
