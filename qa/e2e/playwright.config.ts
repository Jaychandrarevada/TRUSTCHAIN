/**
 * Playwright E2E config (PART 4/12) — golden path + cross-browser matrix.
 * Runs against a full stack (backend :5000 seeded, frontend :3000).
 *
 * Setup: npm i -D @playwright/test && npx playwright install
 * Run:   npx playwright test --config qa/e2e/playwright.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: '../reports/e2e' }], ['list']],
  use: {
    baseURL: process.env.FE_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Cross-platform compatibility matrix (PART 12).
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },        // Safari engine
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },        // Android
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },      // iOS
  ],
});
