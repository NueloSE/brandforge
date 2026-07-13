import { NextRequest, NextResponse } from 'next/server';
import { parseBrief } from '@/lib/brief';
import { buildConcepts } from '@/lib/concepts';
import { encodeBoard } from '@/lib/encode';
import { issueRerollToken, isValidRerollToken } from '@/lib/reroll';
import {
  paymentMode, buildPaymentRequiredHeader, parsePaymentHeader, verifyPayment,
  settlePayment, buildPaymentResponseHeader, kitPriceMinimal,
} from '@/lib/x402';

// Seller-side A2MCP endpoint for OKX.AI. Payment gating (x402) is applied
// unless PAYMENT_MODE=free or the caller presents a valid reroll token
// (one free regeneration per purchased brief — dissatisfaction insurance).

export const maxDuration = 60;

const SERVICE_DESCRIPTION =
  'Complete brand identity from one sentence: vector logo system, WCAG-validated palette, typography, design tokens, hosted brand board.';

function paymentRequired(req: NextRequest): NextResponse {
  const header = buildPaymentRequiredHeader(`${req.nextUrl.origin}/api/kit`, SERVICE_DESCRIPTION);
  return new NextResponse(JSON.stringify({ error: 'Payment required' }), {
    status: 402,
    headers: { 'content-type': 'application/json', 'PAYMENT-REQUIRED': header },
  });
}

// OKX's endpoint validator probes with a bare GET and expects the 402 challenge.
export async function GET(req: NextRequest) {
  if (paymentMode() === 'x402') return paymentRequired(req);
  return NextResponse.json({
    service: 'BrandForge Brand Kit Studio',
    usage: 'POST { "brief": "your business in one sentence", "style"?: "preferences" }',
  });
}

export async function POST(req: NextRequest) {
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

  // ── payment gate ──────────────────────────────────────────────────────
  let paymentResponseHeader: string | undefined;
  if (paymentMode() === 'x402' && !isFreeReroll) {
    const sigHeader = req.headers.get('PAYMENT-SIGNATURE');
    if (!sigHeader) return paymentRequired(req);
    try {
      const payment = parsePaymentHeader(sigHeader);
      const verdict = await verifyPayment(payment);
      if (!verdict.ok) {
        return NextResponse.json({ error: `Payment invalid: ${verdict.reason}` }, { status: 402 });
      }
      const settled = await settlePayment(sigHeader);
      if (settled.status === 'failed') {
        console.error('settlement failed', settled.detail);
        return NextResponse.json(
          { error: 'Payment settlement failed — you were NOT charged. Please retry.' },
          { status: 502 },
        );
      }
      paymentResponseHeader = buildPaymentResponseHeader(settled, verdict.payer!, kitPriceMinimal());
    } catch (e) {
      return NextResponse.json({ error: `Payment header unreadable: ${(e as Error).message}` }, { status: 402 });
    }
  }

  try {
    const fullBrief = style ? `${raw}\nClient style preferences (must honor): ${style}` : raw;
    const brief = await parseBrief(fullBrief);
    const conceptSet = await buildConcepts(brief);
    const slug = encodeBoard(conceptSet);
    const origin = req.nextUrl.origin;

    return NextResponse.json(
      {
        board_url: `${origin}/b/${slug}`,
        business_name: brief.businessName,
        tagline: brief.tagline,
        concepts: conceptSet.concepts.map((c) => c.label),
        featured: conceptSet.concepts[conceptSet.featuredIndex].label,
        // one free regeneration of this same brief — pass it back as reroll_token
        reroll_token: isFreeReroll ? undefined : issueRerollToken(raw),
        note: isFreeReroll
          ? 'Free reroll applied.'
          : 'Not in love with the direction? Call again with this reroll_token (same brief) for one free regeneration, or add a "style" field to steer.',
      },
      { headers: paymentResponseHeader ? { 'PAYMENT-RESPONSE': paymentResponseHeader } : undefined },
    );
  } catch (err) {
    console.error('kit generation failed', err);
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }
}
