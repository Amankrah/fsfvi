#!/usr/bin/env python3
"""
Setup Database Script for Demo Government Backend
Creates SQLite database and runs all migrations
"""

import os
import sqlite3
import sys
from pathlib import Path

def main():
    print("=== Demo Government Backend - Database Setup ===\n")

    db_path = "demo_gov_backend.db"
    migrations_dir = Path("migrations")

    # Check if database exists
    if os.path.exists(db_path):
        print(f"WARNING: Database already exists at: {db_path}")
        response = input("Delete and start fresh? (y/N): ").strip().lower()
        if response == 'y':
            os.remove(db_path)
            print("OK - Deleted existing database")
        else:
            print("Keeping existing database. Exiting.")
            return 0

    print(f"Creating new SQLite database: {db_path}")

    # Create database and connection
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        print("OK - Created database file\n")

        # Get migration files in order
        migration_files = sorted(migrations_dir.glob("*.sql"))

        if not migration_files:
            print(f"WARNING: No migration files found in {migrations_dir}")
            return 1

        print(f"Found {len(migration_files)} migration file(s)")
        print("Running migrations...\n")

        # Run each migration
        for migration_file in migration_files:
            print(f"  Running: {migration_file.name}...", end=" ")

            with open(migration_file, 'r', encoding='utf-8') as f:
                sql = f.read()

            try:
                # Use executescript to run the entire migration file at once
                # This handles multi-statement SQL files properly
                cursor.executescript(sql)
                conn.commit()
                print("OK")

            except sqlite3.Error as e:
                print(f"ERROR\n  Error: {e}")
                return 1

        # Show created tables
        print("\nOK - All migrations completed successfully!\n")
        print("Database created at:", db_path)
        print("Tables created:")

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        for (table_name,) in tables:
            print(f"  - {table_name}")

        conn.close()

        print("\nOK - Setup complete!")
        print("\nNext step: Run 'cargo build' or 'cargo run'")
        return 0

    except sqlite3.Error as e:
        print(f"ERROR - Database error: {e}")
        return 1
    except Exception as e:
        print(f"ERROR - Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
