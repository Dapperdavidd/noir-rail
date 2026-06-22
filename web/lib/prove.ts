// In-browser Groth16 proving. The witness is assembled from local secrets + the public Merkle
// path; snarkjs proves over WASM. Only the proof and public signals (no secrets) ever surface.
import { buildWithdrawWitness, proofToHex, publicSignalsToHex, type Note } from "@noir-rail/sdk";
import { CIRCUIT } from "./config.ts";

export interface ProvedWithdraw {
  proofHex: string;
  publicHex: string;
}

export async function proveWithdraw(
  note: Note,
  commitmentsHex: string[],
  recipientStrkey: string,
): Promise<ProvedWithdraw> {
  const commitments = commitmentsHex.map((h) => BigInt(h.startsWith("0x") ? h : "0x" + h));
  const witness = await buildWithdrawWitness(note, commitments, recipientStrkey);

  // snarkjs is browser-only; import lazily so it never runs during SSR.
  const snarkjs = await import("snarkjs");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    witness as unknown as Record<string, unknown>,
    CIRCUIT.wasm,
    CIRCUIT.zkey,
  );
  return {
    proofHex: proofToHex(proof),
    publicHex: publicSignalsToHex(publicSignals),
  };
}
