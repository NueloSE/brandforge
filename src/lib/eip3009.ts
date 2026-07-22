// EIP-3009 (transferWithAuthorization) settlement — the scheme OKX's
// task-402-pay buyer produces and the pattern the approved reference ASPs use.
//
// The buyer signs an off-chain authorization ("move <value> USD₮0 from me to
// payTo") and sends {signature, authorization} in the payment header. WE
// broadcast transferWithAuthorization from a dedicated operator wallet (paying
// gas in OKB — fractions of a cent on X Layer); the token contract itself
// verifies the buyer's EIP-712 signature and enforces single-use nonces.
// Funds move buyer -> payTo; the operator only relays and pays gas.

import {
  createPublicClient, createWalletClient, http, defineChain, getAddress, type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT_XLAYER, XLAYER_CHAIN_ID, payToAddress } from './x402';

export const xLayer = defineChain({
  id: XLAYER_CHAIN_ID,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [process.env.XLAYER_RPC_URL ?? 'https://rpc.xlayer.tech'] } },
});

const EIP3009_ABI = [
  {
    type: 'function', name: 'transferWithAuthorization', stateMutability: 'nonpayable', outputs: [],
    inputs: [
      { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' }, { name: 'r', type: 'bytes32' }, { name: 's', type: 'bytes32' },
    ],
  },
  {
    type: 'function', name: 'authorizationState', stateMutability: 'view',
    inputs: [{ name: 'authorizer', type: 'address' }, { name: 'nonce', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

export interface Eip3009Authorization {
  from: string; to: string; value: string;
  validAfter: string; validBefore: string; nonce: string;
}
export interface Eip3009Payment {
  signature: Hex;
  authorization: Eip3009Authorization;
}

/** Pull the EIP-3009 authorization out of the decoded payment header, if present. */
export function parseEip3009(headerValue: string): Eip3009Payment | null {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(Buffer.from(headerValue, 'base64').toString('utf-8'));
  } catch {
    try { json = JSON.parse(headerValue); } catch { return null; }
  }
  const p = (json.payload ?? json) as Record<string, unknown>;
  const sig = p.signature as string | undefined;
  const auth = p.authorization as Eip3009Authorization | undefined;
  if (!sig || !auth || auth.from === undefined || auth.to === undefined || auth.value === undefined) return null;
  return { signature: sig as Hex, authorization: auth };
}

export interface Eip3009Result {
  status: 'settled' | 'failed';
  transaction?: string;
  payer?: string;
  detail?: string;
}

function operatorAccount() {
  const pk = process.env.OPERATOR_PRIVATE_KEY;
  if (!pk) throw new Error('OPERATOR_PRIVATE_KEY is not set');
  return privateKeyToAccount((pk.startsWith('0x') ? pk : `0x${pk}`) as Hex);
}

function splitSig(sig: Hex): { r: Hex; s: Hex; v: number } {
  const h = sig.slice(2);
  const r = `0x${h.slice(0, 64)}` as Hex;
  const s = `0x${h.slice(64, 128)}` as Hex;
  let v = parseInt(h.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { r, s, v };
}

/**
 * Verify terms + settle a buyer's EIP-3009 authorization on-chain.
 * priceMin is the minimum acceptable value in token minimal units.
 */
export async function settleEip3009(p: Eip3009Payment, priceMin: bigint): Promise<Eip3009Result> {
  const a = p.authorization;
  const eq = (x: string, y: string) => x?.toLowerCase() === y?.toLowerCase();

  if (!eq(a.to, payToAddress())) return { status: 'failed', detail: `authorization.to must be ${payToAddress()}` };
  let value: bigint;
  try { value = BigInt(a.value); } catch { return { status: 'failed', detail: 'value not an integer' }; }
  if (value < priceMin) return { status: 'failed', detail: `insufficient amount: ${value} < ${priceMin}` };

  const now = Math.floor(Date.now() / 1000);
  if (now < Number(a.validAfter) - 60) return { status: 'failed', detail: 'authorization not yet valid' };
  if (now > Number(a.validBefore) - 6) return { status: 'failed', detail: 'authorization expired' };

  const account = operatorAccount();
  const pub = createPublicClient({ chain: xLayer, transport: http() });
  const wallet = createWalletClient({ account, chain: xLayer, transport: http() });

  // on-chain replay check
  const used = await pub.readContract({
    address: USDT_XLAYER as Hex, abi: EIP3009_ABI, functionName: 'authorizationState',
    args: [getAddress(a.from), a.nonce as Hex],
  });
  if (used) return { status: 'failed', detail: 'authorization already used (replay)' };

  const { r, s, v } = splitSig(p.signature);
  const args = [
    getAddress(a.from), getAddress(a.to), value,
    BigInt(a.validAfter), BigInt(a.validBefore), a.nonce as Hex, v, r, s,
  ] as const;

  // Free preflight: the token verifies the EIP-712 signature and balance. A
  // revert here means it can never settle — surface it without burning gas.
  try {
    await pub.simulateContract({
      address: USDT_XLAYER as Hex, abi: EIP3009_ABI, functionName: 'transferWithAuthorization',
      args, account,
    });
  } catch (e) {
    return { status: 'failed', detail: `preflight failed: ${shortErr(e)}` };
  }

  try {
    const hash = await wallet.writeContract({
      address: USDT_XLAYER as Hex, abi: EIP3009_ABI, functionName: 'transferWithAuthorization', args,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 90_000 });
    if (receipt.status !== 'success') return { status: 'failed', detail: 'settlement tx reverted', transaction: hash };
    return { status: 'settled', transaction: hash, payer: getAddress(a.from) };
  } catch (e) {
    return { status: 'failed', detail: `settlement failed: ${shortErr(e)}` };
  }
}

/** Preflight only (no broadcast) — proves the signature settles, spends no gas. */
export async function preflightEip3009(p: Eip3009Payment, priceMin: bigint): Promise<Eip3009Result> {
  const a = p.authorization;
  if (a.to?.toLowerCase() !== payToAddress().toLowerCase()) return { status: 'failed', detail: 'wrong payTo' };
  if (BigInt(a.value) < priceMin) return { status: 'failed', detail: 'insufficient amount' };
  const pub = createPublicClient({ chain: xLayer, transport: http() });
  const { r, s, v } = splitSig(p.signature);
  try {
    await pub.simulateContract({
      address: USDT_XLAYER as Hex, abi: EIP3009_ABI, functionName: 'transferWithAuthorization',
      args: [getAddress(a.from), getAddress(a.to), BigInt(a.value), BigInt(a.validAfter), BigInt(a.validBefore), a.nonce as Hex, v, r, s],
      account: getAddress(a.from), // simulate as if from the payer; no operator needed
    });
    return { status: 'settled', payer: getAddress(a.from), detail: 'preflight ok (signature valid, would settle)' };
  } catch (e) {
    return { status: 'failed', detail: `preflight failed: ${shortErr(e)}` };
  }
}

function shortErr(e: unknown): string {
  const m = (e as { shortMessage?: string; message?: string })?.shortMessage
    ?? (e as Error)?.message ?? String(e);
  return m.slice(0, 200);
}
