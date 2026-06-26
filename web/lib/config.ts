// Network + deployment configuration for the NoirRail terminal (Stellar testnet).

export const NETWORK = "testnet";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const FRIENDBOT = "https://friendbot.stellar.org";

/** The deployed ShieldedPool. Set via NEXT_PUBLIC_POOL_ID (see web/.env.local). */
export const POOL_ID = process.env.NEXT_PUBLIC_POOL_ID ?? "";
/** The pool's underlying asset (native XLM Stellar Asset Contract on testnet). */
export const TOKEN_ID =
  process.env.NEXT_PUBLIC_TOKEN_ID ??
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
/** A funded account used purely as the source for read-only simulations. */
export const READ_SOURCE = process.env.NEXT_PUBLIC_READ_SOURCE ?? "";

export const POOL_SCOPE = "noir_pool";

export const ASSET = {
  symbol: "XLM",
  name: "Stellar Lumens · testnet",
  decimals: 7,
};

/** Static circuit artifacts served from /public for in-browser proving. */
export const CIRCUIT = {
  wasm: "/circuits/withdraw.wasm",
  zkey: "/circuits/withdraw_final.zkey",
};

/** Set-membership disclosure circuit (prove a note ∈ vetted set, revealing nothing else). */
export const MEMBERSHIP_CIRCUIT = {
  wasm: "/circuits/membership.wasm",
  zkey: "/circuits/membership_final.zkey",
  vkey: "/circuits/membership_vk.json",
};

/** Format base units (stroops) as a human asset amount. */
export function formatAmount(units: bigint | number, decimals = ASSET.decimals): string {
  const v = BigInt(units);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  const s = frac ? `${whole}.${frac}` : `${whole}`;
  return (neg ? "-" : "") + s;
}

/** Parse a human asset amount into base units. */
export function parseAmount(input: string, decimals = ASSET.decimals): bigint {
  const [w, f = ""] = input.trim().split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt(frac || "0");
}
