/**
 * Tailwind configuration — binds utilities to the TrustChain design tokens
 * (UI/UX spec §6/§15), elevated for the 2026 premium visual system.
 *
 * Semantic tokens (bg-surface, text-primary, verdict-*) are UNCHANGED so every
 * existing component keeps working; this file only ADDS premium primitives:
 * glass elevation, ambient glow, gradient-mesh backgrounds, and motion keyframes.
 */
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary — Metallic Gold scale (Black & Gold brand). Gold carries trust,
        // verification, authority, prestige. Sparingly, on obsidian black.
        // Anchored on #D4AF37 (accent) / #E8C96B (soft) per brand spec.
        primary: {
          50: "#FBF7E6", 100: "#F7ECC4", 200: "#F0DD97", 300: "#E8C96B",
          400: "#DDBF4E", 500: "#D4AF37", 600: "#B8912B", 700: "#937021",
          800: "#6B5115", 900: "#47360D",
          DEFAULT: "#D4AF37", foreground: "#070707",
        },
        // Champagne / soft-gold accent for ambient glow + gradient mesh
        accent: {
          400: "#E8C96B", 500: "#D4AF37", 600: "#B8912B",
        },
        // Semantic surfaces (CSS variables switch light/dark, spec §6.2)
        page: "var(--tc-bg-page)",
        surface: "var(--tc-bg-surface)",
        raised: "var(--tc-bg-raised)",
        glass: "var(--tc-glass-bg)",
        "text-primary": "var(--tc-text-primary)",
        "text-secondary": "var(--tc-text-secondary)",
        "border-default": "var(--tc-border-default)",
        "border-glass": "var(--tc-glass-border)",
        // Status scales
        success: { 100: "#DCFCE7", 400: "#4ADE80", 500: "#22C55E", 700: "#15803D" },
        warning: { 100: "#FEF3C7", 400: "#FBBF24", 700: "#B45309" },
        danger: { 100: "#FEE2E2", 400: "#F87171", 700: "#B91C1C", 800: "#991B1B" },
        info: { 100: "#E0F2FE", 400: "#38BDF8", 700: "#0369A1" },
      },
      fontFamily: {
        // Self-hosted @fontsource families (variable = "* Variable")
        display: ["Sora Variable", "Sora", "system-ui", "sans-serif"],
        sans: ["Inter Variable", "Inter", "Noto Sans Devanagari", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Fluid display scale for hero typography
        "display-lg": ["clamp(2.75rem, 6vw, 4.5rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display": ["clamp(2.25rem, 4.5vw, 3.5rem)", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
      },
      borderRadius: { sm: "6px", md: "10px", lg: "14px", xl: "20px", "2xl": "28px" },
      boxShadow: {
        sm: "0 1px 2px rgba(15,23,42,.06)",
        md: "0 4px 16px rgba(15,23,42,.08)",
        lg: "0 12px 40px rgba(15,23,42,.12)",
        // Premium glass elevation + ambient glows
        glass: "0 8px 32px rgba(7,7,7,.18), inset 0 1px 0 rgba(255,255,255,.12)",
        "glass-dark": "0 12px 44px rgba(0,0,0,.6), inset 0 1px 0 rgba(212,175,55,.16)",
        glow: "0 0 0 1px rgba(212,175,55,.30), 0 8px 30px -6px rgba(212,175,55,.50)",
        "glow-lg": "0 0 0 1px rgba(212,175,55,.28), 0 20px 70px -18px rgba(212,175,55,.55)",
        "glow-success": "0 0 40px -8px rgba(34,197,94,.45)",
        "glow-danger": "0 0 40px -8px rgba(185,28,28,.45)",
      },
      backdropBlur: { xs: "2px", glass: "16px" },
      transitionDuration: { fast: "120ms", standard: "200ms", overlay: "300ms", settle: "450ms" },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // gentle overshoot
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      backgroundImage: {
        "mesh-primary":
          "radial-gradient(60% 60% at 20% 20%, rgba(212,175,55,.30), transparent 60%), " +
          "radial-gradient(50% 50% at 80% 10%, rgba(184,145,43,.22), transparent 55%), " +
          "radial-gradient(60% 60% at 70% 80%, rgba(232,201,107,.16), transparent 60%)",
        "grid-fade":
          "linear-gradient(to right, var(--tc-grid-line) 1px, transparent 1px), " +
          "linear-gradient(to bottom, var(--tc-grid-line) 1px, transparent 1px)",
      },
      keyframes: {
        "aurora-drift": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)", opacity: "0.9" },
          "50%": { transform: "translate3d(2%,-3%,0) scale(1.08)", opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%,100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "border-flow": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Infinite trust-marquee (track holds two copies; shift by half)
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Slow diagonal gloss sweep — the credential's "micro reflection"
        sheen: {
          "0%, 100%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "aurora-drift": "aurora-drift 18s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "border-flow": "border-flow 6s ease infinite",
        marquee: "marquee 38s linear infinite",
        sheen: "sheen 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
