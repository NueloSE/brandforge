// No database for the MVP: a board's full state is encoded straight into its
// URL slug. Deterministic composition means re-decoding always reproduces
// the identical board — the slug *is* the storage.

import type { ParsedBrief } from './brief';
import type { Concept, ConceptSet } from './concepts';
import { pairingById } from './library/fonts';
import { motifById } from './compose/motifs';
import type { Palette } from './library/palettes';

interface WireConcept {
  l: Concept['label'];
  p: string; // pairing id
  m: string; // motif id
  pal: Palette;
  s: number;
  c: string; // critique
}

import type { SiteCopy } from './site-copy';

interface WireBoard {
  b: ParsedBrief;
  cs: WireConcept[];
  f: number;
  site?: SiteCopy; // present only for the Instant Brand Site SKU
}

export interface DecodedBoard extends ConceptSet {
  site?: SiteCopy;
}

export function encodeBoard(set: ConceptSet, site?: SiteCopy): string {
  const wire: WireBoard = {
    b: set.brief,
    cs: set.concepts.map((c) => ({ l: c.label, p: c.pairing.id, m: c.motif.id, pal: c.palette, s: c.seed, c: c.critique })),
    f: set.featuredIndex,
    ...(site ? { site } : {}),
  };
  const json = JSON.stringify(wire);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

export function decodeBoard(slug: string): DecodedBoard {
  const json = Buffer.from(slug, 'base64url').toString('utf-8');
  const wire = JSON.parse(json) as WireBoard;
  const concepts: Concept[] = wire.cs.map((c) => ({
    label: c.l,
    pairing: pairingById(c.p),
    motif: motifById(c.m),
    palette: c.pal,
    seed: c.s,
    critique: c.c,
  }));
  return { brief: wire.b, concepts, featuredIndex: wire.f, site: wire.site };
}
