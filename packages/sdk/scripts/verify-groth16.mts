// Prints the TS-encoded vk/proof/public hex for the given JSON files, for diffing against the
// Rust `circom2soroban`. Usage: node verify-groth16.mts <vk.json> <proof.json> <public.json>
import { readFileSync } from "node:fs";
import { vkToHex, proofToHex, publicSignalsToHex } from "../src/groth16.ts";

const [vkPath, proofPath, publicPath] = process.argv.slice(2);
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));

console.log("vk " + vkToHex(read(vkPath)));
console.log("proof " + proofToHex(read(proofPath)));
console.log("public " + publicSignalsToHex(read(publicPath)));
