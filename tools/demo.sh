#!/usr/bin/env bash
# NoirRail · Phase 0 end-to-end demo on Stellar testnet.
#
#   shield (deposit, arbitrary value)  →  prove  →  unshield (withdraw, recipient-bound)
#
# Proves the NoirRail deltas over the reference: the deposited amount is bound into the note
# on-chain, the proof anchors to a root in the history window, and the payout is bound to the
# recipient inside the circuit. Requires: stellar CLI, snarkjs, node, jq, circom artifacts +
# ceremony already built (`pnpm --filter @noir-rail/circuits all`).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.npm-global/bin:$HOME/.cargo/bin:$PATH"

NETWORK="${NETWORK:-testnet}"
# Native XLM Stellar Asset Contract on testnet (the pool's underlying asset for the demo).
TOKEN_ADDRESS="${TOKEN_ADDRESS:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
ASSET_ID="${ASSET_ID:-1}"
VALUE="${VALUE:-2500000000}"           # 2.5 XLM — arbitrary, not a fixed denomination
SCRATCH="$ROOT/.demo"
mkdir -p "$SCRATCH"

say() { printf "\n\033[1;33m%s\033[0m\n" "$*"; }

command -v jq >/dev/null || { echo "✗ jq required"; exit 1; }
command -v snarkjs >/dev/null || { echo "✗ snarkjs required"; exit 1; }
[ -f circuits/build/withdraw_js/withdraw.wasm ] || { echo "✗ build circuits: pnpm --filter @noir-rail/circuits build"; exit 1; }
[ -f circuits/ceremony/withdraw/withdraw_final.zkey ] || { echo "✗ run setup: pnpm --filter @noir-rail/circuits setup"; exit 1; }

say "👤 Funding demo account…"
stellar keys ls 2>/dev/null | grep -q "^noir_demo$" || stellar keys generate noir_demo >/dev/null 2>&1
stellar keys fund noir_demo --network "$NETWORK" >/dev/null 2>&1 || true
DEMO_ADDR="$(stellar keys address noir_demo)"
echo "   $DEMO_ADDR"

say "📦 Building + deploying the ShieldedPool…"
cargo build --target wasm32v1-none --release -p shielded-pool
stellar contract optimize \
  --wasm target/wasm32v1-none/release/shielded_pool.wasm \
  --wasm-out target/wasm32v1-none/release/shielded_pool.optimized.wasm >/dev/null

VK_HEX="$(cargo run --release --quiet --bin circom2soroban -- vk circuits/ceremony/withdraw/verification_key.json | grep -oE '[0-9a-f]{64,}$' | tail -1)"
TVK_HEX="$(cargo run --release --quiet --bin circom2soroban -- vk circuits/ceremony/transfer/verification_key.json | grep -oE '[0-9a-f]{64,}$' | tail -1)"
[ -n "$VK_HEX" ] && [ -n "$TVK_HEX" ] || { echo "✗ failed to extract vk hex"; exit 1; }

CONTRACT_ID="$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/shielded_pool.optimized.wasm \
  --source noir_demo --network "$NETWORK" \
  -- --vk_bytes "$VK_HEX" --transfer_vk_bytes "$TVK_HEX" --token_address "$TOKEN_ADDRESS" --admin noir_demo --asset_id "$ASSET_ID" \
  2>&1 | grep -oE 'C[A-Z0-9]{55}' | tail -1)"
[ -n "$CONTRACT_ID" ] || { echo "✗ deploy failed"; exit 1; }
echo "   pool: $CONTRACT_ID"

say "🪙 Generating a shielded note worth $VALUE (arbitrary value)…"
cargo run --release --quiet --bin noterail -- generate noir_pool --value "$VALUE" -o "$SCRATCH/coin.json" >/dev/null
LABEL_HEX="$(jq -r '.label_hex' "$SCRATCH/coin.json" | sed 's/^0x//')"
PRECOMMIT_HEX="$(jq -r '.precommitment_hex' "$SCRATCH/coin.json" | sed 's/^0x//')"
COMMITMENT="$(jq -r '.coin.commitment' "$SCRATCH/coin.json")"

say "💰 Shielding (deposit): the contract binds $VALUE into the commitment on-chain…"
stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" \
  -- deposit --from noir_demo --amount "$VALUE" --label "$LABEL_HEX" --precommitment "$PRECOMMIT_HEX"
echo "   pool balance: $(stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" -- get_balance)"

say "🧾 Building the withdrawal witness (recipient = $DEMO_ADDR)…"
echo "{\"commitments\":[\"$COMMITMENT\"],\"scope\":\"noir_pool\"}" > "$SCRATCH/state.json"
cargo run --release --quiet --bin noterail -- withdraw "$SCRATCH/coin.json" "$SCRATCH/state.json" "$DEMO_ADDR" -o "$SCRATCH/withdrawal.json" >/dev/null

say "🔐 Proving (Groth16 / BLS12-381)…"
node circuits/build/withdraw_js/generate_witness.js \
  circuits/build/withdraw_js/withdraw.wasm "$SCRATCH/withdrawal.json" "$SCRATCH/witness.wtns"
snarkjs groth16 prove circuits/ceremony/withdraw/withdraw_final.zkey \
  "$SCRATCH/witness.wtns" "$SCRATCH/proof.json" "$SCRATCH/public.json"
snarkjs groth16 verify circuits/ceremony/withdraw/verification_key.json \
  "$SCRATCH/public.json" "$SCRATCH/proof.json"

PROOF_HEX="$(cargo run --release --quiet --bin circom2soroban -- proof "$SCRATCH/proof.json" | sed -n '/Hex encoding:/{n;p;}' | tr -d '[:space:]' | sed -E 's/^0x//i')"
PUBLIC_HEX="$(cargo run --release --quiet --bin circom2soroban -- public "$SCRATCH/public.json" | sed -n '/Hex encoding:/{n;p;}' | tr -d '[:space:]' | sed -E 's/^0x//i')"
[ -n "$PROOF_HEX" ] && [ -n "$PUBLIC_HEX" ] || { echo "✗ failed to convert proof/public"; exit 1; }

say "💸 Unshielding (withdraw) to the bound recipient…"
stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" \
  -- withdraw --to noir_demo --proof_bytes "$PROOF_HEX" --pub_signals_bytes "$PUBLIC_HEX"

say "✅ Settled. Final pool balance:"
stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" -- get_balance
echo ""
echo "🎉 NoirRail Phase 0: shield → prove → unshield complete on $NETWORK."
echo "   pool: $CONTRACT_ID"
