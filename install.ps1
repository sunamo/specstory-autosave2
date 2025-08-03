# SpecStory AutoSave - Clean Install Script
Write-Host "SpecStory AutoSave - Clean Install Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Clean up old VSIX files first
Write-Host "1. Cleaning old VSIX files..." -ForegroundColor Yellow
$vsixFiles = Get-ChildItem -Path "." -Filter "*.vsix" -ErrorAction SilentlyContinue
if ($vsixFiles.Count -gt 0) {
    Write-Host "   Found $($vsixFiles.Count) old VSIX files to remove:" -ForegroundColor Cyan
    foreach ($file in $vsixFiles) {
        Write-Host "   - Removing: $($file.Name)" -ForegroundColor Gray
        Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
    }
    Write-Host "   ✅ Old VSIX files cleaned" -ForegroundColor Green
} else {
    Write-Host "   No old VSIX files found" -ForegroundColor Gray
}

# Clean up TEMP cache folder
Write-Host "1.1. Cleaning TEMP cache..." -ForegroundColor Yellow
if (Test-Path "%TEMP%") {
    Write-Host "   - Removing %TEMP% folder (21MB+ cache)" -ForegroundColor Gray
    Remove-Item "%TEMP%" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ TEMP cache cleaned" -ForegroundColor Green
} else {
    Write-Host "   No TEMP cache found" -ForegroundColor Gray
}

# Build the extension
Write-Host "2. Building extension..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Create VSIX package with specific name
Write-Host "3. Creating VSIX package..." -ForegroundColor Yellow
vsce package --allow-star-activation --out latest.vsix 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ VSIX creation failed!" -ForegroundColor Red
    exit 1
}

# Clean old extensions (completely silent)
Write-Host "4. Cleaning old extensions..." -ForegroundColor Yellow
Start-Process -FilePath "code-insiders" -ArgumentList "--uninstall-extension", "sunamocz.specstory-autosave" -WindowStyle Hidden -Wait 2>$null

# Wait a moment
Start-Sleep -Seconds 2

# Install new extension (no new window)
Write-Host "5. Installing new extension..." -ForegroundColor Yellow
$result = Start-Process -FilePath "code-insiders" -ArgumentList "--install-extension", "latest.vsix", "--force" -WindowStyle Hidden -Wait -PassThru

if ($result.ExitCode -eq 0) {
    Write-Host "✅ Extension installed successfully!" -ForegroundColor Green
    Write-Host "📝 Please restart VS Code Insiders to see the new version" -ForegroundColor Cyan
    Write-Host "🤖 Status bar will show: AI: [count] (no version number)" -ForegroundColor Cyan
    Write-Host "📋 Test with Ctrl+Shift+A or Enter in Copilot Chat" -ForegroundColor Cyan
} else {
    Write-Host "❌ Installation failed!" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation complete!" -ForegroundColor Green
