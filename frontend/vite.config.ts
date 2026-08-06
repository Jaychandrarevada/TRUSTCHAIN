/**
 * Vite configuration.
 * - `/api` proxies to the Flask backend in dev (no CORS friction locally).
 * - Manual chunks split the heavy, rarely-shared libs (charts, web3) so the
 *   public verification route stays lean (UI/UX NFR-LOC-02 performance budget).
 * - Vitest config colocated (jsdom + RTL, coverage thresholds).
 */
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    // IPv4 host + 5173 avoids the Windows reserved-port EACCES on ::1:3000.
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:5000", changeOrigin: true },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          web3: ["ethers"],
          vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
        },
      },
    },
  },
  // Vitest (Jest-compatible API on the Vite toolchain)
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**", "src/**/*.d.ts", "src/main.tsx"],
    },
  },
} as never);
