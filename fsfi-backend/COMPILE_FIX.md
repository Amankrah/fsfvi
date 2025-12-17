# Quick Fix to Compile

The issue is that sqlx macro checking requires either:
1. A database connection at compile time, OR
2. Pre-generated query metadata

## Option 1: Quick Build (Skip Features)

Build without the problematic features temporarily:

```powershell
cargo build --no-default-features
```

## Option 2: Use Nightly Rust (Recommended for Development)

Install Rust nightly for this project:

```powershell
# Install nightly
rustup install nightly

# Use nightly for this project
rustup override set nightly

# Now build
cargo build
```

## Option 3: Remove sqlx Macros (Use Runtime Queries)

This requires rewriting all the `sqlx::query!` macros to use `sqlx::query` (without the `!`).

## Recommended: Use Nightly for Now

Run these commands:

```powershell
cd C:\Users\Windows\Desktop\Dev_Projects\fsfvi\fsfi-backend

# Set this project to use nightly Rust
rustup override set nightly

# Clean previous build
cargo clean

# Build with nightly
cargo build
```

After building successfully, you can prepare offline data:

```powershell
# Generate query metadata (requires database running)
cargo sqlx prepare

# Then switch back to stable if you want
rustup override set stable
```
