# Stop any processes using port 5173
$connections = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($connections) {
    Write-Host "Releasing port 5173..." -ForegroundColor Yellow
    foreach ($conn in $connections) {
        if ($conn.OwningProcess -gt 0) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1
}

# Start the frontend dev server
npm run dev
