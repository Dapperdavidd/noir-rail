// circom2soroban, in TypeScript: convert snarkjs Groth16 artifacts (verification key, proof,
// public signals) into the exact byte encoding the on-chain `zk` verifier expects.
//
// Wire format (verified against the Rust `circom2soroban` in scripts/verify-groth16.mts):
//   * G1/G2 curve points: each Fq coordinate is 48 bytes BIG-ENDIAN; G1 = x‖y (96 B);
//     G2 = x.c0‖x.c1‖y.c0‖y.c1 (192 B).
//   * VK   = alpha(G1) ‖ beta(G2) ‖ gamma(G2) ‖ delta(G2) ‖ icLen(u32 BE) ‖ IC[](G1…)
//   * Proof= a(G1) ‖ b(G2) ‖ c(G1)
//   * Public = len(u32 BE) ‖ signal[](32-byte BIG-ENDIAN each)

export interface VerificationKeyJson {
  vk_alpha_1: [string, string, string];
  vk_beta_2: [[string, string], [string, string], [string, string]];
  vk_gamma_2: [[string, string], [string, string], [string, string]];
  vk_delta_2: [[string, string], [string, string], [string, string]];
  IC: [string, string, string][];
  nPublic: number;
}

export interface ProofJson {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
}

const concat = (parts: Uint8Array[]): Uint8Array => {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const toHex = (b: Uint8Array): string =>
  [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Fq coordinate → 48-byte big-endian. */
function fqBE(dec: string): Uint8Array {
  let v = BigInt(dec);
  const out = new Uint8Array(48);
  for (let i = 47; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** field element → 32-byte big-endian (soroban U256). */
function feBE(dec: string): Uint8Array {
  let v = BigInt(dec);
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function u32BE(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

const g1 = (p: [string, string, ...string[]]): Uint8Array => concat([fqBE(p[0]), fqBE(p[1])]);
// Fq2 serializes as (c1, c0): x.c1‖x.c0‖y.c1‖y.c0.
const g2 = (p: [[string, string], [string, string], ...unknown[]]): Uint8Array =>
  concat([fqBE(p[0][1]), fqBE(p[0][0]), fqBE(p[1][1]), fqBE(p[1][0])]);

/** Verification key → on-chain hex (no 0x). */
export function vkToHex(vk: VerificationKeyJson): string {
  return toHex(
    concat([
      g1(vk.vk_alpha_1),
      g2(vk.vk_beta_2),
      g2(vk.vk_gamma_2),
      g2(vk.vk_delta_2),
      u32BE(vk.IC.length),
      ...vk.IC.map((ic) => g1(ic)),
    ]),
  );
}

/** Proof → on-chain hex (no 0x). */
export function proofToHex(proof: ProofJson): string {
  return toHex(concat([g1(proof.pi_a), g2(proof.pi_b), g1(proof.pi_c)]));
}

/** Public signals (decimal strings) → on-chain hex (no 0x). */
export function publicSignalsToHex(signals: string[]): string {
  return toHex(concat([u32BE(signals.length), ...signals.map((s) => feBE(s))]));
}
