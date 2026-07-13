// Landing-page copy for the Instant Brand Site SKU — one LLM call, strict JSON.

import { askJson } from './anthropic';
import type { ParsedBrief } from './brief';

export interface SiteCopy {
  headline: string;      // <=8 words, not the tagline verbatim
  subhead: string;       // <=26 words
  cta: string;           // button label, <=4 words
  sections: { title: string; body: string }[]; // exactly 3
  footerLine: string;    // one warm closing line
}

const SYSTEM = `You write landing-page copy for small businesses. Voice: specific, concrete,
zero cliches (never "elevate", "unleash", "seamless", "solutions"). Write like the business
owner would talk to a customer they respect. Ground every line in the business's actual world.
Reply with ONLY a JSON object:
{
  "headline": string,     // <=8 words. Not the tagline. A claim or invitation.
  "subhead": string,      // <=26 words, concrete about what the customer gets
  "cta": string,          // <=4 words, action verb first
  "sections": [           // exactly 3
    { "title": string, "body": string }  // title <=5 words; body <=40 words
  ],
  "footerLine": string    // one warm line, <=14 words
}`;

export async function generateSiteCopy(brief: ParsedBrief): Promise<SiteCopy> {
  const user = `Business: ${brief.businessName} — ${brief.industry}
Tagline: ${brief.tagline}
Audience: ${brief.audience}
Traits: ${brief.traits.join(', ')}
World: ${brief.world.rationale}`;
  const copy = await askJson<SiteCopy>(SYSTEM, user, 900);
  copy.sections = (copy.sections ?? []).slice(0, 3);
  while (copy.sections.length < 3) {
    copy.sections.push({ title: brief.tagline, body: brief.audience });
  }
  return copy;
}
