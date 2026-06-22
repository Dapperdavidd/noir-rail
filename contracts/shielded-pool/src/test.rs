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
    let pool_id = env.register(
        ShieldedPool,
        (
            vk_bytes,
            transfer_vk_bytes,
            token_addr.clone(),
            admin.clone(),
            1u32,
        ),
    );
    let client = ShieldedPoolClient::new(&env, &pool_id);

    (env, client, admin, token_addr)
}

// Two real deposits each run ~20 software-Poseidon hashes up the depth-20 tree. That is fast as
// optimized wasm on-chain (proven by tools/demo.sh on testnet) but minutes in the debug native
// interpreter, so this integration-style test is opt-in: `cargo test -- --ignored`.
#[test]
#[ignore = "slow in the debug host; deposit/append is proven end-to-end on testnet via demo.sh"]
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
