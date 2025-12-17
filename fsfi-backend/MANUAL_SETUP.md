# Manual Setup Guide - Step by Step

If you prefer to run commands manually instead of using the setup script, follow these steps:

## Prerequisites

Make sure Docker Desktop is running!

## Step 1: Copy Environment File

```powershell
Copy-Item .env.development .env
```

## Step 2: Start PostgreSQL

```powershell
docker run -d --name fsfi-dev-postgres -e POSTGRES_DB=fsfi_dev_db -e POSTGRES_USER=fsfi_dev -e POSTGRES_PASSWORD=dev_password_123 -p 5432:5432 postgres:16-alpine
```

Wait 5 seconds for PostgreSQL to start:
```powershell
Start-Sleep -Seconds 5
```

## Step 3: Install sqlx-cli (if not already installed)

```powershell
cargo install sqlx-cli --no-default-features --features postgres,rustls
```

This may take a few minutes the first time.

## Step 4: Run Database Migrations

```powershell
sqlx migrate run
```

You should see:
```
Applied 20250101000001/migrate initial schema (XXXms)
```

## Step 5: Build the Project

```powershell
cargo build
```

This will download dependencies and compile the project. First build takes 5-10 minutes.

## Step 6: Generate Password Hash

```powershell
cargo run --bin hash_password "Test123!@#"
```

Copy the hash that appears after "Hash:". It looks like:
```
$argon2id$v=19$m=19456,t=2,p=1$...
```

## Step 7: Update Seed Data

1. Open `seed-dev-data.sql` in your editor
2. Find all 4 instances of:
   ```sql
   '$argon2id$v=19$m=19456,t=2,p=1$aSI3SzkAYqn5GQckjpvazQ$T5rL6h8zJ5Ky8vJxGXkVlcqMxB7OjhEQc7qFGVnvWZU',
   ```
3. Replace each with your generated hash from Step 6

## Step 8: Load Test Data

```powershell
Get-Content seed-dev-data.sql | docker exec -i fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db
```

You should see:
```
INSERT 0 4
INSERT 0 4
type                 | count
---------------------+-------
Governments Created  | 4
Users Created        | 4
```

## Step 9: Start the Server

```powershell
cargo run
```

You should see:
```
🚀 Starting FSFI Backend Server...
✅ Database connection established
✅ Database migrations completed
```

The server is now running at http://localhost:8080

**Keep this terminal window open!**

## Step 10: Test the API

Open a **NEW** PowerShell window and test:

```powershell
# Test health endpoint
Invoke-RestMethod http://localhost:8080/health

# Test login
$body = @{
    email = "john.kamau@agriculture.ke.gov"
    password = "Test123!@#"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:8080/api/v1/auth/login" -ContentType "application/json" -Body $body
```

Or run the full test suite:
```powershell
.\test-api.ps1
```

## Common Issues

### "Docker daemon is not running"

Start Docker Desktop and wait for it to fully load.

### "Port 5432 is already in use"

Another PostgreSQL is running. Either:
- Use that PostgreSQL and update DATABASE_URL in `.env`
- Or stop the other PostgreSQL first

### "sqlx command not found"

Make sure cargo's bin directory is in your PATH. Restart PowerShell after installing sqlx-cli.

### "Build failed"

Make sure you're in the correct directory:
```powershell
cd C:\Users\Windows\Desktop\Dev_Projects\fsfvi\fsfi-backend
```

## What's Next?

Once everything is running:

1. **Test all endpoints**: `.\test-api.ps1`
2. **Read API docs**: See `API.md`
3. **Add your business logic**: Create new handlers in `src/handlers/`
4. **Review security**: See `SECURITY.md`

## Cleanup

When you're done testing:

```powershell
# Stop the server (Ctrl+C in the server window)

# Stop and remove PostgreSQL
docker stop fsfi-dev-postgres
docker rm fsfi-dev-postgres

# Remove .env file
Remove-Item .env
```

## Quick Reference

```powershell
# Start everything
.\setup-dev.ps1

# Start just the server
cargo run

# Build for production
cargo build --release

# Run tests
cargo test

# Format code
cargo fmt

# Check for issues
cargo clippy

# Update dependencies
cargo update

# Connect to database
docker exec -it fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db
```
