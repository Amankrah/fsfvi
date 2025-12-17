// Simple utility to generate password hashes for development
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: cargo run --bin hash_password <password>");
        eprintln!("Example: cargo run --bin hash_password 'Test123!@#'");
        std::process::exit(1);
    }

    let password = &args[1];

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    match argon2.hash_password(password.as_bytes(), &salt) {
        Ok(password_hash) => {
            println!("Password: {}", password);
            println!("Hash: {}", password_hash);
        }
        Err(e) => {
            eprintln!("Error hashing password: {}", e);
            std::process::exit(1);
        }
    }
}
