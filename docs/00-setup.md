# 00 · Setup & toolchain

NoirRail spans four toolchains that must agree on one field (BLS12-381) and one hash (Poseidon).
This is the exact, verified setup used to build and ship Phase 0 (June 2026).

## Prerequisites

| Tool | Version (proven) | Install |
| --- | --- | --- |
| Rust (via **rustup**) | 1.95 stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| wasm target | `wasm32v1-none` | `rustup target add wasm32v1-none` |
| Stellar CLI | 27.x | `brew install stellar-cli` |
| circom | 2.2.x | build from `iden3/circom`: `cargo install --path circom` |
| snarkjs | latest | `npm i -g snarkjs` |
| circomlib | latest | `npm i -g circomlib` |
| Node | 22+ | — |
| pnpm | 11.x | `npm i -g pnpm` |
| jq | any | `brew install jq` |

> **rustup is required.** Soroban contracts compile to `wasm32v1-none`, and only rustup can add
> that target. A Homebrew-installed Rust cannot. If `npm -g` hits permission errors, point npm at a
> user prefix: `npm config set prefix ~/.npm-global` and add `~/.npm-global/bin` to `PATH`.

## Three corrections to the original system-design document

Verified against primary sources; these supersede the spec where they differ:

1. **Poseidon is Protocol 25 (CAP-0075)**, live on mainnet since Jan 2026 — *not* Protocol 23.
   BLS12-381 (CAP-0059) is Protocol 22. Both are live; mainnet is on Protocol 26.
2. **The wasm target is `wasm32v1-none`**, not `wasm32-unknown-unknown` (which the Soroban runtime
   rejects). Build output lands in `target/wasm32v1-none/release/`.
3. **Poseidon must be byte-matched between circuit and contract.** circomlib's Poseidon and the
   CAP-0075 host-function Poseidon use *different parameters and do not agree*. NoirRail uses a
   single matched implementation on both sides — the `poseidon255` Circom templates and the
   `soroban-poseidon` crate — proven equal end-to-end. (Adopting the CAP-0075 host function is a
   Phase-1 optimization that must re-verify the match first.)

## Pinned crate versions

`soroban-sdk = 25.0.0-rc.1` and `soroban-poseidon = 25.0.0-rc.1` are pinned in the workspace
because the circuit's Poseidon is matched to `soroban-poseidon` at this version. The contract crate
must enable `soroban-sdk`'s `alloc` feature (it provides the wasm global allocator).

## One-time build

```bash
pnpm install
pnpm --filter @noir-rail/circuits build     # compile circuits → R1CS + witness wasm
pnpm --filter @noir-rail/circuits setup      # dev trusted setup → zkey + verification key
cargo build --release                        # CLI tools + libs
bash tools/demo.sh                           # end-to-end shield → prove → unshield on testnet
```

The trusted setup run by `setup` is a **single-contributor, dev-only ceremony** — it is not secure
for production. Replacing it with a published multi-contributor ceremony is Phase 1.
