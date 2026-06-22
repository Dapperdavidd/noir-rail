# 1 · Why NoirRail exists

Tokenized real-world assets (RWAs) crossed from pilot to production in 2025. Treasuries,
money-market funds, invoices, and private credit moved on-chain in real size. The *value* moved.
The *privacy* did not.

On a public ledger, a tokenized treasury position is a billboard. Anyone can read a fund's
holdings, infer its strategy, watch it rebalance, and front-run its flows. For a regulated
institution that is not a feature — it is a disqualifier. The market routed around the problem
the only way it could without privacy: by retreating into permissioned walled gardens, where the
operator sees everything and outsiders see nothing. The privacy is real, but it is bought by
abandoning the open, composable settlement that made the technology worth using.

## The third path

NoirRail keeps assets on a public, neutral rail — Stellar — and makes confidentiality a
**protocol property** instead of a platform one:

- Hide the numbers cryptographically (note commitments, never plaintext balances).
- Prove the rules in zero knowledge (a Groth16 SNARK per settlement).
- Hand the auditor a *key*, not the whole ledger (selective disclosure — Phase 2+).

The result keeps the two properties institutions need but rarely get together:
**confidentiality and auditability.**

## Why it is buildable today

This is not speculative cryptography. The substrate already shipped:

- **Stellar Protocol 22 (CAP-0059)** added BLS12-381 host functions to Soroban — the pairing
  check a Groth16 verifier needs, running natively on-chain.
- **Stellar Protocol 25 (CAP-0075)** added Poseidon hashing host functions.
- The **Stellar Development Foundation prototyped privacy pools** on exactly this stack: Circom
  circuits, Groth16 proofs, verified inside a Soroban contract.

> One correction the build surfaced, worth stating plainly because the original design doc had it
> wrong: Poseidon host functions are **Protocol 25 (CAP-0075)**, not Protocol 23. BLS12-381 is
> Protocol 22 (CAP-0059). NoirRail's Phase 0 does not depend on the host-function Poseidon — see
> [Chapter 5](05-poseidon.md) for why we run a *matched* Poseidon in software instead.

NoirRail extends that proven prototype from a fixed-denomination mixer into a **value-bearing**,
**recipient-bound**, audit-ready settlement layer for named, regulated assets.

## The one-line

> NoirRail settles real-world value on Stellar the way a private bank settles in a vault: the
> books cryptographically sealed to outsiders, and openable — on demand and in proof — to the
> auditor.

## What it is, and is not

**Is:** a confidentiality layer for tokenized RWAs — shield an existing token into a per-asset
pool, move and settle it privately, and (later) disclose selectively to auditors. Settlement
infrastructure.

**Is not:** an asset issuer (it wraps what others tokenize), an exchange or AMM (price discovery
lives elsewhere), a mixer for anonymity's sake (disclosure is a design goal, not an escape
hatch), or a new L1 (it is a contract suite on Stellar).

---

**Try it:** read [Chapter 2](02-architecture.md) for the system shape, then run the end-to-end
demo in [Chapter 11](11-flows.md) to watch a shielded value settle on testnet.

**If you change one thing:** the scope is the product. Every feature beyond *private settlement
of value-bearing notes* was deliberately deferred (see [Chapter 13](13-roadmap.md)). Adding an
order book or a bridge is not "more NoirRail" — it is a different product.
