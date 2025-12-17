@echo off
echo ================================
echo FSFI Admin Account Setup
echo ================================
echo.

echo Copying SQL file to Docker container...
docker cp create-fsfi-admin.sql fsfi-dev-postgres:/tmp/create-admin.sql

if %ERRORLEVEL% NEQ 0 (
    echo Error: Could not copy file to Docker container
    echo Make sure Docker is running and PostgreSQL container is up
    pause
    exit /b 1
)

echo Executing SQL script...
docker exec fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db -f /tmp/create-admin.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================
    echo FSFI Admin Account Created!
    echo ================================
    echo.
    echo Login Credentials:
    echo   Email:    admin@fsfi.org
    echo   Password: Test123!@#
    echo.
    echo WARNING: Change this password immediately after first login!
    echo.
    echo Next Steps:
    echo   1. Start the backend: cargo run
    echo   2. Test login: powershell -File login-test.ps1
    echo   3. See ADMIN_ACCESS_GUIDE.md for full instructions
    echo.
) else (
    echo.
    echo Error: Failed to create admin account
    echo Check the SQL script for errors
    echo.
)

pause
