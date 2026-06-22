pragma circom 2.2.0;

// NoirRail · withdraw / unshield circuit (BLS12-381).
//
// Proves: "I know an unspent note committed in the pool's tree, worth exactly `withdrawnValue`,
// and I am paying it out to `recipient`" — without revealing which note.
//
// Differences from the SDF privacy-pools reference `main.circom`:
//   * recipient is a public input, bound into the constraint system, so a watcher who copies a
//     pending proof cannot redirect the payout (the frontrunning fix the prototype left open);
//   * full-value semantics: `withdrawnValue === value`, so the on-chain release amount is exactly
//     the note's hidden value (no silently-forfeited remainder);
//   * the association-set membership check is removed — it returns in Phase 2 as a separate path.
//
// Public signal order (outputs first, then public inputs in declaration order):
//   [ nullifierHash, withdrawnValue, stateRoot, recipient ]

include "lib/commitment.circom";
include "lib/merkleProof.circom";

template Withdraw(treeDepth) {
    // ---- public inputs ----
    signal input withdrawnValue;        // the amount being unshielded (revealed at the exit)
    signal input stateRoot;             // a published commitment-tree root
    signal input recipient;             // payout address as a field element (bound below)

    // ---- private witness ----
    signal input label;                 // pool scope ‖ nonce
    signal input value;                 // the note's hidden value
    signal input nullifier;             // note nullifier
    signal input secret;                // note secret
    signal input stateSiblings[treeDepth];
    signal input stateIndex;

    // ---- output ----
    signal output nullifierHash;        // = Poseidon(nullifier); marks the note spent on-chain

    // 1. Reconstruct the commitment and the nullifier hash from the witness.
    component commitmentHasher = CommitmentHasher();
    commitmentHasher.value <== value;
    commitmentHasher.label <== label;
    commitmentHasher.secret <== secret;
    commitmentHasher.nullifier <== nullifier;
    signal commitment <== commitmentHasher.commitment;
    nullifierHash <== commitmentHasher.nullifierHash;

    // 2. Prove the commitment is included under the public state root.
    component stateRootChecker = MerkleProof(treeDepth);
    stateRootChecker.leaf <== commitment;
    stateRootChecker.leafIndex <== stateIndex;
    stateRootChecker.siblings <== stateSiblings;
    stateRoot === stateRootChecker.out;

    // 3. Full-value semantics: the publicly released amount equals the note's hidden value.
    withdrawnValue === value;

    // 4. Recipient binding. `recipient` is otherwise unused logically, so square it to force it
    //    into the R1CS; any change to the destination then invalidates the proof.
    signal recipientSquared;
    recipientSquared <== recipient * recipient;
}

// Depth 14 ⇒ 16,384 notes per pool. Chosen so a transfer's two on-chain Merkle inserts fit
// alongside the Groth16 pairing within the per-transaction instruction budget. Raising it to 20
// (~1M notes) is a Phase-1 optimization gated on cheaper on-chain hashing (persistent subtree
// cache or the CAP-0075 host-function Poseidon).
component main {public [withdrawnValue, stateRoot, recipient]} = Withdraw(14);
