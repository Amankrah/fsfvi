# FSFI Backend - Development Setup Script for Windows
# This script sets up the local development environment

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "FSFI Backend - Development Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "Success: Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "Error: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Copy environment file
Write-Host "[2/6] Setting up environment..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "Success: .env already exists" -ForegroundColor Green
}
else {
    Copy-Item ".env.development" ".env"
    Write-Host "Success: Created .env from .env.development" -ForegroundColor Green
}

# Start PostgreSQL container
Write-Host "[3/6] Starting PostgreSQL..." -ForegroundColor Yellow
$postgresRunning = docker ps --filter "name=fsfi-dev-postgres" --format "{{.Names}}"
if ($postgresRunning -eq "fsfi-dev-postgres") {
    Write-Host "Success: PostgreSQL already running" -ForegroundColor Green
}
else {
    docker run -d --name fsfi-dev-postgres -e POSTGRES_DB=fsfi_dev_db -e POSTGRES_USER=fsfi_dev -e POSTGRES_PASSWORD=dev_password_123 -e POSTGRES_HOST_AUTH_METHOD=trust -p 5433:5432 postgres:16-alpine
    Write-Host "Success: PostgreSQL started" -ForegroundColor Green
    Write-Host "  Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Install sqlx-cli if not present
Write-Host "[4/6] Checking sqlx-cli..." -ForegroundColor Yellow
$sqlxInstalled = Get-Command sqlx -ErrorAction SilentlyContinue
if ($sqlxInstalled) {
    Write-Host "Success: sqlx-cli already installed" -ForegroundColor Green
}
else {
    Write-Host "  Installing sqlx-cli..." -ForegroundColor Yellow
    cargo install sqlx-cli --no-default-features --features postgres,rustls
    Write-Host "Success: sqlx-cli installed" -ForegroundColor Green
}

# Run migrations
Write-Host "[5/6] Running database migrations..." -ForegroundColor Yellow
sqlx migrate run
Write-Host "Success: Migrations completed" -ForegroundColor Green

# Build the project
Write-Host "[6/6] Building project..." -ForegroundColor Yellow
# Ensure SQLX_OFFLINE is not set
$env:SQLX_OFFLINE = $null
cargo build
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Build successful" -ForegroundColor Green
}
else {
    Write-Host "Error: Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run the server: cargo run" -ForegroundColor White
Write-Host "2. Test endpoints: .\test-api.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Database info:" -ForegroundColor Yellow
Write-Host "  Host: localhost:5433" -ForegroundColor White
Write-Host "  Database: fsfi_dev_db" -ForegroundColor White
Write-Host "  User: fsfi_dev" -ForegroundColor White
Write-Host "  Password: dev_password_123" -ForegroundColor White
Write-Host ""
