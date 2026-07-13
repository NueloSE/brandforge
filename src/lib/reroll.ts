// One free reroll per purchased brief: the kit response carries an HMAC token
// bound to the normalized brief + the current day. Presenting a valid token
// bypasses the payment gate for a regeneration of the SAME brief only.
// Stateless by design (no DB): worst case a buyer rerolls one brief several
// times within a day — pennies of compute, cheap goodwill.

import { createHmac } from 'crypto';

function secret(): string {
  return process.env.REROLL_SECRET ?? 'brandforge-dev-secret';
}

export function normalizeBrief(brief: string): string {
  return brief.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function issueRerollToken(brief: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHmac('sha256', secret()).update(`${normalizeBrief(brief)}|${day}`).digest('base64url');
}

export function isValidRerollToken(brief: string, token: string): boolean {
  if (!token) return false;
  // accept today's and yesterday's token so a reroll never expires mid-session
  const now = new Date();
  for (const offset of [0, 1]) {
    const d = new Date(now.getTime() - offset * 86400_000).toISOString().slice(0, 10);
    const expect = createHmac('sha256', secret()).update(`${normalizeBrief(brief)}|${d}`).digest('base64url');
    if (token === expect) return true;
  }
  return false;
}
