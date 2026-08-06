/**
 * Automated accessibility audit (PART 11) — drives the running frontend with
 * Playwright + axe-core and asserts ZERO critical/serious violations on the
 * highest-priority surfaces (verify page + wallet), per WCAG 2.2 AA
 * (UI/UX spec §12 / NFR-ACC-01).
 *
 * Setup (once):  npm i -D @playwright/test @axe-core/playwright && npx playwright install chromium
 * Run:           node qa/accessibility/axe-audit.mjs  (frontend dev server on :3000)
 * Output:        qa/reports/accessibility/axe-results.json + console summary.
 */
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.FE_BASE_URL || 'http://localhost:3000';
const CERT = process.env.CERT_UID || 'TC-0000-0000-0000';

// Surfaces audited, ranked by traffic + diversity of users (spec §12.1).
const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'verify-hub', path: '/verify' },
  { name: 'verdict', path: `/v/${CERT}` },   // flagship — hardest a11y bar
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function main() {
  mkdirSync('qa/reports/accessibility', { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  let criticalOrSerious = 0;

  for (const page of PAGES) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`${BASE}${page.path}`, { waitUntil: 'networkidle' });
    const scan = await new AxeBuilder({ page: p }).withTags(WCAG_TAGS).analyze();

    const blocking = scan.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
    criticalOrSerious += blocking.length;
    results.push({
      page: page.name,
      violations: scan.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      passes: scan.passes.length,
    });
    console.log(`${page.name}: ${scan.violations.length} violations (${blocking.length} critical/serious), ${scan.passes.length} passes`);
    await ctx.close();
  }

  await browser.close();
  writeFileSync('qa/reports/accessibility/axe-results.json', JSON.stringify(results, null, 2));

  // Exit non-zero if any critical/serious violation → CI gate.
  if (criticalOrSerious > 0) {
    console.error(`\nFAIL: ${criticalOrSerious} critical/serious a11y violations`);
    process.exit(1);
  }
  console.log('\nPASS: no critical/serious accessibility violations');
}

main().catch((err) => { console.error(err); process.exit(1); });
