# BrandForge

**One sentence in. A complete brand out.**

BrandForge is an AI Agent Service Provider (ASP) on [OKX.AI](https://www.okx.ai) — the agent-economy marketplace. A buyer (human or agent) describes a business in one sentence and receives, in about 90 seconds: a vector logo system, an accessibility-validated color palette, curated typography, machine-readable design tokens, and optionally a **live one-page website** — paid per call in USD₮0 on X Layer via the x402 protocol.

**Live:** [brandforge-kappa.vercel.app](https://brandforge-kappa.vercel.app)

## Services

| Service | Price / call | Endpoint | What you get |
|---|---|---|---|
| **Brand Kit Studio** | 0.1 USDT | `POST /api/kit` | Naming (if none given) + vector logo in 4 variants + WCAG-validated 5-role palette + font pairing + 3 judged concept directions + `design-tokens.json` & `brand.md` + hosted brand board. One free regeneration. |
| **Instant Brand Site** | 0.2 USDT | `POST /api/launch` | Everything in the kit **plus** a deployed one-page website wearing the brand, live at a URL in the same call. |

## API

```bash
# Discover terms (x402 challenge)
curl -i https://brandforge-kappa.vercel.app/api/kit
# -> HTTP 402 with a PAYMENT-REQUIRED header (base64 JSON: price, asset, payTo on X Layer)

# Call with payment (via any x402 client, e.g. OKX's `onchainos payment pay`)
curl -X POST https://brandforge-kappa.vercel.app/api/launch \
  -H "content-type: application/json" \
  -H "PAYMENT-SIGNATURE: <signed authorization>" \
  -d '{"brief": "A modern West African bakery in Yaba, Lagos — warm, artisanal, proud of its roots.",
       "style": "no green, feel premium"}'
```

Response:

```json
{
  "board_url": "https://.../b/<slug>",
  "site_url":  "https://.../s/<slug>",
  "business_name": "…",
  "tagline": "…",
  "concepts": ["A", "B", "C"],
  "featured": "A",
  "reroll_token": "…"
}
```

- `brief` (required) — the business in one sentence; a name is optional (we invent one with alternates if missing, and never change a given name)
- `style` (optional) — steering, e.g. colors to avoid, mood
- `reroll_token` (optional) — from a previous purchase: one free regeneration of the same brief
- A bare `POST {}` returns `400 {status:"input_required", fields:[…]}` so agents can self-discover the contract
- Deliverable views: `/b/<slug>` brand board · `/s/<slug>` live site (Instant Brand Site only) · `/api/asset/<slug>?v=primary|reversed|mark|mono` raw SVG logos
- Boards are stateless: the full kit is encoded in the URL itself — no database, nothing to expire

## How generation works

1. **Brief parsing + world-grounding** — an LLM extracts business, audience, and personality traits, then grounds color choices in the brief's own world (a Lagos bakery pulls palm-oil orange and cassava cream — never "startup blue"). Industry-default palettes are explicitly banned.
2. **Curated selection** — font pairings and mark motifs are chosen from hand-curated, trait-tagged libraries via a per-brand seeded shuffle (similar businesses get different, equally fitting directions). The AI selects; it never invents geometry.
3. **Deterministic composition** — logos are parameterized vector (SVG) geometry; every color pair is validated against WCAG contrast math and auto-adjusted until it passes.
4. **Judging** — three concepts are scored against an anti-cliché rubric; the winner is featured, all three ship.

## Payments (x402 / OKX Agent Payments Protocol)

- Challenge: `HTTP 402` + `PAYMENT-REQUIRED` header — scheme `exact`, network `eip155:196` (X Layer), asset USD₮0
- Buyer signs a Permit2 `PermitWitnessTransferFrom` (spender = OKX's x402 proxy; our wallet fixed in the signed witness)
- We verify the EIP-712 signature server-side, settle through the OKX facilitator, and only then generate
- The buyer is never charged for a failed generation, and generation never runs unpaid

## Stack

Next.js (App Router) · TypeScript · Vercel · Anthropic Claude (brief parsing, judging, site copy) · viem (EIP-712 verification) · x402 on X Layer

## Development

```bash
npm install
cp .env.example .env.local     # set ANTHROPIC_API_KEY (payment mode off by default locally)
npm run dev
curl -X POST localhost:3000/api/kit -H "content-type: application/json" \
  -d '{"brief":"A cozy bookshop in Nairobi with rare African literature"}'
```

Environment variables:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | LLM calls (required) |
| `PAYMENT_MODE` | `free` (default) or `x402` (production) |
| `REROLL_SECRET` | HMAC key signing free-reroll tokens |
| `PAY_TO_ADDRESS` | revenue wallet on X Layer (defaults to BrandForge's) |
| `KIT_PRICE_USDT` / `LAUNCH_PRICE_USDT` | prices (default 0.1 / 0.2) |
| `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` | facilitator settlement auth |

## License

[MIT](LICENSE)

---

Built for the [OKX.AI Genesis Hackathon](https://www.hackquest.io/hackathons/OKXAI-Genesis-Hackathon), July 2026.
