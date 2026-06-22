use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "noterail")]
#[command(about = "NoirRail note utilities — generate notes and build withdrawal witnesses")]
#[command(version = "0.1.0")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Generate a new shielded note for a pool scope.
    Generate {
        /// Pool scope (e.g. the asset symbol or pool id).
        scope: String,
        /// Note value in token base units (defaults to the dev value).
        #[arg(short, long)]
        value: Option<i128>,
        /// Output file path.
        #[arg(short, long, default_value = "coin.json")]
        output: String,
    },
    /// Build the SNARK witness input to unshield a note to a recipient address.
    Withdraw {
        /// Note file (from `generate`).
        coin_file: String,
        /// State file: the pool's published commitment list.
        state_file: String,
        /// Recipient Stellar address (G… or C…); bound into the proof.
        recipient: String,
        /// Output file path.
        #[arg(short, long, default_value = "withdrawal.json")]
        output: String,
    },
    /// Add a label to an association set (Phase 2 compliance; unused by the Phase 0 withdraw).
    UpdateAssociation {
        /// Association set file path.
        association_file: String,
        /// Label to add.
        label: String,
    },
}

impl Cli {
    pub fn parse() -> Self {
        <Self as clap::Parser>::parse()
    }
}
