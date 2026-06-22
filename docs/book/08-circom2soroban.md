# 8 · From snarkjs to Soroban

snarkjs and the on-chain verifier speak the same mathematics but not the same file format. snarkjs
emits JSON full of decimal strings and, by default, a *Solidity* verifier. The Soroban verifier is
`no_std` Rust over BLS12-381 host types. `circom2soroban` (in `cli/`, and ported to TS in the SDK)
is the small translator in between.

## What the on-chain verifier expects

The `zk` library (`contracts/libs/groth16/`) deserializes three blobs:

- **Verification key** — `alpha (G1) ‖ beta (G2) ‖ gamma (G2) ‖ delta (G2) ‖ ic_len (u32 BE) ‖
  ic[] (G1 each)`.
- **Proof** — `a (G1) ‖ b (G2) ‖ c (G1)`.
- **Public signals** — `len (u32 BE) ‖ signal[] (32-byte BE each)`.

The point encodings are **uncompressed, big-endian**: a G1 point is `x ‖ y` = 48 + 48 = **96
bytes**; a G2 point is two Fp2 coordinates = **192 bytes**. So a proof is 96 + 192 + 96 = **384
bytes** (768 hex), and a 4-signal public input is 4 + 4×32 = **132 bytes** (264 hex). Seeing those
exact lengths in the logs is a good sanity check that the encoding is right.

## The translation

snarkjs gives each point as decimal coordinates (G2 as `Fp2 = [c0, c1]` pairs). The converter:

1. parses each coordinate decimal → big integer,
2. serializes it big-endian into 48 bytes (G1 coord) with the correct Fp2 ordering for G2,
3. concatenates in the layout above, length-prefixing where needed.

```bash
cargo run --bin circom2soroban -- vk     ceremony/withdraw/verification_key.json   # → vk hex
cargo run --bin circom2soroban -- proof  proof.json                               # → proof hex
cargo run --bin circom2soroban -- public public.json                              # → public hex
```

The vk hex is pinned into the pool at deploy; the proof and public hex are passed to `withdraw` /
`transfer`.

## Two implementations, proven identical

The Rust `circom2soroban` is what the demo scripts use. The SDK's `groth16.ts` does the *same*
conversion in TypeScript, so the browser can submit proofs without a server. These are not assumed
equivalent — `packages/sdk/scripts/verify-groth16.mts` runs both on the same proof and diffs the
output, and they are **byte-identical** (proof 768 hex, public 264 hex). Because the Rust output
already settles on testnet, the TS output is guaranteed to settle too. That diff is what lets
NoirRail claim "in-browser proving" honestly.

## Why the verifier is its own contract/library

Keeping Groth16 verification isolated means every pool shares one audited, cost-characterized
verification path, and a new circuit ships by pinning a new verification-key hash rather than
redeploying settlement logic.

---

**Try it:** generate a proof (Chapter 11), then run all three `circom2soroban` subcommands and
note the 768/264-hex lengths.

**If you change one thing:** the G2 Fp2 coordinate ordering is the classic footgun. If a freshly
ported converter produces proofs the contract rejects while snarkjs verifies them, suspect the
`(c0, c1)` order before anything else — and diff against the Rust converter, which is known-good.
