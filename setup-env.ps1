#requires -Version 5.1
<#
  .SYNOPSIS
    Setup .env file for MinigGames deployment

  .DESCRIPTION
    Creates .env with DATABASE_URL, GOOGLE_CLIENT_ID, CORS_ORIGIN
    Just fill in CLIENT_ID and DATABASE_SECRET, then ready to deploy

  .EXAMPLE
    .\setup-env.ps1
#>

param(
  [switch]$SkipDeploy  # If set, only create .env without deploying
)

$ErrorActionPreference = "Stop"

Write-Host @"
========================================================
  MinigGames .env Setup
========================================================
  This script creates .env for VPS deployment.
  You only need to provide 2 secrets below.
"@ -ForegroundColor Cyan

# ──────────────────────────────────────────────────────
# 1. Ask for Google CLIENT_ID
# ──────────────────────────────────────────────────────
Write-Host "`n>>> Step 1: Google OAuth2 CLIENT_ID" -ForegroundColor Yellow
Write-Host "  Get from: Google Cloud Console → OAuth2 credentials" -ForegroundColor Gray
$googleClientId = Read-Host "  Enter GOOGLE_CLIENT_ID (or press Enter to skip)" -AsSecureString
$googleClientIdPlain = if ($googleClientId.Length -gt 0) {
  [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($googleClientId))
} else { "" }

# ──────────────────────────────────────────────────────
# 2. Ask for Database Password
# ──────────────────────────────────────────────────────
Write-Host "`n>>> Step 2: MySQL Password" -ForegroundColor Yellow
Write-Host "  User: root" -ForegroundColor Gray
Write-Host "  Host: localhost" -ForegroundColor Gray
Write-Host "  Database: minigames" -ForegroundColor Gray
$dbPassword = Read-Host "  Enter MySQL password (or press Enter to skip)" -AsSecureString
$dbPasswordPlain = if ($dbPassword.Length -gt 0) {
  [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($dbPassword))
} else { "" }

# ──────────────────────────────────────────────────────
# 3. Build DATABASE_URL
# ──────────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($dbPasswordPlain)) {
  Write-Host "`n⚠️  Using .env template (update DATABASE_URL manually)" -ForegroundColor Yellow
  $databaseUrl = "mysql://root:YOUR_DB_PASSWORD@localhost:3306/minigames"
} else {
  $databaseUrl = "mysql://root:$dbPasswordPlain@localhost:3306/minigames"
}

if ([string]::IsNullOrWhiteSpace($googleClientIdPlain)) {
  Write-Host "`n⚠️  Using placeholder for GOOGLE_CLIENT_ID (update manually if needed)" -ForegroundColor Yellow
  $googleClientId = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
} else {
  $googleClientId = $googleClientIdPlain
}

# ──────────────────────────────────────────────────────
# 4. Create .env file
# ──────────────────────────────────────────────────────
$envContent = @"
# MinigGames Environment Configuration
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# Database (MySQL)
DATABASE_URL=$databaseUrl

# Google OAuth2 (optional, for token verification)
GOOGLE_CLIENT_ID=$googleClientId

# CORS
CORS_ORIGIN=https://minigames.allin1site.com

# Server
PORT=3333

# SSL
MYSQL_SSL=false
"@

$envPath = Join-Path (Get-Location) ".env"
Set-Content -Path $envPath -Value $envContent -Encoding UTF8

Write-Host "`n✅ .env created: $envPath" -ForegroundColor Green
Write-Host "   Secured: $($envContent -split "`n" | Select-Object -First 5)" -ForegroundColor Gray

# ──────────────────────────────────────────────────────
# 5. Offer to deploy
# ──────────────────────────────────────────────────────
if ($SkipDeploy) {
  Write-Host "`n  ℹ️  Run next: .\deploy-safe.ps1 -CloneIfMissing -UploadEnv" -ForegroundColor Cyan
  exit 0
}

Write-Host "`n>>> Ready to deploy?" -ForegroundColor Yellow
$deployNow = Read-Host "  Run deploy now? (y/n)"

if ($deployNow -eq "y" -or $deployNow -eq "yes") {
  Write-Host "`n🚀 Starting deployment..." -ForegroundColor Cyan
  & ".\deploy-safe.ps1" -CloneIfMissing -UploadEnv
} else {
  Write-Host "`n  ℹ️  Run next: .\deploy-safe.ps1 -CloneIfMissing -UploadEnv" -ForegroundColor Cyan
}
