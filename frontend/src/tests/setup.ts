/** Vitest setup — RTL matchers + jsdom polyfills. */
import "@testing-library/jest-dom/vitest";

// jsdom lacks matchMedia (used by framer-motion's reduced-motion hook).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
