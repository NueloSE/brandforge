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
  const result = await askJson<ParsedBrief>(
    SYSTEM,
    `Business brief:\n"""${clean}"""`,
  );
  result.traits = result.traits.filter((t): t is Trait => TRAIT_LIST.includes(t as Trait)).slice(0, 4);
  if (result.traits.length === 0) result.traits = ['modern', 'friendly'];
  return result;
}

/** Buyer input is untrusted — strip anything that reads like an instruction before it reaches the model. */
function sanitizeBrief(raw: string): string {
  return raw
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 600)
    .replace(/\b(ignore|disregard)\b[^.]{0,80}(instructions|prompt|system|above)/gi, '[redacted]');
}
