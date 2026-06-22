# 11 · End-to-end flows

This chapter is the operational one: the exact commands that take a value through the rail. Each
flow is a script in `tools/`, so you can run the whole thing or read it as a worked example.

Prerequisites (once):

```bash
# toolchain: rustup + wasm32v1-none, stellar-cli, circom, snarkjs + circomlib, node/pnpm
pnpm install
pnpm --filter @noir-rail/circuits all     # build both circuits + run the dev ceremony
```

## Shield → unshield (`tools/demo.sh`)

The full deposit-then-withdraw loop, settling on Stellar testnet.

```bash
bash tools/demo.sh
```

What it does, step by step:

1. **Fund** a testnet account via friendbot.
2. **Build + deploy** the `ShieldedPool` over the native XLM SAC, pinning both verification keys.
3. **Generate** a note worth 2.5 XLM (arbitrary value — not a fixed denomination).
4. **Shield (deposit):** send `amount`, `label`, `precommitment`; the contract recomputes the leaf
   on-chain (value binding) and escrows the tokens.
5. **Build the withdraw witness** with `noterail`, bound to the recipient address.
6. **Prove** (`snarkjs groth16 prove`) and convert (`circom2soroban`).
7. **Unshield (withdraw):** the contract verifies the proof, checks the recipient binding and the
   nullifier, and releases the tokens. Pool balance returns to zero.

## Private transfer (`tools/demo-transfer.sh`)

Spend one shielded note into two — a payment and change — without revealing amounts or parties.

```bash
bash tools/demo-transfer.sh
```

1. Deploy the pool; **shield** a 2.5-XLM input note.
2. **Build the transfer** with the SDK (`build-transfer.mts`): pay 1.0 to a recipient (their
   payment address), keep 1.5 as change. Value is conserved in-circuit.
3. **Prove** and **settle** via `transfer`. No tokens move; the pool balance is unchanged.
4. **Assert** the post-state: 3 commitments (input + two outputs), and the balance still equals the
   shielded amount.

## Proving in the browser (`packages/sdk/scripts/verify-sdk.mts`)

The same witness, built entirely client-side, proven by snarkjs, and converted by the TS
`groth16` — shown to be byte-identical to the Rust converter, hence chain-accepted.

```bash
cd packages/sdk
node scripts/verify-poseidon.mts   # hash matches Rust
node scripts/verify-merkle.mts     # tree matches Rust
node scripts/verify-sdk.mts        # SDK-built witness proves + recipient mapping matches
```

## The mapping between layers

| Action | Public signals (circuit order) | Contract call | Tokens move? |
| --- | --- | --- | --- |
| Shield | — (no proof) | `deposit(from, amount, label, precommitment)` | in |
| Unshield | `[nullifierHash, withdrawnValue, stateRoot, recipient]` | `withdraw(to, proof, public)` | out |
| Transfer | `[nullifierHash, outCommitment0, outCommitment1, stateRoot]` | `transfer(proof, public)` | no |

---

**Try it:** run `tools/demo.sh` then `tools/demo-transfer.sh` — both print a `stellar.expert` link
per transaction so you can watch the settlement on-chain.

**If you change one thing:** the demos pin `TOKEN_ADDRESS` to testnet's native XLM SAC. Point it at
a different SAC to shield a different asset — the pool is asset-agnostic; one instance serves one
asset id.
