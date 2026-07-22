import { NextRequest, NextResponse } from 'next/server';
import { decodeBoard } from '@/lib/encode';
import { logoSet, type LogoVariant } from '@/lib/compose/logo';
import { resolveShort, looksLikeShortCode } from '@/lib/shortlink';

// Raw SVG assets for a generated board: /api/asset/<slug>?v=mark|primary|reversed|mono
// Free by design: the board slug is only known to whoever paid for the kit.

export async function GET(req: NextRequest, ctx: RouteContext<'/api/asset/[slug]'>) {
  const { slug: seg } = await ctx.params;
  const variant = (req.nextUrl.searchParams.get('v') ?? 'primary') as LogoVariant;
  if (!['primary', 'reversed', 'mark', 'mono'].includes(variant)) {
    return NextResponse.json({ error: 'v must be primary|reversed|mark|mono' }, { status: 400 });
  }
  const slug = looksLikeShortCode(seg) ? await resolveShort(seg) : seg;
  if (!slug) return NextResponse.json({ error: 'unknown board' }, { status: 404 });
  let data;
  try {
    data = decodeBoard(slug);
  } catch {
    return NextResponse.json({ error: 'unknown board' }, { status: 404 });
  }
  const c = data.concepts[data.featuredIndex];
  const svg = logoSet({
    brandName: data.brief.businessName,
    subline: data.brief.subline,
    motifId: c.motif.id,
    pairing: c.pairing,
    palette: c.palette,
    seed: c.seed,
  })[variant];

  return new NextResponse(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'content-disposition': `inline; filename="${data.brief.businessName.replace(/[^a-z0-9]/gi, '-')}-${variant}.svg"`,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
