import { SHOWCASE } from '@/lib/showcase';

// BrandForge landing page — wearing the identity our own pipeline generated:
// anvil black #1A1A1A · forge ember #E8573F · workshop limestone #F5F3F0.

const INK = '#1A1A1A';
const EMBER = '#E8573F';
const GROUND = '#F5F3F0';
const MUTED = '#6b6862';

function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-label="BrandForge mark">
      <rect x="26" y="26" width="20" height="20" rx="4" fill={INK} />
      <rect x="50" y="26" width="20" height="20" rx="4" fill={INK} />
      <rect x="26" y="50" width="20" height="20" rx="10" fill={EMBER} />
      <rect x="50" y="50" width="20" height="20" rx="4" fill={INK} />
    </svg>
  );
}

const display = { fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 600 } as const;

export default function Home() {
  return (
    <main style={{ background: GROUND, color: INK, fontFamily: 'var(--font-body), system-ui, sans-serif', minHeight: '100vh', width: '100%' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>
        {/* nav */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 0', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mark size={34} />
            <span style={{ ...display, fontSize: 22 }}>BrandForge</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="#work" style={{ color: INK, textDecoration: 'none' }}>Work</a>
            <a href="#pricing" style={{ color: INK, textDecoration: 'none' }}>Pricing</a>
            <a href="#agents" style={{ color: INK, textDecoration: 'none' }}>For agents</a>
            <a
              href="https://www.okx.ai/agents"
              style={{ background: INK, color: GROUND, padding: '10px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
            >
              Hire us on OKX.AI
            </a>
          </div>
        </nav>

        {/* hero */}
        <header style={{ padding: '72px 0 64px', maxWidth: 760 }}>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED, marginBottom: 18 }}>
            AI design studio · agent service on OKX.AI
          </div>
          <h1 style={{ ...display, fontSize: 'clamp(40px, 7vw, 68px)', lineHeight: 1.05, margin: 0 }}>
            One sentence in.
            <br />
            A complete <span style={{ color: EMBER }}>brand</span> out.
          </h1>
          <p style={{ fontSize: 19, color: MUTED, maxWidth: '54ch', lineHeight: 1.6, marginTop: 24 }}>
            Describe your business in a sentence. Ninety seconds later: a vector logo system,
            an accessibility-validated palette, curated typography, and design tokens your
            coding agents can build with — for a dollar, paid per call.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap' }}>
            <a
              href="https://www.okx.ai/agents"
              style={{ background: EMBER, color: '#fff', padding: '14px 26px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 16 }}
            >
              Get your brand — 1 USDT
            </a>
            <a
              href={`/b/${SHOWCASE[0].slug}`}
              style={{ border: `1.5px solid ${INK}`, color: INK, padding: '13px 26px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 16 }}
            >
              See a real brand board
            </a>
          </div>
          <div style={{ marginTop: 28, fontFamily: 'ui-monospace, monospace', fontSize: 12, color: MUTED }}>
            no diffusion · no templates · vector-first · settled in USD₮0 on X Layer via x402
          </div>
        </header>

        {/* how it works */}
        <section style={{ padding: '56px 0', borderTop: '1px solid #e0dcd4' }}>
          <h2 style={{ ...display, fontSize: 30, margin: '0 0 32px' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {[
              ['Describe it', 'One sentence about your business — the name is optional, we can suggest those too. Add style preferences if you have them.'],
              ['We compose it', 'A strategist model grounds colors in your world. Fonts and marks are selected from hand-curated libraries and composed as vector geometry — three concepts, judged, contrast-checked.'],
              ['You own it', 'A hosted brand board with logo variants, palette, typography, and design tokens your coding agent applies directly. Not in love? One regeneration is free.'],
            ].map(([title, body], i) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #e0dcd4', borderRadius: 14, padding: 24 }}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: EMBER, marginBottom: 10 }}>0{i + 1}</div>
                <h3 style={{ ...display, fontSize: 20, margin: '0 0 8px' }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.6, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* showcase */}
        <section id="work" style={{ padding: '56px 0', borderTop: '1px solid #e0dcd4' }}>
          <h2 style={{ ...display, fontSize: 30, margin: '0 0 8px' }}>Real output, live boards</h2>
          <p style={{ color: MUTED, fontSize: 15, margin: '0 0 32px' }}>
            Every board below is unedited pipeline output. Click through — the contrast math and concept critiques are on the board.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            {SHOWCASE.map((s) => (
              <a
                key={s.name}
                href={`/b/${s.slug}`}
                style={{ background: '#fff', border: '1px solid #e0dcd4', borderRadius: 14, padding: 24, textDecoration: 'none', color: INK, display: 'block' }}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {s.colors.map((c) => (
                    <span key={c} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: '1px solid #e0dcd4', display: 'inline-block' }} />
                  ))}
                </div>
                <h3 style={{ ...display, fontSize: 22, margin: '0 0 4px' }}>{s.name}</h3>
                <div style={{ fontSize: 14, color: EMBER, fontWeight: 600, marginBottom: 8 }}>{s.tagline}</div>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, margin: 0 }}>{s.brief}</p>
                <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600 }}>View the board →</div>
              </a>
            ))}
          </div>
        </section>

        {/* for agents */}
        <section id="agents" style={{ padding: '56px 0', borderTop: '1px solid #e0dcd4' }}>
          <div style={{ background: INK, color: GROUND, borderRadius: 16, padding: '36px 32px' }}>
            <h2 style={{ ...display, fontSize: 28, margin: '0 0 10px' }}>
              Built for the agent economy
            </h2>
            <p style={{ fontSize: 15, color: '#b8b4ac', maxWidth: '62ch', lineHeight: 1.65, margin: 0 }}>
              BrandForge is an API service: your agent calls our endpoint, pays per call over the
              x402 protocol in USD₮0 on X Layer, and receives structured JSON — board URL, palette,
              and design tokens it can apply without a human in the loop. Deliverables ship both
              human-readable (brand board) and machine-readable (design-tokens.json, brand.md).
            </p>
            <div style={{ marginTop: 18, fontFamily: 'ui-monospace, monospace', fontSize: 13, background: '#242424', borderRadius: 8, padding: '12px 16px', overflowX: 'auto' }}>
              POST https://brandforge-kappa.vercel.app/api/kit · {'{ "brief": "your business in one sentence" }'}
            </div>
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" style={{ padding: '56px 0', borderTop: '1px solid #e0dcd4' }}>
          <h2 style={{ ...display, fontSize: 30, margin: '0 0 32px' }}>Pricing</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {[
              { name: 'Brand Kit Studio', price: '1 USDT', live: true, body: 'The full identity: logo system in four vector variants, validated five-role palette, curated type pairing, three concept directions, design tokens, hosted board. One free regeneration included.' },
              { name: 'Brand Name Studio', price: '0.3 USDT', live: false, body: 'Eight to ten ownable name candidates with rationale, tagline options, and live domain availability checks.' },
              { name: 'Instant Brand Site', price: '2 USDT', live: false, body: 'Everything in the kit, plus a deployed one-page site wearing the brand — hero, story, contact — live at a URL in the same call.' },
            ].map((p) => (
              <div key={p.name} style={{ background: '#fff', border: p.live ? `2px solid ${EMBER}` : '1px solid #e0dcd4', borderRadius: 14, padding: 24, position: 'relative' }}>
                {p.live ? (
                  <span style={{ position: 'absolute', top: 16, right: 16, background: EMBER, color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '3px 10px', letterSpacing: '0.06em' }}>LIVE</span>
                ) : (
                  <span style={{ position: 'absolute', top: 16, right: 16, border: '1px solid #e0dcd4', color: MUTED, fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '3px 10px', letterSpacing: '0.06em' }}>SOON</span>
                )}
                <h3 style={{ ...display, fontSize: 20, margin: '0 0 4px' }}>{p.name}</h3>
                <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 10 }}>{p.price}<span style={{ fontSize: 13, color: MUTED, fontWeight: 400 }}> / call</span></div>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* footer */}
        <footer style={{ padding: '40px 0 56px', borderTop: '1px solid #e0dcd4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mark size={24} />
            <span style={{ fontSize: 13, color: MUTED }}>
              BrandForge — built for the OKX.AI Genesis Hackathon, July 2026
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            <a href="https://github.com/NueloSE/brandforge" style={{ color: MUTED }}>GitHub</a>
            <a href="https://www.okx.ai" style={{ color: MUTED }}>OKX.AI</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
