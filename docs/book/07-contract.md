# 7 · The ShieldedPool contract

`contracts/shielded-pool/src/lib.rs` is the whole on-chain layer for Phase 0: one Soroban
contract, one instance per asset. It is deliberately small — the heavy mathematics lives in the
Groth16 verifier library; the contract is bookkeeping over commitments, roots, and nullifiers,
plus custody of the underlying Stellar Asset Contract (SAC) balance.

## Storage

| Key | Type | Purpose |
| --- | --- | --- |
| `admin` | `Address` | the deployer (reserved for later admin paths) |
| `vk` | `Bytes` | the `withdraw` verification key, pinned at deploy |
| `tvk` | `Bytes` | the `transfer` verification key, pinned at deploy |
| `token` | `Address` | the pool's underlying SAC |
| `asset` | `u32` | the asset id this pool serves |
| tree leaves / depth / root | via `lean-imt` | the commitment Merkle tree (depth 20 ≈ 1M notes) |
| `roots` | `Vec<BytesN<32>>` | a bounded ring buffer of recent roots |
| `(null, h)` | persistent entry | presence ⇒ nullifier `h` is spent |

The verification keys are **pinned at construction and never caller-supplied** thereafter, so a
settlement always verifies against the exact key the pool was deployed with.

## The three entrypoints

- **`deposit(from, amount, label, precommitment)`** — shield. Pulls `amount` of the token into
  custody, recomputes the leaf `Poseidon(amount, label, precommitment)` *on-chain* (this is the
  value binding from Chapter 3), appends it, and records the new root. No proof needed: the value
  is transparent at entry and bound by the on-chain hash.
- **`withdraw(to, proof, signals)`** — unshield. Verifies a `withdraw` proof and releases tokens.
- **`transfer(proof, signals)`** — private→private. Verifies a `transfer` proof, spends one note,
  appends two. No tokens move.

## The settlement path (withdraw)

Public signals arrive in circuit order: `[nullifierHash, withdrawnValue, stateRoot, recipient]`.

```rust
// 1. anchor: the proof's root must be one we published recently
if !root_is_known(env, &state_root) { return Err(StaleRoot); }
// 2. bind: the proof's recipient must equal the actual payout address (frontrunning fix)
if recipient_fr != address_to_fr(env, &to) { return Err(RecipientMismatch); }
// 3. no reuse: the nullifier must be unspent
if nullifier_spent(env, &nullifier) { return Err(NullifierUsed); }
// 4. verify: exactly one Groth16 pairing check against the pinned key
if !Groth16Verifier::verify_proof(env, vk, proof, &signals)? { return Err(BadProof); }
// 5. commit: spend the nullifier, pay out the withdrawn value
spend_nullifier(env, nullifier);
token.transfer(&contract, &to, &amount);
```

`transfer` is the same shape minus the token movement: anchor → no-reuse → verify (against `tvk`)
→ spend the input nullifier, append both output commitments, advance the root.

## What this extends beyond the SDF prototype

Five concrete deltas, each a deliberate decision recorded in the code:

1. **Arbitrary value.** The prototype was a fixed-denomination mixer; here the deposited amount is
   bound into the note on-chain, so a note is worth exactly what was escrowed.
2. **Root-history ring buffer.** A proof anchored to a recent root stays valid as the tree grows,
   instead of going stale on the next deposit. The prototype kept only the current root.
3. **Nullifier map** (O(1) persistent membership) instead of a linearly-scanned vector.
4. **Recipient binding** — the frontrunning fix the prototype flagged as unimplemented. The
   recipient is a public input bound inside the circuit; the contract checks it equals the payout
   address, so a watcher who copies a pending proof cannot redirect the funds.
5. **Typed `Result` errors** on the settlement path instead of stringly-typed returns.

## A note on recipient binding

A Stellar address is mapped to a field element by `address_to_fr`: `sha256(strkey)` with the most
significant byte zeroed (so it is `< r`). The SDK computes the identical value
(`addressToField`). Any mismatch fails `RecipientMismatch` *before* the expensive verification.

## Testing reality

`deposit_rejects_non_positive_amount` and `commitment_is_deterministic_for_same_inputs` run fast
and are the default suite. The full `deposit_escrows_and_appends_commitment` runs two real
deposits — ~40 software-Poseidon hashes in the debug native interpreter, which is minutes — so it
is `#[ignore]`d and run with `cargo test -- --ignored`. The deposit/append behavior is proven the
real way: optimized wasm on testnet, by `tools/demo.sh`.

---

**Try it:** `cargo build --target wasm32v1-none --release -p shielded-pool` then
`stellar contract optimize ...` — inspect the wasm the pool deploys.

**If you change one thing:** the public-signal order in `withdraw`/`transfer` must match the
circuit's output-then-public-input order *and* the verification key. Change the circuit's signals
and you must re-run the ceremony and update the positional reads here in lockstep.
