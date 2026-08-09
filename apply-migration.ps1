#!/usr/bin/env pwsh
# PowerShell script to apply phone auth migration

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Phone Auth Migration Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "[1/3] Applying database migration..." -ForegroundColor Yellow
try {
    & npx prisma db push --accept-data-loss
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migration applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Migration failed. Trying alternative method..." -ForegroundColor Red
        Get-Content "prisma\migrations\20260809000001_add_phone_auth_fields\migration.sql" | & npx prisma db execute --stdin
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Migration applied via execute!" -ForegroundColor Green
        } else {
            throw "Migration failed"
        }
    }
} catch {
    Write-Host "✗ Error applying migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/3] Regenerating Prisma Client..." -ForegroundColor Yellow
try {
    & npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Prisma Client generated!" -ForegroundColor Green
    } else {
        throw "Prisma generate failed"
    }
} catch {
    Write-Host "✗ Error generating Prisma Client: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/3] Migration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Restart your backend server (Ctrl+C then npm run start:dev)" -ForegroundColor White
Write-Host "2. Clear browser local storage (F12 → Application → Clear)" -ForegroundColor White
Write-Host "3. Test phone login at http://localhost:5173/patient/login" -ForegroundColor White
Write-Host ""
Write-Host "Backend should log: [DEV] OTP for +1234567890: 123456" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
