// Encode a snarkjs verification_key.json into the exact on-chain byte hex the ShieldedPool
// constructor expects (alpha‖beta‖gamma‖delta‖icLen‖IC[]). Usage:
//   node contracts/shielded-pool/scripts/vk-hex.mjs <path-to-verification_key.json>
import { readFileSync } from "node:fs";
import { vkToHex } from "../../../packages/sdk/src/index.ts";

const path = process.argv[2];
if (!path) {
  console.error("usage: node vk-hex.mjs <verification_key.json>");
  process.exit(1);
}
process.stdout.write(vkToHex(JSON.parse(readFileSync(path, "utf8"))));
