# Manual Accessibility Checklist (WCAG 2.2 AA)

Automated axe covers ~40% of WCAG; these require human/AT verification (UI/UX spec §12.1). Test on the **verify page, wallet claim, and share builder** — the flows a diverse public depends on.

| # | Criterion | How to test | Pass condition |
|---|---|---|---|
| A1 | Keyboard only | Unplug mouse; Tab through verify → claim → share | Every action reachable; no trap; visible focus |
| A2 | Focus order | Tab order follows visual order | Logical, no jumps |
| A3 | Focus not obscured (2.4.11, new in 2.2) | Scroll with sticky bars present | Focused element never hidden behind sticky UI |
| A4 | Screen reader — verdict | NVDA/VoiceOver on `/v/:uid` | Verdict announced via role=status; checks read as a list |
| A5 | Screen reader — claim | Complete claim with SR only | OTP/fields labelled; success announced |
| A6 | Contrast | Verify verdict text + body | ≥ 4.5:1 body, verdict target ≥ 7:1 (token-validated) |
| A7 | Color-blind | Deuteranopia/protanopia sim on 7 verdicts | Each distinguishable by icon+text, not hue |
| A8 | Reduced motion | OS "reduce motion" on | Verdict settle/QR animations collapse to fades |
| A9 | Zoom 200% | Browser zoom to 200% | No content loss/overlap; no horizontal scroll on body |
| A10 | Target size (2.5.8, new in 2.2) | Measure interactive targets | ≥ 24×24 CSS px (we standardize 44 px touch) |
| A11 | Forms | Submit empty/invalid | Error summary focuses; field errors linked via aria-describedby |
| A12 | Language | Switch/inspect lang attr | `lang` set; content matches |

Record results in the [accessibility report](../reports/ACCESSIBILITY-REPORT.md). Any A1–A7 failure on the verify path is a release blocker.
