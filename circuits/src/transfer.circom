pragma circom 2.2.0;

// NoirRail · transfer circuit (private → private settlement, BLS12-381).
//
// Spends ONE input note and creates TWO output notes (1-in-2-out "JoinSplit"):
//   * output 0 — paid to a recipient, bound to a precommitment the recipient supplied
//     (their shielded "payment address" = Poseidon(nullifier, secret)); the sender never
//     learns the recipient's secrets, yet only the recipient can later spend it;
//   * output 1 — change, returned to the sender.
//
// Amounts, sender, and recipient stay hidden. The chain sees only: the input's nullifier,
// the two new commitments, and the root. Value is conserved in-circuit:  value_in == v0 + v1.
//
// Public signal order (outputs first, then public inputs):
//   [ nullifierHash, outCommitment0, outCommitment1, stateRoot ]

include "lib/commitment.circom";
include "lib/merkleProof.circom";
include "lib/poseidon255.circom";
include "comparators.circom";
include "bitify.circom";

// commitment = Poseidon(value, label, precommitment); precommitment is supplied directly.
template OutputCommitment() {
    signal input value;
    signal input label;
    signal input precommitment;
    signal output commitment;

    component h = Poseidon255(3);
    h.in[0] <== value;
    h.in[1] <== label;
    h.in[2] <== precommitment;
    commitment <== h.out;
}

template Transfer(treeDepth) {
    // ---- public input ----
    signal input stateRoot;

    // ---- private witness: the input note ----
    signal input inValue;
    signal input inLabel;
    signal input inNullifier;
    signal input inSecret;
    signal input stateSiblings[treeDepth];
    signal input stateIndex;

    // ---- private witness: the two outputs ----
    signal input outValue0;        // to the recipient
    signal input outLabel0;
    signal input outPrecommitment0; // recipient-supplied payment address
    signal input outValue1;        // change, to the sender
    signal input outLabel1;
    signal input outPrecommitment1;

    // ---- outputs (public) ----
    signal output nullifierHash;
    signal output outCommitment0;
    signal output outCommitment1;

    // 1. Reconstruct the input commitment + its nullifier hash.
    component inHasher = CommitmentHasher();
    inHasher.value <== inValue;
    inHasher.label <== inLabel;
    inHasher.secret <== inSecret;
    inHasher.nullifier <== inNullifier;
    nullifierHash <== inHasher.nullifierHash;

    // 2. Prove the input note is included under the public root.
    component mp = MerkleProof(treeDepth);
    mp.leaf <== inHasher.commitment;
    mp.leafIndex <== stateIndex;
    mp.siblings <== stateSiblings;
    stateRoot === mp.out;

    // 3. Value conservation: nothing is minted or burned.
    inValue === outValue0 + outValue1;

    // 4. Range-check both outputs (and therefore the split) as non-negative 128-bit values.
    component r0 = Num2Bits(128);
    r0.in <== outValue0;
    component r1 = Num2Bits(128);
    r1.in <== outValue1;

    // 5. Commit the two output notes.
    component o0 = OutputCommitment();
    o0.value <== outValue0;
    o0.label <== outLabel0;
    o0.precommitment <== outPrecommitment0;
    outCommitment0 <== o0.commitment;

    component o1 = OutputCommitment();
    o1.value <== outValue1;
    o1.label <== outLabel1;
    o1.precommitment <== outPrecommitment1;
    outCommitment1 <== o1.commitment;
}

component main {public [stateRoot]} = Transfer(20);
