// Lockup composer: mark (motif SVG) + wordmark (typography) → the four logo
// variants every brand needs. Wordmarks are real text with the display font
// embedded at render time, so exports stay vector and editable.

import type { FontPairing } from '../library/fonts';
import type { Palette } from '../library/palettes';
import { MOTIFS, type Motif, type MotifParams } from './motifs';

export interface LogoSpec {
  brandName: string;
  subline?: string; // e.g. "BAKERY · LAGOS"
  motifId: string;
  pairing: FontPairing;
  palette: Palette;
  seed: number;
}

export type LogoVariant = 'primary' | 'reversed' | 'mark' | 'mono';

function markSvg(motif: Motif, p: MotifParams, size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">${motif.draw(p)}</svg>`;
}

function applyCase(name: string, c: FontPairing['wordmark']['case']): string {
  if (c === 'upper') return name.toUpperCase();
  if (c === 'lower') return name.toLowerCase();
  return name;
}

/**
 * Full lockup as a standalone SVG. `fontDataUri` is the display font woff2 as
 * a data: URI (embedded so the file is portable); the renderer supplies it.
 */
/**
 * `fontDataUri` embeds the display font so the SVG is a portable, standalone
 * file (needed for downloads/exports). Omit it for inline web rendering,
 * where the page already loads the same family via a stylesheet link —
 * embedding again there would just duplicate bytes for no benefit.
 */
export function lockupSvg(spec: LogoSpec, variant: LogoVariant, fontDataUri?: string): string {
  const { palette, pairing } = spec;
  const motif = MOTIFS.find((m) => m.id === spec.motifId) ?? MOTIFS[0];

  const fg = variant === 'reversed' ? palette.ground : variant === 'mono' ? palette.ink : palette.primary;
  const ac = variant === 'mono' ? palette.ink : palette.accent;
  const markInner = motif.draw({ primary: fg, accent: ac, seed: spec.seed });

  if (variant === 'mark') {
    return `<svg width="192" height="192" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">${markInner}</svg>`;
  }

  const word = applyCase(spec.brandName, pairing.wordmark.case);
  const fontSize = 44;
  // conservative width estimate; renderer measures precisely and can override
  const estWidth = Math.ceil(word.length * fontSize * 0.62) + 24;
  const markSize = 84;
  const gap = 20;
  const w = markSize + gap + estWidth;
  const h = 100;
  const sub = spec.subline
    ? `<text x="${markSize + gap}" y="82" font-family="${pairing.body.family}" font-size="11" font-weight="600" letter-spacing="3.5" fill="${fg}" opacity="0.8">${escapeXml(spec.subline.toUpperCase())}</text>`
    : '';

  const fontFace = fontDataUri
    ? `<defs><style>@font-face{font-family:'${pairing.display.family}';src:url(${fontDataUri}) format('woff2');font-weight:${pairing.wordmark.weight};}</style></defs>`
    : '';

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
${fontFace}
<g transform="translate(0, ${(h - markSize) / 2}) scale(${markSize / 96})">${markInner}</g>
<text x="${markSize + gap}" y="${spec.subline ? 62 : 68}" font-family="'${pairing.display.family}'" font-size="${fontSize}" font-weight="${pairing.wordmark.weight}" letter-spacing="${pairing.wordmark.tracking}" fill="${fg}">${escapeXml(word)}</text>
${sub}
</svg>`;
}

/** All four variants for a spec. */
export function logoSet(spec: LogoSpec, fontDataUri?: string): Record<LogoVariant, string> {
  return {
    primary: lockupSvg(spec, 'primary', fontDataUri),
    reversed: lockupSvg(spec, 'reversed', fontDataUri),
    mark: lockupSvg(spec, 'mark', fontDataUri),
    mono: lockupSvg(spec, 'mono', fontDataUri),
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
