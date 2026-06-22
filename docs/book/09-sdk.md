# 9 · The SDK

`packages/sdk/` is the browser's cryptographic half of NoirRail. Its whole reason to exist is
[invariant 1](02-architecture.md): **secrets never leave the device.** So everything that touches
a secret — generating a note, building a witness, proving — runs here, client-side, in
TypeScript. The server only ever sees the public proof and signals.

The hard part is that this TypeScript must agree, byte-for-byte, with Rust running on-chain. The
SDK is built so that agreement is *tested*, not hoped for.

## Modules

| File | Responsibility |
| --- | --- |
| `field.ts` | BLS12-381 scalar field: decimal/hex/bytes conversions, `addressToField` (recipient mapping). |
| `poseidon.ts` (+ `poseidon-constants.js`) | The hash, ported from the circuit; constants generated from it. |
| `merkle.ts` | A LeanIMT port: build the commitment tree, derive an inclusion path. |
| `note.ts` | The note model: `generateNote`, `depositArgs`, `buildWithdrawWitness`, `buildTransferWitness`. |
| `groth16.ts` | `circom2soroban` in TypeScript: snarkjs `vk`/`proof`/`public` → Soroban hex bytes. |
| `prover.ts` | snarkjs `groth16.fullProve` in a Web Worker, off the main thread. |

## Two design rules

**1. Heavy hashing matches Rust because it is tested against Rust.** `poseidon.ts` and `merkle.ts`
are not "probably the same algorithm" — `scripts/verify-poseidon.mts` and `verify-merkle.mts`
check them against vectors produced by the Rust `soroban-poseidon`/`lean-imt`, and must print
all-PASS. `poseidon-constants.js` is generated *from the circuit's own constants file*, so there
is no hand-transcription to get wrong.

**2. The conversion is tested too.** `groth16.ts` re-encodes a proof into the exact byte layout
the on-chain verifier expects (uncompressed G1 = 96 bytes, G2 = 192 bytes, big-endian; public
signals length-prefixed). `verify-groth16.mts` diffs its output against the Rust `circom2soroban`
for the same proof — and they are byte-identical. Since the Rust bytes already settle on testnet,
identical TS bytes are guaranteed to settle too.

## A full client-side withdraw, end to end

```ts
import { generateNote, depositArgs, buildWithdrawWitness } from "@noir-rail/sdk";
import { proofToHex, publicSignalsToHex } from "@noir-rail/sdk/groth16";

// 1. shield: a note is generated locally; only depositArgs() leave the device
const note = generateNote("noir_pool", 2_500_000_000n);
const { amount, labelHex, precommitmentHex } = depositArgs(note);
// → contract.deposit(from, amount, labelHex, precommitmentHex)

// 2. unshield: build the witness from public commitments + the local note, prove, convert
const witness = await buildWithdrawWitness(note, poolCommitments, recipientStrkey);
const { proof, publicSignals } = await prove("withdraw", witness); // snarkjs in a Worker
const proofHex = proofToHex(proof);
const publicHex = publicSignalsToHex(publicSignals);
// → contract.withdraw(to, proofHex, publicHex), signed by the wallet
```

At no point does `note.secret`, `note.nullifier`, or the witness cross the network. The Merkle
path is computed from `poolCommitments` — public data the indexer (or the contract's
`get_commitments`) provides.

## Verifying the whole thing

`scripts/verify-sdk.mts` is the integration proof: it generates a note and builds a withdraw
witness entirely in the SDK, and confirms (a) the recipient mapping equals `noterail`'s and (b)
the witness proves and verifies under snarkjs. Together with the byte-diff against `circom2soroban`,
this establishes that the browser path produces chain-accepted artifacts.

---

**Try it:**
```bash
cd packages/sdk
node scripts/verify-poseidon.mts && node scripts/verify-merkle.mts && node scripts/verify-sdk.mts
```

**If you change one thing:** if you touch `poseidon.ts`, `merkle.ts`, or `groth16.ts`, re-run the
matching `verify-*` script *before* trusting a single on-chain interaction. A silent mismatch
here surfaces as "valid proof rejected," which is miserable to debug after the fact.
