#!/usr/bin/env bash
# NoirRail · private→private transfer demo on Stellar testnet.
#
#   shield (deposit) → transfer (1-in-2-out, value hidden) → assert
#
# Spends one shielded note into two: a payment to a recipient and change to the sender. No tokens
# move and no amount is revealed; the chain only sees the input nullifier and two new commitments.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
export PATH="$HOME/.npm-global/bin:$HOME/.cargo/bin:$PATH"

NETWORK="${NETWORK:-testnet}"
TOKEN_ADDRESS="${TOKEN_ADDRESS:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
say() { printf "\n\033[1;33m%s\033[0m\n" "$*"; }

[ -f circuits/ceremony/transfer/transfer_final.zkey ] || { echo "✗ run: pnpm --filter @noir-rail/circuits all (transfer)"; exit 1; }

say "👤 Funding demo account…"
stellar keys ls 2>/dev/null | grep -q "^noir_demo$" || stellar keys generate noir_demo >/dev/null 2>&1
stellar keys fund noir_demo --network "$NETWORK" >/dev/null 2>&1 || true

say "📦 Building + deploying the pool (withdraw + transfer keys)…"
cargo build --target wasm32v1-none --release -p shielded-pool
stellar contract optimize --wasm target/wasm32v1-none/release/shielded_pool.wasm \
  --wasm-out target/wasm32v1-none/release/shielded_pool.optimized.wasm >/dev/null
VK_HEX="$(cargo run --release --quiet --bin circom2soroban -- vk circuits/ceremony/withdraw/verification_key.json | grep -oE '[0-9a-f]{64,}$' | tail -1)"
TVK_HEX="$(cargo run --release --quiet --bin circom2soroban -- vk circuits/ceremony/transfer/verification_key.json | grep -oE '[0-9a-f]{64,}$' | tail -1)"
CONTRACT_ID="$(stellar contract deploy --wasm target/wasm32v1-none/release/shielded_pool.optimized.wasm \
  --source noir_demo --network "$NETWORK" \
  -- --vk_bytes "$VK_HEX" --transfer_vk_bytes "$TVK_HEX" --token_address "$TOKEN_ADDRESS" --admin noir_demo --asset_id 1 \
  2>&1 | grep -oE 'C[A-Z0-9]{55}' | tail -1)"
echo "   pool: $CONTRACT_ID"

say "🪙 Building the transfer (SDK): spend 2.5 → pay 1.0, keep 1.5 change…"
BUNDLE="$(node packages/sdk/scripts/build-transfer.mts)"
AMOUNT="$(echo "$BUNDLE" | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).deposit.amount))')"
LABEL_HEX="$(echo "$BUNDLE" | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).deposit.labelHex))' | sed 's/^0x//')"
PRECOMMIT_HEX="$(echo "$BUNDLE" | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).deposit.precommitmentHex))' | sed 's/^0x//')"

say "💰 Shielding the input note ($AMOUNT)…"
stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" \
  -- deposit --from noir_demo --amount "$AMOUNT" --label "$LABEL_HEX" --precommitment "$PRECOMMIT_HEX" >/dev/null
echo "   commitments: $(stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" -- get_commitment_count)"

say "🔐 Proving the transfer (Groth16 / BLS12-381)…"
node circuits/build/transfer_js/generate_witness.js circuits/build/transfer_js/transfer.wasm .demo/transfer/witness.json .demo/transfer/t.wtns
snarkjs groth16 prove circuits/ceremony/transfer/transfer_final.zkey .demo/transfer/t.wtns .demo/transfer/proof.json .demo/transfer/public.json
snarkjs groth16 verify circuits/ceremony/transfer/verification_key.json .demo/transfer/public.json .demo/transfer/proof.json
PROOF_HEX="$(cargo run --release --quiet --bin circom2soroban -- proof .demo/transfer/proof.json | sed -n '/Hex encoding:/{n;p;}' | tr -d '[:space:]' | sed -E 's/^0x//i')"
PUBLIC_HEX="$(cargo run --release --quiet --bin circom2soroban -- public .demo/transfer/public.json | sed -n '/Hex encoding:/{n;p;}' | tr -d '[:space:]' | sed -E 's/^0x//i')"

say "🔀 Settling the transfer privately…"
stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" \
  -- transfer --proof_bytes "$PROOF_HEX" --pub_signals_bytes "$PUBLIC_HEX"

say "✅ Asserting post-state…"
COUNT="$(stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" -- get_commitment_count | tr -d '"')"
BAL="$(stellar contract invoke --id "$CONTRACT_ID" --source noir_demo --network "$NETWORK" -- get_balance | tr -d '"')"
echo "   commitments: $COUNT (expect 3: input + 2 outputs)"
echo "   pool balance: $BAL (expect $AMOUNT — unchanged; value stayed shielded)"
[ "$COUNT" = "3" ] && [ "$BAL" = "$AMOUNT" ] && echo "🎉 Private transfer settled on $NETWORK. pool: $CONTRACT_ID" || { echo "✗ post-state mismatch"; exit 1; }
