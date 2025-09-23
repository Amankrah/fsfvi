# Build script to create SQLite database and build project

# Try to create database using .NET if SQLite3 is not available
try {
    Add-Type -AssemblyName System.Data.SQLite -ErrorAction Stop
    $connectionString = "Data Source=kenya_auth.db;Version=3;New=True;"
    $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
    $connection.Open()
    
    # Read and execute schema
    $schema = Get-Content "create_db.sql" -Raw
    $command = $connection.CreateCommand()
    $command.CommandText = $schema
    $command.ExecuteNonQuery()
    
    $connection.Close()
    Write-Host "Database created successfully using .NET SQLite"
} catch {
    Write-Host "Could not create database with .NET SQLite: $($_.Exception.Message)"
    Write-Host "Trying alternative approach..."
    
    # Alternative: Just build without database validation for now
    $env:SQLX_OFFLINE = "false"
    Remove-Item env:DATABASE_URL -ErrorAction SilentlyContinue
    Write-Host "Building without database validation..."
}

# Build the project
cargo build --release
