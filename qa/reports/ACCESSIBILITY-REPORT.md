# TrustChain — Accessibility Compliance Report (PART 11)

| Field | Value |
|---|---|
| Standard | WCAG 2.2 Level AA |
| Scope | Public verification (flagship), wallet, auth, landing |
| Method | axe-core automated (`qa/accessibility/axe-audit.mjs`) + manual AT checklist + code review vs UI/UX spec §12 |
| Requirement | NFR-ACC-01: zero axe critical/serious on verify page + wallet |

## 1. Design-level conformance (verified in code review)

The frontend was **built to the accessibility contract** (UI/UX spec §12), verified against the component code:

| Criterion | Implementation | Evidence |
|---|---|---|
| Verdict never color-only (1.4.1) | 7 verdicts = distinct icon + label + color | `constants/VERDICTS`; `verdict.test.tsx` asserts text labels for all 7 |
| Status announcements (4.1.3) | Verdict panel `role=status` | `verdict.test.tsx::announces the verdict via role=status` |
| Visible focus (2.4.7) | `:focus-visible` ring, never removed | `globals.css` |
| Focus not obscured (2.4.11, new 2.2) | Sticky bars pad scroll | Layout code |
| Labels + linked errors (3.3.1/3.3.2) | `FieldWrapper` label + `aria-describedby` error | `field.tsx`; claim form errors linked |
| Reduced motion (2.3.3) | Media query + framer `useReducedMotion` | `globals.css` + `verdict.tsx` |
| Target size (2.5.8, new 2.2) | 44 px touch targets | Button `sm/md/lg` = 32/40/48; icon buttons 44 |
| Skip link (2.4.1) | Skip-to-content on every layout | `layouts/index.tsx` |
| Keyboard dialogs (2.1.2) | Native `<dialog>` focus trap + Esc | `dialog.tsx` |
| Contrast (1.4.3) | Token pairs ≥ 4.5:1 (verdict ≥ 7:1 target) | `globals.css` token scale |

## 2. Automated audit (axe-core)

`qa/accessibility/axe-audit.mjs` drives Playwright + axe over the WCAG 2.2 AA ruleset on 5 surfaces and **exits non-zero on any critical/serious violation** (CI gate). Run against a running frontend:
```bash
node qa/accessibility/axe-audit.mjs   # → qa/reports/accessibility/axe-results.json
```
Status this cycle: harness built and verified; execute against the running dev server / staging to capture the results JSON. The design-level controls above make critical/serious violations unlikely on the audited surfaces.

## 3. Manual AT verification

The 12-point [manual checklist](../accessibility/manual-checklist.md) covers what axe cannot: real screen-reader journeys (claim, share, verify), keyboard-only completion, color-blind simulation, and 200% zoom. **A1–A7 failures on the verify path are release blockers.** These require a human with NVDA/VoiceOver on staging.

## 4. Localization readiness

EN + HI at GA (spec NFR-LOC-01); the token system and component library are RTL-safe and font stacks include Noto Sans Devanagari. Pseudo-locale CI check recommended before adding languages.

## 5. Recommendation

Execute the axe harness + manual checklist against staging with a real screen reader; attach `axe-results.json` and the checklist outcomes. Expected result based on design review: **pass** on the verify page and wallet (the two hardest-bar, highest-traffic surfaces).
