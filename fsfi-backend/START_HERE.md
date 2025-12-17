# 🚀 START HERE - Quick Setup for Local Testing

## What You Need to Do Right Now

### Step 1: Run the Setup Script

Open PowerShell in this directory and run:

```powershell
.\setup-dev.ps1
```

This will:
- ✓ Start PostgreSQL in Docker
- ✓ Set up your `.env` file
- ✓ Install required tools
- ✓ Run database migrations
- ✓ Build the project

### Step 2: Generate Password Hash

We need to create a password hash for test users:

```powershell
cargo run --bin hash_password "Test123!@#"
```

Copy the hash that's printed. It will look like:
```
$argon2id$v=19$m=19456,t=2,p=1$...
```

### Step 3: Update Seed Data

Open `seed-dev-data.sql` and replace ALL instances of the password_hash with the hash you just generated.

Find this line (appears 4 times):
```sql
'$argon2id$v=19$m=19456,t=2,p=1$aSI3SzkAYqn5GQckjpvazQ$T5rL6h8zJ5Ky8vJxGXkVlcqMxB7OjhEQc7qFGVnvWZU',
```

Replace with your generated hash.

### Step 4: Load Test Data

```powershell
Get-Content seed-dev-data.sql | docker exec -i fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db
```

You should see:
```
Governments Created | 4
Users Created | 4
```

### Step 5: Start the Server

```powershell
cargo run
```

You should see:
```
🚀 Starting FSFI Backend Server...
✅ Database connection established
✅ Database migrations completed
```

The server is now running at `http://localhost:8080`

### Step 6: Test All Endpoints

Open a NEW PowerShell window (keep the server running in the first one):

```powershell
.\test-api.ps1
```

This will test all 10 endpoints and show you:
- ✓ Health check
- ✓ Login
- ✓ JWT authentication
- ✓ API key creation
- ✓ API key usage
- And more!

## Test Credentials

| Email | Password | Country | Role |
|-------|----------|---------|------|
| john.kamau@agriculture.ke.gov | Test123!@# | Kenya | admin |
| developer@agriculture.ke.gov | Test123!@# | Kenya | developer |
| sarah.nakato@maaif.go.ug | Test123!@# | Uganda | admin |
| hassan.mwinyi@agriculture.go.tz | Test123!@# | Tanzania | analyst |

## Common Commands

```powershell
# Start the server
cargo run

# Build for production
cargo build --release

# Run tests
cargo test

# Check database
docker exec -it fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db

# View logs
# Logs will appear in the terminal where you ran `cargo run`

# Stop PostgreSQL
docker stop fsfi-dev-postgres

# Start PostgreSQL again
docker start fsfi-dev-postgres
```

## What's Next?

1. **Test with Postman/Insomnia**: Use the credentials above
2. **Add Your Business Logic**: Add your food system algorithms
3. **Review the Documentation**:
   - [README.md](README.md) - Full documentation
   - [API.md](API.md) - Complete API reference
   - [SECURITY.md](SECURITY.md) - Security policies
   - [TESTING.md](TESTING.md) - Detailed testing guide

## Troubleshooting

### "cargo build" fails

Make sure you're in the `fsfi-backend` directory:
```powershell
cd C:\Users\Windows\Desktop\Dev_Projects\fsfvi\fsfi-backend
```

### Docker not running

Start Docker Desktop, wait for it to fully start, then run `.\setup-dev.ps1` again.

### Port 8080 in use

```powershell
# Find what's using port 8080
netstat -ano | findstr :8080

# Kill it (replace <PID> with the number from above)
taskkill /PID <PID> /F
```

### Database connection failed

```powershell
# Restart PostgreSQL
docker restart fsfi-dev-postgres

# Wait 5 seconds
Start-Sleep -Seconds 5

# Try again
cargo run
```

## Production Deployment

When ready for production:

1. Review [SECURITY.md](SECURITY.md)
2. Use `.env.production.example` as template
3. Generate secure secrets:
   ```powershell
   # JWT Secret
   openssl rand -base64 64

   # Encryption Key
   openssl rand -base64 32
   ```
4. Run `deploy-secure.sh` on your EC2 instance
5. Never use test passwords in production!

## Need Help?

- Check [TESTING.md](TESTING.md) for detailed testing guide
- Check [README.md](README.md) for full documentation
- Create an issue if something doesn't work

---

**Remember**: This is a DEVELOPMENT setup. Production requires:
- Separate database
- Strong secrets
- SSL certificates
- Firewall configuration
- See [SECURITY.md](SECURITY.md) for details
