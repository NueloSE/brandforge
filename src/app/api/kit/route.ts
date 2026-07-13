import { NextRequest, NextResponse } from 'next/server';
import { parseBrief } from '@/lib/brief';
import { buildConcepts } from '@/lib/concepts';
import { encodeBoard } from '@/lib/encode';

// x402 payment gating lands here next — this route is the seller-side
// endpoint OKX.AI's marketplace will call. For now it runs unpaid so we can
// validate generation quality before wiring payments.

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { brief?: string };
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

  try {
    const brief = await parseBrief(raw);
    const conceptSet = await buildConcepts(brief);
    const slug = encodeBoard(conceptSet);
    const origin = req.nextUrl.origin;

    return NextResponse.json({
      board_url: `${origin}/b/${slug}`,
      business_name: brief.businessName,
      tagline: brief.tagline,
      concepts: conceptSet.concepts.map((c) => c.label),
      featured: conceptSet.concepts[conceptSet.featuredIndex].label,
    });
  } catch (err) {
    console.error('kit generation failed', err);
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }
}
