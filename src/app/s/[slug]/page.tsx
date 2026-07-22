import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { decodeBoard } from '@/lib/encode';
import { logoSet } from '@/lib/compose/logo';
import { resolveShort, looksLikeShortCode } from '@/lib/shortlink';

async function slugFor(seg: string): Promise<string | null> {
  if (looksLikeShortCode(seg)) return resolveShort(seg);
  return seg;
}

// The Instant Brand Site — a deployed one-page landing site wearing the
// generated brand. Same slug as the board: /b/<slug> is the brand system,
// /s/<slug> is the live site built from it.

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: seg } = await params;
  try {
    const slug = await slugFor(seg);
    if (!slug) return { title: 'Brand Site' };
    const { brief } = decodeBoard(slug);
    return { title: `${brief.businessName} — ${brief.tagline}` };
  } catch {
    return { title: 'Brand Site' };
  }
}

export default async function SitePage({ params }: PageProps) {
  const { slug: seg } = await params;
  const slug = await slugFor(seg);
  if (!slug) notFound();
  let data;
  try {
    data = decodeBoard(slug);
  } catch {
    notFound();
  }
  if (!data.site) notFound(); // kit-only boards have no site view

  const { brief, concepts, featuredIndex, site } = data;
  const c = concepts[featuredIndex];
  const p = c.palette;
  const logos = logoSet({
    brandName: brief.businessName,
    subline: brief.subline,
    motifId: c.motif.id,
    pairing: c.pairing,
    palette: c.palette,
    seed: c.seed,
  });

  const fonts = `https://fonts.googleapis.com/css2?family=${c.pairing.display.gf}&family=${c.pairing.body.gf}&display=swap`;
  const display = { fontFamily: `${c.pairing.display.family}, Georgia, serif`, fontWeight: c.pairing.wordmark.weight } as const;

  const favicon = `data:image/svg+xml;utf8,${encodeURIComponent(logos.mark)}`;

  return (
    <>
      <link rel="icon" href={favicon} />
      <link rel="stylesheet" href={fonts} />
      <div style={{ background: p.ground, color: p.ink, fontFamily: `${c.pairing.body.family}, system-ui, sans-serif`, minHeight: '100vh' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px' }}>
          {/* nav */}
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 0', flexWrap: 'wrap', gap: 12 }}>
            <div dangerouslySetInnerHTML={{ __html: logos.mark.replace('width="192" height="192"', 'width="40" height="40"') }} />
            <a
              href="#contact"
              style={{ background: p.primary, color: p.ground, padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
            >
              {site.cta}
            </a>
          </nav>

          {/* hero */}
          <header style={{ padding: '72px 0 64px', maxWidth: 720 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.primary, fontWeight: 600, marginBottom: 16 }}>
              {brief.subline}
            </div>
            <h1 style={{ ...display, fontSize: 'clamp(38px, 6.5vw, 60px)', lineHeight: 1.08, margin: 0, color: p.primary }}>
              {site.headline}
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, marginTop: 22, maxWidth: '52ch', opacity: 0.85 }}>
              {site.subhead}
            </p>
            <a
              href="#contact"
              style={{ display: 'inline-block', marginTop: 28, background: p.accent, color: p.ink, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 16 }}
            >
              {site.cta}
            </a>
          </header>

          {/* sections */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18, padding: '48px 0', borderTop: `1px solid ${p.secondary}` }}>
            {site.sections.map((s) => (
              <div key={s.title}>
                <h2 style={{ ...display, fontSize: 21, color: p.primary, margin: '0 0 8px' }}>{s.title}</h2>
                <p style={{ fontSize: 15, lineHeight: 1.65, margin: 0, opacity: 0.85 }}>{s.body}</p>
              </div>
            ))}
          </section>

          {/* brand banner */}
          <section style={{ background: p.primary, borderRadius: 16, padding: '44px 32px', margin: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div dangerouslySetInnerHTML={{ __html: logos.reversed }} style={{ maxWidth: '100%', overflow: 'hidden' }} />
            <p style={{ ...display, color: p.ground, fontSize: 'clamp(18px, 3vw, 26px)', margin: 0, maxWidth: '18ch' }}>
              {brief.tagline}
            </p>
          </section>

          {/* contact / footer */}
          <footer id="contact" style={{ padding: '48px 0 56px', borderTop: `1px solid ${p.secondary}`, textAlign: 'center' }}>
            <h2 style={{ ...display, fontSize: 26, color: p.primary, margin: '0 0 8px' }}>{brief.businessName}</h2>
            <p style={{ fontSize: 15, opacity: 0.8, margin: '0 0 20px' }}>{site.footerLine}</p>
            <div style={{ fontSize: 12, opacity: 0.55 }}>
              Site + identity generated by BrandForge on OKX.AI
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
