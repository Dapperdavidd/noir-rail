# NoirRail

**Shielded settlement for tokenized real-world assets on Stellar.**
A settlement rail you can see through, but no one can see into.

NoirRail wraps tokenized treasuries, invoices, and credit in a per-asset shielded pool on
Stellar. Deposits, transfers, and withdrawals settle with amounts and holder positions hidden
behind zero-knowledge proofs, while a layered disclosure system gives auditors a verifiable,
revocable line of sight. Confidentiality and auditability, together.

- **Proofs** — Circom 2.x · Groth16 · snarkjs
- **Curve** — BLS12-381 (end to end: circuit, ceremony, on-chain verifier)
- **Settle** — Soroban contracts on Stellar · Stellar Asset Contract custody
- **Hash** — Poseidon over BLS12-381 (matched circuit ↔ contract)
- **Client** — Next.js · TypeScript · in-browser WASM proving

> Built on the architecture the Stellar Development Foundation prototyped in *Privacy Pools on
> Stellar*, extended from a fixed-denomination mixer into a value-bearing, audit-gated
> settlement layer for regulated assets.

## Monorepo layout

| Path | What it is |
| --- | --- |
| `circuits/` | Circom circuits (BLS12-381), the trusted-setup ceremony, and build scripts |
| `contracts/` | Soroban contracts (Rust `no_std`): the shielded pool + the Groth16 verifier |
| `contracts/libs/` | Shared `no_std` crates: `poseidon` (matched to circuit), `lean-imt`, `groth16` |
| `cli/` | Off-chain Rust tools: `circom2soroban` (artifact converter) and `noterail` (note utilities) |
| `packages/sdk/` | TypeScript SDK: note model, in-browser proving, indexer client, field conversions |
| `web/` | The settlement terminal (Next.js, "Obsidian Clearing" art direction) |
| `docs/` | Design notes and the end-of-project codebase book |

Rust crates form a single Cargo workspace (`/Cargo.toml`); JS packages form a pnpm workspace
(`/pnpm-workspace.yaml`). Shared `no_std + alloc` libs are consumed by both the wasm contract
and the std CLI, so the on-chain and off-chain hashing/Merkle logic provably agree.

## Build phases

NoirRail is built in fenced phases (see `docs/`). Phase 0 — the current target — is one asset,
`shield → transfer → unshield`, proven in-browser and settling on Stellar testnet.

## Toolchain

Built and tested June 2026 with: Rust (rustup) + `wasm32v1-none`, `stellar-cli` 27,
`circom` 2.2.x, `snarkjs` + `circomlib`, Node 22+, pnpm.

See `docs/00-setup.md` for the exact setup.
