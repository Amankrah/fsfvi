#!/usr/bin/env python3
"""
Initialize SQLite database with all migrations for SQLx compile-time verification
This is a government-level system - handle with care
"""
import sqlite3
import os

# Database path
DB_PATH = "demo_gov_backend.db"

# Migration files in order
MIGRATIONS = [
    "migrations/001_auth.sql",
    "migrations/002_raw_data.sql",
    "migrations/003_fsfvi_data.sql",
    "migrations/004_fsfvi_results.sql",
    "migrations/005_security_events.sql",
    "migrations/006_demo_fsfvi_data.sql",
]

def main():
    print(f"Initializing database: {DB_PATH}")

    # Remove existing database if it exists
    if os.path.exists(DB_PATH):
        print(f"Removing existing database...")
        os.remove(DB_PATH)

    # Create new database connection
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Run each migration
    for migration_file in MIGRATIONS:
        print(f"Running migration: {migration_file}")
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()

        # Execute the migration (split by semicolon for multiple statements)
        cursor.executescript(migration_sql)
        conn.commit()
        print(f"  [OK] Completed")

    # Verify tables were created
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = cursor.fetchall()

    print(f"\nDatabase initialized successfully!")
    print(f"Created {len(tables)} tables:")
    for table in tables:
        print(f"  - {table[0]}")

    conn.close()
    print(f"\n[OK] Database ready for SQLx compile-time verification")

if __name__ == "__main__":
    main()
