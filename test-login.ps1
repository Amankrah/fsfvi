# Test Emmanuel's login directly via PowerShell

$loginUrl = "http://localhost:8080/api/v1/auth/login"

$body = @{
    email = "emmanuel@fsfi.org"
    password = "f:8.2sc#udM}d|Sk"
} | ConvertTo-Json

Write-Host "Testing login for emmanuel@fsfi.org..." -ForegroundColor Cyan
Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $body
Write-Host ""

try {
    $response = Invoke-RestMethod -Method POST -Uri $loginUrl -ContentType "application/json" -Body $body
    Write-Host "✅ Login SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Login FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error:" -ForegroundColor Yellow
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $responseBody = $reader.ReadToEnd()
    Write-Host $responseBody
}
