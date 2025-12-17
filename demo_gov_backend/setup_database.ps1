# Setup Database Script for Demo Government Backend
# This creates the SQLite database and runs migrations manually

Write-Host "=== Demo Government Backend - Database Setup ===" -ForegroundColor Cyan
Write-Host ""

$dbPath = "demo_gov_backend.db"
$migrationsPath = "migrations"

# Check if database already exists
if (Test-Path $dbPath) {
    Write-Host "⚠️  Database already exists at: $dbPath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to delete it and start fresh? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Remove-Item $dbPath
        Write-Host "✓ Deleted existing database" -ForegroundColor Green
    } else {
        Write-Host "Keeping existing database. Exiting." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Creating new SQLite database..." -ForegroundColor Cyan

# Create empty database file
New-Item -ItemType File -Path $dbPath -Force | Out-Null
Write-Host "✓ Created database file: $dbPath" -ForegroundColor Green

# Load SQLite assembly (using System.Data.SQLite if available)
Write-Host ""
Write-Host "Running migrations..." -ForegroundColor Cyan

# Get all migration files in order
$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Host "⚠️  No migration files found in $migrationsPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($migrationFiles.Count) migration file(s)" -ForegroundColor Gray

# Try to use sqlite3.exe if available
$sqlite3Path = Get-Command sqlite3 -ErrorAction SilentlyContinue

if ($null -eq $sqlite3Path) {
    Write-Host ""
    Write-Host "⚠️  sqlite3 not found in PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options to proceed:" -ForegroundColor Cyan
    Write-Host "1. Install SQLite tools:" -ForegroundColor White
    Write-Host "   - Download from: https://www.sqlite.org/download.html" -ForegroundColor Gray
    Write-Host "   - Extract sqlite3.exe to this directory or add to PATH" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Use manual SQL execution:" -ForegroundColor White
    Write-Host "   - Run migrations manually using a SQLite GUI tool" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Use cargo-sqlx offline mode:" -ForegroundColor White
    Write-Host "   - Run: cargo install sqlx-cli" -ForegroundColor Gray
    Write-Host "   - Then: cargo sqlx database create" -ForegroundColor Gray
    Write-Host "   - Then: cargo sqlx migrate run" -ForegroundColor Gray
    Write-Host ""

    # Try to use .NET SQLite if available
    try {
        Add-Type -Path "System.Data.SQLite.dll" -ErrorAction Stop
        Write-Host "Found System.Data.SQLite - attempting to run migrations via .NET..." -ForegroundColor Cyan

        $connectionString = "Data Source=$dbPath;Version=3;"
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        $connection.Open()

        foreach ($file in $migrationFiles) {
            Write-Host "  Running: $($file.Name)..." -ForegroundColor Gray
            $sql = Get-Content $file.FullName -Raw
            $command = $connection.CreateCommand()
            $command.CommandText = $sql
            $command.ExecuteNonQuery() | Out-Null
            Write-Host "  ✓ $($file.Name)" -ForegroundColor Green
        }

        $connection.Close()
        Write-Host ""
        Write-Host "✓ All migrations completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next step: Run 'cargo build' or 'cargo run'" -ForegroundColor Cyan
        exit 0
    }
    catch {
        Write-Host ""
        Write-Host "❌ Could not execute migrations automatically" -ForegroundColor Red
        Write-Host "Please install SQLite tools or use cargo-sqlx" -ForegroundColor Yellow
        exit 1
    }
}

# Use sqlite3 to run migrations
Write-Host "Using sqlite3 from: $($sqlite3Path.Source)" -ForegroundColor Gray
Write-Host ""

foreach ($file in $migrationFiles) {
    Write-Host "  Running: $($file.Name)..." -ForegroundColor Gray

    # Execute the SQL file
    $result = & sqlite3 $dbPath ".read `"$($file.FullName)`"" 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Failed to run $($file.Name)" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        exit 1
    }

    Write-Host "  ✓ $($file.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "✓ All migrations completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Database created at: $dbPath" -ForegroundColor Cyan
Write-Host "Tables created:" -ForegroundColor Cyan
& sqlite3 $dbPath ".tables" | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "Next step: Run 'cargo build' or 'cargo run'" -ForegroundColor Cyan
Write-Host ""
