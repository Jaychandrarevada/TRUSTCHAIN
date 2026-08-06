/** Entry point. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts (no CDN dependency — offline-safe, private, CSP-strict).
import "@fontsource-variable/sora";
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import App from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
