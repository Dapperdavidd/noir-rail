// Verifies the TS MerkleTree against a vector produced by the Rust `noterail`/`lean-imt`.
// Run: node scripts/verify-merkle.mts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { MerkleTree } from "../src/merkle.ts";

const here = dirname(fileURLToPath(import.meta.url));
const vec = JSON.parse(readFileSync(resolve(here, "merkle-vector.json"), "utf8"));

const leaves: bigint[] = vec.commitments.map((s: string) => BigInt(s));
const tree = new MerkleTree(leaves);

const expectedRoot = BigInt(vec.stateRoot);
const gotRoot = tree.root();
const rootOk = gotRoot === expectedRoot;
console.log(`${rootOk ? "PASS" : "FAIL"}  root`);
if (!rootOk) {
  console.log(`   expected ${expectedRoot}`);
  console.log(`   got      ${gotRoot}`);
}

const idx = Number(vec.stateIndex);
const path = tree.proof(idx);
const expectedSibs: bigint[] = vec.stateSiblings.map((s: string) => BigInt(s));
let sibsOk = path.siblings.length === expectedSibs.length;
for (let i = 0; i < expectedSibs.length; i++) {
  if (path.siblings[i] !== expectedSibs[i]) {
    sibsOk = false;
    console.log(`   sibling[${i}] expected ${expectedSibs[i]} got ${path.siblings[i]}`);
  }
}
console.log(`${sibsOk ? "PASS" : "FAIL"}  siblings (${expectedSibs.length})`);

const all = rootOk && sibsOk;
console.log(all ? "\n✓ merkle matches Rust" : "\n✗ merkle mismatch");
process.exit(all ? 0 : 1);
