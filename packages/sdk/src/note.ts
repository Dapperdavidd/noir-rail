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

/** circom witness input for the transfer circuit (decimal field strings). */
export interface TransferWitness {
  stateRoot: string;
  inValue: string;
  inLabel: string;
  inNullifier: string;
  inSecret: string;
  stateIndex: string;
  stateSiblings: string[];
  outValue0: string;
  outLabel0: string;
  outPrecommitment0: string;
  outValue1: string;
  outLabel1: string;
  outPrecommitment1: string;
}

/** A recipient's shielded payment address — the public parts an incoming note is built from. */
export interface PaymentAddress {
  value: bigint;
  label: bigint;
  precommitment: bigint;
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

/**
 * Build the transfer witness: spend `inNote`, pay `out0` to a recipient (identified by their
 * payment address — value + label + precommitment they shared), and return the remainder as a
 * fresh change note the sender keeps. Value is conserved; the change note is returned so the
 * caller can persist it. The sender never learns the recipient's secrets.
 */
export async function buildTransferWitness(
  inNote: Note,
  commitments: bigint[],
  out0: PaymentAddress,
  changeScope: string,
): Promise<{ witness: TransferWitness; changeNote: Note; out0Commitment: bigint }> {
  const tree = new MerkleTree(commitments);
  const leafIndex = tree.indexOf(inNote.commitment);
  if (leafIndex < 0) throw new Error("input note not found in the pool state");
  const path = tree.proof(leafIndex);

  const changeValue = inNote.value - out0.value;
  if (changeValue < 0n) throw new Error("transfer amount exceeds the note value");
  const changeNote = generateNote(changeScope, changeValue);
  const out0Commitment = poseidon([out0.value, out0.label, out0.precommitment]);

  return {
    witness: {
      stateRoot: toDecimal(path.root),
      inValue: toDecimal(inNote.value),
      inLabel: toDecimal(inNote.label),
      inNullifier: toDecimal(inNote.nullifier),
      inSecret: toDecimal(inNote.secret),
      stateIndex: String(leafIndex),
      stateSiblings: path.siblings.map(toDecimal),
      outValue0: toDecimal(out0.value),
      outLabel0: toDecimal(out0.label),
      outPrecommitment0: toDecimal(out0.precommitment),
      outValue1: toDecimal(changeNote.value),
      outLabel1: toDecimal(changeNote.label),
      outPrecommitment1: toDecimal(changeNote.precommitment),
    },
    changeNote,
    out0Commitment,
  };
}
