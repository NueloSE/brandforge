import { makeGet, makePost } from '@/lib/service-handler';

// Brand Kit Studio — 0.5 USDT per call (x402-gated in production).

export const maxDuration = 60;
export const GET = makeGet('kit');
export const POST = makePost('kit');
