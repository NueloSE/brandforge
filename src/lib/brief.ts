// Brief parsing + world-grounding — the one LLM step that decides *what*
// the brand is about. Everything downstream (fonts, palette, motif) is
// deterministic selection from curated libraries, keyed off this output.

import { askJson } from './anthropic';
import type { Trait } from './library/fonts';

const TRAIT_LIST: Trait[] = [
  'warm', 'crafted', 'rooted', 'elegant', 'playful', 'bold', 'technical',
  'minimal', 'luxurious', 'friendly', 'editorial', 'geometric', 'organic',
  'retro', 'modern', 'serious', 'energetic',
];

export interface ParsedBrief {
  businessName: string;
  nameWasGiven: boolean;
  nameAlternates: string[]; // populated when nameWasGiven is false
  tagline: string;
  subline: string; // short caps line for the lockup, e.g. "BAKERY · LAGOS"
  industry: string;
  audience: string;
  traits: Trait[]; // 3-4, ranked, drawn only from TRAIT_LIST
  world: {
    primaryHint: string; // hex, grounded in the brief's own world
    accentHint: string;
    groundHint: string;
    rationale: string; // why these colors — shown on the board as craft proof
  };
}

const SYSTEM = `You are a senior brand strategist. Given a short business brief, extract a structured
brand foundation. You never invent generic "startup blue" — every color choice must be
GROUNDED in something specific from the brief's own world (a place, material, tradition,
food, craft, or culture the business actually belongs to). Be concrete and specific, not
generic. Reply with ONLY a single JSON object, no prose, no markdown fences.

CLICHE BAN — the industry's default palette is FORBIDDEN. Never: terminal/neon green for
developer tools; generic blue for fintech or SaaS; teal for health; purple gradients for AI;
red-yellow for food chains. Find the color a lazy designer would miss: ground it in a
specific material, place, or object from THIS business's world. If the brief is thin, invent
a plausible specific world for it first (its city, its craft, its customers' desks) and
ground there.

NAMING — applies ONLY when the brief does NOT supply a name. If the brief gives a name
(e.g. "X — a bakery..." or "the name is X"), keep it VERBATIM, set nameWasGiven=true, and
skip every rule below — a client's existing name is never questioned or changed.
When inventing a name, it must be ownable and surprising. HARD RULES:
1. NEVER a word that describes the product's function or an agent-noun of it (a monitoring
   tool must not be Watcher/Monitor/Vigil/Lookout/Guard/Tracker/Scout/Sentry; a bakery must
   not be Baker/Oven). Function words are what EVERY lazy generator produces.
2. NEVER these overused tokens: Sentinel, Nexus, Pulse, Apex, Vertex, Zenith, Vigil, Beacon,
   Forge, Atlas, Echo, Nova, Orbit, Prism, Flux, Shift, Spark.
3. DO name sideways: a concrete object/place/figure from an adjacent world that carries the
   right FEELING (like "Slack", "Stripe", "Notion", "Linear" — none describe their function),
   a coined portmanteau, or a resonant non-English word with real meaning here.
4. Each of the 3 names (main + 2 alternates) must use a DIFFERENT strategy from rule 3.
Test: if the name tells you what the product does, it fails. If it makes you ask "why is it
called that?" and the answer is a good story, it wins.

Traits MUST be chosen only from this exact list (pick 3-4, most-defining first):
${TRAIT_LIST.join(', ')}

JSON shape:
{
  "businessName": string,        // use the name if given in the brief; otherwise invent ONE strong, specific name (not generic)
  "nameWasGiven": boolean,
  "nameAlternates": string[],    // 2 alternate names if nameWasGiven=false, else []
  "tagline": string,             // <=6 words, specific to this business, no cliches
  "subline": string,             // short caps-style descriptor, e.g. "BAKERY - LAGOS" or "STUDIO"
  "industry": string,
  "audience": string,            // one line: who this is for
  "traits": string[],            // 3-4 from the allowed list
  "world": {
    "primaryHint": "#RRGGBB",    // a color grounded in the brief's real-world context
    "accentHint": "#RRGGBB",     // a complementary/contrasting accent, also grounded
    "groundHint": "#RRGGBB",     // a light neutral base, tinted toward the world (not pure white)
    "rationale": string          // 1-2 sentences: what real thing each color comes from
  }
}`;

export async function parseBrief(rawBrief: string): Promise<ParsedBrief> {
  const clean = sanitizeBrief(rawBrief);
  try {
    const result = await askJson<ParsedBrief>(SYSTEM, `Business brief:\n"""${clean}"""`);
    result.traits = result.traits.filter((t): t is Trait => TRAIT_LIST.includes(t as Trait)).slice(0, 4);
    if (result.traits.length === 0) result.traits = ['modern', 'friendly'];
    return result;
  } catch (e) {
    // A buyer has already paid by the time this runs — never hang or fail.
    // Fall back to a deterministic brief built from the brief's own words.
    console.error('parseBrief LLM failed, using deterministic fallback:', (e as Error).message);
    return deterministicBrief(clean);
  }
}

/**
 * LLM-free brief: keyword→trait heuristics + a name-derived palette. Less
 * world-grounded than the model path, but always produces a coherent,
 * contrast-valid brand — so a paid request is never left undelivered.
 */
export function deterministicBrief(clean: string): ParsedBrief {
  const text = clean.toLowerCase();
  const givenName = extractGivenName(clean);

  const TRAIT_CUES: [Trait, RegExp][] = [
    ['warm', /bakery|coffee|cafe|kitchen|food|restaurant|home|family/],
    ['crafted', /artisan|handmade|craft|studio|workshop|bespoke|repair/],
    ['rooted', /heritage|traditional|local|african|roots|authentic/],
    ['technical', /api|dev|software|data|engineer|infrastructure|tool|platform|cloud/],
    ['minimal', /simple|clean|minimal|precise/],
    ['luxurious', /luxury|premium|fine|couture|jewel|gold/],
    ['playful', /kids|fun|game|kids|kid|kids'|party|kids’|toy/],
    ['bold', /gym|fitness|sport|street|loud|bold/],
    ['elegant', /fashion|beauty|salon|interior|elegant/],
    ['editorial', /media|magazine|writer|content|publish|journal/],
    ['organic', /wellness|health|farm|natural|plant|garden/],
    ['modern', /startup|app|tech|digital|online/],
    ['friendly', /community|social|people|friendly|help/],
  ];
  const traits: Trait[] = [];
  for (const [t, re] of TRAIT_CUES) if (re.test(text) && !traits.includes(t)) traits.push(t);
  while (traits.length < 3) for (const d of ['modern', 'crafted', 'friendly'] as Trait[]) if (!traits.includes(d)) traits.push(d);
  const finalTraits = traits.slice(0, 4);

  // deterministic hue from the name so the same brand always looks the same
  const seed = [...(givenName ?? clean)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const hue = seed % 360;
  const primaryHint = hslHex(hue, 0.55, 0.32);
  const accentHint = hslHex((hue + 32) % 360, 0.7, 0.62);
  const groundHint = hslHex(hue, 0.18, 0.95);

  const name = givenName ?? deriveName(clean, seed);
  return {
    businessName: name,
    nameWasGiven: Boolean(givenName),
    nameAlternates: givenName ? [] : [deriveName(clean, seed * 3 + 1), deriveName(clean, seed * 7 + 2)],
    tagline: 'Crafted with intention',
    subline: (clean.split(/[—\-,.]/)[1] ?? 'STUDIO').trim().slice(0, 24).toUpperCase() || 'STUDIO',
    industry: 'General',
    audience: clean.slice(0, 120),
    traits: finalTraits,
    world: {
      primaryHint, accentHint, groundHint,
      rationale: 'A distinctive palette derived from the brand’s character, tuned for contrast and legibility.',
    },
  };
}

function extractGivenName(clean: string): string | null {
  // "Name — description" / "Name, description" / "the name is Name"
  const dash = clean.match(/^([A-Z][\w'&.]+(?:\s+[A-Z][\w'&.]+){0,3})\s*[—–\-]/);
  if (dash) return dash[1].trim();
  const explicit = clean.match(/\bname\s+is\s+([A-Z][\w'&.]+(?:\s+[A-Z][\w'&.]+){0,2})/i);
  if (explicit) return explicit[1].trim();
  return null;
}

const SYLL = ['ora', 'ven', 'lum', 'kai', 'sol', 'mir', 'ash', 'vale', 'noor', 'ryn', 'ade', 'zola'];
function deriveName(clean: string, seed: number): string {
  const a = SYLL[seed % SYLL.length];
  const b = SYLL[(seed >> 3) % SYLL.length];
  const s = (a + b).replace(/(.)\1/g, '$1');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hslHex(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const t = (x: number) => {
    x = ((x % 1) + 1) % 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const c = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  const hn = h / 360;
  return `#${c(t(hn + 1 / 3))}${c(t(hn))}${c(t(hn - 1 / 3))}`;
}

/** Buyer input is untrusted — strip anything that reads like an instruction before it reaches the model. */
function sanitizeBrief(raw: string): string {
  return raw
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 600)
    .replace(/\b(ignore|disregard)\b[^.]{0,80}(instructions|prompt|system|above)/gi, '[redacted]');
}
