# =====================================================================
# allin1site Mini Games — One-shot deploy from local PowerShell
# =====================================================================
# Cách dùng:
#   .\deploy.ps1                                 (dùng config mặc định trong file)
#   .\deploy.ps1 -VpsHost 1.2.3.4 -VpsUser root  (override)
#   .\deploy.ps1 -SkipPull                       (chỉ rebuild, không git pull)
#
# Yêu cầu:
#   - Đã có ssh key đăng ký trên VPS (~/.ssh/id_rsa hoặc id_ed25519)
#   - Trên VPS đã clone repo + có file .env trong subapp/games/
#   - Trên VPS đã cài docker + docker compose
# =====================================================================

[CmdletBinding()]
param(
  # ── Sửa 3 dòng này một lần, các lần sau chỉ chạy `.\deploy.ps1` ────
  [string]$VpsHost = "your-vps.example.com",   # IP hoặc hostname VPS
  [string]$VpsUser = "root",                   # user SSH
  [string]$RepoDir = "~/allin1site",           # đường dẫn repo trên VPS

  # ── Tùy chọn ───────────────────────────────────────────────────────
  [string]$SshKey = "",                        # để trống = ssh dùng default key
  [switch]$SkipPull,                           # chỉ rebuild, không git pull
  [switch]$Logs,                               # tail log sau khi deploy
  [switch]$UploadEnv,                          # scp .env (local) → VPS trước khi deploy
  [string]$EnvFile = ".\.env"                  # path .env local (mặc định cùng folder)
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "▶ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "✗ $msg" -ForegroundColor Red }

# ── Build SSH command prefix ─────────────────────────────────────────
$sshArgs = @()
if ($SshKey) { $sshArgs += @('-i', $SshKey) }
$sshArgs += @('-o', 'StrictHostKeyChecking=accept-new', "$VpsUser@$VpsHost")

function Invoke-Ssh($remoteCmd) {
  & ssh @sshArgs $remoteCmd
  if ($LASTEXITCODE -ne 0) {
    Write-Err "Remote command failed: $remoteCmd"
    exit $LASTEXITCODE
  }
}

# ── Pre-flight checks ────────────────────────────────────────────────
Write-Step "Checking VPS connectivity ($VpsHost)..."
Invoke-Ssh "echo ok && uname -a"
Write-Ok "SSH OK"

Write-Step "Checking docker on VPS..."
Invoke-Ssh "docker --version && docker compose version"
Write-Ok "Docker OK"

# ── Upload .env from local (optional) ────────────────────────────────
if ($UploadEnv) {
  if (-not (Test-Path $EnvFile)) {
    Write-Err ".env file not found at: $EnvFile"
    exit 1
  }
  Write-Step "Uploading $EnvFile → ${VpsUser}@${VpsHost}:$RepoDir/subapp/games/.env"
  $scpArgs = @()
  if ($SshKey) { $scpArgs += @('-i', $SshKey) }
  $scpArgs += @('-o', 'StrictHostKeyChecking=accept-new')
  $scpArgs += @($EnvFile, "${VpsUser}@${VpsHost}:$RepoDir/subapp/games/.env")
  & scp @scpArgs
  if ($LASTEXITCODE -ne 0) { Write-Err "scp failed"; exit $LASTEXITCODE }
  # chmod 600 so only owner can read
  Invoke-Ssh "chmod 600 $RepoDir/subapp/games/.env"
  Write-Ok ".env uploaded (chmod 600)"
}

Write-Step "Checking .env file on VPS..."
Invoke-Ssh "test -f $RepoDir/subapp/games/.env || (echo '[ERROR] .env missing — run: .\deploy.ps1 -UploadEnv'; exit 1)"
Write-Ok ".env present"

# ── Pull latest code ─────────────────────────────────────────────────
if (-not $SkipPull) {
  Write-Step "git pull on VPS..."
  Invoke-Ssh "cd $RepoDir && git pull --ff-only"
  Write-Ok "Pull OK"
} else {
  Write-Host "⊙ Skipping git pull (--SkipPull)" -ForegroundColor Yellow
}

# ── Build & start ────────────────────────────────────────────────────
Write-Step "docker compose up -d --build (this takes 30-60s)..."
Invoke-Ssh "cd $RepoDir/subapp/games && docker compose up -d --build"
Write-Ok "Build & start OK"

Write-Step "Cleaning up old images..."
Invoke-Ssh "docker image prune -f >/dev/null 2>&1; echo done"
Write-Ok "Cleanup OK"

# ── Health check ─────────────────────────────────────────────────────
Write-Step "Waiting for healthz..."
Start-Sleep -Seconds 4
$health = & ssh @sshArgs "curl -sf http://127.0.0.1:3333/healthz" 2>$null
if ($health -match '"ok":true') {
  Write-Ok "Health check passed: $health"
} else {
  Write-Err "Health check failed. Run --Logs to debug."
  exit 1
}

# ── Status summary ───────────────────────────────────────────────────
Write-Step "Container status:"
Invoke-Ssh "docker ps --filter name=minigames --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Deploy complete: minigames @ port 3333" -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host "Verify: https://minigames.allin1site.com/" -ForegroundColor White
Write-Host "Tip:    Cloudflare → Caching → Purge Everything (clear edge cache)" -ForegroundColor Yellow
Write-Host ""

if ($Logs) {
  Write-Step "Tailing logs (Ctrl+C to stop)..."
  & ssh @sshArgs "cd $RepoDir/subapp/games && docker compose logs -f --tail=50"
}
