// Live on-chain access to the ShieldedPool via Soroban RPC. Reads use simulation; writes are
// prepared, signed by the connected key, and submitted.
import {
  rpc,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  Keypair,
  xdr,
} from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, POOL_ID, READ_SOURCE, RPC_URL } from "./config.ts";

const server = () => new rpc.Server(RPC_URL, { allowHttp: false });

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const bytesScVal = (hex: string) =>
  xdr.ScVal.scvBytes(Buffer.from(hexToBytes(hex)));
const i128ScVal = (v: bigint) => nativeToScVal(v, { type: "i128" });
const addrScVal = (pk: string) => new Address(pk).toScVal();

/** Read-only contract call via simulation. */
async function read<T>(method: string, source: string, args: xdr.ScVal[] = []): Promise<T> {
  const s = server();
  const account = await s.getAccount(source);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(POOL_ID).call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await s.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result!.retval) as T;
}

export interface PoolState {
  balance: bigint;
  commitmentCount: number;
  root: string; // hex
  commitments: string[]; // hex
}

export async function fetchPoolState(source: string): Promise<PoolState> {
  const src = source || READ_SOURCE;
  const [balance, count, rootBytes, commitmentBytes] = await Promise.all([
    read<bigint>("get_balance", src),
    read<number>("get_commitment_count", src),
    read<Uint8Array>("get_merkle_root", src),
    read<Uint8Array[]>("get_commitments", src),
  ]);
  const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return {
    balance: BigInt(balance),
    commitmentCount: Number(count),
    root: toHex(rootBytes),
    commitments: commitmentBytes.map(toHex),
  };
}

async function send(kp: Keypair, op: xdr.Operation): Promise<string> {
  const s = server();
  const account = await s.getAccount(kp.publicKey());
  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(120)
    .build();
  tx = await s.prepareTransaction(tx);
  tx.sign(kp);
  const sent = await s.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error(`submit failed: ${JSON.stringify(sent.errorResult)}`);
  // poll
  let result = await s.getTransaction(sent.hash);
  for (let i = 0; i < 30 && result.status === rpc.Api.GetTransactionStatus.NOT_FOUND; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    result = await s.getTransaction(sent.hash);
  }
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`transaction ${sent.hash} did not succeed: ${result.status}`);
  }
  return sent.hash;
}

export async function submitDeposit(
  kp: Keypair,
  amount: bigint,
  labelHex: string,
  precommitmentHex: string,
): Promise<string> {
  const op = new Contract(POOL_ID).call(
    "deposit",
    addrScVal(kp.publicKey()),
    i128ScVal(amount),
    bytesScVal(labelHex),
    bytesScVal(precommitmentHex),
  );
  return send(kp, op);
}

export async function submitWithdraw(
  kp: Keypair,
  proofHex: string,
  publicHex: string,
): Promise<string> {
  const op = new Contract(POOL_ID).call(
    "withdraw",
    addrScVal(kp.publicKey()),
    bytesScVal(proofHex),
    bytesScVal(publicHex),
  );
  return send(kp, op);
}
