use noterail::cli::*;

fn main() {
    // Initialize logging
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    let cli = Cli::parse();

    let command_handler = CommandHandler::new();

    let result = match cli.command {
        Commands::Generate {
            scope,
            value,
            output,
        } => command_handler.handle_generate(scope, value, output),
        Commands::Withdraw {
            coin_file,
            state_file,
            recipient,
            output,
        } => command_handler.handle_withdraw(coin_file, state_file, recipient, output),
        Commands::UpdateAssociation {
            association_file,
            label,
        } => command_handler.handle_update_association(association_file, label),
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
