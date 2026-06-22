# 6 · The trusted setup

Groth16 is small and fast to verify — three group elements, one pairing — but it pays for that
with a **per-circuit trusted setup**. The setup produces a proving key (the `.zkey`) and a
verification key (the `verification_key.json`, pinned on-chain). Its by-product is "toxic waste":
secret randomness that, if known, lets someone forge proofs. The whole game is to generate the
keys so that *no one* ends up knowing the waste.

## Two phases

- **Phase 1 — Powers of Tau.** Circuit-independent; reusable across every circuit on the same
  curve. NoirRail runs it over BLS12-381 at `2¹⁴` (16,384 constraints — both circuits are well
  under that). The output, `ceremony/pot14_final.ptau`, is shared by `withdraw` and `transfer`.
- **Phase 2 — per circuit.** Specializes Phase 1 to one circuit's R1CS, producing that circuit's
  `.zkey`, then exports its `verification_key.json`.

```bash
# what scripts/setup.sh runs, per circuit
snarkjs groth16 setup build/<c>.r1cs ceremony/pot14_final.ptau ceremony/<c>/<c>_0000.zkey
snarkjs zkey contribute ... <c>_final.zkey -e="<entropy>"
snarkjs zkey export verificationkey <c>_final.zkey ceremony/<c>/verification_key.json
```

## Dev vs production — stated plainly

`scripts/setup.sh` runs a **single-contributor** ceremony. That is fine for a hackathon/testnet
demo and **unsafe for mainnet**: the lone contributor knows the toxic waste and could forge
proofs. The header of the script says so in as many words.

Production (Phase 1 of the build plan) replaces this with a **public, multi-contributor**
ceremony with published transcripts, so trust rests on *"at least one contributor was honest and
destroyed their waste"* — not on any single party. The `.zkey` changes; the circuit does not.

## What is committed, and what is not

- The `verification_key.json` per circuit **is** committed — it is small, public, and its hash is
  what a pool pins at deploy.
- The `.ptau` and `.zkey` are **git-ignored** — large, and (for a real ceremony) published
  separately with their transcripts.

## When you must re-run it

Any change to a circuit's R1CS — new signal, new constraint, different depth — changes the proving
and verification keys. After such a change you must re-run Phase 2 (Phase 1 is reusable as long as
the constraint count still fits `2¹⁴`) and redeploy pools with the new verification key. The depth
reduction from 20 to 14 in Phase 0, for instance, forced exactly this re-ceremony for both
circuits.

---

**Try it:** `pnpm --filter @noir-rail/circuits all` builds both circuits and runs their setups,
leaving `ceremony/<circuit>/verification_key.json` ready to pin.

**If you change one thing:** never reuse a `.zkey` across a circuit edit. A proving key that does
not match the deployed verification key produces proofs that silently fail to verify.
