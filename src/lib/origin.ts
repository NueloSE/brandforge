import type { NextRequest } from 'next/server';

/**
 * The public origin buyers can actually reach.
 *
 * Behind a reverse proxy (Railway), Next.js sees the internal bind address, so
 * `req.nextUrl.origin` yields `https://localhost:8080` — which would poison the
 * x402 challenge's resource.url and every board/site URL we return. Resolve the
 * externally visible origin instead, most explicit source first.
 */
export function publicOrigin(req: NextRequest): string {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return `https://${railway}`;

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (host && !host.startsWith('localhost')) {
    const proto = req.headers.get('x-forwarded-proto')?.split(',')[0] ?? 'https';
    return `${proto}://${host}`;
  }

  return req.nextUrl.origin;
}
