import { NextRequest, NextResponse } from 'next/server';
import { parseBrief } from '@/lib/brief';
import { buildConcepts } from '@/lib/concepts';
import { encodeBoard } from '@/lib/encode';
import { issueRerollToken, isValidRerollToken } from '@/lib/reroll';

// Seller-side A2MCP endpoint for OKX.AI. Payment gating (x402) is applied
// unless PAYMENT_MODE=free or the caller presents a valid reroll token
// (one free regeneration per purchased brief — dissatisfaction insurance).

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { brief?: string; style?: string; reroll_token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON: { "brief": "..." }' }, { status: 400 });
  }

  const raw = (body.brief ?? '').trim();
  if (!raw || raw.length < 8) {
    return NextResponse.json({ error: 'Provide a short business brief (name optional).' }, { status: 400 });
  }
  if (raw.length > 600) {
    return NextResponse.json({ error: 'Brief is too long (max 600 characters).' }, { status: 400 });
  }
  const style = (body.style ?? '').trim().slice(0, 200);
  const isFreeReroll = isValidRerollToken(raw, body.reroll_token ?? '');

  // x402 gate slots in here: if PAYMENT_MODE=x402 and !isFreeReroll and no
  // valid PAYMENT-SIGNATURE header -> return 402 with PAYMENT-REQUIRED.

  try {
    const fullBrief = style ? `${raw}\nClient style preferences (must honor): ${style}` : raw;
    const brief = await parseBrief(fullBrief);
    const conceptSet = await buildConcepts(brief);
    const slug = encodeBoard(conceptSet);
    const origin = req.nextUrl.origin;

    return NextResponse.json({
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
    });
  } catch (err) {
    console.error('kit generation failed', err);
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }
}
