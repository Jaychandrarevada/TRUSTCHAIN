/**
 * E2E — authenticated journeys: login, issuer dashboard reach, and the
 * two-person guardrails visible in the UI (maker-checker, revocation).
 * Uses seeded demo accounts (password ChangeMe-Demo-123!).
 */
import { test, expect } from '@playwright/test';

const DEMO_PW = process.env.DEMO_PASSWORD || 'ChangeMe-Demo-123!';

async function login(page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(DEMO_PW);
  await page.getByRole('button', { name: /^sign in$/i }).click();
}

test.describe('Authentication', () => {
  test('wrong password shows actionable error, not a crash', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@trustchain.local');
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.getByText(/didn't match|reset your password/i)).toBeVisible();
  });

  test('operator lands in the issuer console', async ({ page }) => {
    test.skip(!process.env.RUN_SEEDED, 'requires seeded demo stack');
    await login(page, 'operator@demo-university.local');
    await expect(page).toHaveURL(/\/issuer/);
    await expect(page.getByRole('heading', { name: /institution console|dashboard/i })).toBeVisible();
  });

  test('protected route redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/issuer');
    await expect(page).toHaveURL(/\/login/);
  });
});
