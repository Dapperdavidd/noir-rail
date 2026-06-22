#!/usr/bin/env bash
# NoirRail Groth16 trusted setup over BLS12-381.
#
# ⚠️  DEV-ONLY. This runs a single-contributor ceremony: the contributor knows the toxic waste
#     and could forge proofs. Phase 1 of the build plan replaces this with a published,
#     multi-contributor ceremony ("at least one was honest"). Do not use this zkey on mainnet.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CIRCUIT="${1:-withdraw}"
POWER="${POWER:-14}"                       # 2^14 = 16384 constraints; withdraw uses ~5.6k
PTAU="ceremony/pot${POWER}_final.ptau"
OUT="ceremony/$CIRCUIT"
mkdir -p "$OUT"

rand() { head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

# Phase 1 — circuit-independent, reusable across the suite.
if [ ! -f "$PTAU" ]; then
  echo "→ phase 1: powers of tau (bls12-381, 2^$POWER)"
  snarkjs powersoftau new bls12-381 "$POWER" "ceremony/pot${POWER}_0000.ptau" -v
  snarkjs powersoftau contribute "ceremony/pot${POWER}_0000.ptau" "ceremony/pot${POWER}_0001.ptau" \
    --name="noir-rail dev" -e="$(rand)" -v
  snarkjs powersoftau prepare phase2 "ceremony/pot${POWER}_0001.ptau" "$PTAU" -v
  rm -f "ceremony/pot${POWER}_0000.ptau" "ceremony/pot${POWER}_0001.ptau"
fi

# Phase 2 — per circuit.
echo "→ phase 2: groth16 setup for $CIRCUIT"
snarkjs groth16 setup "build/$CIRCUIT.r1cs" "$PTAU" "$OUT/${CIRCUIT}_0000.zkey"
snarkjs zkey contribute "$OUT/${CIRCUIT}_0000.zkey" "$OUT/${CIRCUIT}_final.zkey" \
  --name="noir-rail dev" -e="$(rand)" -v
snarkjs zkey export verificationkey "$OUT/${CIRCUIT}_final.zkey" "$OUT/verification_key.json"
rm -f "$OUT/${CIRCUIT}_0000.zkey"

echo "✓ $CIRCUIT → $OUT/{${CIRCUIT}_final.zkey, verification_key.json}"
