use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct CoinData {
    pub value: String,
    pub nullifier: String,
    pub secret: String,
    pub label: String,
    /// Poseidon(nullifier, secret) — the public part the contract needs to bind the value.
    pub precommitment: String,
    pub commitment: String,
}

#[derive(Serialize, Deserialize)]
pub struct GeneratedCoin {
    pub coin: CoinData,
    /// 32-byte field encodings the on-chain `deposit` consumes.
    pub commitment_hex: String,
    pub label_hex: String,
    pub precommitment_hex: String,
}
