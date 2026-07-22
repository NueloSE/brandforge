// Shared request handler for both paid services:
//   kit    -> brand kit board                       (/api/kit)
//   launch -> brand kit board + live one-page site  (/api/launch)

import { NextRequest, NextResponse } from 'next/server';
import { parseBrief } from './brief';
import { buildConcepts } from './concepts';
import { generateSiteCopy } from './site-copy';
import { encodeBoard } from './encode';
import { issueRerollToken, isValidRerollToken } from './reroll';
import { publicOrigin } from './origin';
import { isReplay, markFulfilled } from './replay-guard';
import { parseEip3009, settleEip3009 } from './eip3009';
import {
  paymentMode, buildPaymentRequiredHeader, parsePaymentHeader, verifyPayment,
  settlePayment, buildPaymentResponseHeader, SERVICES, type ServiceId,
} from './x402';

const DESCRIPTIONS: Record<ServiceId, string> = {
  kit: 'Complete brand identity from one sentence: vector logo system, validated palette, typography, design tokens, hosted brand board. Naming included.',
  launch: 'Everything in the brand kit plus a live one-page website wearing the brand, deployed at a URL in the same call.',
};

function paymentRequired(service: ServiceId, req: NextRequest): NextResponse {
  const header = buildPaymentRequiredHeader(service, `${publicOrigin(req)}${req.nextUrl.pathname}`, DESCRIPTIONS[service]);
  return new NextResponse(JSON.stringify({ error: 'Payment required' }), {
    status: 402,
    headers: { 'content-type': 'application/json', 'PAYMENT-REQUIRED': header },
  });
}

export function makeGet(service: ServiceId) {
  return async function GET(req: NextRequest) {
    if (paymentMode() === 'x402') return paymentRequired(service, req);
    return NextResponse.json({
      service: SERVICES[service].name,
      usage: 'POST { "brief": "your business in one sentence", "style"?: "preferences" }',
    });
  };
}

export function makePost(service: ServiceId) {
  return async function POST(req: NextRequest) {
    let body: { brief?: string; style?: string; reroll_token?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Body must be JSON: { "brief": "..." }' }, { status: 400 });
    }

    const raw = (body.brief ?? '').trim();
    if (!raw || raw.length < 8) {
      // OKX probe format: 400 + status:"input_required" + self-described fields
      return NextResponse.json(
        {
          status: 'input_required',
          message: 'Provide a short business brief describing the company (name optional).',
          requiredAnyOf: ['brief'],
          fields: [
            { name: 'brief', type: 'string', required: true, description: 'The business in one sentence, e.g. "A modern West African bakery in Yaba, Lagos — warm, artisanal, proud of its roots."' },
            { name: 'style', type: 'string', required: false, description: 'Optional style preferences, e.g. "no green, feel premium"' },
            { name: 'reroll_token', type: 'string', required: false, description: 'Token from a previous purchase for one free regeneration of the same brief' },
          ],
        },
        { status: 400 },
      );
    }
    if (raw.length > 600) {
      return NextResponse.json({ error: 'Brief is too long (max 600 characters).' }, { status: 400 });
    }
    const style = (body.style ?? '').trim().slice(0, 200);
    const isFreeReroll = isValidRerollToken(raw, body.reroll_token ?? '');

    // ── payment gate ────────────────────────────────────────────────────
    let paymentResponseHeader: string | undefined;
    if (paymentMode() === 'x402' && !isFreeReroll) {
      // x402 v2 uses PAYMENT-SIGNATURE; v1 clients (and some buyer tools) send
      // X-PAYMENT. Accept either so no buyer is turned away over a header name.
      const sigHeader =
        req.headers.get('PAYMENT-SIGNATURE') ??
        req.headers.get('X-PAYMENT') ??
        req.headers.get('x-payment');
      if (!sigHeader) return paymentRequired(service, req);
      try {
        const priceMin = BigInt(SERVICES[service].price());
        // Detect the scheme by payload shape: EIP-3009 (authorization) — what
        // task-402-pay and spec buyers send — or Permit2 (permit2Authorization).
        // Both settle through the OKX facilitator (verified on-chain), so no
        // operator wallet or gas is needed. Nonce comes from whichever is present.
        const eip3009 = parseEip3009(sigHeader);
        const permit2 = eip3009 ? null : parsePaymentHeader(sigHeader);
        const nonce = eip3009 ? eip3009.authorization.nonce : permit2!.authorization.nonce;

        // Permit2 payloads carry the terms in the signature; verify them locally.
        // (EIP-3009 terms are enforced by the token contract at settlement.)
        if (permit2) {
          const verdict = await verifyPayment(permit2, SERVICES[service].price());
          if (!verdict.ok) {
            return NextResponse.json({ error: `Payment invalid: ${verdict.reason}` }, { status: 402 });
          }
        }

        if (isReplay(nonce)) {
          return NextResponse.json(
            { error: 'This payment authorization was already used. Start a new payment for another brand.' },
            { status: 402 },
          );
        }

        let settled = await settlePayment(sigHeader);
        // Optional resilience: if the facilitator ever rejects an EIP-3009
        // payload and an operator wallet is funded, self-settle on-chain.
        if (settled.status === 'failed' && eip3009 && process.env.OPERATOR_PRIVATE_KEY) {
          console.error('facilitator EIP-3009 settle failed, trying self-settle:', settled.detail);
          const self = await settleEip3009(eip3009, priceMin);
          settled = { status: self.status === 'settled' ? 'settled' : 'failed', transaction: self.transaction, detail: self.detail };
        }
        if (settled.status === 'failed') {
          console.error('settlement failed', settled.detail);
          return NextResponse.json(
            { error: 'Payment settlement failed — you were NOT charged. Please retry.' },
            { status: 502 },
          );
        }
        markFulfilled(nonce);
        const payer = eip3009 ? eip3009.authorization.from : permit2!.authorization.from;
        paymentResponseHeader = buildPaymentResponseHeader(settled, payer, SERVICES[service].price());
      } catch (e) {
        return NextResponse.json({ error: `Payment header unreadable: ${(e as Error).message}` }, { status: 402 });
      }
    }

    try {
      const fullBrief = style ? `${raw}\nClient style preferences (must honor): ${style}` : raw;
      // Each model step is bounded (SDK timeout) and self-heals to a
      // deterministic fallback, so generation always completes quickly and a
      // paid buyer is never left without a deliverable. No compounding retry.
      const brief = await parseBrief(fullBrief);
      // concepts and site copy both depend only on `brief` — run them together.
      const [conceptSet, site] = await Promise.all([
        buildConcepts(brief),
        service === 'launch' ? generateSiteCopy(brief) : Promise.resolve(undefined),
      ]);
      const slug = encodeBoard(conceptSet, site);
      const origin = publicOrigin(req);

      return NextResponse.json(
        {
          board_url: `${origin}/b/${slug}`,
          ...(site ? { site_url: `${origin}/s/${slug}` } : {}),
          business_name: brief.businessName,
          tagline: brief.tagline,
          concepts: conceptSet.concepts.map((c) => c.label),
          featured: conceptSet.concepts[conceptSet.featuredIndex].label,
          reroll_token: isFreeReroll ? undefined : issueRerollToken(raw),
          note: isFreeReroll
            ? 'Free reroll applied.'
            : 'Not in love with the direction? Call again with this reroll_token (same brief) for one free regeneration, or add a "style" field to steer.',
        },
        { headers: paymentResponseHeader ? { 'PAYMENT-RESPONSE': paymentResponseHeader } : undefined },
      );
    } catch (err) {
      console.error(`${service} generation failed`, err);
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
    }
  };
}
