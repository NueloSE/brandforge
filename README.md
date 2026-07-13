# BrandForge

**One sentence in, a complete brand identity out.**

BrandForge is an AI Agent Service Provider (ASP) on [OKX.AI](https://www.okx.ai) — the agent economy marketplace. Buyers (humans or their agents) pay per call in USDT on X Layer via the x402 payment protocol, and receive a finished, usable brand system in about 90 seconds.

## Services

| Service | What you get |
|---|---|
| **Brand Name Studio** | 8–10 name candidates with rationale, tagline options, and live domain-availability checks |
| **Brand Kit Studio** | Full identity: vector logo system (4 variants), WCAG-validated 5-role color palette, curated font pairing, social media kit, a hosted brand board — plus `design-tokens.json` and `brand.md` your coding agents can consume directly |
| **Instant Brand Site** | Everything in the kit, plus a deployed one-page landing site wearing the brand |

## How it works

No diffusion models for logos, no templates with your name swapped in:

1. **Brief parsing** — an LLM extracts the business, audience, and personality traits, then grounds visual choices in the brief's own world (a Lagos bakery pulls adire indigo, not "startup blue")
2. **Curated selection** — font pairings and palette recipes come from hand-curated, trait-tagged libraries; the AI selects, it never invents
3. **Deterministic composition** — logos are parameterized SVG geometry composed with typography; every color pair is validated against WCAG contrast math
4. **Self-critique** — three concepts are generated and scored against an encoded design rubric; you receive all three, with the winner as a full asset pack

Deliverables are both human-readable (brand board, zip of assets) and machine-readable (design tokens) — built for an economy where your next designer might be an agent.

## Stack

Next.js (App Router) · TypeScript · Vercel · Anthropic Claude · x402 / OKX Agent Payments Protocol · X Layer

## Development

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

---

Built for the [OKX.AI Genesis Hackathon](https://www.hackquest.io/hackathons/OKXAI-Genesis-Hackathon), July 2026.
