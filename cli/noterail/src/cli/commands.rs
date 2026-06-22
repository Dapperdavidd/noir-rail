use crate::{
    crypto::coin::generate_coin,
    error::Result,
    io::{FileManager, SerializationManager},
    merkle::association::AssociationManager,
    merkle::withdrawal::WithdrawalManager,
};
use log::{debug, info};
use soroban_sdk::Env;

/// Command handler for processing CLI commands
pub struct CommandHandler {
    file_manager: FileManager,
    serialization_manager: SerializationManager,
    withdrawal_manager: WithdrawalManager,
    association_manager: AssociationManager,
}

impl CommandHandler {
    pub fn new() -> Self {
        Self {
            file_manager: FileManager::new(),
            serialization_manager: SerializationManager::new(),
            withdrawal_manager: WithdrawalManager::new(),
            association_manager: AssociationManager::new(),
        }
    }

    /// Handle the generate command
    pub fn handle_generate(&self, scope: String, value: Option<i128>, output: String) -> Result<()> {
        info!("Generating note with scope: {}", scope);
        debug!("Output file: {}", output);

        let env = Env::default();
        env.cost_estimate().budget().reset_unlimited();

        let generated_coin = match value {
            Some(v) => crate::crypto::coin::generate_coin_with_value(&env, scope.as_bytes(), v),
            None => generate_coin(&env, scope.as_bytes()),
        };

        self.file_manager.write_coin_file(&generated_coin, &output)?;
        info!("Note saved to: {}", output);

        println!("Generated note:");
        println!("  Value: {}", generated_coin.coin.value);
        println!("  Label (hex): {}", generated_coin.label_hex);
        println!("  Precommitment (hex): {}", generated_coin.precommitment_hex);
        println!("  Commitment (hex): {}", generated_coin.commitment_hex);
        println!("  Saved to: {}", output);

        Ok(())
    }

    /// Handle the withdraw command
    pub fn handle_withdraw(
        &self,
        coin_file: String,
        state_file: String,
        recipient: String,
        output: String,
    ) -> Result<()> {
        info!("Processing withdrawal for note: {}", coin_file);
        debug!("State file: {}", state_file);
        debug!("Recipient: {}", recipient);
        debug!("Output file: {}", output);

        let env = Env::default();
        env.cost_estimate().budget().reset_unlimited();

        let existing_coin = self.file_manager.read_coin_file(&coin_file)?;
        let state_data = self.file_manager.read_state_file(&state_file)?;

        // Map the recipient address to the bound field element (matches the contract).
        let recipient_field =
            crate::crypto::conversions::address_to_recipient_field(&recipient);

        let snark_input = self.withdrawal_manager.withdraw_coin(
            &env,
            &existing_coin.coin,
            &state_data,
            recipient_field,
        )?;

        let withdrawal_json = self
            .serialization_manager
            .serialize_snark_input(&snark_input)?;
        std::fs::write(&output, withdrawal_json)?;
        info!("Withdrawal data saved to: {}", output);

        println!("Withdrawal created:");
        println!("  Withdrawn value: {}", snark_input.withdrawn_value);
        println!("  State root: {}", snark_input.state_root);
        println!("  Recipient field: {}", snark_input.recipient);
        println!("  Commitment index: {}", snark_input.state_index);
        println!("  Snark input saved to: {}", output);

        Ok(())
    }

    /// Handle the updateAssociation command
    pub fn handle_update_association(&self, association_file: String, label: String) -> Result<()> {
        info!("Updating association set: {}", association_file);
        debug!("Adding label: {}", label);

        let env = Env::default();
        env.cost_estimate().budget().reset_unlimited();

        self.association_manager
            .update_association_set(&env, &association_file, &label)?;
        info!("Association set updated successfully");

        println!("Association set updated successfully");
        Ok(())
    }
}

impl Default for CommandHandler {
    fn default() -> Self {
        Self::new()
    }
}
