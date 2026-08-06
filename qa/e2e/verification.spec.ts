/**
 * E2E — public verification golden path (the product's reputation surface).
 * No login; runs on every browser/device in the matrix.
 */
import { test, expect } from '@playwright/test';

const CERT = process.env.CERT_UID; // seeded valid certificate

test.describe('Public verification', () => {
  test('unknown ID shows a clear, neutral not-found', async ({ page }) => {
    await page.goto('/v/TC-0000-0000-0000');
    await expect(page.getByText(/no certificate found/i)).toBeVisible();
  });

  test('verify hub rejects malformed IDs before navigating', async ({ page }) => {
    await page.goto('/verify');
    await page.getByLabel(/certificate id/i).first().fill('garbage');
    await page.getByRole('button', { name: /^verify$/i }).click();
    await expect(page.getByText(/doesn't look like a certificate id/i)).toBeVisible();
  });

  test('valid certificate shows VALID verdict + checks + proof', async ({ page }) => {
    test.skip(!CERT, 'CERT_UID not seeded');
    await page.goto(`/v/${CERT}`);
    // role=status announces the verdict (a11y contract)
    await expect(page.getByRole('status')).toContainText(/valid certificate/i);
    await expect(page.getByText(/verification checks/i)).toBeVisible();
    await page.getByText(/proof & blockchain details/i).click();
    await expect(page.getByText(/merkle root/i)).toBeVisible();
  });
});
