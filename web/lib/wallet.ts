// Dev-grade testnet signer. The secret lives in localStorage and is clearly labelled in the UI
// as a development convenience — the production path is Freighter / WebAuthn passkeys (Phase 4).
import { Keypair } from "@stellar/stellar-sdk";
import { FRIENDBOT } from "./config.ts";

const KEY = "noir.wallet.secret";

export function loadWallet(): Keypair | null {
  if (typeof localStorage === "undefined") return null;
  const s = localStorage.getItem(KEY);
  try {
    return s ? Keypair.fromSecret(s) : null;
  } catch {
    return null;
  }
}

export async function createWallet(): Promise<Keypair> {
  const kp = Keypair.random();
  localStorage.setItem(KEY, kp.secret());
  await fund(kp.publicKey());
  return kp;
}

export function importWallet(secret: string): Keypair {
  const kp = Keypair.fromSecret(secret.trim());
  localStorage.setItem(KEY, kp.secret());
  return kp;
}

export function clearWallet(): void {
  localStorage.removeItem(KEY);
}

export async function fund(publicKey: string): Promise<void> {
  try {
    await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(publicKey)}`);
  } catch {
    /* already funded or offline; ignore */
  }
}
