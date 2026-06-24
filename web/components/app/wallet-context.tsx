"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Keypair } from "@stellar/stellar-sdk";
import { createWallet, clearWallet, loadWallet } from "@/lib/wallet.ts";

interface WalletCtx {
  wallet: Keypair | null;
  busy: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const Ctx = createContext<WalletCtx | null>(null);

export function useWallet(): WalletCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet must be used within <WalletProvider>");
  return c;
}

/** Shared testnet wallet, persisted in localStorage and surfaced in the app topbar. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Keypair | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWallet(loadWallet());
  }, []);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setWallet(await createWallet());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearWallet();
    setWallet(null);
  }, []);

  return <Ctx.Provider value={{ wallet, busy, error, connect, disconnect }}>{children}</Ctx.Provider>;
}
