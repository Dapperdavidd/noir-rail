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
//! - **Root-history ring buffer.** A proof anchored to a recent root stays valid as the tree
//!   grows, instead of going stale on the very next deposit.
//! - **Nullifier map** (O(1) membership) instead of a linearly-scanned vector.
//! - **Recipient binding** (frontrunning fix). The recipient is a public input bound inside the
//!   circuit; the contract checks the proof's recipient signal equals the actual payout address,
//!   so a watcher who copies a pending proof cannot redirect the funds.
//! - **Typed `Result` errors** on the settlement path.

extern crate alloc;

use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, token,
    crypto::bls12_381::Fr,
    Address, Bytes, BytesN, Env, Symbol, U256, Vec,
};

use lean_imt::{LeanIMT, TREE_DEPTH_KEY, TREE_LEAVES_KEY, TREE_ROOT_KEY};
use soroban_poseidon::poseidon_hash;
use zk::{Groth16Verifier, Proof, PublicSignals, VerificationKey};

#[cfg(test)]
mod test;

/// Depth of the commitment tree. 2^20 ≈ 1,048,576 notes per pool.
const TREE_DEPTH: u32 = 20;
/// Number of recent roots retained so in-flight proofs survive concurrent deposits.
const ROOT_HISTORY_SIZE: u32 = 32;

// --- storage keys ---
const ADMIN_KEY: Symbol = symbol_short!("admin");
const VK_KEY: Symbol = symbol_short!("vk");
const TOKEN_KEY: Symbol = symbol_short!("token");
const ASSET_KEY: Symbol = symbol_short!("asset");
const NULL_KEY: Symbol = symbol_short!("null");
const ROOTS_KEY: Symbol = symbol_short!("roots");

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
}

#[contract]
pub struct ShieldedPool;

#[contractimpl]
impl ShieldedPool {
    /// Wires the pool to its verification key, its underlying SAC, an admin, and the asset id
    /// it serves. The verification key is pinned at deploy and is never caller-supplied
    /// thereafter — settlement always verifies against this exact key.
    pub fn __constructor(
        env: &Env,
        vk_bytes: Bytes,
        token_address: Address,
        admin: Address,
        asset_id: u32,
    ) {
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&VK_KEY, &vk_bytes);
        env.storage().instance().set(&TOKEN_KEY, &token_address);
        env.storage().instance().set(&ASSET_KEY, &asset_id);

        // Empty commitment tree.
        let tree = LeanIMT::new(env, TREE_DEPTH);
        let (leaves, depth, root) = tree.to_storage();
        env.storage().instance().set(&TREE_LEAVES_KEY, &leaves);
        env.storage().instance().set(&TREE_DEPTH_KEY, &depth);
        env.storage().instance().set(&TREE_ROOT_KEY, &root);

        // Seed the root history with the empty root.
        let mut roots: Vec<BytesN<32>> = Vec::new(env);
        roots.push_back(root);
        env.storage().instance().set(&ROOTS_KEY, &roots);
    }

    /// **Shield.** Deposit `amount` of the pool's token and append the note commitment.
    ///
    /// The caller supplies the public parts of the note — its `label` (pool scope ‖ nonce) and
    /// its `precommitment` (= Poseidon(nullifier, secret)) — and the *transparent* `amount`.
    /// The contract recomputes the leaf `c = Poseidon(amount, label, precommitment)` itself,
    /// using the same Poseidon as the circuit, so the hidden note value provably equals the
    /// tokens actually escrowed. The owner-identifying parts (nullifier, secret) never appear.
    ///
    /// Returns the leaf index of the new commitment.
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

        // Escrow the underlying asset.
        let token_address: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        let token_client = token::Client::new(env, &token_address);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        // Bind value into the commitment by recomputing the leaf on-chain.
        let leaf = Self::commitment(env, amount, &label, &precommitment);

        let (new_root, leaf_index) = Self::append_commitment(env, leaf)?;
        Self::record_root(env, new_root);
        Ok(leaf_index)
    }

    /// **Unshield.** Release `withdrawnValue` of the token to `to`, against a valid spend proof.
    ///
    /// Public signals, in circuit order: `[nullifierHash, withdrawnValue, stateRoot, recipient]`.
    /// The flow is: anchor to a known root, enforce recipient binding, reject a reused nullifier,
    /// verify the single Groth16 proof, then commit (spend the nullifier, pay out).
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

        // 1. The proof must anchor to a root we published recently.
        let state_root = state_root_fr.to_bytes();
        if !Self::root_is_known(env, &state_root) {
            return Err(Error::StaleRoot);
        }

        // 2. Recipient binding: the proof's recipient must be the actual payout address.
        let expected_recipient = Self::address_to_fr(env, &to);
        if recipient_fr != expected_recipient {
            return Err(Error::RecipientMismatch);
        }

        // 3. No nullifier may be reused.
        let nullifier = nullifier_hash.to_bytes();
        if Self::nullifier_spent(env, &nullifier) {
            return Err(Error::NullifierUsed);
        }

        // 4. Verify exactly one Groth16 proof against the pinned key.
        let vk_bytes: Bytes = env.storage().instance().get(&VK_KEY).unwrap();
        let vk = VerificationKey::from_bytes(env, &vk_bytes).map_err(|_| Error::BadProof)?;
        let proof = Proof::from_bytes(env, &proof_bytes);
        let ok = Groth16Verifier::verify_proof(env, vk, proof, &pub_signals.pub_signals)
            .map_err(|_| Error::BadProof)?;
        if !ok {
            return Err(Error::BadProof);
        }

        // 5. Commit. Convert the field-element amount back to a token amount and pay out.
        let amount = Self::fr_to_i128(env, &withdrawn_value_fr)?;
        let token_address: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        let token_client = token::Client::new(env, &token_address);
        if token_client.balance(&env.current_contract_address()) < amount {
            return Err(Error::InsufficientBalance);
        }

        Self::spend_nullifier(env, nullifier);
        token_client.transfer(&env.current_contract_address(), &to, &amount);
        Ok(())
    }

    // --- views ---

    pub fn get_merkle_root(env: &Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&TREE_ROOT_KEY)
            .unwrap_or(BytesN::from_array(env, &[0u8; 32]))
    }

    pub fn get_root_history(env: &Env) -> Vec<BytesN<32>> {
        env.storage().instance().get(&ROOTS_KEY).unwrap_or(Vec::new(env))
    }

    pub fn get_commitment_count(env: &Env) -> u32 {
        let leaves: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&TREE_LEAVES_KEY)
            .unwrap_or(Vec::new(env));
        leaves.len()
    }

    pub fn get_commitments(env: &Env) -> Vec<BytesN<32>> {
        env.storage()
            .instance()
            .get(&TREE_LEAVES_KEY)
            .unwrap_or(Vec::new(env))
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

    /// `c = Poseidon(value, label, precommitment)` — byte-identical to the circuit and to the
    /// off-chain note generator, because all three call the same `soroban-poseidon`.
    fn commitment(env: &Env, amount: i128, label: &BytesN<32>, precommitment: &BytesN<32>) -> BytesN<32> {
        let value_u = Self::i128_to_u256(env, amount);
        let label_u = U256::from_be_bytes(env, &Bytes::from_array(env, &label.to_array()));
        let pre_u = U256::from_be_bytes(env, &Bytes::from_array(env, &precommitment.to_array()));

        let mut inputs: Vec<U256> = Vec::new(env);
        inputs.push_back(value_u);
        inputs.push_back(label_u);
        inputs.push_back(pre_u);

        // 3 inputs → state size t = 4.
        let out = poseidon_hash::<4, Fr>(env, &inputs);
        Fr::from_u256(out).to_bytes()
    }

    fn append_commitment(env: &Env, leaf: BytesN<32>) -> Result<(BytesN<32>, u32), Error> {
        let leaves: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&TREE_LEAVES_KEY)
            .unwrap_or(Vec::new(env));
        let depth: u32 = env.storage().instance().get(&TREE_DEPTH_KEY).unwrap_or(0);
        let root: BytesN<32> = env
            .storage()
            .instance()
            .get(&TREE_ROOT_KEY)
            .unwrap_or(BytesN::from_array(env, &[0u8; 32]));

        let mut tree = LeanIMT::from_storage(env, leaves, depth, root);
        tree.insert(leaf).map_err(|_| Error::TreeAtCapacity)?;
        let leaf_index = tree.get_leaf_count() - 1;

        let (new_leaves, new_depth, new_root) = tree.to_storage();
        env.storage().instance().set(&TREE_LEAVES_KEY, &new_leaves);
        env.storage().instance().set(&TREE_DEPTH_KEY, &new_depth);
        env.storage().instance().set(&TREE_ROOT_KEY, &new_root);
        Ok((new_root, leaf_index))
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
        // Stellar strkeys are 56 chars; cap defensively.
        let mut buf = [0u8; 64];
        s.copy_into_slice(&mut buf[..len]);
        let bytes = Bytes::from_slice(env, &buf[..len]);
        let hash = env.crypto().sha256(&bytes);
        let mut h = hash.to_bytes().to_array();
        h[0] = 0; // ensure < field modulus
        Fr::from_u256(U256::from_be_bytes(env, &Bytes::from_array(env, &h)))
    }

    fn i128_to_u256(env: &Env, amount: i128) -> U256 {
        // amount is validated non-negative by callers.
        let mut buf = [0u8; 32];
        let amt = (amount as u128).to_be_bytes();
        buf[16..].copy_from_slice(&amt);
        U256::from_be_bytes(env, &Bytes::from_array(env, &buf))
    }

    fn fr_to_i128(env: &Env, fr: &Fr) -> Result<i128, Error> {
        let _ = env;
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
