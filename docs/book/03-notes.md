# 3 · Notes, commitments, nullifiers

A shielded value in NoirRail is a **note** (the literature calls it a "coin"). Everything else —
the circuits, the contract, the SDK — is machinery for creating notes, proving facts about them,
and spending them exactly once.

## A note is four field elements

| Field | Meaning | Public? |
| --- | --- | --- |
| `value` | the amount, in the token's base units | hidden |
| `label` | `Poseidon(scope, nonce)` — binds the note to one pool, with a fresh nonce | hidden in spends |
| `nullifier` | a random secret; its hash marks the note spent | hidden until spend |
| `secret` | a random secret proving ownership | hidden always |

All four are elements of the BLS12-381 scalar field (integers mod `r ≈ 2²⁵²`). The SDK draws
`nullifier` and `secret` from 248 bits of CSPRNG randomness, which is always `< r`.

## From note to public commitment

A note never appears on-chain. What appears is its **commitment** — a hash that hides the note
but binds all of it:

```
precommitment = Poseidon(nullifier, secret)        // hides who can spend
commitment    = Poseidon(value, label, precommitment)
```

The chain stores `commitment` as a leaf in a Merkle tree. Two hashes, nested, is deliberate:

- **Why nest?** Spending reveals only `nullifierHash = Poseidon(nullifier)`. Because `nullifier`
  is buried inside `precommitment` inside `commitment`, the on-chain link between the *deposit*
  (a commitment) and the *spend* (a nullifier hash) never appears — a SNARK proves the same
  `nullifier` sits in both, without revealing it.
- **Why a label?** It binds a note to one pool and a fresh nonce (domain separation). A note
  minted for one asset pool cannot be replayed into another.

## Spending: the nullifier

To spend a note you reveal `nullifierHash = Poseidon(nullifier)` and prove, in zero knowledge,
that you know a note in the tree whose nullifier hashes to it. The contract keeps a set of seen
nullifier hashes; a repeat is a double-spend and reverts. The note itself is never revealed, so
observers cannot tell *which* leaf you spent — your anonymity set is the whole tree.

## The arbitrary-value twist (NoirRail's first real delta)

The SDF prototype was a fixed-denomination mixer: every note was worth 1 XLM, so the value field
was decorative. NoirRail notes carry **arbitrary value** — which forces a question: how does the
pool know a note is worth what its owner claims?

The answer is **on-chain value binding**. At deposit, the holder sends the transparent `amount`,
the `label`, and the `precommitment`. The contract *recomputes the leaf itself*:

```
leaf = Poseidon(amount, label, precommitment)   // computed on-chain, with the real amount
```

Because the contract uses the actual escrowed `amount` as the value, a note is provably worth
exactly what was deposited — no separate "deposit proof" needed. This works only because the
contract's Poseidon is **byte-identical** to the circuit's (see [Chapter 5](05-poseidon.md)).

## Paying someone: the payment address

To pay a recipient privately (a `transfer`), the sender needs to create a note the *recipient*
can later spend — without learning the recipient's secrets. The recipient shares a **payment
address**: their `precommitment = Poseidon(nullifier, secret)` (plus a `label` and the agreed
`value`). The sender builds `outCommitment = Poseidon(value, label, precommitment)`. Only the
recipient, who knows the underlying `nullifier`/`secret`, can ever spend it. Preimage resistance
means the sender learns nothing spendable.

---

**Try it:** `cargo run --release --bin noterail -- generate noir_pool --value 2500000000 -o note.json`
then `cat note.json` — you will see the four fields plus the `precommitment`/`commitment` hex.

**If you change one thing:** if you alter the commitment formula (order or arity of the Poseidon
inputs), you must change it in *three* places at once — `circuits/src/lib/commitment.circom`, the
contract's `commitment()` in `lib.rs`, and the SDK's `generateNote()`. They are one definition
wearing three coats; [Chapter 5](05-poseidon.md) explains why.
