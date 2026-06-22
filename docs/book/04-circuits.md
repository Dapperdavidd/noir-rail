# 4 · The circuits

NoirRail's zero-knowledge logic is two Circom circuits over BLS12-381: `withdraw` (unshield) and
`transfer` (private→private). Both reuse the same matched helpers — `commitment.circom`,
`merkleProof.circom`, and `poseidon255.circom` — so a commitment means the same thing everywhere.

A circuit proves a statement about *hidden* inputs by exposing only a few *public* signals. The
golden rule for reading one: **a private signal is something only the prover knows; a public
signal is something the verifier (the contract) gets to check.** Circom orders the public signals
as *outputs first, then public inputs in declaration order* — and that order must match how the
contract reads them and how the verification key was generated.

## `withdraw.circom`

Statement: *"I know an unspent note in the pool worth exactly `withdrawnValue`, and I am paying it
to `recipient`"* — without revealing which note.

```
public:  withdrawnValue, stateRoot, recipient
private: label, value, nullifier, secret, stateSiblings[20], stateIndex
output:  nullifierHash
```

Four constraints carry the meaning:

1. **Reconstruct** the commitment and `nullifierHash` from the witness (via `CommitmentHasher`).
2. **Inclusion** — a Merkle proof that the commitment sits under the public `stateRoot`.
3. **Full value** — `withdrawnValue === value`. The released amount equals the note's hidden
   value (unshielding reveals the amount, which is expected at the exit).
4. **Recipient binding** — `recipientSquared <== recipient * recipient`. The recipient is
   otherwise logically unused, so squaring it forces it into the constraint system; now any change
   to the destination invalidates the proof. This is the front-running fix.

Public signal order: `[nullifierHash, withdrawnValue, stateRoot, recipient]`.

## `transfer.circom`

Statement: *"I spend one note worth `v`, and create two notes worth `v0` and `v1` with
`v0 + v1 = v`"* — amounts, sender, and recipient all hidden. It is a 1-in-2-out "JoinSplit":
output 0 pays a recipient (bound to a precommitment they supplied — their payment address),
output 1 is change back to the sender.

```
public:  stateRoot
private: inValue, inLabel, inNullifier, inSecret, stateSiblings[20], stateIndex,
         outValue0, outLabel0, outPrecommitment0,   // to the recipient
         outValue1, outLabel1, outPrecommitment1    // change
output:  nullifierHash, outCommitment0, outCommitment1
```

Constraints:

1. **Reconstruct** the input commitment + its `nullifierHash`.
2. **Inclusion** of the input under `stateRoot`.
3. **Value conservation** — `inValue === outValue0 + outValue1`. Nothing is minted or burned.
4. **Range checks** — both outputs pass `Num2Bits(128)`, so neither can wrap the field to forge
   value.
5. **Commit** the two outputs as `Poseidon(value, label, precommitment)` each.

Public signal order: `[nullifierHash, outCommitment0, outCommitment1, stateRoot]`. No tokens move
on-chain; only the input nullifier and two new commitments become public.

## The shared helpers

- **`commitment.circom`** — `commitment = Poseidon(value, label, Poseidon(nullifier, secret))`,
  `nullifierHash = Poseidon(nullifier)`. The exact scheme from [Chapter 3](03-notes.md).
- **`merkleProof.circom`** — a LeanIMT inclusion proof: at each level, order the (node, sibling)
  pair by the index bit and hash with `Poseidon255(2)`. Depth 20.
- **`poseidon255.circom`** — the hash, byte-matched to the contract and SDK ([Chapter 5](05-poseidon.md)).

## Why depth 20

`2²⁰ ≈ 1,048,576` leaves — the anonymity set a pool can hold. It also sets the cost of every
on-chain Merkle insert (≈ one Poseidon per level), which matters for the transfer's instruction
budget (see [Chapter 7](07-contract.md)).

---

**Try it:** `pnpm --filter @noir-rail/circuits build` compiles both circuits and prints their
constraint counts (`withdraw` ≈ 5.6k non-linear; `transfer` ≈ 6.4k).

**If you change one thing:** adding or reordering a public signal changes the verification key's
shape *and* the contract's positional reads. Recompile, re-run the ceremony ([Chapter 6](06-ceremony.md)),
and update the contract together — they are one interface in three files.
