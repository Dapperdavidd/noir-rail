// LeanIMT-style fixed-depth commitment tree, ported from the Rust `lean-imt` used on-chain and by
// `noterail`. Parents are Poseidon([left, right]); missing nodes are zero. Verified byte-for-byte
// against Rust output in scripts/verify-merkle.mts. The Merkle path uses only public commitments,
// so computing it client-side leaks nothing.
import { poseidon } from "./poseidon.ts";

// Must equal the depth baked into the circuits, the contract, and noterail.
export const TREE_DEPTH = 14;

function zeroHashes(depth: number): bigint[] {
  const z: bigint[] = [0n];
  for (let l = 1; l <= depth; l++) z.push(poseidon([z[l - 1], z[l - 1]]));
  return z;
}

export interface MerklePath {
  siblings: bigint[]; // length = depth
  pathIndices: number[]; // 0 = node is left child, 1 = right child
  leafIndex: number;
  root: bigint;
}

export class MerkleTree {
  readonly depth: number;
  private leaves: bigint[];
  private zeros: bigint[];
  private memo = new Map<string, bigint>();

  constructor(leaves: bigint[] = [], depth = TREE_DEPTH) {
    this.depth = depth;
    this.leaves = leaves.slice();
    this.zeros = zeroHashes(depth);
  }

  get size(): number {
    return this.leaves.length;
  }

  /** Value of the node at (index, level); empty subtrees collapse to the cached zero hash. */
  private node(index: number, level: number): bigint {
    if (level === 0) return index < this.leaves.length ? this.leaves[index] : 0n;
    const span = 2 ** level;
    if (index * span >= this.leaves.length) return this.zeros[level];
    const key = `${level}:${index}`;
    const hit = this.memo.get(key);
    if (hit !== undefined) return hit;
    const h = poseidon([this.node(index * 2, level - 1), this.node(index * 2 + 1, level - 1)]);
    this.memo.set(key, h);
    return h;
  }

  root(): bigint {
    return this.node(0, this.depth);
  }

  indexOf(commitment: bigint): number {
    return this.leaves.findIndex((l) => l === commitment);
  }

  /** Inclusion path for a leaf index (siblings + path bits + root). */
  proof(leafIndex: number): MerklePath {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error(`leaf index ${leafIndex} out of range (size ${this.leaves.length})`);
    }
    const siblings: bigint[] = [];
    const pathIndices: number[] = [];
    let current = leafIndex;
    for (let level = 0; level < this.depth; level++) {
      const sibling = current % 2 === 0 ? current + 1 : current - 1;
      siblings.push(this.node(sibling, level));
      pathIndices.push(current % 2);
      current = Math.floor(current / 2);
    }
    return { siblings, pathIndices, leafIndex, root: this.root() };
  }
}
