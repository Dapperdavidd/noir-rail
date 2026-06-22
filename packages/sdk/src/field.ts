// BLS12-381 scalar-field helpers and encodings shared across the SDK.
import { FR_MODULUS } from "./poseidon.ts";

export { FR_MODULUS };

/** Reduce into [0, r). */
export function fieldMod(x: bigint): bigint {
  const r = x % FR_MODULUS;
  return r < 0n ? r + FR_MODULUS : r;
}

/** Decimal field string → bigint. */
export function fromDecimal(s: string): bigint {
  return fieldMod(BigInt(s));
}

/** bigint → decimal field string (what circom witness inputs expect). */
export function toDecimal(x: bigint): string {
  return fieldMod(x).toString(10);
}

/** bigint → 32-byte big-endian. */
export function toBytes32(x: bigint): Uint8Array {
  let v = fieldMod(x);
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** 32-byte big-endian → bigint. */
export function fromBytes(b: Uint8Array): bigint {
  let x = 0n;
  for (const byte of b) x = (x << 8n) | BigInt(byte);
  return x;
}

/** bigint → 64-char lowercase hex (no 0x), the on-chain BytesN<32> form. */
export function toHex32(x: bigint): string {
  return [...toBytes32(x)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** hex (with or without 0x) → bigint. */
export function fromHex(h: string): bigint {
  return BigInt(h.startsWith("0x") ? h : "0x" + h);
}

/**
 * Map a Stellar address (strkey, e.g. "G…"/"C…") to the circuit's `recipient` field element.
 * Must match the contract's `address_to_fr`: sha256(strkey) with the MSB zeroed so the value is
 * < the field modulus. Async because it uses Web Crypto (available in browsers and Node ≥ 20).
 */
export async function addressToField(strkey: string): Promise<bigint> {
  const data = new TextEncoder().encode(strkey);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  digest[0] = 0; // ensure < field modulus
  return fromBytes(digest);
}
