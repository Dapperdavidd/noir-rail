// The NoirRail book — chapter index. Slugs match files in /docs/book/<slug>.md.
export interface Chapter {
  slug: string;
  n: string;
  title: string;
  blurb: string;
  part: string;
}

export const CHAPTERS: Chapter[] = [
  { slug: "01-why", n: "01", title: "Why NoirRail exists", blurb: "The privacy gap in on-chain RWAs, and the thesis.", part: "The idea" },
  { slug: "02-architecture", n: "02", title: "The shape of the system", blurb: "Four planes, three invariants, the data flow.", part: "The idea" },
  { slug: "03-notes", n: "03", title: "Notes, commitments, nullifiers", blurb: "The data model of a shielded value.", part: "Cryptographic core" },
  { slug: "04-circuits", n: "04", title: "The circuits", blurb: "withdraw and transfer in Circom, line by line.", part: "Cryptographic core" },
  { slug: "05-poseidon", n: "05", title: "Poseidon, one hash everywhere", blurb: "Why the same hash must run in three places.", part: "Cryptographic core" },
  { slug: "06-ceremony", n: "06", title: "The trusted setup", blurb: "What Groth16 needs and how we ceremony it.", part: "Cryptographic core" },
  { slug: "07-contract", n: "07", title: "The ShieldedPool contract", blurb: "Storage, the settlement path, the deltas.", part: "The chain" },
  { slug: "08-circom2soroban", n: "08", title: "From snarkjs to Soroban", blurb: "Serializing proofs for the on-chain verifier.", part: "The chain" },
  { slug: "09-sdk", n: "09", title: "The SDK", blurb: "Notes, Merkle, and proving in the browser.", part: "The client" },
  { slug: "10-terminal", n: "10", title: "The terminal", blurb: "Obsidian Clearing: the design system and screens.", part: "The client" },
  { slug: "11-flows", n: "11", title: "End-to-end flows", blurb: "Shield, transfer, unshield — exact commands.", part: "Operating it" },
  { slug: "12-security", n: "12", title: "Security model", blurb: "What we assume, defend, and honestly cannot.", part: "Operating it" },
  { slug: "13-roadmap", n: "13", title: "The road ahead", blurb: "The phases beyond the hackathon MVP.", part: "Operating it" },
];
