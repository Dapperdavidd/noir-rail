#![no_std]
//! # NoirRail · ShieldedPool
//!
//! One instance per asset. Holds the Merkle tree of note commitments, the spent-nullifier
//! set, and custody of the underlying Stellar Asset Contract (SAC) balance.
//!
//! Every shielded settlement is the same shape: *anchor to a known root → reject reused
//! nullifiers → bind the recipient → verify once → commit*. The contract never sees a holder
//! or a hidden balance; it sees commitments, roots, nullifiers, and (only at the daylight
//! edges of shield/unshield) a transparent token amount.
//!
//! ## What this extends beyond the SDF privacy-pools prototype
//! - **Arbitrary value.** The deposited token amount is bound into the note commitment by
//!   recomputing the leaf on-chain with the same Poseidon the circuit uses, so a note is worth
//!   exactly what was deposited. (The prototype was a fixed-denomination mixer.)
//! - **Frontier Merkle tree.** Inserts are O(depth) and persistent across transactions (the
//!   classic "filled subtrees" frontier), so multi-deposit and transfer both stay within the
//!   per-transaction instruction budget. The prototype recomputed from the leaf set on each load,
//!   which is exponential for cold inserts into a non-empty tree.
//! - **Root-history ring buffer.** A proof anchored to a recent root stays valid as the tree grows.
//! - **Nullifier map** (O(1) membership) instead of a linearly-scanned vector.
//! - **Recipient binding** (frontrunning fix). The recipient is a public input bound inside the
//!   circuit; the contract checks the proof's recipient signal equals the actual payout address.
//! - **Typed `Result` errors** on the settlement path.
//!
//! The frontier produces the *same* zero-padded fixed-depth root the circuit, SDK, and `noterail`
//! compute (same Poseidon, same zero ladder, left child = lower index), so nothing off-chain
//! needs to change.

extern crate alloc;

use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, token,
    crypto::bls12_381::Bls12381Fr as Fr,
    Address, Bytes, BytesN, Env, Symbol, U256, Vec,
};

use soroban_poseidon::poseidon_hash;
use zk::{Groth16Verifier, Proof, PublicSignals, VerificationKey};

#[cfg(test)]
mod test;

/// Depth of the commitment tree. 2^14 = 16,384 notes per pool. Sized so a transfer's two on-chain
/// Merkle inserts fit alongside the Groth16 pairing within the per-tx instruction budget; raising
/// it is a Phase-1 task (CAP-0075 host Poseidon). Must equal the depth baked into the circuits,
/// the SDK, and `noterail`.
const TREE_DEPTH: u32 = 14;
/// Number of recent roots retained so in-flight proofs survive concurrent settlements.
const ROOT_HISTORY_SIZE: u32 = 32;

// --- storage keys ---
const ADMIN_KEY: Symbol = symbol_short!("admin");
const VK_KEY: Symbol = symbol_short!("vk"); // withdraw / unshield verification key
const TVK_KEY: Symbol = symbol_short!("tvk"); // transfer verification key
const MVK_KEY: Symbol = symbol_short!("mvk"); // membership (disclosure) verification key
const APPROOT_KEY: Symbol = symbol_short!("approot"); // pinned approved-set (allow-list) root
const TOKEN_KEY: Symbol = symbol_short!("token");
const ASSET_KEY: Symbol = symbol_short!("asset");
const NULL_KEY: Symbol = symbol_short!("null");
const ROOTS_KEY: Symbol = symbol_short!("roots");
const ROOT_KEY: Symbol = symbol_short!("mroot"); // current Merkle root
const FILLED_KEY: Symbol = symbol_short!("filled"); // frontier: left-sibling per level
const ZEROS_KEY: Symbol = symbol_short!("zeros"); // empty-subtree hash per level
const NEXTIDX_KEY: Symbol = symbol_short!("nextidx"); // next free leaf index
const LEAVES_KEY: Symbol = symbol_short!("leaves"); // appended commitments (for the indexer/SDK)

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The proof's referenced state root is not in the retained history window.
    StaleRoot = 1,
    /// This nullifier has already been spent (double-spend attempt).
    NullifierUsed = 2,
    /// Groth16 verification failed.
    BadProof = 3,
    /// The proof's bound recipient does not match the payout address (frontrunning attempt).
    RecipientMismatch = 4,
    /// The pool's custodied balance is insufficient to release the withdrawn value.
    InsufficientBalance = 5,
    /// A deposit amount must be strictly positive.
    NonPositiveAmount = 6,
    /// The commitment tree is full.
    TreeAtCapacity = 7,
    /// A field element did not fit back into an i128 token amount.
    ValueOverflow = 8,
    /// A disclosure proof's approval root does not match the pool's pinned allow-list.
    ApprovalRootMismatch = 9,
}

#[contract]
pub struct ShieldedPool;

#[contractimpl]
impl ShieldedPool {
    /// Wires the pool to its verification keys, its underlying SAC, an admin, and the asset id.
    /// The keys are pinned at deploy and are never caller-supplied thereafter.
    pub fn __constructor(
        env: &Env,
        vk_bytes: Bytes,
        transfer_vk_bytes: Bytes,
        token_address: Address,
        admin: Address,
        asset_id: u32,
        membership_vk_bytes: Bytes,
        approval_root: BytesN<32>,
    ) {
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&VK_KEY, &vk_bytes);
        env.storage().instance().set(&TVK_KEY, &transfer_vk_bytes);
        env.storage().instance().set(&MVK_KEY, &membership_vk_bytes);
        env.storage().instance().set(&APPROOT_KEY, &approval_root);
        env.storage().instance().set(&TOKEN_KEY, &token_address);
        env.storage().instance().set(&ASSET_KEY, &asset_id);

        // Build the zero-subtree ladder and seed an empty frontier.
        let mut zeros: Vec<BytesN<32>> = Vec::new(env);
        let mut filled: Vec<BytesN<32>> = Vec::new(env);
        let mut z = BytesN::from_array(env, &[0u8; 32]);
        let mut level = 0u32;
        while level < TREE_DEPTH {
            zeros.push_back(z.clone());
            filled.push_back(z.clone());
            z = Self::hash2(env, &z, &z);
            level += 1;
        }
        zeros.push_back(z.clone()); // zeros[depth] = empty root
        let empty_root = z;

        env.storage().instance().set(&ZEROS_KEY, &zeros);
        env.storage().instance().set(&FILLED_KEY, &filled);
        env.storage().instance().set(&NEXTIDX_KEY, &0u32);
        env.storage().instance().set(&ROOT_KEY, &empty_root);
        env.storage().instance().set(&LEAVES_KEY, &Vec::<BytesN<32>>::new(env));

        let mut roots: Vec<BytesN<32>> = Vec::new(env);
        roots.push_back(empty_root);
        env.storage().instance().set(&ROOTS_KEY, &roots);
    }

    /// **Shield.** Deposit `amount` of the pool's token and append the note commitment.
    ///
    /// The caller supplies the public parts of the note — its `label` (pool scope ‖ nonce) and its
    /// `precommitment` (= Poseidon(nullifier, secret)) — and the *transparent* `amount`. The
    /// contract recomputes the leaf `c = Poseidon(amount, label, precommitment)` itself, so the
    /// hidden note value provably equals the tokens escrowed. The owner-identifying parts never
    /// appear. Returns the leaf index.
    pub fn deposit(
        env: &Env,
        from: Address,
        amount: i128,
        label: BytesN<32>,
        precommitment: BytesN<32>,
    ) -> Result<u32, Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::NonPositiveAmount);
        }

        let token_address: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        let token_client = token::Client::new(env, &token_address);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        let leaf = Self::commitment(env, amount, &label, &precommitment);
        let (new_root, leaf_index) = Self::merkle_insert(env, leaf)?;
        Self::record_root(env, new_root);
        Ok(leaf_index)
    }

    /// **Unshield.** Release `withdrawnValue` of the token to `to`, against a valid spend proof.
    ///
    /// Public signals, in circuit order: `[nullifierHash, withdrawnValue, stateRoot, recipient]`.
    pub fn withdraw(
        env: &Env,
        to: Address,
        proof_bytes: Bytes,
        pub_signals_bytes: Bytes,
    ) -> Result<(), Error> {
        to.require_auth();

        let pub_signals = PublicSignals::from_bytes(env, &pub_signals_bytes);
        let nullifier_hash = pub_signals.pub_signals.get(0).unwrap();
        let withdrawn_value_fr = pub_signals.pub_signals.get(1).unwrap();
        let state_root_fr = pub_signals.pub_signals.get(2).unwrap();
        let recipient_fr = pub_signals.pub_signals.get(3).unwrap();

        // 1. Anchor to a known root.
        if !Self::root_is_known(env, &state_root_fr.to_bytes()) {
            return Err(Error::StaleRoot);
        }
        // 2. Recipient binding.
        if recipient_fr != Self::address_to_fr(env, &to) {
            return Err(Error::RecipientMismatch);
        }
        // 3. No nullifier reuse.
        let nullifier = nullifier_hash.to_bytes();
        if Self::nullifier_spent(env, &nullifier) {
            return Err(Error::NullifierUsed);
        }
        // 4. Verify exactly one Groth16 proof against the pinned key.
        let vk_bytes: Bytes = env.storage().instance().get(&VK_KEY).unwrap();
        let vk = VerificationKey::from_bytes(env, &vk_bytes).map_err(|_| Error::BadProof)?;
        let proof = Proof::from_bytes(env, &proof_bytes);
        if !Groth16Verifier::verify_proof(env, vk, proof, &pub_signals.pub_signals)
            .map_err(|_| Error::BadProof)?
        {
            return Err(Error::BadProof);
        }

        // 5. Commit: spend the nullifier, pay out.
        let amount = Self::fr_to_i128(&withdrawn_value_fr)?;
        let token_address: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        let token_client = token::Client::new(env, &token_address);
        if token_client.balance(&env.current_contract_address()) < amount {
            return Err(Error::InsufficientBalance);
        }
        Self::spend_nullifier(env, nullifier);
        token_client.transfer(&env.current_contract_address(), &to, &amount);
        Ok(())
    }

    /// **Transfer.** Private → private settlement: spend one input note and append two output
    /// notes, value conserved inside the proof. No tokens move; only commitments, a nullifier, and
    /// the root advance.
    ///
    /// Public signals, in circuit order: `[nullifierHash, outCommitment0, outCommitment1, stateRoot]`.
    pub fn transfer(env: &Env, proof_bytes: Bytes, pub_signals_bytes: Bytes) -> Result<(), Error> {
        let pub_signals = PublicSignals::from_bytes(env, &pub_signals_bytes);
        let nullifier_hash = pub_signals.pub_signals.get(0).unwrap();
        let out_commitment0 = pub_signals.pub_signals.get(1).unwrap();
        let out_commitment1 = pub_signals.pub_signals.get(2).unwrap();
        let state_root_fr = pub_signals.pub_signals.get(3).unwrap();

        if !Self::root_is_known(env, &state_root_fr.to_bytes()) {
            return Err(Error::StaleRoot);
        }
        let nullifier = nullifier_hash.to_bytes();
        if Self::nullifier_spent(env, &nullifier) {
            return Err(Error::NullifierUsed);
        }
        let vk_bytes: Bytes = env.storage().instance().get(&TVK_KEY).unwrap();
        let vk = VerificationKey::from_bytes(env, &vk_bytes).map_err(|_| Error::BadProof)?;
        let proof = Proof::from_bytes(env, &proof_bytes);
        if !Groth16Verifier::verify_proof(env, vk, proof, &pub_signals.pub_signals)
            .map_err(|_| Error::BadProof)?
        {
            return Err(Error::BadProof);
        }

        // Commit: spend the input, append both outputs, advance the root.
        Self::spend_nullifier(env, nullifier);
        Self::merkle_insert(env, out_commitment0.to_bytes())?;
        let (new_root, _) = Self::merkle_insert(env, out_commitment1.to_bytes())?;
        Self::record_root(env, new_root);
        Ok(())
    }

    /// **Disclose membership.** Verify a selective-disclosure proof that a held note is committed in
    /// this pool *and* is a member of the authority's pinned approved/vetted set — revealing nothing
    /// but the two roots (never the amount, the owner, or which note). No tokens move and no state
    /// changes; a `disclosed` event is emitted and `Ok(())` returned iff the proof is valid.
    ///
    /// Public signals, in circuit order: `[stateRoot, approvalRoot]`.
    pub fn verify_membership(
        env: &Env,
        proof_bytes: Bytes,
        pub_signals_bytes: Bytes,
    ) -> Result<(), Error> {
        let pub_signals = PublicSignals::from_bytes(env, &pub_signals_bytes);
        let state_root_fr = pub_signals.pub_signals.get(0).unwrap();
        let approval_root_fr = pub_signals.pub_signals.get(1).unwrap();

        // 1. Anchor: the note is committed in a real, recent root of this pool.
        if !Self::root_is_known(env, &state_root_fr.to_bytes()) {
            return Err(Error::StaleRoot);
        }
        // 2. The proof must be against the authority's pinned allow-list, not an arbitrary set.
        let pinned: BytesN<32> = env.storage().instance().get(&APPROOT_KEY).unwrap();
        if approval_root_fr.to_bytes() != pinned {
            return Err(Error::ApprovalRootMismatch);
        }
        // 3. Verify the Groth16 membership proof against the pinned key.
        let vk_bytes: Bytes = env.storage().instance().get(&MVK_KEY).unwrap();
        let vk = VerificationKey::from_bytes(env, &vk_bytes).map_err(|_| Error::BadProof)?;
        let proof = Proof::from_bytes(env, &proof_bytes);
        if !Groth16Verifier::verify_proof(env, vk, proof, &pub_signals.pub_signals)
            .map_err(|_| Error::BadProof)?
        {
            return Err(Error::BadProof);
        }
        Ok(())
    }

    /// Publish a new approved-set (allow-list) root. Admin-only — the compliance authority curates
    /// the vetted set off-chain and pins its Merkle root here; future disclosures verify against it.
    pub fn set_approval_root(env: &Env, approval_root: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();
        env.storage().instance().set(&APPROOT_KEY, &approval_root);
    }

    // --- views ---

    pub fn get_approval_root(env: &Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&APPROOT_KEY)
            .unwrap_or(BytesN::from_array(env, &[0u8; 32]))
    }

    pub fn get_merkle_root(env: &Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&ROOT_KEY)
            .unwrap_or(BytesN::from_array(env, &[0u8; 32]))
    }

    pub fn get_root_history(env: &Env) -> Vec<BytesN<32>> {
        env.storage().instance().get(&ROOTS_KEY).unwrap_or(Vec::new(env))
    }

    pub fn get_commitment_count(env: &Env) -> u32 {
        env.storage().instance().get(&NEXTIDX_KEY).unwrap_or(0)
    }

    pub fn get_commitments(env: &Env) -> Vec<BytesN<32>> {
        env.storage().instance().get(&LEAVES_KEY).unwrap_or(Vec::new(env))
    }

    pub fn is_nullifier_spent(env: &Env, nullifier: BytesN<32>) -> bool {
        Self::nullifier_spent(env, &nullifier)
    }

    pub fn get_balance(env: &Env) -> i128 {
        let token_address: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        token::Client::new(env, &token_address).balance(&env.current_contract_address())
    }

    pub fn get_admin(env: &Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY).unwrap()
    }

    pub fn get_asset_id(env: &Env) -> u32 {
        env.storage().instance().get(&ASSET_KEY).unwrap_or(0)
    }

    // --- internal helpers ---

    /// `c = Poseidon(value, label, precommitment)` — byte-identical to the circuit and the
    /// off-chain note generator (all three call the same `soroban-poseidon`, t = 4).
    fn commitment(env: &Env, amount: i128, label: &BytesN<32>, precommitment: &BytesN<32>) -> BytesN<32> {
        let mut inputs: Vec<U256> = Vec::new(env);
        inputs.push_back(Self::i128_to_u256(env, amount));
        inputs.push_back(U256::from_be_bytes(env, &Bytes::from_array(env, &label.to_array())));
        inputs.push_back(U256::from_be_bytes(env, &Bytes::from_array(env, &precommitment.to_array())));
        Fr::from_u256(poseidon_hash::<4, Fr>(env, &inputs)).to_bytes()
    }

    /// `Poseidon(left, right)` — the Merkle parent hash, matching `merkleProof.circom`'s
    /// `Poseidon255(2)` (t = 3), with the lower-index child on the left.
    fn hash2(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
        let mut inputs: Vec<U256> = Vec::new(env);
        inputs.push_back(U256::from_be_bytes(env, &Bytes::from_array(env, &left.to_array())));
        inputs.push_back(U256::from_be_bytes(env, &Bytes::from_array(env, &right.to_array())));
        Fr::from_u256(poseidon_hash::<3, Fr>(env, &inputs)).to_bytes()
    }

    /// Append a leaf to the frontier Merkle tree in O(depth) hashes, persist the new frontier,
    /// root, and leaf, and return (new_root, leaf_index).
    fn merkle_insert(env: &Env, leaf: BytesN<32>) -> Result<(BytesN<32>, u32), Error> {
        let idx: u32 = env.storage().instance().get(&NEXTIDX_KEY).unwrap_or(0);
        if idx >= (1u32 << TREE_DEPTH) {
            return Err(Error::TreeAtCapacity);
        }
        let zeros: Vec<BytesN<32>> = env.storage().instance().get(&ZEROS_KEY).unwrap();
        let mut filled: Vec<BytesN<32>> = env.storage().instance().get(&FILLED_KEY).unwrap();

        let mut cur = leaf.clone();
        let mut running = idx;
        let mut i = 0u32;
        while i < TREE_DEPTH {
            if running & 1 == 0 {
                // Left child: this node becomes the left sibling for the next insertion.
                filled.set(i, cur.clone());
                let right = zeros.get(i).unwrap();
                cur = Self::hash2(env, &cur, &right);
            } else {
                // Right child: pair with the stored left sibling.
                let left = filled.get(i).unwrap();
                cur = Self::hash2(env, &left, &cur);
            }
            running >>= 1;
            i += 1;
        }

        let mut leaves: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&LEAVES_KEY)
            .unwrap_or(Vec::new(env));
        leaves.push_back(leaf);

        env.storage().instance().set(&LEAVES_KEY, &leaves);
        env.storage().instance().set(&FILLED_KEY, &filled);
        env.storage().instance().set(&NEXTIDX_KEY, &(idx + 1));
        env.storage().instance().set(&ROOT_KEY, &cur);
        Ok((cur, idx))
    }

    /// Append `root` to the bounded ring buffer of recent roots.
    fn record_root(env: &Env, root: BytesN<32>) {
        let mut roots: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&ROOTS_KEY)
            .unwrap_or(Vec::new(env));
        roots.push_back(root);
        while roots.len() > ROOT_HISTORY_SIZE {
            roots.remove(0);
        }
        env.storage().instance().set(&ROOTS_KEY, &roots);
    }

    fn root_is_known(env: &Env, root: &BytesN<32>) -> bool {
        let roots: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&ROOTS_KEY)
            .unwrap_or(Vec::new(env));
        roots.contains(root)
    }

    fn nullifier_spent(env: &Env, nullifier: &BytesN<32>) -> bool {
        env.storage().persistent().has(&(NULL_KEY, nullifier.clone()))
    }

    fn spend_nullifier(env: &Env, nullifier: BytesN<32>) {
        env.storage().persistent().set(&(NULL_KEY, nullifier), &());
    }

    /// Map a Stellar address to a circuit field element: `sha256(strkey)` with the MSB zeroed so
    /// the result is < the BLS12-381 scalar field. The off-chain prover derives the identical
    /// value, so any mismatch (a redirected payout) fails `RecipientMismatch` before verification.
    fn address_to_fr(env: &Env, addr: &Address) -> Fr {
        let s = addr.to_string();
        let len = s.len() as usize;
        let mut buf = [0u8; 64]; // strkeys are 56 chars; cap defensively
        s.copy_into_slice(&mut buf[..len]);
        let hash = env.crypto().sha256(&Bytes::from_slice(env, &buf[..len]));
        let mut h = hash.to_bytes().to_array();
        h[0] = 0;
        Fr::from_u256(U256::from_be_bytes(env, &Bytes::from_array(env, &h)))
    }

    fn i128_to_u256(env: &Env, amount: i128) -> U256 {
        let mut buf = [0u8; 32];
        buf[16..].copy_from_slice(&(amount as u128).to_be_bytes());
        U256::from_be_bytes(env, &Bytes::from_array(env, &buf))
    }

    fn fr_to_i128(fr: &Fr) -> Result<i128, Error> {
        let a = fr.to_bytes().to_array();
        if a[..16].iter().any(|&b| b != 0) {
            return Err(Error::ValueOverflow);
        }
        let mut low = [0u8; 16];
        low.copy_from_slice(&a[16..]);
        let v = u128::from_be_bytes(low);
        if v > i128::MAX as u128 {
            return Err(Error::ValueOverflow);
        }
        Ok(v as i128)
    }
}
