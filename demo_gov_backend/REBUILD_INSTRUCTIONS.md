# Demo Government Backend - Rebuild Instructions

## Quick Start: Complete Rebuild from Scratch

To completely clean and rebuild the project with all Kenya references removed:

```powershell
.\rebuild_from_scratch.ps1
```

This single command will:
1. ✅ Replace all "Kenya" references with "Demo Government"
2. ✅ Delete `Cargo.lock` for fresh dependency resolution
3. ✅ Remove `target/` directory (all build artifacts)
4. ✅ Delete all database files (`*.db`, `*.db-shm`, `*.db-wal`)
5. ✅ Remove `.sqlx/` cache directory
6. ✅ Create `.env` from `.env.example` if needed
7. ✅ Build the project fresh
8. ✅ Run the backend with clean database

---

## Individual Scripts (if you need granular control)

### 1. Update Kenya References Only
```powershell
.\update_references.ps1
```
Updates all code references from "Kenya" to "Demo Government" without deleting anything.

### 2. Cleanup Only
```powershell
.\cleanup.ps1
```
Removes build artifacts and databases without running the server.

### 3. Normal Build and Run
```powershell
.\build_script.ps1
```
Builds and runs the backend (without cleanup).

---

## What Gets Cleaned Up

### Code Changes
- `KenyaGovernment` → `DemoGovernment` (enum variant)
- `kenya_government` → `demo_government` (string literals)
- `kenya-government` → `demo-government` (JWT audience)
- `fsfvi-kenya-backend` → `fsfvi-demo-gov-backend` (JWT issuer)
- Package name in `Cargo.toml`: `kenya_backend` → `demo_gov_backend`

### Files Deleted
- `target/` - All compiled binaries and build artifacts
- `Cargo.lock` - Dependency lock file (will be regenerated)
- `*.db` - All SQLite databases
- `*.db-shm`, `*.db-wal` - SQLite temporary files
- `.sqlx/` - SQLx prepared query cache

### Fresh Database
The new database `demo_gov_backend.db` will be created automatically with:
- ✅ All 4 migrations run fresh
- ✅ Default demo government user created
- ✅ Clean authentication tables
- ✅ Empty FSFVI data tables ready for use

---

## After Rebuild

The backend will start with:
- 🚀 Server: `http://127.0.0.1:8081`
- 🔒 JWT Authentication (8-hour expiration)
- 💾 Fresh SQLite database with data sovereignty
- 📊 34 FSFVI endpoints ready to use
- 🔐 Default credentials (check logs for temporary password)

---

## Important Notes

⚠️ **Before running**: Make sure to update `FSFVI_API_KEY` in `.env` file with your actual API key.

💡 **First run**: The build will take longer as it downloads and compiles all dependencies.

🔄 **Subsequent runs**: Use `.\build_script.ps1` for faster starts (no cleanup).

🗑️ **Clean slate**: Run `.\rebuild_from_scratch.ps1` whenever you want to start completely fresh.
