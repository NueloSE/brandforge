// Curated font pairing library — the quality floor of the whole product.
// Every pairing is hand-picked; the LLM only *selects* by traits, never invents.
// Fonts are fetched as woff2 at build/generate time and embedded as data URIs
// in deliverables (brand boards and sites must be self-contained).

export type Trait =
  | 'warm' | 'crafted' | 'rooted' | 'elegant' | 'playful' | 'bold'
  | 'technical' | 'minimal' | 'luxurious' | 'friendly' | 'editorial'
  | 'geometric' | 'organic' | 'retro' | 'modern' | 'serious' | 'energetic';

export interface FontPairing {
  id: string;
  display: { family: string; weights: number[]; gf: string }; // gf = Google Fonts css2 family query
  body: { family: string; weights: number[]; gf: string };
  traits: Trait[];
  /** when a wordmark needs tighter tracking or case treatment */
  wordmark: { case: 'normal' | 'lower' | 'upper'; tracking: string; weight: number };
  notes: string; // shown to the LLM judge as context, never to users
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: 'fraunces-archivo',
    display: { family: 'Fraunces', weights: [600], gf: 'Fraunces:opsz,wght@9..144,600' },
    body: { family: 'Archivo', weights: [400, 600], gf: 'Archivo:wght@400;600' },
    traits: ['warm', 'crafted', 'rooted', 'organic'],
    wordmark: { case: 'normal', tracking: '-0.01em', weight: 600 },
    notes: 'Soft wonky serif + workhorse grotesque. Food, craft, hospitality, heritage-modern.',
  },
  {
    id: 'sora-inter',
    display: { family: 'Sora', weights: [600, 700], gf: 'Sora:wght@600;700' },
    body: { family: 'Inter', weights: [400, 600], gf: 'Inter:wght@400;600' },
    traits: ['technical', 'modern', 'geometric', 'minimal'],
    wordmark: { case: 'normal', tracking: '-0.02em', weight: 700 },
    notes: 'Geometric tech display + neutral body. SaaS, dev tools, fintech.',
  },
  {
    id: 'bricolage-worksans',
    display: { family: 'Bricolage Grotesque', weights: [600, 800], gf: 'Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800' },
    body: { family: 'Work Sans', weights: [400, 500], gf: 'Work+Sans:wght@400;500' },
    traits: ['playful', 'bold', 'energetic', 'modern'],
    wordmark: { case: 'lower', tracking: '-0.03em', weight: 800 },
    notes: 'Charactered grotesque with attitude. Consumer apps, creators, youth brands.',
  },
  {
    id: 'cormorant-outfit',
    display: { family: 'Cormorant Garamond', weights: [600], gf: 'Cormorant+Garamond:wght@600' },
    body: { family: 'Outfit', weights: [400, 500], gf: 'Outfit:wght@400;500' },
    traits: ['elegant', 'luxurious', 'editorial', 'serious'],
    wordmark: { case: 'upper', tracking: '0.18em', weight: 600 },
    notes: 'High-contrast garalde + clean geometric body. Fashion, jewelry, premium services.',
  },
  {
    id: 'spacegrotesk-splinesans',
    display: { family: 'Space Grotesk', weights: [500, 700], gf: 'Space+Grotesk:wght@500;700' },
    body: { family: 'Spline Sans', weights: [400, 500], gf: 'Spline+Sans:wght@400;500' },
    traits: ['technical', 'geometric', 'modern', 'bold'],
    wordmark: { case: 'normal', tracking: '-0.02em', weight: 700 },
    notes: 'Techy but warm-edged. Crypto, data products, hardware.',
  },
  {
    id: 'dmserif-dmsans',
    display: { family: 'DM Serif Display', weights: [400], gf: 'DM+Serif+Display' },
    body: { family: 'DM Sans', weights: [400, 500], gf: 'DM+Sans:opsz,wght@9..40,400;9..40,500' },
    traits: ['editorial', 'elegant', 'friendly', 'modern'],
    wordmark: { case: 'normal', tracking: '0em', weight: 400 },
    notes: 'Same-superfamily contrast pair. Media, consulting, boutiques.',
  },
  {
    id: 'unbounded-manrope',
    display: { family: 'Unbounded', weights: [600, 700], gf: 'Unbounded:wght@600;700' },
    body: { family: 'Manrope', weights: [400, 600], gf: 'Manrope:wght@400;600' },
    traits: ['bold', 'energetic', 'geometric', 'modern'],
    wordmark: { case: 'upper', tracking: '0.04em', weight: 700 },
    notes: 'Expanded display with presence. Web3, gaming, events, streetwear.',
  },
  {
    id: 'lora-karla',
    display: { family: 'Lora', weights: [600], gf: 'Lora:wght@600' },
    body: { family: 'Karla', weights: [400, 600], gf: 'Karla:wght@400;600' },
    traits: ['warm', 'friendly', 'editorial', 'organic', 'serious'],
    wordmark: { case: 'normal', tracking: '0em', weight: 600 },
    notes: 'Calm bookish serif + humanist sans. Education, wellness, NGOs, coaching.',
  },
  {
    id: 'archivoblack-archivo',
    display: { family: 'Archivo Black', weights: [400], gf: 'Archivo+Black' },
    body: { family: 'Archivo', weights: [400, 500], gf: 'Archivo:wght@400;500' },
    traits: ['bold', 'retro', 'energetic', 'crafted'],
    wordmark: { case: 'upper', tracking: '-0.01em', weight: 400 },
    notes: 'Heavy poster grotesque. Barbershops, gyms, food trucks, records.',
  },
  {
    id: 'gloock-figtree',
    display: { family: 'Gloock', weights: [400], gf: 'Gloock' },
    body: { family: 'Figtree', weights: [400, 500], gf: 'Figtree:wght@400;500' },
    traits: ['luxurious', 'editorial', 'elegant', 'modern'],
    wordmark: { case: 'normal', tracking: '0.01em', weight: 400 },
    notes: 'Didone-flavored display + soft geometric body. Beauty, interiors, studios.',
  },
];

export function pairingById(id: string): FontPairing {
  const p = FONT_PAIRINGS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown font pairing: ${id}`);
  return p;
}

export function pairingsByTraits(wanted: Trait[], count = 3): FontPairing[] {
  return [...FONT_PAIRINGS]
    .map((p) => ({ p, score: p.traits.filter((t) => wanted.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.p);
}
