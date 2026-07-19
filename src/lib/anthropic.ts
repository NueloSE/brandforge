import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    // Bound the SDK: a single request may not exceed `timeout`, and we allow
    // only one internal retry. Without this the SDK silently retries an
    // "overloaded" model with growing backoff, and — since Railway does not
    // enforce route maxDuration — a paid request could hang for minutes.
    // maxRetries: 0 — on a transient overload we prefer an instant deterministic
    // fallback over stacking retry backoff, since the buyer is waiting post-payment.
    client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 0 });
  }
  return client;
}

export const MODEL = 'claude-sonnet-4-5';

/** Ask the model for a single JSON object and parse it. Throws on malformed output or timeout. */
export async function askJson<T>(system: string, user: string, maxTokens = 1500): Promise<T> {
  const res = await anthropic().messages.create(
    { model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] },
    { timeout: 22_000 },
  );
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Model did not return JSON: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]) as T;
}
