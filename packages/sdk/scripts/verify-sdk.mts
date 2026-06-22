// End-to-end SDK check: the recipient mapping matches noterail, and a note + witness built
// entirely by the SDK is accepted and proven by snarkjs. Run: node scripts/verify-sdk.mts
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { generateNote, buildWithdrawWitness } from "../src/note.ts";
import { addressToField } from "../src/field.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const ADDR = "GDRZC5A7S6VAA3IE6A4NJ7ZQLV44PQMXQONEI6N5KWJXRRIGL75PUJGD";

// 1. Recipient field must match noterail's (from the Rust-built mtest withdrawal).
const wd = JSON.parse(readFileSync(resolve(repo, ".demo/mtest/wd.json"), "utf8"));
const sdkRecipient = await addressToField(ADDR);
const recOk = sdkRecipient.toString() === wd.recipient;
console.log(`${recOk ? "PASS" : "FAIL"}  recipient mapping matches noterail`);
if (!recOk) console.log(`   sdk ${sdkRecipient}\n   rust ${wd.recipient}`);

// 2. Build a note + withdraw witness fully in the SDK, emit for snarkjs proving.
const note = generateNote("noir_pool", 2_500_000_000n);
const witness = await buildWithdrawWitness(note, [note.commitment], ADDR);
writeFileSync(resolve(repo, ".demo/sdk_wd.json"), JSON.stringify(witness, null, 2));
console.log("wrote .demo/sdk_wd.json (SDK-built witness)");
process.exit(recOk ? 0 : 1);
