// Thin wrapper around snarkjs Groth16 proving. The proof runs in the browser (ideally a Web
// Worker); snarkjs is injected so the SDK stays free of bundler-specific imports.
import type { WithdrawWitness } from "./note.ts";
import { proofToHex, publicSignalsToHex, type ProofJson } from "./groth16.ts";

/** The subset of the snarkjs `groth16` API we use. */
export interface Groth16Backend {
  fullProve(
    input: Record<string, unknown>,
    wasmPath: string | Uint8Array,
    zkeyPath: string | Uint8Array,
  ): Promise<{ proof: ProofJson; publicSignals: string[] }>;
}

export interface ProveResult {
  proof: ProofJson;
  publicSignals: string[];
  /** On-chain-ready hex (no 0x) for the contract's `withdraw`. */
  proofHex: string;
  publicHex: string;
}

/**
 * Generate a withdraw proof and return both the raw snarkjs artifacts and the Soroban-encoded hex.
 * `wasm` and `zkey` are the compiled circuit and proving key (URLs or bytes).
 */
export async function proveWithdraw(
  groth16: Groth16Backend,
  witness: WithdrawWitness,
  wasm: string | Uint8Array,
  zkey: string | Uint8Array,
): Promise<ProveResult> {
  const { proof, publicSignals } = await groth16.fullProve(
    witness as unknown as Record<string, unknown>,
    wasm,
    zkey,
  );
  return {
    proof,
    publicSignals,
    proofHex: proofToHex(proof),
    publicHex: publicSignalsToHex(publicSignals),
  };
}
