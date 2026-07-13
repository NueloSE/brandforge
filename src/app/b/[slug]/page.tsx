import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { decodeBoard } from '@/lib/encode';
import { logoSet } from '@/lib/compose/logo';
import { designTokensJson, brandMarkdown } from '@/lib/compose/tokens';
import type { Concept } from '@/lib/concepts';

function googleFontsHref(concepts: Concept[]): string {
  const families = new Set<string>();
  for (const c of concepts) {
    families.add(c.pairing.display.gf);
    families.add(c.pairing.body.gf);
  }
  return `https://fonts.googleapis.com/css2?${[...families].map((f) => `family=${f}`).join('&')}&display=swap`;
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { brief } = decodeBoard(slug);
    return { title: `${brief.businessName} — Brand Kit by BrandForge`, description: brief.tagline };
  } catch {
    return { title: 'Brand Kit by BrandForge' };
  }
}

export default async function BoardPage({ params }: PageProps) {
  const { slug } = await params;
  let data;
  try {
    data = decodeBoard(slug);
  } catch {
    notFound();
  }
  const { brief, concepts, featuredIndex } = data;
  const featured = concepts[featuredIndex];
  const others = concepts.filter((_, i) => i !== featuredIndex);
  const logos = logoSet({
    brandName: brief.businessName,
    subline: brief.subline,
    motifId: featured.motif.id,
    pairing: featured.pairing,
    palette: featured.palette,
    seed: featured.seed,
  });
  const tokens = designTokensJson({ brief, palette: featured.palette, pairing: featured.pairing, slug });
  const brandMd = brandMarkdown({ brief, palette: featured.palette, pairing: featured.pairing, slug });

  const p = featured.palette;
  const displayFamily = featured.pairing.display.family;
  const bodyFamily = featured.pairing.body.family;

  const favicon = `data:image/svg+xml;utf8,${encodeURIComponent(logos.mark)}`;

  return (
    <>
      <link rel="icon" href={favicon} />
      <link rel="stylesheet" href={googleFontsHref(concepts)} />
      <div
        style={{
          margin: 0,
          background: '#f1f1ee',
          color: '#1d1c19',
          fontFamily: `${bodyFamily}, system-ui, sans-serif`,
          lineHeight: 1.55,
          minHeight: '100vh',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px 80px' }}>
          <header style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6e6c64' }}>
              BrandForge · Brand Kit
            </div>
            <h1
              style={{
                fontFamily: `${displayFamily}, serif`,
                fontWeight: featured.pairing.wordmark.weight,
                fontSize: 'clamp(28px, 5vw, 42px)',
                margin: '8px 0 4px',
                color: p.primary,
              }}
            >
              {brief.businessName}
            </h1>
            <p style={{ fontSize: 16, color: '#6e6c64', margin: 0 }}>{brief.tagline}</p>
            {brief.nameWasGiven === false && brief.nameAlternates.length > 0 && (
              <p style={{ fontSize: 12, color: '#8a8a80', marginTop: 8 }}>
                Also considered: {brief.nameAlternates.join(' · ')}
              </p>
            )}
          </header>

          <Section title="Logo system" note="Primary lockup, reversed, mark-only, and one-color — vector, crisp at every size.">
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
              <div
                style={{ background: p.ground, border: '1px solid #ddd', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220, padding: 24 }}
                dangerouslySetInnerHTML={{ __html: logos.primary }}
              />
              <div
                style={{ background: p.primary, border: '1px solid #ddd', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220, padding: 24 }}
                dangerouslySetInnerHTML={{ __html: logos.reversed }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 14 }}>
              <div style={{ background: p.ground, border: '1px solid #ddd', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }} dangerouslySetInnerHTML={{ __html: logos.mark }} />
              <div style={{ background: p.ground, border: '1px solid #ddd', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }} dangerouslySetInnerHTML={{ __html: logos.mono }} />
            </div>
          </Section>

          <Section title="Color system" note="Every pairing below is checked against WCAG contrast — not eyeballed.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
              {[
                ['Primary', p.primary],
                ['Accent', p.accent],
                ['Ground', p.ground],
                ['Ink', p.ink],
                ['Secondary', p.secondary],
              ].map(([name, hex]) => (
                <div key={name} style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                  <div style={{ height: 80, background: hex }} />
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#6e6c64' }}>{hex}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#6e6c64' }}>
              {p.checks.map((c) => `${c.pair}: ${c.ratio}:1 ${c.pass ? '✓' : '✗'}`).join('   ·   ')}
            </div>
            <p style={{ fontSize: 13, color: '#6e6c64', marginTop: 10, maxWidth: '60ch' }}>{brief.world.rationale}</p>
          </Section>

          <Section title="Typography" note={`${featured.pairing.display.family} paired with ${featured.pairing.body.family}.`}>
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 24 }}>
              <p style={{ fontFamily: displayFamily, fontWeight: featured.pairing.wordmark.weight, fontSize: 28, margin: '0 0 10px' }}>{brief.tagline}</p>
              <p style={{ fontSize: 14, color: '#6e6c64', margin: 0, maxWidth: '58ch' }}>
                Built for {brief.audience}. Traits: {brief.traits.join(', ')}.
              </p>
            </div>
          </Section>

          <Section title="Other directions" note="Two more concepts were generated and judged alongside the featured one.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {others.map((c) => {
                const alt = logoSet({ brandName: brief.businessName, subline: brief.subline, motifId: c.motif.id, pairing: c.pairing, palette: c.palette, seed: c.seed });
                return (
                  <div key={c.label} style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                    <div style={{ background: c.palette.ground, padding: 20, display: 'flex', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: alt.primary }} />
                    <div style={{ padding: '10px 14px', fontSize: 12, color: '#6e6c64' }}>Concept {c.label} — {c.critique}</div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="For your agents" note="design-tokens.json and brand.md — paste into your coding agent and your site styles itself.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <pre style={{ background: '#1d1c19', color: '#eae8e1', borderRadius: 12, padding: 16, fontSize: 11.5, overflowX: 'auto', margin: 0 }}>{tokens}</pre>
              <pre style={{ background: '#1d1c19', color: '#eae8e1', borderRadius: 12, padding: 16, fontSize: 11.5, overflowX: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>{brandMd}</pre>
            </div>
          </Section>

          <footer style={{ marginTop: 56, paddingTop: 20, borderTop: '1px solid #ddd', fontSize: 12, color: '#8a8a80' }}>
            Generated by BrandForge on OKX.AI — vector composition, no diffusion, no templates.
          </footer>
        </div>
      </div>
    </>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 44 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6e6c64' }}>{title}</span>
        <span style={{ fontSize: 12, color: '#8a8a80', maxWidth: '52ch' }}>{note}</span>
      </div>
      {children}
    </section>
  );
}
