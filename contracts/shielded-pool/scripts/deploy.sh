#!/usr/bin/env bash
# Deploy a fresh ShieldedPool with the membership (disclosure) verifier wired in.
#
# Because the constructor changed (it now pins the membership VK + approval root), there is no
# in-place upgrade — this deploys a NEW pool instance with a NEW contract id. The old pool's
# deposited notes do not carry over (Phase 0 testnet; acceptable). After deploy, set
# NEXT_PUBLIC_POOL_ID in web/.env.local to the printed id.
#
# Required env:
#   SOURCE  — your funded deploy identity (a `stellar keys` name, or an S... secret)
#   ADMIN   — the admin G... address (can call set_approval_root later)
# Optional env:
#   NETWORK        (default: testnet)
#   TOKEN_ID       (default: native XLM SAC on testnet)
#   ASSET_ID       (default: 1)
#   APPROVAL_ROOT  (default: all-zeros; publish the real allow-list root post-deploy via set_approval_root)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

: "${SOURCE:?set SOURCE to your funded deploy identity (stellar keys name or S... secret)}"
: "${ADMIN:?set ADMIN to the admin G... address}"
NETWORK="${NETWORK:-testnet}"
TOKEN_ID="${TOKEN_ID:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
ASSET_ID="${ASSET_ID:-1}"
APPROVAL_ROOT="${APPROVAL_ROOT:-0000000000000000000000000000000000000000000000000000000000000000}"

echo "→ building contract wasm (wasm32v1-none)"
cargo build --target wasm32v1-none --release -p shielded-pool >/dev/null
WASM="target/wasm32v1-none/release/shielded_pool.wasm"

echo "→ encoding verification keys"
WVK=$(node contracts/shielded-pool/scripts/vk-hex.mjs circuits/ceremony/withdraw/verification_key.json)
TVK=$(node contracts/shielded-pool/scripts/vk-hex.mjs circuits/ceremony/transfer/verification_key.json)
MVK=$(node contracts/shielded-pool/scripts/vk-hex.mjs circuits/ceremony/membership/verification_key.json)

echo "→ deploying to $NETWORK (admin $ADMIN)"
stellar contract deploy --wasm "$WASM" --source "$SOURCE" --network "$NETWORK" -- \
  --vk_bytes "$WVK" \
  --transfer_vk_bytes "$TVK" \
  --token_address "$TOKEN_ID" \
  --admin "$ADMIN" \
  --asset_id "$ASSET_ID" \
  --membership_vk_bytes "$MVK" \
  --approval_root "$APPROVAL_ROOT"

echo
echo "✓ deployed. Copy the contract id above into web/.env.local as NEXT_PUBLIC_POOL_ID, then:"
echo "  1. shield a position in the new pool,"
echo "  2. publish the vetted allow-list root:  stellar contract invoke --id <POOL> --source $ADMIN --network $NETWORK -- set_approval_root --approval_root <ROOT_HEX>,"
echo "  3. disclose — the console will verify the proof on-chain."
