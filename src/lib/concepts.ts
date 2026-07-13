// Orchestration: brief -> 3 distinct concepts -> judged -> ready to render.
// Selection (fonts, motifs) is deterministic library lookups; only the brief
// parse and the final judging call touch the model.

import { askJson } from './anthropic';
import type { ParsedBrief } from './brief';
import { pairingsByTraits, type FontPairing } from './library/fonts';
import { buildPalette, type Palette } from './library/palettes';
import { motifsByTraits, type Motif } from './compose/motifs';

export interface Concept {
  label: 'A' | 'B' | 'C';
  pairing: FontPairing;
  motif: Motif;
  palette: Palette;
  seed: number;
  critique: string; // one line, shown on the board
}

export interface ConceptSet {
  brief: ParsedBrief;
  concepts: Concept[];
  featuredIndex: number;
}

export async function buildConcepts(brief: ParsedBrief): Promise<ConceptSet> {
  const pairings = pairingsByTraits(brief.traits, 3);
  const motifs = motifsByTraits(brief.traits, 3);

  const raw: Omit<Concept, 'critique'>[] = [0, 1, 2].map((i) => ({
    label: (['A', 'B', 'C'] as const)[i],
    pairing: pairings[i % pairings.length],
    motif: motifs[i % motifs.length],
    palette: buildPalette({
      primaryHint: brief.world.primaryHint,
      accentHint: brief.world.accentHint,
      groundHint: brief.world.groundHint,
    }),
    seed: hashSeed(brief.businessName + i),
  }));

  const judged = await judgeConcepts(brief, raw);

  const concepts: Concept[] = raw.map((c, i) => ({ ...c, critique: judged.notes[i] ?? '' }));
  return { brief, concepts, featuredIndex: clampIndex(judged.featuredIndex, concepts.length) };
}

interface JudgeResult {
  featuredIndex: number;
  notes: string[];
}

async function judgeConcepts(
  brief: ParsedBrief,
  concepts: Omit<Concept, 'critique'>[],
): Promise<JudgeResult> {
  const summary = concepts
    .map(
      (c, i) =>
        `${i}: font pairing "${c.pairing.id}" (${c.pairing.notes}), motif "${c.motif.id}" (${c.motif.notes})`,
    )
    .join('\n');

  const system = `You are a brand design judge. Given a brief and 3 candidate directions (font pairing +
mark motif), score them on trait fit, distinctiveness, and coherence with the brief's world.
ANTI-CLICHE RULE: actively penalize the most-expected choice for this industry (geometric
sans + orbit/ledger for dev tools, serif + thread for luxury, etc.). Feature the direction a
thoughtful human designer would pick to STAND OUT in this industry while staying credible.
Reply with ONLY a JSON object: { "featuredIndex": 0|1|2, "notes": [3 strings] } — each note is
one short punchy sentence (<=12 words) explaining that concept's character, written for the
brand owner, not a designer. No prose outside the JSON.`;

  const user = `Business: ${brief.businessName} (${brief.industry})
Traits: ${brief.traits.join(', ')}
World rationale: ${brief.world.rationale}

Candidates:
${summary}`;

  try {
    return await askJson<JudgeResult>(system, user, 500);
  } catch {
    // judging is an enhancement, never a hard dependency — fall back safely
    return { featuredIndex: 0, notes: concepts.map((c) => c.pairing.notes) };
  }
}

function clampIndex(i: number, len: number): number {
  return Number.isInteger(i) && i >= 0 && i < len ? i : 0;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 10;
}
