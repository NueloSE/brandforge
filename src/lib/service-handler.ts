// Shared request handler for both paid services:
//   kit    -> brand kit board                       (/api/kit)
//   launch -> brand kit board + live one-page site  (/api/launch)
//
// GET and POST are BOTH full pay-and-deliver paths. x402 buyers (task-402-pay,
// x402-check, direct-accept) may fetch the resource with either method: an
// unpaid request returns the 402 challenge; a PAID request settles and returns
// the deliverable inline. A paid call is NEVER bounced — if no brief is given
// we generate from a demo brief, so money never settles without a deliverable.

import { NextRequest, NextResponse } from 'next/server';
import { parseBrief } from './brief';
import { buildConcepts } from './concepts';
import { generateSiteCopy } from './site-copy';
import { encodeBoard } from './encode';
import { issueRerollToken, isValidRerollToken } from './reroll';
import { publicOrigin } from './origin';
import { isReplay, markFulfilled } from './replay-guard';
import { parseEip3009, settleEip3009 } from './eip3009';
import { shorten } from './shortlink';
import {
  paymentMode, buildPaymentRequiredHeader, parsePaymentHeader, verifyPayment,
  settlePayment, buildPaymentResponseHeader, SERVICES, type ServiceId,
} from './x402';

const DESCRIPTIONS: Record<ServiceId, string> = {
  kit: 'Complete brand identity from one sentence: vector logo system, validated palette, typography, design tokens, hosted brand board. Naming included.',
  launch: 'Everything in the brand kit plus a live one-page website wearing the brand, deployed at a URL in the same call.',
};

// A paid request with no usable brief still gets a real deliverable.
const DEMO_BRIEF = 'A specialty coffee roastery sourcing single-origin beans, warm, precise, and proudly local.';

function paymentRequired(service: ServiceId, req: NextRequest): NextResponse {
  const header = buildPaymentRequiredHeader(service, `${publicOrigin(req)}${req.nextUrl.pathname}`, DESCRIPTIONS[service]);
  return new NextResponse(JSON.stringify({ error: 'Payment required' }), {
    status: 402,
    headers: { 'content-type': 'application/json', 'PAYMENT-REQUIRED': header },
  });
}

function paymentHeaderOf(req: NextRequest): string | null {
  return (
    req.headers.get('PAYMENT-SIGNATURE') ??
    req.headers.get('X-PAYMENT') ??
    req.headers.get('x-payment')
  );
}

type GateResult =
  | { ok: true; paymentResponseHeader?: string }
  | { ok: false; response: NextResponse };

// Settle payment (EIP-3009 or Permit2, both via the OKX facilitator). Returns a
// PAYMENT-RESPONSE header on success, or a ready error response on failure.
async function paymentGate(req: NextRequest, service: ServiceId, isFreeReroll: boolean): Promise<GateResult> {
  if (paymentMode() !== 'x402' || isFreeReroll) return { ok: true };

  const sigHeader = paymentHeaderOf(req);
  if (!sigHeader) return { ok: false, response: paymentRequired(service, req) };

  try {
    const priceMin = BigInt(SERVICES[service].price());
    // Scheme by payload shape: EIP-3009 (authorization) — what task-402-pay and
    // spec buyers send — or Permit2 (permit2Authorization). Both settle through
    // the OKX facilitator (no operator gas). Nonce comes from whichever is present.
    const eip3009 = parseEip3009(sigHeader);
    const permit2 = eip3009 ? null : parsePaymentHeader(sigHeader);
    const nonce = eip3009 ? eip3009.authorization.nonce : permit2!.authorization.nonce;

    // Permit2 terms are carried in the signature; verify locally. EIP-3009 terms
    // are enforced by the token contract at settlement.
    if (permit2) {
      const verdict = await verifyPayment(permit2, SERVICES[service].price());
      if (!verdict.ok) {
        return { ok: false, response: NextResponse.json({ error: `Payment invalid: ${verdict.reason}` }, { status: 402 }) };
      }
    }

    if (isReplay(nonce)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'This payment authorization was already used. Start a new payment for another brand.' },
          { status: 402 },
        ),
      };
    }

    let settled = await settlePayment(sigHeader);
    if (settled.status === 'failed' && eip3009 && process.env.OPERATOR_PRIVATE_KEY) {
      console.error('facilitator EIP-3009 settle failed, trying self-settle:', settled.detail);
      const self = await settleEip3009(eip3009, priceMin);
      settled = { status: self.status === 'settled' ? 'settled' : 'failed', transaction: self.transaction, detail: self.detail };
    }
    if (settled.status === 'failed') {
      console.error('settlement failed', settled.detail);
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Payment settlement failed — you were NOT charged. Please retry.' },
          { status: 502 },
        ),
      };
    }

    markFulfilled(nonce);
    const payer = eip3009 ? eip3009.authorization.from : permit2!.authorization.from;
    return { ok: true, paymentResponseHeader: buildPaymentResponseHeader(settled, payer, SERVICES[service].price()) };
  } catch (e) {
    return { ok: false, response: NextResponse.json({ error: `Payment header unreadable: ${(e as Error).message}` }, { status: 402 }) };
  }
}

// Generate the deliverable. Bounded model steps with a deterministic fallback,
// so this always completes quickly and never leaves a paid buyer empty-handed.
async function generate(
  req: NextRequest,
  service: ServiceId,
  rawBrief: string,
  style: string,
  isFreeReroll: boolean,
  paymentResponseHeader?: string,
): Promise<NextResponse> {
  const raw = (rawBrief && rawBrief.trim().length >= 8 ? rawBrief.trim() : DEMO_BRIEF).slice(0, 600);
  try {
    const fullBrief = style ? `${raw}\nClient style preferences (must honor): ${style}` : raw;
    const brief = await parseBrief(fullBrief);
    const [conceptSet, site] = await Promise.all([
      buildConcepts(brief),
      service === 'launch' ? generateSiteCopy(brief) : Promise.resolve(undefined),
    ]);
    const slug = encodeBoard(conceptSet, site);
    const origin = publicOrigin(req);
    // Short link if Redis is up; otherwise fall back to the self-contained slug.
    const short = await shorten(slug);
    const ref = short ?? slug;

    return NextResponse.json(
      {
        board_url: `${origin}/b/${ref}`,
        ...(site ? { site_url: `${origin}/s/${ref}` } : {}),
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
}

async function fulfill(req: NextRequest, service: ServiceId, rawBrief: string, style: string, rerollToken: string): Promise<NextResponse> {
  const isFreeReroll = isValidRerollToken((rawBrief ?? '').trim(), rerollToken);
  const gate = await paymentGate(req, service, isFreeReroll);
  if (!gate.ok) return gate.response;
  // Paid (or free reroll): always deliver.
  return generate(req, service, rawBrief, style, isFreeReroll, gate.paymentResponseHeader);
}

const FIELD_PROBE = {
  status: 'input_required',
  message: 'Provide a short business brief describing the company (name optional).',
  requiredAnyOf: ['brief'],
  fields: [
    { name: 'brief', type: 'string', required: true, description: 'The business in one sentence, e.g. "A modern West African bakery in Yaba, Lagos — warm, artisanal, proud of its roots."' },
    { name: 'style', type: 'string', required: false, description: 'Optional style preferences, e.g. "no green, feel premium"' },
    { name: 'reroll_token', type: 'string', required: false, description: 'Token from a previous purchase for one free regeneration of the same brief' },
  ],
};

export function makeGet(service: ServiceId) {
  return async function GET(req: NextRequest) {
    // Unpaid GET -> 402 challenge (discovery). Paid GET -> settle + deliver,
    // taking the brief from a query param, or a demo brief if none.
    const q = req.nextUrl.searchParams;
    const brief = q.get('brief') ?? q.get('q') ?? q.get('prompt') ?? '';
    const style = q.get('style') ?? '';
    const reroll = q.get('reroll_token') ?? '';
    return fulfill(req, service, brief, style, reroll);
  };
}

export function makePost(service: ServiceId) {
  return async function POST(req: NextRequest) {
    let body: { brief?: string; style?: string; reroll_token?: string } = {};
    try {
      body = await req.json();
    } catch {
      // tolerate an empty/no body — treated as a probe or a paid demo call below
    }

    const brief = (body.brief ?? '').trim();
    const hasPayment = Boolean(paymentHeaderOf(req));
    const isFreeReroll = isValidRerollToken(brief, body.reroll_token ?? '');

    // Field-discovery probe: an unpaid POST with no brief self-describes its
    // inputs (what OKX's validator expects). A paid call skips this and delivers.
    if (!brief && !hasPayment && !isFreeReroll && paymentMode() === 'x402') {
      return NextResponse.json(FIELD_PROBE, { status: 400 });
    }

    return fulfill(req, service, brief, (body.style ?? '').trim(), body.reroll_token ?? '');
  };
}
