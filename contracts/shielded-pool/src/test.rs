#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::StellarAssetClient,
    Address, Bytes, BytesN, Env,
};

fn setup() -> (Env, ShieldedPoolClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    // On-chain Poseidon + the Merkle insert exceed the small default unit-test budget;
    // the real testnet per-tx budget is far larger (the reference deposit, which also hashes
    // up the tree, settles on testnet). Lift the cap for the sandbox.
    env.cost_estimate().budget().reset_unlimited();

    let admin = Address::generate(&env);

    // A Stellar Asset Contract to act as the pool's underlying token.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();

    // Deploy the pool. The verification key is irrelevant to the deposit path, so an empty
    // blob is fine here; withdraw is exercised end-to-end on testnet with a real key.
    let vk_bytes = Bytes::new(&env);
    let transfer_vk_bytes = Bytes::new(&env);
    let membership_vk_bytes = Bytes::new(&env);
    let approval_root = BytesN::from_array(&env, &[0u8; 32]);
    let pool_id = env.register(
        ShieldedPool,
        (
            vk_bytes,
            transfer_vk_bytes,
            token_addr.clone(),
            admin.clone(),
            1u32,
            membership_vk_bytes,
            approval_root,
        ),
    );
    let client = ShieldedPoolClient::new(&env, &pool_id);

    (env, client, admin, token_addr)
}

// With the frontier tree each deposit is O(depth) hashes, so two deposits run quickly even in the
// debug native interpreter.
#[test]
fn deposit_escrows_and_appends_commitment() {
    let (env, client, _admin, token_addr) = setup();

    let user = Address::generate(&env);
    StellarAssetClient::new(&env, &token_addr).mint(&user, &10_000_000_000i128);

    assert_eq!(client.get_commitment_count(), 0);
    assert_eq!(client.get_balance(), 0);

    let label = BytesN::from_array(&env, &[7u8; 32]);
    let precommitment = BytesN::from_array(&env, &[9u8; 32]);
    let idx = client.deposit(&user, &2_500_000_000i128, &label, &precommitment);

    assert_eq!(idx, 0);
    assert_eq!(client.get_commitment_count(), 1);
    assert_eq!(client.get_balance(), 2_500_000_000i128);

    // The newest root is recorded in the history window.
    let root = client.get_merkle_root();
    assert!(client.get_root_history().contains(&root));

    // A second deposit advances the tree and the index.
    let idx2 = client.deposit(
        &user,
        &1_000_000_000i128,
        &BytesN::from_array(&env, &[1u8; 32]),
        &BytesN::from_array(&env, &[2u8; 32]),
    );
    assert_eq!(idx2, 1);
    assert_eq!(client.get_commitment_count(), 2);
    assert_eq!(client.get_balance(), 3_500_000_000i128);
}

#[test]
fn deposit_rejects_non_positive_amount() {
    let (env, client, _admin, token_addr) = setup();
    let user = Address::generate(&env);
    StellarAssetClient::new(&env, &token_addr).mint(&user, &10_000_000_000i128);

    let label = BytesN::from_array(&env, &[7u8; 32]);
    let precommitment = BytesN::from_array(&env, &[9u8; 32]);
    let res = client.try_deposit(&user, &0i128, &label, &precommitment);
    assert_eq!(res, Err(Ok(Error::NonPositiveAmount)));
}

// --- on-chain selective-disclosure (set-membership) verification ---
//
// Fixtures in src/fixtures/ are produced by a real membership proof (see the SDK + circuit). The
// Soroban test env executes the genuine BLS12-381 host functions, so these exercise the actual
// on-chain pairing, not a mock.

const MVK: &[u8] = include_bytes!("fixtures/mvk.bin");
const PROOF: &[u8] = include_bytes!("fixtures/proof.bin");
const PUB: &[u8] = include_bytes!("fixtures/pub.bin");
const APPROOT: &[u8; 32] = include_bytes!("fixtures/approot.bin");
const DEPOSITS: &[u8] = include_bytes!("fixtures/deposits.bin"); // [value(16) ‖ label(32) ‖ precommit(32)] × 2

fn membership_setup(approot: [u8; 32]) -> (Env, ShieldedPoolClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    env.cost_estimate().budget().reset_unlimited();
    let admin = Address::generate(&env);
    let token_addr = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let pool_id = env.register(
        ShieldedPool,
        (
            Bytes::new(&env),
            Bytes::new(&env),
            token_addr.clone(),
            admin.clone(),
            1u32,
            Bytes::from_slice(&env, MVK),
            BytesN::from_array(&env, &approot),
        ),
    );
    (env.clone(), ShieldedPoolClient::new(&env, &pool_id), token_addr)
}

/// Recreate, on-chain, the exact pool tree the proof was built against, so its state root is known.
fn seed_pool(env: &Env, client: &ShieldedPoolClient, token_addr: &Address) {
    let user = Address::generate(env);
    StellarAssetClient::new(env, token_addr).mint(&user, &1_000_000_000i128);
    for i in 0..2usize {
        let o = i * 80;
        let mut v = [0u8; 16];
        v.copy_from_slice(&DEPOSITS[o..o + 16]);
        let value = u128::from_be_bytes(v) as i128;
        let mut label = [0u8; 32];
        label.copy_from_slice(&DEPOSITS[o + 16..o + 48]);
        let mut pre = [0u8; 32];
        pre.copy_from_slice(&DEPOSITS[o + 48..o + 80]);
        client.deposit(&user, &value, &BytesN::from_array(env, &label), &BytesN::from_array(env, &pre));
    }
}

#[test]
fn verify_membership_accepts_a_real_proof() {
    let (env, client, token_addr) = membership_setup(*APPROOT);
    seed_pool(&env, &client, &token_addr);
    // Runs the real on-chain Groth16 / BLS12-381 verification; panics on any error.
    client.verify_membership(&Bytes::from_slice(&env, PROOF), &Bytes::from_slice(&env, PUB));
}

#[test]
fn verify_membership_rejects_an_unanchored_state_root() {
    // Correct allow-list + key, but the pool is empty, so the proof's state root is unknown.
    let (env, client, _token) = membership_setup(*APPROOT);
    let res = client.try_verify_membership(&Bytes::from_slice(&env, PROOF), &Bytes::from_slice(&env, PUB));
    assert_eq!(res, Err(Ok(Error::StaleRoot)));
}

#[test]
fn verify_membership_rejects_an_unrecognised_allow_list() {
    // Anchored state root, but an allow-list root that is neither pinned nor a known pool root.
    // PUB layout: [count u32][stateRoot 32][approvalRoot 32]; corrupt a byte of the approvalRoot.
    let (env, client, token_addr) = membership_setup(*APPROOT);
    seed_pool(&env, &client, &token_addr);
    let mut pb = [0u8; 68];
    pb.copy_from_slice(PUB);
    pb[40] ^= 0x55;
    let res = client.try_verify_membership(&Bytes::from_slice(&env, PROOF), &Bytes::from_slice(&env, &pb));
    assert_eq!(res, Err(Ok(Error::ApprovalRootMismatch)));
}

#[test]
fn commitment_is_deterministic_for_same_inputs() {
    // The on-chain leaf hash must be a pure function of (amount, label, precommitment).
    let (env, _c, _a, _t) = setup();
    let label = BytesN::from_array(&env, &[3u8; 32]);
    let pre = BytesN::from_array(&env, &[4u8; 32]);
    let a = ShieldedPool::commitment(&env, 100, &label, &pre);
    let b = ShieldedPool::commitment(&env, 100, &label, &pre);
    let c = ShieldedPool::commitment(&env, 101, &label, &pre);
    assert_eq!(a, b);
    assert_ne!(a, c);
}

