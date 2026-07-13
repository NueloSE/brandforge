// Seller-side x402 (OKX Agent Payments Protocol) for the exact+Permit2 scheme.
//
// Wire format reverse-engineered from OKX's own buyer CLI (okx/onchainos-skills):
// - Challenge: HTTP 402 + `PAYMENT-REQUIRED` header = base64 JSON
//   { x402Version: 2, resource, accepts: [entry] }.
// - Buyer signs Permit2 PermitWitnessTransferFrom with
//   spender = x402ExactPermit2Proxy (0x4020...0001, same on all EVM chains),
//   witness = { to: payTo, validAfter }. Replays with `PAYMENT-SIGNATURE`.
// - We verify the EIP-712 signature locally (cryptographic proof of payment
//   authorization), then settle via the OKX facilitator; funds can ONLY go to
//   the witness.to baked into the signature, so settlement is not trust-bearing.

import { createHmac } from 'crypto';
import { recoverTypedDataAddress, type Hex } from 'viem';

export const XLAYER_CAIP2 = 'eip155:196';
export const XLAYER_CHAIN_ID = 196;
// USD₮0 — Tether's omnichain USDT and the stablecoin OKX actually pays out on
// X Layer (an OKX withdrawal lands as this token, and OKX's own payment docs
// use it for the `exact` scheme). The legacy 0x1e4a…41d USDT contract exists
// on-chain but is NOT what buyers hold — advertising it would be unpayable.
export const USDT_XLAYER = '0x779ded0c9e1022225f8e0630b35a9b54be713736';
export const USDT_SYMBOL = 'USD₮0';
export const USDT_DECIMALS = 6;
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
export const X402_EXACT_PERMIT2_PROXY = '0x402085c248EeA27D92E8b30b2C58ed07f9E20001';

export function payToAddress(): string {
  // default: the BrandForge Agentic Wallet (revenue destination)
  return process.env.PAY_TO_ADDRESS ?? '0x3136f29e1ff3c656286a47024121a87db7b933da';
}

export function paymentMode(): 'free' | 'x402' {
  return process.env.PAYMENT_MODE === 'x402' ? 'x402' : 'free';
}

/** price in minimal units (6-decimals USDT), e.g. "0.5" USDT -> "500000" */
export function priceMinimal(usdtStr: string): string {
  return String(Math.round(Number(usdtStr) * 10 ** USDT_DECIMALS));
}

export const SERVICES = {
  kit: {
    name: 'BrandForge Brand Kit Studio',
    price: () => priceMinimal(process.env.KIT_PRICE_USDT ?? '0.1'),
  },
  launch: {
    name: 'BrandForge Instant Brand Site',
    price: () => priceMinimal(process.env.LAUNCH_PRICE_USDT ?? '0.2'),
  },
} as const;
export type ServiceId = keyof typeof SERVICES;

// ── 402 challenge ──────────────────────────────────────────────────────────

export function buildPaymentRequiredHeader(service: ServiceId, serviceUrl: string, description: string): string {
  const payload = {
    x402Version: 2,
    resource: {
      name: SERVICES[service].name,
      description,
      url: serviceUrl,
    },
    accepts: [
      {
        scheme: 'exact',
        network: XLAYER_CAIP2,
        asset: USDT_XLAYER,
        payTo: payToAddress(),
        maxAmountRequired: SERVICES[service].price(),
        maxTimeoutSeconds: 300,
        extra: {
          name: USDT_SYMBOL,
          decimals: USDT_DECIMALS,
          assetTransferMethod: 'permit2',
        },
      },
    ],
  };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}

// ── payment proof parsing + verification ───────────────────────────────────

export interface Permit2Authorization {
  from: string;
  permitted: { token: string; amount: string };
  spender: string;
  nonce: string;
  deadline: string;
  witness: { to: string; validAfter: string };
}

export interface ParsedPayment {
  signature: Hex;
  authorization: Permit2Authorization;
}

/** Accepts the PAYMENT-SIGNATURE header (base64 JSON in a few possible shapes). */
export function parsePaymentHeader(headerValue: string): ParsedPayment {
  const json = JSON.parse(Buffer.from(headerValue, 'base64').toString('utf-8'));
  // shapes seen in the wild: {payload:{signature, permit2Authorization}},
  // {signature, permit2Authorization}, {payload:{signature, authorization}}
  const p = json.payload ?? json;
  const signature: string | undefined = p.signature;
  const auth = p.permit2Authorization ?? p.authorization ?? p.permit2_authorization;
  if (!signature || !auth) throw new Error('payment header missing signature/authorization');
  return { signature: signature as Hex, authorization: auth as Permit2Authorization };
}

const PERMIT2_TYPES = {
  PermitWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'witness', type: 'Witness' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  Witness: [
    { name: 'to', type: 'address' },
    { name: 'validAfter', type: 'uint256' },
  ],
} as const;

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  payer?: string;
}

/** Cryptographically verify the buyer's Permit2 authorization against our terms. */
export async function verifyPayment(p: ParsedPayment, priceMin: string): Promise<VerifyResult> {
  const a = p.authorization;
  const eq = (x: string, y: string) => x?.toLowerCase() === y?.toLowerCase();

  if (!eq(a.permitted?.token, USDT_XLAYER)) return { ok: false, reason: 'wrong token' };
  if (!eq(a.spender, X402_EXACT_PERMIT2_PROXY)) return { ok: false, reason: 'wrong spender' };
  if (!eq(a.witness?.to, payToAddress())) return { ok: false, reason: 'wrong payTo' };
  if (BigInt(a.permitted.amount) < BigInt(priceMin)) return { ok: false, reason: 'amount below price' };

  const now = Math.floor(Date.now() / 1000);
  if (Number(a.deadline) < now) return { ok: false, reason: 'authorization expired' };
  if (Number(a.witness.validAfter) > now) return { ok: false, reason: 'authorization not yet valid' };

  let recovered: string;
  try {
    recovered = await recoverTypedDataAddress({
      domain: { name: 'Permit2', chainId: XLAYER_CHAIN_ID, verifyingContract: PERMIT2_ADDRESS as Hex },
      types: PERMIT2_TYPES,
      primaryType: 'PermitWitnessTransferFrom',
      message: {
        permitted: { token: a.permitted.token as Hex, amount: BigInt(a.permitted.amount) },
        spender: a.spender as Hex,
        nonce: BigInt(a.nonce),
        deadline: BigInt(a.deadline),
        witness: { to: a.witness.to as Hex, validAfter: BigInt(a.witness.validAfter) },
      },
      signature: p.signature,
    });
  } catch (e) {
    return { ok: false, reason: `signature recovery failed: ${(e as Error).message}` };
  }
  if (!eq(recovered, a.from)) return { ok: false, reason: 'signer does not match from' };
  return { ok: true, payer: a.from };
}

// ── settlement via OKX facilitator ─────────────────────────────────────────

export interface SettleResult {
  status: 'settled' | 'pending' | 'failed';
  transaction?: string;
  detail?: string;
}

/**
 * OKX API auth (AK signing), per OKX's own client:
 *   prehash = timestamp + METHOD + requestPath + body
 *   sign    = base64(HMAC-SHA256(secretKey, prehash))
 */
function okxAuthHeaders(method: string, requestPath: string, body: string): Record<string, string> {
  const key = process.env.OKX_API_KEY;
  const secret = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;
  if (!key || !secret || !passphrase) throw new Error('OKX API credentials are not configured');

  const timestamp = new Date().toISOString().replace(/(\.\d{3})\d*Z$/, '$1Z');
  const sign = createHmac('sha256', secret).update(`${timestamp}${method}${requestPath}${body}`).digest('base64');

  return {
    'content-type': 'application/json',
    'OK-ACCESS-KEY': key,
    'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'OK-ACCESS-TIMESTAMP': timestamp,
  };
}

/**
 * Ask the facilitator to execute proxy.settle -> permitWitnessTransferFrom.
 * Funds can only move to the witness.to baked into the buyer's signature,
 * so this call cannot redirect payment even if the request were tampered with.
 *
 * Body shape (confirmed against the live facilitator): the decoded
 * PAYMENT-SIGNATURE header as `paymentPayload` (it carries x402Version,
 * accepted, payload{signature, permit2Authorization}), plus the buyer's
 * `accepted` entry as `paymentRequirements`.
 */
export async function settlePayment(rawPaymentHeader: string): Promise<SettleResult> {
  const host = process.env.OKX_API_HOST ?? 'https://web3.okx.com';
  const path = process.env.FACILITATOR_SETTLE_PATH ?? '/api/v6/pay/x402/settle';

  let decoded: Record<string, unknown>;
  try {
    decoded = JSON.parse(Buffer.from(rawPaymentHeader, 'base64').toString('utf-8'));
  } catch {
    return { status: 'failed', detail: 'payment header is not base64 JSON' };
  }
  const body = JSON.stringify({
    paymentPayload: decoded,
    paymentRequirements: decoded.accepted ?? null,
  });

  try {
    const res = await fetch(`${host}${path}`, {
      method: 'POST',
      headers: okxAuthHeaders('POST', path, body),
      body,
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    if (!res.ok) return { status: 'failed', detail: `facilitator HTTP ${res.status}: ${text.slice(0, 300)}` };

    let json: Record<string, unknown> = {};
    try { json = JSON.parse(text); } catch {
      return { status: 'failed', detail: `facilitator returned non-JSON: ${text.slice(0, 200)}` };
    }
    const data = (json.data ?? {}) as Record<string, unknown>;
    // strict: only `success: true` counts as money moved
    if (data.success === true) {
      const tx = (data.transaction ?? '') as string;
      const status = (data.status as string) === 'pending' ? 'pending' : 'settled';
      return { status, transaction: tx };
    }
    return {
      status: 'failed',
      detail: `${data.errorReason ?? 'unknown'}: ${data.errorMessage ?? JSON.stringify(json).slice(0, 200)}`,
    };
  } catch (e) {
    return { status: 'failed', detail: (e as Error).message };
  }
}

export function buildPaymentResponseHeader(r: SettleResult, payer: string, amountMinimal: string): string {
  return Buffer.from(
    JSON.stringify({ status: r.status, transaction: r.transaction ?? null, amount: amountMinimal, payer }),
    'utf-8',
  ).toString('base64');
}
