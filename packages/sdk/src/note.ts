// The NoirRail note (a "coin"): a value-bearing secret committed on-chain as a Poseidon hash.
// Note generation and the withdrawal witness are built entirely client-side — secrets never leave.
import { poseidon } from "./poseidon.ts";
import { MerkleTree } from "./merkle.ts";
import { addressToField, fromBytes, toDecimal, toHex32 } from "./field.ts";

export interface Note {
  scope: string;
  value: bigint;
  nullifier: bigint;
  secret: bigint;
  label: bigint;
  precommitment: bigint;
  commitment: bigint;
  /** Tree leaf index, assigned after the deposit is observed on-chain. */
  leafIndex?: number;
}

/** Arguments the on-chain `deposit` consumes. */
export interface DepositArgs {
  amount: bigint;
  labelHex: string; // BytesN<32>
  precommitmentHex: string; // BytesN<32>
}

/** circom witness input for the withdraw circuit (decimal field strings). */
export interface WithdrawWitness {
  withdrawnValue: string;
  stateRoot: string;
  recipient: string;
  label: string;
  value: string;
  nullifier: string;
  secret: string;
  stateIndex: string;
  stateSiblings: string[];
}

/** A cryptographically strong field element in [0, 2^248) (< r). */
function randomField(): bigint {
  const b = new Uint8Array(31); // 248 bits, always below the field modulus
  crypto.getRandomValues(b);
  return fromBytes(b);
}

/** Encode a pool scope string into a field element (low 31 bytes, big-endian). */
function scopeToField(scope: string): bigint {
  const bytes = new TextEncoder().encode(scope).slice(0, 31);
  const buf = new Uint8Array(32);
  buf.set(bytes, 32 - bytes.length);
  return fromBytes(buf);
}

/**
 * Generate a fresh note for `scope` worth `value` (token base units). Uses 248-bit randomness for
 * the nullifier/secret — stronger than the reference's 32-bit values.
 */
export function generateNote(scope: string, value: bigint): Note {
  const nullifier = randomField();
  const secret = randomField();
  const nonce = randomField();
  const label = poseidon([scopeToField(scope), nonce]);
  const precommitment = poseidon([nullifier, secret]);
  const commitment = poseidon([value, label, precommitment]);
  return { scope, value, nullifier, secret, label, precommitment, commitment };
}

export function depositArgs(note: Note): DepositArgs {
  return {
    amount: note.value,
    labelHex: toHex32(note.label),
    precommitmentHex: toHex32(note.precommitment),
  };
}

/**
 * Build the withdraw witness for `note`, given the pool's published commitment list and the
 * recipient address. The Merkle path is derived from public commitments only.
 */
export async function buildWithdrawWitness(
  note: Note,
  commitments: bigint[],
  recipientStrkey: string,
): Promise<WithdrawWitness> {
  const tree = new MerkleTree(commitments);
  const leafIndex = tree.indexOf(note.commitment);
  if (leafIndex < 0) throw new Error("note commitment not found in the pool state");
  const path = tree.proof(leafIndex);
  const recipient = await addressToField(recipientStrkey);
  return {
    withdrawnValue: toDecimal(note.value),
    stateRoot: toDecimal(path.root),
    recipient: toDecimal(recipient),
    label: toDecimal(note.label),
    value: toDecimal(note.value),
    nullifier: toDecimal(note.nullifier),
    secret: toDecimal(note.secret),
    stateIndex: String(leafIndex),
    stateSiblings: path.siblings.map(toDecimal),
  };
}
