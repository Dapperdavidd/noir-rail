// The Note Vault: encrypted-at-rest is the Phase-1 goal; Phase 0 stores notes in localStorage,
// labelled dev-grade in the UI. Secrets never leave the device regardless.
import type { Note } from "@noir-rail/sdk";

const KEY = "noir.notes";

export interface StoredNote {
  scope: string;
  value: string;
  nullifier: string;
  secret: string;
  label: string;
  precommitment: string;
  commitment: string;
  leafIndex?: number;
  spent?: boolean;
  createdAt: number;
  txHash?: string;
}

function toStored(n: Note, txHash?: string): StoredNote {
  return {
    scope: n.scope,
    value: n.value.toString(),
    nullifier: n.nullifier.toString(),
    secret: n.secret.toString(),
    label: n.label.toString(),
    precommitment: n.precommitment.toString(),
    commitment: n.commitment.toString(),
    leafIndex: n.leafIndex,
    createdAt: Date.now(),
    txHash,
  };
}

export function toNote(s: StoredNote): Note {
  return {
    scope: s.scope,
    value: BigInt(s.value),
    nullifier: BigInt(s.nullifier),
    secret: BigInt(s.secret),
    label: BigInt(s.label),
    precommitment: BigInt(s.precommitment),
    commitment: BigInt(s.commitment),
    leafIndex: s.leafIndex,
  };
}

export function loadNotes(): StoredNote[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(notes: StoredNote[]): void {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function addNote(n: Note, txHash?: string): StoredNote[] {
  const notes = loadNotes();
  notes.unshift(toStored(n, txHash));
  persist(notes);
  return notes;
}

export function markSpent(commitment: string, txHash?: string): StoredNote[] {
  const notes = loadNotes().map((n) =>
    n.commitment === commitment ? { ...n, spent: true, txHash: txHash ?? n.txHash } : n,
  );
  persist(notes);
  return notes;
}
