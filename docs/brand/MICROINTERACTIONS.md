# TrustChain — Microinteraction Catalog

**220 handcrafted microinteractions**, governed by [DESIGN-LANGUAGE.md](DESIGN-LANGUAGE.md). Every entry follows the same law: it has a **trigger**, a **response**, a **meaning** (what trust concept it reinforces), and a **reduced-motion fallback**. Timing tokens (`fast` 120ms · `standard` 200ms · `overlay` 300ms · `settle` 450ms spring · `pulse` 2.4s) are defined in [DESIGN-TOKENS.md](DESIGN-TOKENS.md).

**Reading the table:** *RM* = reduced-motion behavior. Where RM says "instant," the visual state change still happens — only the animation is removed. No interaction ever *requires* motion to convey meaning.

---

## A. Core input & feedback (1–24)

| # | Trigger | Response | Meaning | RM |
|---|---|---|---|---|
| 1 | Button hover | Lift −3px, shadow warms, subtle sheen sweep | Responsiveness, quality | No transform; color only |
| 2 | Button press | Scale 0.97, glow tightens | Tactile confirmation | Instant color |
| 3 | Primary CTA pointer near | Gentle magnetic pull (≤0.3, damped) | Invitation | Disabled |
| 4 | Button loading | Label locks width, spinner replaces text, aria-busy | Honest waiting | Static spinner |
| 5 | Input focus | Border → Trust Blue, faint focus glow rises | "You're here" | Border only |
| 6 | Input typing | Caret steady; no jitter (tabular where numeric) | Precision | Same |
| 7 | Input valid (on blur) | Border settles neutral, tiny check fades in | Quiet reassurance | Check appears instant |
| 8 | Input invalid | Border → red, message arrives below with icon | Blameless correction | Instant |
| 9 | Input error shake | Single 4px horizontal shake | "Look here" | No shake; red border |
| 10 | Required hint | Asterisk + legend, never red until submit | Calm expectation | Same |
| 11 | Toggle switch | Thumb glides 120ms, track color crossfades | State change | Instant |
| 12 | Checkbox check | Check draws in 150ms | Selection | Instant |
| 13 | Radio select | Dot scales in with soft spring | Choice | Instant |
| 14 | Dropdown open | Panel fades + 4px rise, options stagger 30ms | Arrival | Instant panel |
| 15 | Select option hover | Row tint, subtle inset | Focus | Same |
| 16 | Select confirm | Value settles, panel recedes | Resolution | Instant |
| 17 | Slider drag | Fill tracks pointer, value chip follows | Direct control | Same (no easing) |
| 18 | Stepper +/− | Value ticks with tiny settle | Increment | Instant |
| 19 | Copy click | Icon morphs clipboard→check, "Copied" whisper | Rewarding confirmation | Instant swap |
| 20 | Copy of hash | Truncated string briefly expands full, then check | Honesty (you copied the whole thing) | Instant, no expand |
| 21 | Paste detected (OTP) | Field auto-splits digits | Effortlessness | Same |
| 22 | Clear field (×) | Content fades, × recedes | Reset | Instant |
| 23 | Disabled hover | Cursor not-allowed; tooltip explains why | Guidance not dead-end | Same |
| 24 | Keyboard focus ring | 2px Trust-Blue ring, 2px offset, appears crisply | Accessibility as craft | Same |

## B. Verification (the heart) (25–52)

| # | Trigger | Response | Meaning | RM |
|---|---|---|---|---|
| 25 | Verify page load | SSR shell instant; checks show `…` | No void, ever | Same |
| 26 | Check resolving | Individual `…` → result, 70ms stagger down the list | Watching proof happen | Instant results |
| 27 | Check pass | Row gains green check, arrives from −6px x | Agreement reached | Instant |
| 28 | Check fail | Row gains red ×, holds firm (no bounce) | Gravity | Instant |
| 29 | Verdict resolve VALID | Icon settles (450ms spring), single pulse ring | The signature moment | Icon appears; no pulse |
| 30 | Verification pulse | One expanding ring of light, 2.4s, then gone | Confirmation reaching agreement | Omitted |
| 31 | Verdict REVOKED | Slash-icon settles firm; reason arrives; no pulse | Stop | Instant |
| 32 | Verdict TAMPERED | Broken-seal icon; explanation prominent; no glow | Do not rely on it | Instant |
| 33 | Verdict SUPERSEDED | Forward-arrow icon; link to successor pulses gently once | Follow the newer truth | Instant link |
| 34 | Verdict EXPIRED | Clock icon; validity dates fade in | Time passed | Instant |
| 35 | Verdict UNKNOWN ISSUER | Question icon; "verify with institution" surfaces | Honest uncertainty | Instant |
| 36 | Verdict SUSPENDED ISSUER | Pause icon; issuer-status banner rises | Nuanced state | Instant |
| 37 | Trust meter fill | Fills as checks pass, rests full & still on VALID | Confidence accruing | Fills instant, static full |
| 38 | Issuer accreditation shown | "Accredited" badge fades beside issuer | Fake-university defense | Instant |
| 39 | Adaptive verdict glow | Ambient glow matches verdict color, low opacity | Light = truth state | Static tint |
| 40 | Proof panel expand | "Blockchain details" chevron rotates, content arrives | Progressive disclosure | Instant |
| 41 | Hash reveal | Content hash renders; brief constellation "signature" | Digital fingerprint | Static hash |
| 42 | Tx link hover | External-link icon lifts; "Polygonscan ↗" tooltip | The chain is real | Same |
| 43 | Merkle path visual | Thin lines draw from leaf to root | Membership proof | Static diagram |
| 44 | File upload verify | Drop zone accepts; "recomputing fingerprint" narrates | Transparency | Instant status |
| 45 | Tamper detected on upload | Hash-mismatch highlight; TAMPERED resolves | Forgery self-announces | Instant |
| 46 | Bulk verify progress | Rows resolve top-down; exceptions float up first | Efficiency + honesty | Instant list |
| 47 | Bulk summary chips | Verdict counts settle in | Overview | Instant |
| 48 | Share-link verify | Same verdict UI; "N of M fields shared" note | Selective disclosure respected | Instant |
| 49 | PIN-protected share | Lock prompt rises before any data | Privacy first | Instant |
| 50 | Expired share link | "Ask for a fresh link" state; no data ever shown | Honest expiry | Instant |
| 51 | Stale chain state | "As of 12:03 UTC" banner; never a guessed verdict | Honesty visual | Same |
| 52 | Re-verify (OSS) hint | "Verify independently" reveals with the proof bundle | Vendor-independence | Instant |

## C. Certificate experience (53–78)

| # | Trigger | Response | Meaning | RM |
|---|---|---|---|---|
| 53 | Certificate open | Paper settles → Seal draws → holo catches light → glow rises → QR reveals | The luxury reveal | Appears verified, instant |
| 54 | Seal draw | One continuous stroke of light forms the Seal, then locks | Digital signature flourish | Static Seal |
| 55 | Holographic tilt | Conic sheen shifts subtly with pointer/device tilt | Anti-screenshot authenticity | Static sheen |
| 56 | Dynamic border | Slow blue→violet→green border-flow on valid | Aliveness | Static gradient |
| 57 | QR reveal | Assembles from quiet-zone inward | Premium detail | Instant QR |
| 58 | QR hover | Faint scale + "scan to verify" caption | Affordance | Same |
| 59 | Ownership ribbon | Draws in on claim with holder name | This is yours | Static ribbon |
| 60 | Certificate card hover | Lift + shadow; thumbnail parallax micro-shift | Tangibility | Lift only/none |
| 61 | Card → detail | Shared-element morph of thumbnail to viewer | Continuity | Crossfade |
| 62 | Revoked card | Dimmed thumbnail + REVOKED badge | Clear status | Same |
| 63 | Timeline expand | Events arrive newest-first, connected by a light spine | Provenance | Instant list |
| 64 | Timeline event hover | Node brightens; dual-TZ timestamp on hover | Precision | Same |
| 65 | Verification count | "Verified 12 times in March" whispers in | Live activity | Static text |
| 66 | Download menu | Formats fade in with one-line explainers | Clarity | Instant |
| 67 | Download start | Format icon pulses once | Action ack | Instant |
| 68 | Print preview | Switches to ink-on-paper theme; glow/glass drop | The true document | Instant |
| 69 | Chain status chip | Dot: queued→submitted→confirmed→finalized morph | State machine, honest | Static label |
| 70 | Finalized chip | Faint permanent glow, no motion | Permanence is stillness | Same |
| 71 | Explorer link | Opens with edge-draw of the tx's connections | The constellation | Static |
| 72 | Legacy-attested badge | "Attested retroactively on <date>" shown plainly | Never fakes contemporaneity | Same |
| 73 | Prestige certificate | Slower, richer holographic sweep on honors | Prestige animation | Static richer finish |
| 74 | Micro-credential chip | Compact badge; stacks with soft magnetism | Modular skills | Static stack |
| 75 | Certificate share open | Share sheet rises; live "verifier will see" preview | Control | Instant sheet |
| 76 | Field toggle (disclosure) | Hidden field dims with "hidden from verifier" | Privacy made visible | Instant |
| 77 | Share link created | QR + link assemble; "expires in N days" note | Reassurance | Instant |
| 78 | Share revoked | "Viewers lose access within a minute" confirm | Honest revocation | Instant |

## D. Blockchain & network (79–102)

| # | Trigger | Response | Meaning | RM |
|---|---|---|---|---|
| 79 | Node idle | Dim point of light | Pending | Static dim |
| 80 | Node confirming | Amber, slow breathing | In progress | Static amber |
| 81 | Node confirmed | Verified green, steady | Agreement | Static green |
| 82 | Edge forming | Thin blue line brightens between nodes | Connection | Static line |
| 83 | Consensus | Edges converge + brighten to one node, then pulse | Agreement reached | Static converged |
| 84 | Block arrive | Luminous tile joins chain from right, settles | New block | Instant |
| 85 | Transaction travel | Point glides along edge to its block | Tx in flight | Instant at destination |
| 86 | Confirmation | Single crystalline pulse on the node | Confirmed | Omitted pulse |
| 87 | Sync wave | Gentle radial wave across node field | Network breathing | Omitted |
| 88 | Blockchain heartbeat | Barely-there ambient pulse every few seconds | The chain is alive | Omitted |
| 89 | Hash match | Green halo sweeps left→right along the string | Integrity confirmed | Static green tint |
| 90 | Anchor in progress | Constellation builds toward a green node; honest status | Sealing | Static status |
| 91 | Anchored success | One satisfying green pulse + proud plain copy | Accomplishment | Instant + copy |
| 92 | Reorg (ops) | Node re-links with an amber note; auto re-anchor | Resilience | Static note |
| 93 | Wallet connect | Two ascending tones (if sound); glass panel + address settle | Linked, secure | Instant |
| 94 | Wallet rejected | Panel recedes; "cancelled in wallet" (not an error) | No blame | Instant |
| 95 | Wallet wrong chain | "Switch network" prompt with the chain name | Guidance | Same |
| 96 | Signature request | Message states purpose plainly; sign draws a light stroke | Anti-phishing clarity | Static |
| 97 | Gas meter (ops) | Slim luminous fill; never shown to end users | Kept backstage | Static |
| 98 | Ledger row arrive | Explorer rows stream in monospace | Honest record | Instant |
| 99 | Tx selected | Its edges draw across the constellation | Relationship | Static highlight |
| 100 | Network status | Ambient hum (opt-in) + steady status dot | Aliveness | Dot only |
| 101 | Finality reached | Faintest permanent glow added | Permanence | Same |
| 102 | Relayer healthy (ops) | Quiet green heartbeat on the ops board | Operational calm | Static |

## E. Navigation & command (103–128)

| # | Trigger | Response | Meaning | RM |
|---|---|---|---|---|
| 103 | ⌘K / Ctrl-K | Command bar fades + scales from 0.96, backdrop blurs | Power, everywhere | Instant |
| 104 | Command typing | Results filter live, top result highlighted | Instant search | Same |
| 105 | Paste `TC-…` in ⌘K | Top action becomes "Verify <ID>" | Smart suggestion | Same |
| 106 | ⌘K arrow nav | Selection glides between rows | Keyboard-first | Instant |
| 107 | ⌘K enter | Bar recedes, navigates, subtle page arrive | Resolution | Instant |
| 108 | ⌘K escape | Bar recedes, backdrop clears | Reversible | Instant |
| 109 | Sidebar item hover | Row tint + accent bar hint | Orientation | Same |
| 110 | Sidebar active | Item takes role-accent fill; others recede | "Which world am I in" | Static |
| 111 | Sidebar collapse | Glides to icon rail; labels become tooltips | Adaptive density | Instant |
| 112 | Mobile drawer open | Slides from left, scrim blurs behind | Spatial | Instant |
| 113 | Breadcrumb hover | Segment underlines; overflow ellipsis reveals menu | Wayfinding | Same |
| 114 | Nav route change | Content fade + 4px rise (200ms) | Calm transition | Instant |
| 115 | Command trigger chip | Shows "⌘K" affordance; hover brightens | Discoverability | Same |
| 116 | Theme toggle | Icon crossfades sun/moon; surfaces recolor smoothly | Comfort control | Instant recolor |
| 117 | Theme to OLED | Deepens to pure black; glow re-tunes | Battery + focus | Instant |
| 118 | Role switch | Aurora hue shifts toward new role accent | Context lighting | Instant |
| 119 | Tab change | Underline slides to active tab | Continuity | Instant |
| 120 | Sticky header | Glass intensifies slightly on scroll | Depth | Static glass |
| 121 | Back gesture | Sheet closes first, then route | Predictable | Same |
| 122 | Skip link | Appears crisply on first Tab | Accessibility craft | Same |
| 123 | Avatar menu | Panel rises with soft spring | Personal space | Instant |
| 124 | Notification bell | Badge pops once on increment (300ms scale) | New activity | Static badge |
| 125 | Recent activity peek | Items arrive newest-first | Live context | Instant |
| 126 | Quick action FAB | Lifts on hover; radiates options on tap | Speed | Instant options |
| 127 | Context menu | Fades at pointer with 4px rise | Precision | Instant |
| 128 | Resizable panel | Handle glows on hover; content reflows smoothly | Craft | Instant reflow |

## F. Forms, wizard & data (129–158)

| # | Trigger | Response | Meaning | RM |
|---|---|---|---|---|
| 129 | Floating label | Label rises to border on focus/fill | Elegance + clarity | Instant |
| 130 | Multi-step stepper | Completed step draws a check; line fills to next | Progress | Instant |
| 131 | Step transition | Panel slides 200ms; autosave "Saved · just now" | Safety | Instant |
| 132 | Progressive disclosure | Advanced options expand on request | Not overwhelming | Instant |
| 133 | Smart default | Prefilled field with a subtle "suggested" hint | Effortlessness | Same |
| 134 | Inline validation | On blur, resolves valid/invalid with icon | Immediate feedback | Instant |
| 135 | Error summary | On failed submit, summary focuses, links to fields | Recoverability | Same |
| 136 | Field → summary link | Clicking summary scrolls + focuses the field | Guidance | Instant scroll |
| 137 | Success submit | Fields lock, success state arrives, primary morphs | Closure | Instant |
| 138 | CSV upload | Drop zone accepts; row count ticks up | Tangibility | Instant count |
| 139 | Dry-run validating | "Validating 3/5…" narrates; leave-and-notify offered | Care under load | Static status |
| 140 | Dry-run errors | Errors-first table; each row deep-links | Fear reduction | Instant table |
| 141 | Fix row inline | Cell edits; error clears with a check | Momentum | Instant |
| 142 | 0 errors | "Ready to seal" state brightens | Relief | Instant |
| 143 | Submit for approval | "Awaiting a second approver" note settles | Maker-checker made visible | Instant |
| 144 | Self-approval blocked | Clear "a different approver must release it" | Two-person integrity | Same |
| 145 | Approve batch | Progress → anchored → single green pulse | Accomplishment | Instant |
| 146 | Table sort | Column header arrow flips; rows re-order with subtle fade | Order | Instant re-order |
| 147 | Table filter | Rows fade out/in to match; count updates | Focus | Instant |
| 148 | Table row hover | Row tint; actions reveal in ⋮ | Discoverability | Same |
| 149 | Bulk select | Checkboxes + action bar rises | Power | Instant bar |
| 150 | Pagination | "Newer/Older" glide; disabled ends dim | Clarity | Instant |
| 151 | Export click | Button → "preparing…" → download pulse | Honest async | Instant |
| 152 | Search focus | Field widens slightly; `/` hint fades | Invitation | Instant |
| 153 | Search results | Grouped, arrive with 30ms stagger | Instant search | Instant |
| 154 | Search empty | "Nothing matched '<q>'" with a next step | No dead end | Same |
| 155 | Date picker open | Calendar rises; today highlighted | Orientation | Instant |
| 156 | Chart load | Bars/lines draw from baseline; table toggle offered | Comprehension + a11y | Static chart |
| 157 | Chart hover | Tooltip pins; series highlights | Insight | Same |
| 158 | Chart → table | Toggles to accessible data table | Accessible charts | Instant |

## G. States, system & delight (159–192)

| # | Trigger | Response | Meaning | RM |
|---|---|---|---|---|
| 159 | Skeleton load | Real-layout skeletons shimmer-sweep 1.6s | No void | Static skeleton |
| 160 | Content stream | Blocks hydrate as they arrive, headline first | Progressive | Instant |
| 161 | Empty wallet | A dim node + "your first credential appears here" + claim CTA | Invitation | Static |
| 162 | Empty node lights | On first item, the waiting node brightens | Onboarding payoff | Instant |
| 163 | Empty batches | "Issue your first batch" + New batch CTA | Guidance | Same |
| 164 | Empty search/history | Illustration + clear action | No dead end | Static |
| 165 | Toast success | Slides in bottom-right, aria-polite, auto-dismiss 5s | Confirmation | Instant, auto-dismiss |
| 166 | Toast danger | Persists until dismissed; assertive | Attention warranted | Instant |
| 167 | Toast queue | Max 3; older gracefully recede | Restraint | Instant |
| 168 | Toast action (undo) | "Undo" affordance within window | Reversibility | Same |
| 169 | Notification arrive | In-app center entry; bell badge pop | Live | Static |
| 170 | Grouped notifications | Similar items collapse with a count | Calm | Same |
| 171 | Security notice | Pinned with shield; cannot be dismissed unread | Safety priority | Same |
| 172 | Onboarding start | Three luminous beats: issue → seal → verify | Teach the model | Static steps |
| 173 | Onboarding try-it | A live sample verdict to verify yourself | Learning by doing | Instant |
| 174 | Progressive hint | A gentle, dismissible tip near first use | Guidance | Same |
| 175 | Achievement (claim) | Shield pulse + the one warm line ("Certificate claimed!") | The single celebration | Instant + copy |
| 176 | First share | Quiet acknowledgment; share activity begins | Agency | Same |
| 177 | Verified-by-employer | "Someone verified your credential" whisper | Meaningful moment | Static |
| 178 | Offline banner | Amber bar; "resumes when connection returns" | Honesty | Same |
| 179 | Reconnect | Banner recedes; a soft sync wave | Restored | Instant |
| 180 | 404 | Broken-edge illustration; search + home | Recovery | Static |
| 181 | 403 | "Signed in as … (role)"; switch account | Clarity | Same |
| 182 | 500 | "Your work is saved" + traceId + retry | Reassurance | Same |
| 183 | Wallet error | Typed, actionable message; never blames user | Blameless | Same |
| 184 | Rate-limited (429) | "Try again in Ns" with a calm countdown | Honesty | Static |
| 185 | Session expired | Gentle prompt to re-auth; work preserved where possible | Security without panic | Same |
| 186 | Dark-mode switch | Ambient light re-tunes; verdict glow re-balances | Comfort | Instant |
| 187 | Adaptive blur | Background blurs deeper when modal/⌘K opens | Focus | Static blur |
| 188 | Cursor near Seal | Faint light follows the pointer across the Seal | Premium detail | Disabled |
| 189 | Live status dot | Steady green "operational"; ambient | Reliability | Static |
| 190 | Confidence meter rest | Full and still on VALID (never bouncing) | Assurance | Static full |
| 191 | Copy-all evidence | "Proof bundle" assembles; download pulse | Independence | Instant |
| 192 | Language switch | Content recomposes; numerals localize | Inclusion | Instant |

## H. Role-specific & admin (193–220)

| # | Trigger | Response | Meaning | RM |
|---|---|---|---|---|
| 193 | Issuer dashboard load | KPIs settle; anchoring strip shows live status | Command | Instant |
| 194 | KYB status card | "Accreditation review pending" amber → "Active" green | Legitimacy arc | Instant |
| 195 | Institution approved | On-chain register confirmation + green pulse | The legitimizing moment | Instant |
| 196 | Institution suspended | Clear "issuance blocked; verification continues" | Nuanced governance | Same |
| 197 | Anchoring queue (ops) | FSM board columns tick counts | Operational truth | Instant |
| 198 | Retry failed anchor | One-click retry; idempotent note | Resilience | Same |
| 199 | Chain kill-switch (ops) | Dual-control dialog; grave copy | Contained power | Same |
| 200 | Wallet balance alert | Amber card + runbook link | Preparedness | Static |
| 201 | Fraud flag received | Case appears; risk score attaches | Protection | Instant |
| 202 | Case assigned | Assignee avatar + status chip | Accountability | Same |
| 203 | Case resolved | Timeline closes with outcome | Closure | Instant |
| 204 | Regulator view | Official-green lighting; aggregates only, no PII | Institutional weight | Static |
| 205 | Audit log open | Append-only rows stream; integrity banner ("chain verified") | Tamper-evidence | Instant |
| 206 | Audit entry expand | Before/after diff reveals | Transparency | Instant |
| 207 | Revoke: open dialog | Danger surface; typed REVOKE required | Irreversibility loud | Same |
| 208 | Revoke: type REVOKE | Confirm enables only on exact match | No reflex mistakes | Same |
| 209 | Revoke: awaiting 2nd | "Recorded — awaiting a second approver" | Two-person | Instant |
| 210 | Revoke: same actor | Blocked; "a different approver must confirm" | Integrity | Same |
| 211 | Revoke: confirmed | Status → REVOKED ≤5min; holder notified | Governance complete | Instant |
| 212 | Supersede: open | Diff of corrected fields shown | Transparent correction | Instant |
| 213 | Supersede: issued | Old → SUPERSEDED with forward link | Nothing silently edited | Instant |
| 214 | Member invite | Role badge colored by scope; "invited" state | Least-privilege visible | Same |
| 215 | Key rotation | "Existing certificates remain valid" reassurance | Safe change | Same |
| 216 | Employer bulk verify | Exceptions-first results; watch-list offer | Efficiency + vigilance | Instant |
| 217 | Watch-list armed | "We'll alert you if this is revoked" | Post-hire protection | Same |
| 218 | Attestation PDF | Signed verification receipt assembles | Audit evidence | Instant |
| 219 | Analytics reconcile | Numbers render final, tabular, exact | Trust in the metrics | Static |
| 220 | Admin approve, clean | Approve → registered → single green pulse; audited | Stewardship rewarded | Instant |

---

## Interaction laws (governing all 220)

1. **Meaning first.** If you can't name the trust concept it reinforces, it doesn't ship.
2. **One per moment.** Never stack two microinteractions on the same view-change.
3. **Reduced-motion complete.** Every entry has a fallback that preserves meaning without motion.
4. **Trust values never animate.** Verdicts, hashes, and counts render final.
5. **Felt, not noticed.** The best microinteraction is invisible until it's missing.
6. **Handcrafted.** Timing and easing are chosen per interaction from the token set — never a default.
