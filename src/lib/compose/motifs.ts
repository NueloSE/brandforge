// Parameterized geometric mark generators. Every mark is deterministic vector
// geometry in a 96×96 viewBox — crisp at any size, no diffusion, no jank.
// The LLM selects a motif family by traits; geometry stays code-owned.

import type { Trait } from '../library/fonts';

export interface MotifParams {
  primary: string; // stroke/fill lead color
  accent: string;  // the single accent element
  seed: number;    // small deterministic variation (0..9)
}

export interface Motif {
  id: string;
  traits: Trait[];
  /** inner SVG (no <svg> wrapper) drawn in a 0 0 96 96 viewBox */
  draw: (p: MotifParams) => string;
  notes: string;
}

const SW = 5; // house stroke width

export const MOTIFS: Motif[] = [
  {
    id: 'arch',
    traits: ['warm', 'crafted', 'rooted', 'organic'],
    notes: 'Rising arch / oven / sunrise. Hospitality, craft, heritage.',
    draw: ({ primary, accent, seed }) => {
      const dots = [28, 38, 48, 58, 68]
        .map((x) => `<circle cx="${x}" cy="67" r="2.4" fill="${primary}"/>`)
        .join('');
      const r2 = 16 + (seed % 3); // subtle per-brand variation
      return `
<path d="M22,56 A26,26 0 0 1 74,56" fill="none" stroke="${primary}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M${48 - r2},56 A${r2},${r2} 0 0 1 ${48 + r2},56" fill="none" stroke="${primary}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M41,56 A7,7 0 0 1 55,56 Z" fill="${accent}"/>
${dots}`;
    },
  },
  {
    id: 'orbit',
    traits: ['technical', 'modern', 'geometric', 'minimal'],
    notes: 'Ring + satellite. Tech, data, networks, motion.',
    draw: ({ primary, accent, seed }) => {
      const angle = (seed * 36 * Math.PI) / 180;
      const sx = 48 + 30 * Math.cos(angle);
      const sy = 48 + 30 * Math.sin(angle);
      return `
<circle cx="48" cy="48" r="30" fill="none" stroke="${primary}" stroke-width="${SW}"/>
<circle cx="48" cy="48" r="11" fill="${primary}"/>
<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="6.5" fill="${accent}"/>`;
    },
  },
  {
    id: 'stack',
    traits: ['bold', 'serious', 'modern', 'geometric'],
    notes: 'Three weighted bars, one accented. Finance, structure, building.',
    draw: ({ primary, accent, seed }) => {
      const shift = seed % 2 === 0 ? 6 : -6;
      return `
<rect x="24" y="26" width="48" height="10" rx="5" fill="${primary}"/>
<rect x="${24 + shift}" y="43" width="48" height="10" rx="5" fill="${accent}"/>
<rect x="24" y="60" width="48" height="10" rx="5" fill="${primary}"/>`;
    },
  },
  {
    id: 'bloom',
    traits: ['playful', 'friendly', 'organic', 'energetic'],
    notes: 'Petal cluster around a core. Wellness, community, growth.',
    draw: ({ primary, accent, seed }) => {
      const petals = Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 + seed * 6) * Math.PI) / 180;
        const x = 48 + 20 * Math.cos(a);
        const y = 48 + 20 * Math.sin(a);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="${primary}" opacity="${i % 2 ? 0.55 : 1}"/>`;
      }).join('');
      return `${petals}<circle cx="48" cy="48" r="9" fill="${accent}"/>`;
    },
  },
  {
    id: 'peak',
    traits: ['bold', 'energetic', 'serious', 'modern'],
    notes: 'Twin peaks with accent summit. Ambition, outdoors, performance.',
    draw: ({ primary, accent }) => `
<path d="M18,68 L40,32 L52,52 L62,38 L78,68 Z" fill="none" stroke="${primary}" stroke-width="${SW}" stroke-linejoin="round"/>
<circle cx="62" cy="30" r="5.5" fill="${accent}"/>`,
  },
  {
    id: 'wave',
    traits: ['organic', 'minimal', 'friendly', 'modern'],
    notes: 'Stacked flowing lines. Water, calm, audio, flow.',
    draw: ({ primary, accent }) => `
<path d="M20,38 Q34,28 48,38 T76,38" fill="none" stroke="${primary}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M20,52 Q34,42 48,52 T76,52" fill="none" stroke="${accent}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M20,66 Q34,56 48,66 T76,66" fill="none" stroke="${primary}" stroke-width="${SW}" stroke-linecap="round"/>`,
  },
  {
    id: 'spark',
    traits: ['energetic', 'playful', 'bold', 'retro'],
    notes: 'Eight-point star burst. Creativity, moments, celebration.',
    draw: ({ primary, accent }) => `
<path d="M48,16 L53,41 L78,48 L53,55 L48,80 L43,55 L18,48 L43,41 Z" fill="${primary}"/>
<circle cx="70" cy="26" r="5" fill="${accent}"/>`,
  },
  {
    id: 'tile',
    traits: ['geometric', 'crafted', 'editorial', 'minimal'],
    notes: 'Quartered tile with one accent quadrant. Studios, portfolios, grids.',
    draw: ({ primary, accent, seed }) => {
      const q = seed % 4;
      const pos = [
        [26, 26], [50, 26], [26, 50], [50, 50],
      ];
      return pos
        .map(([x, y], i) =>
          `<rect x="${x}" y="${y}" width="20" height="20" rx="${i === q ? 10 : 4}" fill="${i === q ? accent : primary}"/>`)
        .join('');
    },
  },
  {
    id: 'thread',
    traits: ['elegant', 'luxurious', 'organic', 'editorial'],
    notes: 'Single continuous loop. Fashion, craftsmanship, connection.',
    draw: ({ primary, accent }) => `
<path d="M32,64 C20,52 28,30 48,30 C68,30 76,52 64,64 C56,72 40,72 32,64 Z" fill="none" stroke="${primary}" stroke-width="${SW}" stroke-linecap="round"/>
<circle cx="48" cy="30" r="5" fill="${accent}"/>`,
  },
  {
    id: 'ledger',
    traits: ['technical', 'serious', 'minimal', 'geometric'],
    notes: 'Aligned dashes forming a mark. Data, precision, systems.',
    draw: ({ primary, accent }) => `
<rect x="26" y="28" width="30" height="7" rx="3.5" fill="${primary}"/>
<rect x="26" y="44" width="44" height="7" rx="3.5" fill="${primary}"/>
<rect x="26" y="60" width="22" height="7" rx="3.5" fill="${primary}"/>
<circle cx="64" cy="63.5" r="5" fill="${accent}"/>`,
  },
  {
    id: 'aperture',
    traits: ['technical', 'crafted', 'geometric', 'minimal'],
    notes: 'Camera iris of six blades. Optics, precision craft, focus.',
    draw: ({ primary, accent }) => {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 - 90) * Math.PI) / 180;
        return [48 + 30 * Math.cos(a), 48 + 30 * Math.sin(a)];
      });
      const chords = pts
        .map((p1, i) => {
          const p2 = pts[(i + 2) % 6];
          return `<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="${primary}" stroke-width="4.5" stroke-linecap="round"/>`;
        })
        .join('');
      return `<circle cx="48" cy="48" r="34" fill="none" stroke="${primary}" stroke-width="4.5"/>${chords}<circle cx="48" cy="48" r="5" fill="${accent}"/>`;
    },
  },
  {
    id: 'sprout',
    traits: ['organic', 'friendly', 'warm', 'rooted'],
    notes: 'Stem with two leaves. Growth, food, care, freshness.',
    draw: ({ primary, accent }) => `
<path d="M48,74 C48,58 48,46 48,34" fill="none" stroke="${primary}" stroke-width="5" stroke-linecap="round"/>
<path d="M48,52 C38,50 30,42 29,31 C40,32 47,40 48,52 Z" fill="${primary}"/>
<path d="M48,44 C58,42 66,34 67,23 C56,24 49,32 48,44 Z" fill="${accent}"/>
<circle cx="48" cy="76" r="3" fill="${primary}"/>`,
  },
  {
    id: 'facet',
    traits: ['luxurious', 'bold', 'geometric', 'elegant'],
    notes: 'Cut gem with one lit facet. Jewelry, premium goods, craft.',
    draw: ({ primary, accent }) => `
<path d="M30,36 L66,36 L74,48 L48,74 L22,48 Z" fill="none" stroke="${primary}" stroke-width="4.5" stroke-linejoin="round"/>
<path d="M30,36 L48,48 L66,36" fill="none" stroke="${primary}" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M22,48 L48,48 L48,74 Z" fill="${accent}" opacity="0.9"/>`,
  },
];

export function motifById(id: string): Motif {
  const m = MOTIFS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown motif: ${id}`);
  return m;
}

export function motifsByTraits(wanted: Trait[], count = 3): Motif[] {
  return [...MOTIFS]
    .map((m) => ({ m, score: m.traits.filter((t) => wanted.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.m);
}
