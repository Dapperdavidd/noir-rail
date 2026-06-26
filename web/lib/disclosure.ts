// In-browser selective-disclosure proving + verification. Proves a held note is a member of a
// curated approved/vetted set without revealing which note, its value, or its nullifier — then
// verifies that proof exactly as an auditor would. Secrets never leave the device; only the proof
// and the two public roots ever surface.
import { buildMembershipWitness, proofToHex, publicSignalsToHex, type Note, type ProofJson } from "@noir-rail/sdk";
import { MEMBERSHIP_CIRCUIT } from "./config.ts";

export interface ProvedMembership {
  /** Raw snarkjs proof — kept so an auditor can verify it locally. */
  proof: ProofJson;
  /** Public signals, in circuit order: [stateRoot, approvalRoot]. Nothing else is revealed. */
  publicSignals: string[];
  /** On-chain wire encodings (for an attestation / future on-chain verify). */
  proofHex: string;
  publicHex: string;
}

export async function proveMembership(
  note: Note,
  poolCommitments: bigint[],
  approvedCommitments: bigint[],
): Promise<ProvedMembership> {
  const witness = buildMembershipWitness(note, poolCommitments, approvedCommitments);

  // snarkjs is browser-only; import lazily so it never runs during SSR.
  const snarkjs = await import("snarkjs");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    witness as unknown as Record<string, unknown>,
    MEMBERSHIP_CIRCUIT.wasm,
    MEMBERSHIP_CIRCUIT.zkey,
  );
  return {
    proof: proof as ProofJson,
    publicSignals: publicSignals as string[],
    proofHex: proofToHex(proof as ProofJson),
    publicHex: publicSignalsToHex(publicSignals as string[]),
  };
}

/** Verify a disclosure proof against the pinned verification key — the auditor's side. */
export async function verifyMembership(proof: ProofJson, publicSignals: string[]): Promise<boolean> {
  const snarkjs = await import("snarkjs");
  const vk = await (await fetch(MEMBERSHIP_CIRCUIT.vkey)).json();
  return snarkjs.groth16.verify(vk, publicSignals, proof as unknown as Record<string, unknown>);
}
