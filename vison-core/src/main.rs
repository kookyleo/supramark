use clap::Parser;
use std::fs;
use std::path::PathBuf;
use vison_core::{Validator, VisonComponent};

#[derive(Parser)]
#[command(author, version, about = "Vison JSON Validator CLI", long_about = None)]
struct Cli {
    /// Path to the Vison JSON file to validate
    #[arg(value_name = "FILE")]
    file: PathBuf,
}

fn main() {
    let cli = Cli::parse();

    let content = fs::read_to_string(&cli.file).expect("Failed to read file");
    let component: VisonComponent = match serde_json::from_str(&content) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("❌ JSON Parsing Error: {}", e);
            std::process::exit(1);
        }
    };

    let validator = Validator::new();
    match validator.validate(&component) {
        Ok(_) => {
            println!(
                "✅ Validation Successful: {} is a valid Vison document.",
                cli.file.display()
            );
        }
        Err(e) => {
            eprintln!("❌ Validation Failed: {}", e);
            std::process::exit(1);
        }
    }
}
