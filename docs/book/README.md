# The NoirRail Book

A guided, build-it-yourself tour of NoirRail — a shielded settlement rail for tokenized
real-world assets on Stellar. The goal of this book is that someone who has never touched
zero-knowledge proofs or Soroban can read it front to back, understand *why every piece exists*,
and confidently change the code.

It is written to be read in order. Each chapter ends with **"Try it"** (a command you can run)
and **"If you change one thing"** (the blast radius of a common edit), so the knowledge is
operational, not just conceptual.

## How to read this

- **Part I — The idea** explains the problem and the shape of the solution before any code.
- **Part II — The cryptographic core** builds intuition for notes, commitments, nullifiers, and
  the circuits, then the trusted setup.
- **Part III — The chain** covers the Soroban contract and how a proof becomes settlement.
- **Part IV — The client** covers the SDK (browser crypto that byte-matches the chain) and the
  Obsidian Clearing terminal.
- **Part V — Operating it** covers the end-to-end flows, the security model, and the road ahead.

## Chapters

### Part I — The idea
1. [Why NoirRail exists](01-why.md) — the privacy gap in on-chain RWAs, and the thesis.
2. [The shape of the system](02-architecture.md) — four planes, three invariants, the data flow.

### Part II — The cryptographic core
3. [Notes, commitments, nullifiers](03-notes.md) — the data model of a shielded value.
4. [The circuits](04-circuits.md) — `withdraw` and `transfer` in Circom, line by line.
5. [Poseidon, one hash everywhere](05-poseidon.md) — why the same hash must run in three places.
6. [The trusted setup](06-ceremony.md) — what Groth16 needs and how we (dev-)ceremony it.

### Part III — The chain
7. [The ShieldedPool contract](07-contract.md) — storage, the settlement path, the deltas over the prototype.
8. [From snarkjs to Soroban](08-circom2soroban.md) — serializing proofs for the on-chain verifier.

### Part IV — The client
9. [The SDK](09-sdk.md) — notes, Merkle, field math, and proving in the browser without leaking secrets.
10. [The terminal](10-terminal.md) — Obsidian Clearing: the design system and the screens.

### Part V — Operating it
11. [End-to-end flows](11-flows.md) — shield, transfer, unshield, with the exact commands.
12. [Security model](12-security.md) — what we assume, defend, and honestly cannot.
13. [The road ahead](13-roadmap.md) — the phases beyond the hackathon MVP.

> Status: Phase 0 (hackathon MVP) is complete and proven on Stellar testnet — `shield → transfer
> → unshield`, with in-browser proving validated byte-for-byte against the chain.
