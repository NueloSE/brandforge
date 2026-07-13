import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const MODEL = 'claude-sonnet-4-5';

/** Ask the model for a single JSON object and parse it. Throws on malformed output. */
export async function askJson<T>(system: string, user: string, maxTokens = 1500): Promise<T> {
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Model did not return JSON: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]) as T;
}
