# 13 · The road ahead

NoirRail is built in fenced phases. The discipline is the point: each deferred item was a real
temptation, held back so the core thesis — *private settlement of value-bearing notes* — ships
clean and provable first. Scope is a feature.

## Phase 0 — Hackathon MVP ✅ (this build)

One asset, `shield → transfer → unshield`, settling on Stellar testnet with in-browser proving.

- `withdraw` and `transfer` circuits (BLS12-381), dev ceremony.
- `ShieldedPool` contract: arbitrary value (on-chain binding), frontier Merkle tree, root history,
  nullifier map, recipient binding, typed errors.
- `noterail` + `circom2soroban` CLIs; the TS SDK with byte-matched Poseidon/Merkle/conversion.
- The Obsidian Clearing terminal.
- **Proven:** deposit + Groth16 verify + withdraw and a private transfer all settle on testnet; the
  browser path produces chain-accepted artifacts (byte-identical to the Rust converter).

## Phase 1 — The cryptographic suite

- A public, **multi-contributor trusted setup** with published transcripts (replaces the dev
  ceremony).
- **Viewing-key derivation** and encrypted note sync, so a holder can recover/track notes across
  devices.
- Raise the tree to depth 20 (~1M notes) by adopting the **CAP-0075 host-function Poseidon** for
  on-chain hashing (gated on proving byte-equality with `poseidon255` first).
- Harden recipient binding and the note encryption scheme.

## Phase 2 — Compliance rail

- The **disclosure console** and a Disclosure anchor contract (selective-disclosure proofs:
  "balance under a cap", "member of an approved set", without revealing figures).
- **Association sets** (ASP membership at spend) — the circuits already carry the design; this
  re-enables the on-chain gate.
- Travel-Rule view-key exchange between two institutions.

## Phase 3 — Multi-asset & yield

- An **AssetRegistry** onboarding flow (asset id → SAC, issuer, pinned vk hashes, yield publisher).
- **Yield on a hidden balance**: a signed yield index per epoch and an `accrue` circuit that
  re-mints a note to a larger value in zero knowledge — the rate public, the balance dark. This is
  the one scope branch the council approved, because private settlement of *yield-bearing*
  instruments is the core purpose, not an addition to it.
- Multiple live pools; indexer hardening.

## Phase 4 — Production readiness

- Third-party **security audit** (circuits, contract, the vendored Poseidon).
- A **relayer network** for metadata resistance (break the funding/timing trail).
- Optional **key recovery** (social/shard), never a custodial backdoor.
- Mainnet deployment.

## What the council explicitly rejected

A confidential order book, on-chain lending against shielded notes, and a cross-chain bridge were
each argued and declined. All three are defensible products; none is *this* product. Holding the
line on private settlement is what keeps the build shippable.

---

**Try it:** the phase boundaries map to issues/milestones — start a Phase-1 branch by replacing
`scripts/setup.sh` with a multi-contributor ceremony runner; nothing else in the stack needs to
move to begin.

**If you change one thing:** resist pulling a later-phase feature forward "while you're in there."
The reason Phase 0 is provable is that it is small. Add the next phase, not three features from
three phases.
