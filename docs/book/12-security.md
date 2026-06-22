# 12 · Security model

A privacy rail earns trust by naming its own threat surface plainly. Here is what NoirRail
assumes, what it defends, and what it honestly cannot do.

## Trust assumptions

- **Soundness of Groth16 over BLS12-381** — a false statement cannot be proven, given a sound
  setup.
- **Honest setup majority** — at least one Phase-2 contributor destroyed their toxic waste. (Phase
  0's single-contributor dev ceremony does *not* meet this; see [Chapter 6](06-ceremony.md).)
- **Hash security** — Poseidon over BLS12-381 is collision- and preimage-resistant at the field
  level.
- **Issuer honesty at the edge** — the real-world asset backing a mint exists. This is an off-chain
  trust the rail cannot remove, only attest.
- **Client integrity** — the proving device is not fully compromised. Secrets live on it.

## Threats and defenses

| Threat | Defense |
| --- | --- |
| Double spend | nullifier set, checked before verification |
| Proof replay | nullifiers are unique and consumed on spend |
| Front-running a pending proof | recipient bound inside the circuit; contract checks it equals the payout address |
| Forged value | value bound on-chain at deposit; conservation enforced in the transfer circuit |
| Stale tree | bounded root-history window; a proof must anchor to a retained root |
| Toxic waste | multi-party ceremony (Phase 1) + verification key pinned at deploy |
| Verifier swap | keys are pinned at construction, never caller-supplied |

## Residual risks (stated, not hidden)

- **Metadata & timing.** On-chain amounts are hidden, but transaction timing, the gas payer, and
  network-level metadata can leak correlations. Mitigated by relayers and batching (Phase 4), never
  fully erased.
- **Key loss is final.** Spend secrets live only on the client; lose them and the notes are
  unspendable. Optional social/shard recovery is a roadmap item, never a custodial backdoor.
- **The ceremony is the one ritual that matters.** Until the multi-party ceremony replaces the dev
  setup, the proving keys are not production-trustworthy.

## Honest limits

NoirRail shields on-chain financial detail and (from Phase 2) provides selective audit. It does
**not** anonymize the network layer, does **not** vouch that an off-chain asset is real beyond the
issuer's attestation, and does **not** protect a fully compromised device. Naming these is part of
the security model, not an exception to it.

## Phase-0-specific notes

- The trusted setup is **dev-only** (single contributor). Do not deploy these `.zkey`s to mainnet.
- Association sets / compliance gating (Phase 2) are not yet enforced on withdrawal.
- The vendored Poseidon and the contract are **not audited**. A third-party audit is Phase 4.

---

**Try it:** trace each row of the threats table to the line that enforces it — e.g. "front-running
fix" → `RecipientMismatch` in `withdraw`, and `recipientSquared` in `withdraw.circom`.

**If you change one thing:** removing or weakening any single defense (e.g. skipping the root-history
check to "save gas") can silently re-open a closed threat. Treat the table as invariants.
