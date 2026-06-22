use crate::{
    config::COIN_VALUE,
    crypto::{poseidon_hash, random_fr},
    types::{CoinData, GeneratedCoin},
};
use rand::{thread_rng, Rng};
use soroban_sdk::{crypto::bls12_381::Fr as BlsScalar, Bytes, Env, U256};

/// Generate a label for a coin based on scope and nonce
pub fn generate_label(env: &Env, scope: &[u8], nonce: &[u8; 32]) -> BlsScalar {
    // Convert scope and nonce to field elements for Poseidon hashing
    // Use only lower 31 bytes to ensure values are within BLS12-381 scalar field modulus
    let scope_fr = BlsScalar::from_u256({
        let mut bytes = [0u8; 32];
        let len = scope.len().min(31);
        // Place scope bytes in lower positions (big-endian U256, so pad at start)
        bytes[32 - len..].copy_from_slice(&scope[..len]);
        U256::from_be_bytes(env, &Bytes::from_slice(env, &bytes))
    });
    let nonce_fr = BlsScalar::from_u256({
        // Zero MSB and take the last 31 bytes of nonce to stay within field modulus
        let mut bytes = [0u8; 32];
        bytes[1..].copy_from_slice(&nonce[1..]);
        U256::from_be_bytes(env, &Bytes::from_slice(env, &bytes))
    });

    // Hash using Poseidon
    poseidon_hash(env, &[scope_fr, nonce_fr])
}

/// Generate a commitment for a coin
pub fn generate_commitment(
    env: &Env,
    value: BlsScalar,
    label: BlsScalar,
    nullifier: BlsScalar,
    secret: BlsScalar,
) -> BlsScalar {
    let precommitment = poseidon_hash(env, &[nullifier, secret]);
    poseidon_hash(env, &[value, label, precommitment])
}

/// Generate a complete coin (note) for a pool scope with the default value.
pub fn generate_coin(env: &Env, scope: &[u8]) -> GeneratedCoin {
    generate_coin_with_value(env, scope, COIN_VALUE)
}

/// Generate a complete coin (note) for a pool scope with an arbitrary value (in token base units).
pub fn generate_coin_with_value(env: &Env, scope: &[u8], value_units: i128) -> GeneratedCoin {
    use crate::crypto::conversions::{bls_scalar_to_decimal_string, decimal_string_to_bls_scalar};

    let value = decimal_string_to_bls_scalar(env, &value_units.to_string())
        .expect("value fits the scalar field");
    let nullifier = random_fr(env);
    let secret = random_fr(env);
    let nonce = thread_rng().gen::<[u8; 32]>();
    let label = generate_label(env, scope, &nonce);

    // precommitment = Poseidon(nullifier, secret); commitment = Poseidon(value, label, precommitment).
    let precommitment = poseidon_hash(env, &[nullifier.clone(), secret.clone()]);
    let commitment = poseidon_hash(env, &[value.clone(), label.clone(), precommitment.clone()]);

    let hexify = |s: &BlsScalar| format!("0x{}", hex::encode(s.to_bytes().to_array()));

    let coin_data = CoinData {
        value: bls_scalar_to_decimal_string(&value),
        nullifier: bls_scalar_to_decimal_string(&nullifier),
        secret: bls_scalar_to_decimal_string(&secret),
        label: bls_scalar_to_decimal_string(&label),
        precommitment: bls_scalar_to_decimal_string(&precommitment),
        commitment: bls_scalar_to_decimal_string(&commitment),
    };

    GeneratedCoin {
        coin: coin_data,
        commitment_hex: hexify(&commitment),
        label_hex: hexify(&label),
        precommitment_hex: hexify(&precommitment),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_label() {
        let env = Env::default();
        let scope = b"test_scope";
        let nonce = [1u8; 32];
        let result = generate_label(&env, scope, &nonce);
        // Just verify it doesn't panic and returns a valid scalar
        assert!(result.to_bytes().to_array().iter().any(|&x| x != 0));
    }

    #[test]
    fn test_generate_commitment() {
        let env = Env::default();
        let value = BlsScalar::from_u256(U256::from_u32(&env, 100));
        let label = BlsScalar::from_u256(U256::from_u32(&env, 200));
        let nullifier = BlsScalar::from_u256(U256::from_u32(&env, 300));
        let secret = BlsScalar::from_u256(U256::from_u32(&env, 400));

        let result = generate_commitment(&env, value, label, nullifier, secret);
        // Just verify it doesn't panic and returns a valid scalar
        assert!(result.to_bytes().to_array().iter().any(|&x| x != 0));
    }

    #[test]
    fn test_generate_coin() {
        let env = Env::default();
        let scope = b"test_scope";
        let result = generate_coin(&env, scope);

        // Verify the coin has all required fields
        assert!(!result.coin.value.is_empty());
        assert!(!result.coin.nullifier.is_empty());
        assert!(!result.coin.secret.is_empty());
        assert!(!result.coin.label.is_empty());
        assert!(!result.coin.commitment.is_empty());
        assert!(result.commitment_hex.starts_with("0x"));
    }
}
