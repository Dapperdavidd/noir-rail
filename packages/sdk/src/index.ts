// NoirRail client SDK. Everything needed to manage notes and prove settlements in the browser,
// byte-matched to the on-chain Soroban contract and Circom circuits. Secrets never leave the device.
export { poseidon, FR_MODULUS } from "./poseidon.ts";
export * from "./field.ts";
export { MerkleTree, TREE_DEPTH, type MerklePath } from "./merkle.ts";
export {
  generateNote,
  depositArgs,
  buildWithdrawWitness,
  type Note,
  type DepositArgs,
  type WithdrawWitness,
} from "./note.ts";
export {
  vkToHex,
  proofToHex,
  publicSignalsToHex,
  type VerificationKeyJson,
  type ProofJson,
} from "./groth16.ts";
export { proveWithdraw, type Groth16Backend, type ProveResult } from "./prover.ts";
