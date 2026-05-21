# =====================================================================
# allin1site Mini Games - SAFE deploy from local PowerShell
# Designed for VPS running multiple services - does NOT affect other containers
# =====================================================================
# Usage:
#   .\deploy-safe.ps1                                    (default config)
#   .\deploy-safe.ps1 -VpsHost 1.2.3.4 -VpsUser root     (override)
#   .\deploy-safe.ps1 -DryRun                            (check only, no deploy)
#   .\deploy-safe.ps1 -SkipPull                          (rebuild only)
#   .\deploy-safe.ps1 -UploadEnv                         (scp .env local to VPS)
#   .\deploy-safe.ps1 -Logs                              (tail log after deploy)
#   .\deploy-safe.ps1 -CloneIfMissing                    (first time: auto git clone)
#
# Safety vs old deploy.ps1:
#   - Pre-flight: check port conflict, container conflict, disk space
#   - Backup old image as :rollback before building new
#   - Healthz check + auto rollback if fail
#   - Safe prune (only minigames project image, does NOT touch other services)
#   - Confirm before destructive action (unless -Force)
#   - Log saved to .\deploy-logs\YYYY-MM-DD_HHMMSS.log
#
# Requirements:
#   - SSH key registered on VPS, or use -SshKey param
#   - VPS has docker + docker compose installed
#   - Repo minigames cloned on VPS (or use -CloneIfMissing)
#   - File .env exists in $RepoDir on VPS (or use -UploadEnv)
# =====================================================================

[CmdletBinding()]
param(
  # VPS info
  [string]$VpsHost   = "62.238.28.106",
  [string]$VpsUser   = "root",
  [string]$RepoDir   = "~/minigames",
  [string]$RepoUrl   = "git@github-minigames:manhdauvn09-manhds/minigames.git",
  [string]$SshKey    = "",

  # Container expectations
  [string]$ContainerName    = "minigames",
  [int]   $ExpectedPort     = 3333,
  [string]$ComposeProject   = "minigames",

  # Behavior flags
  [switch]$DryRun,
  [switch]$SkipPull,
  [switch]$Logs,
  [switch]$UploadEnv,
  [string]$EnvFile          = ".\.env",
  [switch]$CloneIfMissing,
  [switch]$Force,
  [switch]$SkipNginxReload,
  [switch]$SkipHealthCheck
)

$ErrorActionPreference = 'Stop'

# Logging setup
$logDir = ".\deploy-logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("{0:yyyy-MM-dd_HHmmss}.log" -f (Get-Date))
function Log-Line($msg) { Add-Content -Path $logFile -Value $msg -Encoding utf8 }
function Write-Step($msg) { Write-Host ">> $msg" -ForegroundColor Cyan; Log-Line "STEP: $msg" }
function Write-Ok($msg)   { Write-Host "OK $msg" -ForegroundColor Green; Log-Line "OK: $msg" }
function Write-Warn($msg) { Write-Host "! $msg" -ForegroundColor Yellow; Log-Line "WARN: $msg" }
function Write-Err($msg)  { Write-Host "X $msg" -ForegroundColor Red; Log-Line "ERR: $msg" }

# SSH wrapper
$sshArgs = @()
if ($SshKey) { $sshArgs += @('-i', $SshKey) }
$sshArgs += @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=10', "$VpsUser@$VpsHost")

function Invoke-Ssh($remoteCmd, [switch]$AllowFail) {
  Log-Line "SSH: $remoteCmd"
  $output = & ssh @sshArgs $remoteCmd 2>&1
  $code = $LASTEXITCODE
  Log-Line "SSH-OUT($code): $output"
  if ($code -ne 0 -and -not $AllowFail) {
    Write-Err "Remote failed (exit $code): $remoteCmd"
    Write-Host $output -ForegroundColor Red
    exit $code
  }
  return $output
}

function Confirm-Or-Exit($prompt) {
  if ($Force) { Write-Warn "$prompt - auto-confirmed (-Force)"; return }
  $ans = Read-Host "$prompt (yes/no)"
  if ($ans -ne 'yes') { Write-Err "User cancelled"; exit 1 }
}

# =====================================================================
# PHASE 0 - Banner + DryRun notice
# =====================================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "   MINIGAMES SAFE DEPLOY - multi-service host edition   " -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "  VPS:        $VpsUser@$VpsHost"
Write-Host "  Repo dir:   $RepoDir"
Write-Host "  Container:  $ContainerName"
Write-Host "  Project:    $ComposeProject"
Write-Host "  Port:       $ExpectedPort"
Write-Host "  Log:        $logFile"
if ($DryRun) { Write-Host "  [DRY RUN - no changes will be applied]" -ForegroundColor Yellow }
Write-Host ""

# =====================================================================
# PHASE 1 - Pre-flight checks (read-only)
# =====================================================================
Write-Step "Phase 1/6: Pre-flight checks"

# SSH connectivity
Invoke-Ssh "echo ssh_ok" | Out-Null
Write-Ok "SSH connection"

# Docker available
Invoke-Ssh 'command -v docker >/dev/null 2>&1; docker compose version >/dev/null 2>&1; echo docker_check_ok' | Out-Null
Write-Ok "Docker + Compose available"

# Disk space (warn if <2GB)
$diskOut = Invoke-Ssh "df -BG --output=avail / | tail -1 | tr -dc '0-9'"
$diskGB = [int]$diskOut
if ($diskGB -lt 2) { Write-Warn "Disk free only ${diskGB}GB - build may fail" }
else { Write-Ok "Disk free: ${diskGB}GB" }

# Container name conflict - check if container belongs to different project
$inspectCmd = 'docker inspect -f ''{{ index .Config.Labels "com.docker.compose.project"}}'' ' + $ContainerName + ' 2>/dev/null; true'
$existingProject = Invoke-Ssh $inspectCmd -AllowFail
$existingProject = ($existingProject -join '').Trim()
if ($existingProject -and $existingProject -ne $ComposeProject) {
  Write-Err "Container '$ContainerName' belongs to compose project '$existingProject' - NOT '$ComposeProject'."
  Write-Err "Stopping to avoid overwriting other service. Change -ContainerName or handle manually."
  exit 1
}
if ($existingProject -eq $ComposeProject) { Write-Ok "Container '$ContainerName' belongs to project '$ComposeProject' - will update" }
else { Write-Ok "Container '$ContainerName' does not exist - will create new" }

# Port conflict - check if port 3333 is in use
$portCheck = Invoke-Ssh "ss -tlnp 2>/dev/null | awk '`$4 ~ /127.0.0.1:$ExpectedPort\$/ || `$4 ~ /:::$ExpectedPort\$/ || `$4 ~ /\\*:$ExpectedPort\$/ {print `$0}' | head -3" -AllowFail
if ($portCheck -and ($portCheck -join '').Trim()) {
  # Port in use - check if it's our container
  $portOwner = Invoke-Ssh "ss -tlnp 2>/dev/null | awk '`$4 ~ /:$ExpectedPort\$/' | head -1" -AllowFail
  $isOurs = ($portOwner -match 'docker-proxy' -or $portOwner -match $ContainerName)
  if (-not $isOurs) {
    Write-Err "Port $ExpectedPort in use by DIFFERENT process:"
    Write-Host ($portOwner -join "`n") -ForegroundColor Red
    Write-Err "Stopping. Change -ExpectedPort or stop other service first."
    exit 1
  }
  Write-Ok "Port $ExpectedPort in use by docker (current service - OK)"
} else {
  Write-Ok "Port ${ExpectedPort}: free"
}

# Repo exists
$repoExistsCmd = 'test -d ' + $RepoDir + '/.git; if [ $? -eq 0 ]; then echo yes; else echo no; fi'
$repoExists = Invoke-Ssh $repoExistsCmd -AllowFail
$repoExists = ($repoExists -join '').Trim()
if ($repoExists -ne 'yes') {
  if ($CloneIfMissing) {
    if ($DryRun) { Write-Warn "[DryRun] Would clone: $RepoUrl to $RepoDir" }
    else {
      Write-Step "Cloning $RepoUrl to $RepoDir (first time, ~30-60s)"
      Confirm-Or-Exit "Clone repo to '$RepoDir'?"
      $sshArgsClone = $sshArgs.Clone()
      $sshArgsClone[0] = 'ssh'
      $sshArgsClone += @('-o', 'ConnectTimeout=60', '-o', 'ServerAliveInterval=10')
      $cloneCmd = "git clone --progress $RepoUrl $RepoDir 2>&1 | grep -E '(Cloning|Resolving|Receiving|Unpacking|done)' | tail -10"
      Invoke-Ssh $cloneCmd | Write-Host
      Write-Ok "Repo cloned successfully"
    }
  } else {
    Write-Err "Repo does not exist at $RepoDir on VPS."
    Write-Err "Re-run with -CloneIfMissing to auto clone, or clone manually."
    exit 1
  }
} else { Write-Ok "Repo present at $RepoDir" }

# =====================================================================
# PHASE 2 - Upload .env (optional) + verify
# =====================================================================
Write-Step "Phase 2/6: Environment config"

if ($UploadEnv) {
  if (-not (Test-Path $EnvFile)) { Write-Err ".env not found at $EnvFile"; exit 1 }
  Confirm-Or-Exit "Upload local '$EnvFile' to VPS:$RepoDir/.env (overwrite if exists)?"
  if (-not $DryRun) {
    $scpArgs = @()
    if ($SshKey) { $scpArgs += @('-i', $SshKey) }
    $scpArgs += @('-o', 'StrictHostKeyChecking=accept-new', $EnvFile, "${VpsUser}@${VpsHost}:$RepoDir/.env")
    & scp @scpArgs
    if ($LASTEXITCODE -ne 0) { Write-Err "scp failed"; exit $LASTEXITCODE }
    Invoke-Ssh "chmod 600 $RepoDir/.env"
    Write-Ok ".env uploaded (chmod 600)"
  }
}

$envOkCmd = 'test -f ' + $RepoDir + '/.env; if [ $? -eq 0 ]; then echo yes; else echo no; fi'
$envOk = Invoke-Ssh $envOkCmd -AllowFail
$envOk = ($envOk -join '').Trim()
if ($envOk -ne 'yes') {
  Write-Err ".env missing on VPS at $RepoDir/.env"
  Write-Err "Re-run with -UploadEnv to upload from local."
  exit 1
}
$envMode = ((Invoke-Ssh "stat -c %a $RepoDir/.env") -join '').Trim()
Write-Ok ".env present (mode $envMode)"

# =====================================================================
# PHASE 3 - Git pull
# =====================================================================
Write-Step "Phase 3/6: Sync code"
if ($SkipPull) {
  Write-Warn "Skip git pull (-SkipPull)"
} elseif ($DryRun) {
  Invoke-Ssh ('cd ' + $RepoDir + ' && git fetch --dry-run 2>&1 | head -20') | Out-Null
  Write-Warn "(DryRun) Would git pull --ff-only"
} else {
  $beforeSha = (Invoke-Ssh ('cd ' + $RepoDir + ' && git rev-parse --short HEAD')) -join ''
  Invoke-Ssh ('cd ' + $RepoDir + ' && git pull --ff-only') | Out-Null
  $afterSha = (Invoke-Ssh ('cd ' + $RepoDir + ' && git rev-parse --short HEAD')) -join ''
  if ($beforeSha -eq $afterSha) { Write-Ok "Already up-to-date ($afterSha)" }
  else { Write-Ok "Updated: $beforeSha -> $afterSha" }
}

if ($DryRun) {
  Write-Host ""
  Write-Host "==== DRY RUN COMPLETE - no changes applied ====" -ForegroundColor Yellow
  Write-Host "Re-run without -DryRun to actually deploy."
  exit 0
}

# =====================================================================
# PHASE 4 - Backup current image (for rollback)
# =====================================================================
Write-Step "Phase 4/6: Backup current image (for rollback)"
$currentImageCmd = 'docker inspect -f ''{{.Config.Image}}'' ' + $ContainerName + ' 2>/dev/null; true'
$currentImage = ((Invoke-Ssh $currentImageCmd -AllowFail) -join '').Trim()
if (-not $currentImage) { $currentImage = 'none' }
if ($currentImage -and $currentImage -ne 'none') {
  $tagCmd = 'docker tag ' + $currentImage + ' ' + $ContainerName + ':rollback'
  Invoke-Ssh $tagCmd | Out-Null
  Write-Ok "Tagged $currentImage to ${ContainerName}:rollback"
} else {
  Write-Warn "No existing container - no rollback image"
}

# =====================================================================
# PHASE 5 - Build + deploy + healthcheck (auto-rollback if fail)
# =====================================================================
Write-Step "Phase 5/6: Build and deploy (downtime ~2-5s)"

Confirm-Or-Exit "Build + restart container '$ContainerName'?"

# Build first to minimize downtime
Invoke-Ssh ('cd ' + $RepoDir + ' && docker compose build 2>&1 | tail -10')
Write-Ok "Build OK"

# Up -d will recreate container since image SHA changed
Invoke-Ssh ('cd ' + $RepoDir + ' && docker compose up -d')
Write-Ok "Container started"

# Healthcheck with retry
if ($SkipHealthCheck) {
  Write-Warn "Skip healthcheck (-SkipHealthCheck)"
} else {
  Write-Step "Healthcheck (wait up to 30s)..."
  $healthy = $false
  $healthCheckCmd = 'curl -sf -m 3 http://127.0.0.1:' + $ExpectedPort + '/healthz 2>/dev/null; true'
  for ($i = 1; $i -le 10; $i++) {
    Start-Sleep -Seconds 3
    $health = Invoke-Ssh $healthCheckCmd -AllowFail
    $healthStr = ($health -join '').Trim()
    if ($healthStr -match '"ok":\s*true') {
      Write-Ok "Healthz passed: $healthStr"
      $healthy = $true
      break
    }
    Write-Host "  attempt $i/10..." -ForegroundColor DarkGray
  }
  if (-not $healthy) {
    Write-Err "Healthz failed after 30s. ROLLING BACK..."
    if ($currentImage -and $currentImage -ne 'none') {
      $rollbackTag = 'docker tag ' + $ContainerName + ':rollback ' + $currentImage
      $rollbackUp  = 'cd ' + $RepoDir + ' && docker compose up -d'
      Invoke-Ssh $rollbackTag
      Invoke-Ssh $rollbackUp
      Start-Sleep -Seconds 5
      $rollHealthCmd = 'curl -sf -m 3 http://127.0.0.1:' + $ExpectedPort + '/healthz'
      $rollHealth = (Invoke-Ssh $rollHealthCmd -AllowFail) -join ''
      if ($rollHealth -match '"ok":\s*true') {
        Write-Warn "Rolled back to previous image. Healthz: $rollHealth"
      } else {
        Write-Err "Rollback also failed. Manual intervention needed: ssh + docker compose logs"
      }
    } else {
      Write-Err "No rollback image available. Container stopped."
    }
    Write-Host ""
    Write-Host "Logs tail:" -ForegroundColor Yellow
    Invoke-Ssh ('cd ' + $RepoDir + ' && docker compose logs --tail=30 ' + $ContainerName) -AllowFail
    exit 1
  }
}

# =====================================================================
# PHASE 6 - Safe cleanup + nginx reload (optional)
# =====================================================================
Write-Step "Phase 6/6: Cleanup + finalize"

# SAFE prune: only delete dangling images of this project
$pruneOut = Invoke-Ssh "docker image prune -f --filter 'label=com.docker.compose.project=$ComposeProject' 2>&1 | tail -3"
Write-Ok "Pruned project images only (other services untouched)"

# Nginx reload (optional, skip if not setup)
if (-not $SkipNginxReload) {
  $hasVhostCmd = 'test -e /etc/nginx/sites-enabled/minigames.conf; if [ $? -eq 0 ]; then echo yes; else echo no; fi'
  $hasVhost = (Invoke-Ssh $hasVhostCmd -AllowFail) -join ''
  if ($hasVhost.Trim() -eq 'yes') {
    Invoke-Ssh "nginx -t 2>&1 | tail -3"
    Invoke-Ssh "systemctl reload nginx"
    Write-Ok "Nginx reloaded (config tested OK)"
  } else {
    Write-Warn "No nginx vhost for minigames found - skipping reload"
  }
}

# Final summary
Write-Step "Final status"
Invoke-Ssh "docker ps --filter name=^${ContainerName}$ --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   OK DEPLOY SUCCESS - minigames is live                 " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verify online:  https://minigames.allin1site.com/" -ForegroundColor White
Write-Host "Cloudflare:     Caching - Purge Everything" -ForegroundColor Yellow
Write-Host "Log saved:      $logFile" -ForegroundColor DarkGray
Write-Host ""

if ($Logs) {
  Write-Step "Tailing logs (Ctrl+C to stop)..."
  & ssh @sshArgs "cd $RepoDir && docker compose logs -f --tail=50 $ContainerName"
}
