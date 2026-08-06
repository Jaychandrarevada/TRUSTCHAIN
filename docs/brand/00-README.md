# TrustChain — Design Language & Brand Identity System v1.0

> **`Proof of Light`** — the design constitution for TrustChain.
> *"This information can be trusted."* — made visible in every pixel, motion, and word.

This is the design DNA for the entire product. Every future screen, animation, icon, illustration, component, and interaction must follow it. It is written to be **timeless, premium, original, and emotionally aligned** with trust, authenticity, verification, and permanence — and it is grounded in the visual system already shipping in the product, so it is a working constitution, not a mood board.

## The documents

| Document | What it governs |
|---|---|
| **[DESIGN-LANGUAGE.md](DESIGN-LANGUAGE.md)** | The constitution: brand DNA, the `Proof of Light` language, color psychology, typography, the `Cryptal` material system, `Consensus Motion`, the blockchain visual language (`The Constellation`), certificate identity (`The Seal`), the emotional map, experience journeys, iconography, illustration, loading, sound, premium details, consistency checklists, and the future roadmap. |
| **[MICROINTERACTIONS.md](MICROINTERACTIONS.md)** | 220 handcrafted microinteractions — each with trigger, response, meaning, and reduced-motion fallback. |
| **[DESIGN-TOKENS.md](DESIGN-TOKENS.md)** | The machine-mappable token reference — colors, type, spacing, motion, materials, interaction — mapped to the real implementation (`tailwind.config.ts` + `globals.css`). |

## The one-paragraph essence

TrustChain's design language is **`Proof of Light`**: every credential is a point of light, verification is light passing cleanly through and confirming, and the chain is a constellation of confirmed light that cannot be dimmed or forged. The brand personality is **The Quiet Authority** — assured, precise, luminous, institutional, future-calm. Trust Blue owns the single action on every screen; a soft blue→violet→green **aurora** glows behind frosted **Cryptal** glass; **Sora** speaks with confidence while **JetBrains Mono** proves with honesty; and motion — **Consensus Motion** — only ever means *agreement, arrival, connection, or confirmation*. The signature moment is the **Verdict Panel** resolving to VALID with a single pulse of light: calm, certain, unmistakably TrustChain even with the logo covered.

## The recognition test

A screen is "TrustChain" when a stranger, shown it with the logo removed, still feels *trust* — because the recognition kit is present: the Verdict Panel and its pulse, the Seal, Trust Blue over aurora, Sora headlines beside monospace hashes, Cryptal glass, the Constellation, and generous silence around the one thing that matters.

## How to use this system

- **Designers:** start with the emotional map (which feeling does this screen engineer?), then the journey it belongs to, then the components and tokens. Run the §16 checklists before calling a screen done.
- **Engineers:** the tokens in [DESIGN-TOKENS.md](DESIGN-TOKENS.md) map 1:1 to the shipped `frontend/` implementation. Consume semantic tokens only; never hardcode a value the system already names.
- **Reviewers:** apply the brand-recognition gut check — *"does this feel like TrustChain with the logo covered?"* — and the accessibility, motion, and consistency checklists.

## Amendment

This constitution outlives any individual screen. Changes require a design-council review and a version bump; evolution is **additive** (new capability, same soul). `Proof of Light` is the constant.

---

*v1.0 · The TrustChain design constitution · Companion to the product's [planning](../planning/00-README.md), [specs](../specs/TRUSTCHAIN-PRD-SRS.md), [architecture](../architecture/TRUSTCHAIN-TDD.md), and [UI/UX spec](../design/TRUSTCHAIN-UIUX-SPEC.md).*
