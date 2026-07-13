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
