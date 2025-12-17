# Test FSFI Admin Login
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing FSFI Admin Login" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://localhost:8080"
$loginEndpoint = "$apiUrl/auth/login"

$credentials = @{
    email = "admin@fsfi.org"
    password = "Test123!@#"
} | ConvertTo-Json

Write-Host "Attempting login..." -ForegroundColor Yellow
Write-Host "Endpoint: $loginEndpoint" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $loginEndpoint -Method Post -Body $credentials -ContentType "application/json"

    if ($response.success) {
        Write-Host "SUCCESS: Login Successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "User Information:" -ForegroundColor Cyan
        Write-Host "  ID:        $($response.data.user.id)" -ForegroundColor White
        Write-Host "  Email:     $($response.data.user.email)" -ForegroundColor White
        Write-Host "  Name:      $($response.data.user.full_name)" -ForegroundColor White
        Write-Host "  Role:      $($response.data.user.role)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Access Token (valid for 1 hour):" -ForegroundColor Cyan
        Write-Host $response.data.access_token -ForegroundColor Yellow
        Write-Host ""

        # Save token
        $response.data.access_token | Out-File -FilePath "admin-token.txt" -NoNewline
        Write-Host "Token saved to: admin-token.txt" -ForegroundColor Green
        Write-Host ""
        Write-Host "See ADMIN_ACCESS_GUIDE.md for usage instructions." -ForegroundColor Cyan
    } else {
        Write-Host "ERROR: Login failed" -ForegroundColor Red
    }

} catch {
    Write-Host "ERROR: Login Failed!" -ForegroundColor Red
    Write-Host ""

    if ($_.Exception.Message -like "*Cannot connect*") {
        Write-Host "Backend server is not running" -ForegroundColor Yellow
        Write-Host "Run: cargo run" -ForegroundColor Cyan
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
