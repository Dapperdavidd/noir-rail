pragma circom 2.2.0;

// NoirRail · set-membership disclosure circuit (BLS12-381).
//
// Proves: "I own an unspent note committed in the pool's tree, and that SAME note is also a member
// of a curated approved/vetted set" — without revealing which note, its value, or its nullifier.
//
// This is the selective-disclosure counterpart to `withdraw.circom`. Where withdraw proves a single
// inclusion (note ∈ pool) and reveals the exit amount, this proves a DOUBLE inclusion
// (note ∈ pool  ∧  note ∈ approved set) and reveals nothing but the two roots. It restores the
// association-set membership check the SDF privacy-pools reference (`main.circom`) carries, which
// withdraw deliberately stripped — an auditor learns "this holder's position is in the vetted set"
// without learning the figure or the identity.
//
// Public signal order (no outputs; public inputs in declaration order):
//   [ stateRoot, approvalRoot ]

include "lib/commitment.circom";
include "lib/merkleProof.circom";

template Membership(treeDepth) {
    // ---- public inputs ----
    signal input stateRoot;             // a published pool commitment-tree root
    signal input approvalRoot;          // root of the curated approved-set tree

    // ---- private witness ----
    signal input label;                 // pool scope ‖ nonce
    signal input value;                 // the note's hidden value (never revealed)
    signal input nullifier;             // note nullifier (never revealed — no linkability to a spend)
    signal input secret;                // note secret
    signal input stateSiblings[treeDepth];
    signal input stateIndex;
    signal input approvalSiblings[treeDepth];
    signal input approvalIndex;

    // 1. Reconstruct the commitment from the witness. This proves knowledge of the note's openings
    //    (value, label, nullifier, secret) — i.e. genuine ownership, not a copied commitment.
    component commitmentHasher = CommitmentHasher();
    commitmentHasher.value <== value;
    commitmentHasher.label <== label;
    commitmentHasher.secret <== secret;
    commitmentHasher.nullifier <== nullifier;
    signal commitment <== commitmentHasher.commitment;

    // 2. Prove the commitment is included under the public pool state root.
    component stateChecker = MerkleProof(treeDepth);
    stateChecker.leaf <== commitment;
    stateChecker.leafIndex <== stateIndex;
    stateChecker.siblings <== stateSiblings;
    stateRoot === stateChecker.out;

    // 3. Prove the SAME commitment is included under the approved-set root.
    component approvalChecker = MerkleProof(treeDepth);
    approvalChecker.leaf <== commitment;
    approvalChecker.leafIndex <== approvalIndex;
    approvalChecker.siblings <== approvalSiblings;
    approvalRoot === approvalChecker.out;
}

// Depth 14 ⇒ 16,384 leaves, matching the pool's commitment tree so a note's pool path and its
// approved-set path share the same shape.
component main {public [stateRoot, approvalRoot]} = Membership(14);
