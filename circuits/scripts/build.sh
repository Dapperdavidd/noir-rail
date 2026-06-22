#!/usr/bin/env bash
# Compile NoirRail circuits to R1CS + WASM witness generators over BLS12-381.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# circomlib include path (Num2Bits, comparators, mux1, ...). Override with CIRCOMLIB=...
CL="${CIRCOMLIB:-$HOME/.npm-global/lib/node_modules/circomlib/circuits}"
if [ ! -d "$CL" ]; then
  echo "✗ circomlib not found at $CL — run: npm i -g circomlib (or set CIRCOMLIB=...)" >&2
  exit 1
fi

mkdir -p build
CIRCUITS=("${@:-withdraw}")
for c in "${CIRCUITS[@]}"; do
  echo "→ compiling src/$c.circom (bls12381)"
  circom "src/$c.circom" --r1cs --wasm --sym -o build -l src/lib -l "$CL" --prime bls12381
done
echo "✓ built: ${CIRCUITS[*]}"
