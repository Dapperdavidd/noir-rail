use crate::{
    config::TREE_DEPTH,
    crypto::{coin::generate_commitment, conversions::*},
    error::{CoinUtilsError, Result},
    types::{CoinData, SnarkInput, StateFile},
};
use lean_imt::LeanIMT;
use soroban_sdk::{crypto::bls12_381::Fr as BlsScalar, Env};

/// Builds the SNARK witness input for unshielding a note.
pub struct WithdrawalManager;

impl WithdrawalManager {
    pub fn new() -> Self {
        Self
    }

    /// Build the witness input for a full unshield of `coin` to `recipient_field`.
    ///
    /// The state tree is reconstructed from the pool's commitment list (as seen by the indexer)
    /// using the same LeanIMT + Poseidon as the contract, so the resulting Merkle path verifies
    /// against the on-chain root. `recipient_field` is the address mapped via
    /// [`address_to_recipient_field`], identical to the contract's `address_to_fr`.
    pub fn withdraw_coin(
        &self,
        env: &Env,
        coin: &CoinData,
        state_file: &StateFile,
        recipient_field: String,
    ) -> Result<SnarkInput> {
        let value = decimal_string_to_bls_scalar(env, &coin.value)?;
        let nullifier = decimal_string_to_bls_scalar(env, &coin.nullifier)?;
        let secret = decimal_string_to_bls_scalar(env, &coin.secret)?;
        let label = decimal_string_to_bls_scalar(env, &coin.label)?;

        // Reconstruct our commitment so we can locate it in the tree.
        let commitment = generate_commitment(
            env,
            value.clone(),
            label.clone(),
            nullifier.clone(),
            secret.clone(),
        );

        // Rebuild the state tree from the published commitments.
        let mut tree = LeanIMT::new(env, TREE_DEPTH);
        let mut commitment_index = None;
        for (index, commitment_str) in state_file.commitments.iter().enumerate() {
            let commitment_fr = decimal_string_to_bls_scalar(env, commitment_str).map_err(|e| {
                CoinUtilsError::InvalidDecimal(format!("Invalid commitment at index {}: {}", index, e))
            })?;
            let commitment_bytes = lean_imt::bls_scalar_to_bytes(commitment_fr.clone());
            tree.insert(commitment_bytes)?;
            if commitment_fr == commitment {
                commitment_index = Some(index);
            }
        }
        let commitment_index = commitment_index.ok_or(CoinUtilsError::CommitmentNotFound)?;

        // Merkle inclusion path for our leaf.
        let (siblings_scalars, _depth) = tree
            .generate_proof(commitment_index as u32)
            .ok_or(CoinUtilsError::ProofGenerationFailed)?;
        let siblings: Vec<BlsScalar> = siblings_scalars.iter().map(|s| s.clone()).collect();
        let root_scalar = lean_imt::bytes_to_bls_scalar(&tree.get_root());

        Ok(SnarkInput {
            // Full withdrawal: the publicly released amount equals the note's value.
            withdrawn_value: bls_scalar_to_decimal_string(&value),
            label: bls_scalar_to_decimal_string(&label),
            value: bls_scalar_to_decimal_string(&value),
            nullifier: bls_scalar_to_decimal_string(&nullifier),
            secret: bls_scalar_to_decimal_string(&secret),
            state_root: bls_scalar_to_decimal_string(&root_scalar),
            state_index: commitment_index.to_string(),
            state_siblings: siblings
                .into_iter()
                .map(|s| bls_scalar_to_decimal_string(&s))
                .collect(),
            recipient: recipient_field,
        })
    }
}

impl Default for WithdrawalManager {
    fn default() -> Self {
        Self::new()
    }
}
