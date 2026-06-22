// Build a transfer (1-in-2-out) witness entirely in the SDK and emit the deposit args + the
// expected output commitments. The witness is written for snarkjs proving by the demo script.
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateNote, depositArgs, buildTransferWitness } from "../src/note.ts";
import { toDecimal } from "../src/field.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const outDir = resolve(repo, ".demo/transfer");
mkdirSync(outDir, { recursive: true });

const SCOPE = "noir_pool";
const IN_VALUE = 2_500_000_000n; // the note being spent
const PAY_VALUE = 1_000_000_000n; // amount sent to the recipient; remainder is change

// Sender's input note (would have been deposited); recipient's note supplies the payment address.
const inNote = generateNote(SCOPE, IN_VALUE);
const recipientNote = generateNote(SCOPE, PAY_VALUE);

const { witness, changeNote, out0Commitment } = await buildTransferWitness(
  inNote,
  [inNote.commitment], // pool state right after the input note was deposited
  { value: recipientNote.value, label: recipientNote.label, precommitment: recipientNote.precommitment },
  SCOPE,
);

writeFileSync(resolve(outDir, "witness.json"), JSON.stringify(witness, null, 2));

const da = depositArgs(inNote);
const bundle = {
  deposit: {
    amount: da.amount.toString(),
    labelHex: da.labelHex,
    precommitmentHex: da.precommitmentHex,
  },
  inCommitment: toDecimal(inNote.commitment),
  out0Commitment: toDecimal(out0Commitment),
  out1Commitment: toDecimal(changeNote.commitment),
};
writeFileSync(resolve(outDir, "bundle.json"), JSON.stringify(bundle, null, 2));
console.log(JSON.stringify(bundle));
