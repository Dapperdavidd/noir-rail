use crate::error::{CoinUtilsError, Result};
use num_bigint::BigUint;
use sha2::{Digest, Sha256};
use soroban_sdk::{crypto::bls12_381::Fr as BlsScalar, BytesN, Env};

/// Convert a decimal string to a BlsScalar (full 256-bit range, no truncation).
pub fn decimal_string_to_bls_scalar(env: &Env, decimal_str: &str) -> Result<BlsScalar> {
    let biguint = decimal_str
        .parse::<BigUint>()
        .map_err(|_| CoinUtilsError::InvalidDecimal(decimal_str.to_string()))?;
    let be = biguint.to_bytes_be();
    if be.len() > 32 {
        return Err(CoinUtilsError::InvalidByteLength(be.len()));
    }
    let mut byte_array = [0u8; 32];
    byte_array[32 - be.len()..].copy_from_slice(&be);
    Ok(BlsScalar::from_bytes(BytesN::from_array(env, &byte_array)))
}

/// Map a Stellar address (strkey) to the circuit's `recipient` field element.
///
/// Must match the contract's `address_to_fr`: `sha256(strkey)` with the most-significant byte
/// zeroed so the value is < the BLS12-381 scalar field. Returned as a decimal field string.
pub fn address_to_recipient_field(address: &str) -> String {
    let mut h = Sha256::digest(address.as_bytes());
    h[0] = 0;
    BigUint::from_bytes_be(&h).to_str_radix(10)
}

/// Convert BlsScalar to decimal string
pub fn bls_scalar_to_decimal_string(scalar: &BlsScalar) -> String {
    let array = scalar.to_bytes().to_array();
    bytes_to_decimal_string(&array)
}

/// Convert bytes to decimal string using num-bigint for efficient conversion
pub fn bytes_to_decimal_string(bytes: &[u8; 32]) -> String {
    let biguint = BigUint::from_bytes_be(bytes);
    biguint.to_str_radix(10)
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, U256};

    #[test]
    fn test_decimal_to_bls_scalar_conversion() {
        let env = Env::default();
        let decimal_str = "123456789";
        let result = decimal_string_to_bls_scalar(&env, decimal_str);
        assert!(result.is_ok());
    }

    #[test]
    fn test_bls_scalar_to_decimal_conversion() {
        let env = Env::default();
        let scalar = BlsScalar::from_u256(U256::from_u32(&env, 123456789));
        let result = bls_scalar_to_decimal_string(&scalar);
        assert_eq!(result, "123456789");
    }

    #[test]
    fn test_invalid_decimal_character() {
        let env = Env::default();
        let decimal_str = "123abc456";
        let result = decimal_string_to_bls_scalar(&env, decimal_str);
        assert!(result.is_err());
    }
}
