# 2 · The shape of the system

NoirRail is four planes. Secrets live on the client and never descend. The chain holds only
commitments, roots, and nullifiers. Off-chain code indexes and helps, but cannot read positions.

```
CLIENT / holder device        OFF-CHAIN              ON-CHAIN / Soroban         STELLAR
─────────────────────         ─────────              ──────────────────         ───────
Settlement terminal  ─┐                              ShieldedPool   ┐
  (Next.js)           │       Indexer                 (per asset)   │
SDK + Prover (snarkjs)├──────►(rebuilds the   ──────► Verifier      ├──► consensus,
  WASM, in a worker   │        Merkle tree)            (Groth16,    │    3–5s finality,
Note vault            │                                BLS12-381)   │    SAC custody
  (encrypted, local)  │                                             ┘
Wallet (Freighter)  ──┘                              (Registry, Association,
                                                      Disclosure — later phases)
```

## The repository, plane by plane

| Plane | Where | What it is |
| --- | --- | --- |
| Circuits | `circuits/` | Circom over BLS12-381: `withdraw`, `transfer`, the matched `poseidon255`/`merkleProof` helpers, and the ceremony scripts. |
| On-chain | `contracts/shielded-pool/` | The `ShieldedPool` Soroban contract. Shared `no_std` libs in `contracts/libs/` (`lean-imt`, `groth16`). |
| Off-chain CLI | `cli/` | `noterail` (note + witness utilities, Rust) and `circom2soroban` (proof/vk → Soroban bytes). |
| Client SDK | `packages/sdk/` | TypeScript: Poseidon, Merkle, field math, note model, Groth16 conversion, snarkjs prover. The browser's crypto. |
| Terminal | `web/` | The Obsidian Clearing Next.js app. |
| Book | `docs/book/` | This. |

Rust crates form one Cargo workspace (`/Cargo.toml`); JS packages form one pnpm workspace. The
shared `no_std` libs compile into *both* the wasm contract and the native CLI, so the on-chain
and off-chain Merkle/hash logic are the *same code*.

## Three invariants

These are the load-bearing promises. If a change would break one, it is the wrong change.

1. **Secrets never leave the device.** The note secret, the nullifier, the witness — none of
   them ever cross the network boundary. The backend sees ciphertext and public roots only.
2. **The chain stores nothing legible.** Only note commitments, a bounded history of Merkle
   roots, and spent nullifiers are public. No amount, no owner.
3. **Disclosure is a separate, granted, revocable capability** (Phase 2+). The auditor's view is
   never the public's view.

## The settlement shape

Every shielded settlement — withdraw or transfer — is the same five beats:

1. **Anchor** — the proof references a Merkle root the contract published recently.
2. **Bind** — the recipient (withdraw) is checked against the proof, defeating front-running.
3. **No reuse** — the input nullifier must be unspent.
4. **Verify** — exactly one Groth16 pairing check, against a key pinned at deploy.
5. **Commit** — record the nullifier, append the new commitment(s), advance the root, and (only
   for shield/unshield) move the transparent token.

The expensive step (4) happens once per settlement; everything else is cheap bookkeeping. See
[Chapter 7](07-contract.md) for the contract that implements this.

---

**Try it:** `tree -L 2 -I 'node_modules|target|.next|.git'` from the repo root to see the planes.

**If you change one thing:** moving logic across the trust boundary (e.g. computing a witness on
a server) breaks invariant 1 even if everything still "works." The boundary is the product.
