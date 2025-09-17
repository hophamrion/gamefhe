# Test script for TrioDuel integration
Write-Host "🎮 Testing TrioDuel Integration..." -ForegroundColor Green

# Check if contract compiles
Write-Host "📦 Compiling TrioDuel contract..." -ForegroundColor Yellow
Set-Location "packages\fhevm-hardhat-template"
npm run compile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Contract compilation successful" -ForegroundColor Green
} else {
    Write-Host "❌ Contract compilation failed" -ForegroundColor Red
    exit 1
}

# Check if frontend builds
Write-Host "🌐 Building frontend..." -ForegroundColor Yellow
Set-Location "..\site"
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
}

# Check aggregator setup
Write-Host "🔧 Checking aggregator setup..." -ForegroundColor Yellow
Set-Location "..\..\aggregator"

if ((Test-Path "package.json") -and (Test-Path "src\index.ts")) {
    Write-Host "✅ Aggregator files present" -ForegroundColor Green
} else {
    Write-Host "❌ Aggregator setup incomplete" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Integration test completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy contract: cd packages\fhevm-hardhat-template && npx hardhat deploy --tags TrioDuel --network sepolia" -ForegroundColor White
Write-Host "2. Setup aggregator: cd ..\..\aggregator && npm install && npm run dev" -ForegroundColor White
Write-Host "3. Run frontend: cd ..\packages\site && npm run dev" -ForegroundColor White
Write-Host "4. Access game at: http://localhost:3000/pixel-duel" -ForegroundColor White
