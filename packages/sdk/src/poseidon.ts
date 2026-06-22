// poseidon255 — a TypeScript port of the Poseidon hash used by NoirRail's circuits and contract.
//
// This MUST stay byte-identical to `soroban-poseidon` (on-chain) and `poseidon255.circom`
// (in-circuit). It is verified against Rust-generated test vectors in scripts/verify-poseidon.ts.
// HADES construction: 8 full rounds + 56 partial rounds, S-box x^5, over the BLS12-381 scalar field.

import { POSEIDON_C, POSEIDON_M } from "./poseidon-constants.js";

/** BLS12-381 scalar field modulus r. */
export const FR_MODULUS =
  0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

const N_F = 8; // full rounds
const N_P = 56; // partial rounds (for state sizes t = 2..5)

function mod(x: bigint): bigint {
  const r = x % FR_MODULUS;
  return r < 0n ? r + FR_MODULUS : r;
}

/** x^5 mod r. */
function pow5(x: bigint): bigint {
  const x2 = mod(x * x);
  const x4 = mod(x2 * x2);
  return mod(x4 * x);
}

/**
 * Poseidon hash of 1, 2, or 3 field elements (state size t = inputs.length + 1).
 * Inputs and output are field elements in [0, r).
 */
export function poseidon(inputs: bigint[]): bigint {
  const n = inputs.length;
  if (n < 1 || n > 3) {
    throw new Error(`poseidon: unsupported input count ${n} (expected 1..3)`);
  }
  const t = n + 1;
  const C = POSEIDON_C[t];
  const M = POSEIDON_M[t];
  const rounds = N_F + N_P;

  // State init: index 0 is the capacity element (0), then the inputs.
  let state: bigint[] = [0n, ...inputs.map(mod)];

  for (let i = 0; i < rounds; i++) {
    // 1. add round constants
    for (let j = 0; j < t; j++) state[j] = mod(state[j] + C[i * t + j]);

    // 2. S-box: full rounds apply x^5 to all lanes; partial rounds only to lane 0.
    const isFull = i < N_F / 2 || i >= N_F / 2 + N_P;
    if (isFull) {
      for (let j = 0; j < t; j++) state[j] = pow5(state[j]);
    } else {
      state[0] = pow5(state[0]);
    }

    // 3. mix with the MDS matrix (row-major): new[r] = Σ_c state[c] * M[r][c]
    const next: bigint[] = new Array(t).fill(0n);
    for (let r = 0; r < t; r++) {
      let acc = 0n;
      for (let c = 0; c < t; c++) acc = mod(acc + state[c] * M[r][c]);
      next[r] = acc;
    }
    state = next;
  }

  return state[0];
}
