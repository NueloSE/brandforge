// Short links for deliverables. We store the (long, self-contained) board slug
// under a short random key in Redis, so a buyer gets `/b/x7k2p9` instead of a
// 2,800-char URL. Fully backward compatible: the long self-contained slug still
// decodes directly, so links keep working even if Redis is unavailable.

import Redis from 'ioredis';
import { randomBytes } from 'crypto';

let client: Redis | null = null;
let triedConnect = false;

function redis(): Redis | null {
  if (triedConnect) return client;
  triedConnect = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    client = new Redis(url, {
      // Railway's private network (*.railway.internal) resolves over IPv6 only;
      // family:0 lets Node use whichever family DNS returns. Without it ioredis
      // silently never connects and every shorten() falls back to the long slug.
      family: 0,
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
      connectTimeout: 5000,
    });
    client.on('error', (e) => { console.error('[redis] error:', (e as Error).message); });
    client.on('connect', () => { console.error('[redis] connected'); });
  } catch {
    client = null;
  }
  return client;
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // no lookalikes (0/o/1/l)
function newCode(len = 7): string {
  let s = '';
  const bytes = randomBytes(len);
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

/**
 * Store the long slug and return a short code. If Redis is unavailable, returns
 * null and the caller uses the long self-contained slug directly.
 */
export async function shorten(longSlug: string): Promise<string | null> {
  const r = redis();
  if (!r) return null;
  try {
    const code = newCode();
    // permanent (no TTL) — deliverables must not expire
    await r.set(`b:${code}`, longSlug);
    return code;
  } catch {
    return null;
  }
}

/** Resolve a short code back to the long slug, or null if not found. */
export async function resolveShort(code: string): Promise<string | null> {
  const r = redis();
  if (!r) return null;
  try {
    return await r.get(`b:${code}`);
  } catch {
    return null;
  }
}

/** A short code is our fixed-length lowercase set; long slugs are base64url. */
export function looksLikeShortCode(s: string): boolean {
  return /^[a-z2-9]{6,10}$/.test(s);
}
