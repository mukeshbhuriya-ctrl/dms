# =============================================================
#  DMS — Windows Server PowerShell Deployment Script
#
#  Usage:
#    .\deploy.ps1              # Normal deploy
#    .\deploy.ps1 -FirstRun   # First-time setup (installs PM2 etc.)
#    .\deploy.ps1 -MigrateOnly # Only run DB migrations, no restart
# =============================================================

param(
    [switch]$FirstRun,
    [switch]$MigrateOnly
)

$ErrorActionPreference = 'Stop'

# ─── Config ───────────────────────────────────────────────────
$ProjectRoot  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir   = Join-Path $ProjectRoot "backend"
$FrontendDir  = Join-Path $ProjectRoot "frontend"
$LogDir       = Join-Path $ProjectRoot "logs"
$EcosystemCfg = Join-Path $ProjectRoot "ecosystem.config.js"

# ─── Helper Functions ─────────────────────────────────────────
function Write-Step($msg) {
    Write-Host "`n━━━ $msg" -ForegroundColor Cyan
}

function Write-OK($msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "  ⚠ $msg" -ForegroundColor Yellow
}

# ─── 1. Ensure log directory exists ───────────────────────────
Write-Step "Ensuring log directory..."
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}
Write-OK "logs/ ready at $LogDir"

# ─── 2. First-Run: Install global tooling ─────────────────────
if ($FirstRun) {
    Write-Step "[FIRST RUN] Installing global dependencies..."

    Write-Host "  Installing PM2 globally..."
    npm install -g pm2
    Write-OK "PM2 installed"

    Write-Host "  Installing pm2-windows-service for startup persistence..."
    npm install -g pm2-windows-service
    Write-OK "pm2-windows-service installed"

    Write-Host "  Installing pm2-logrotate module..."
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 50M
    pm2 set pm2-logrotate:retain 10
    pm2 set pm2-logrotate:compress true
    Write-OK "pm2-logrotate configured (50MB max, 10 files retained)"
}

# ─── 3. Install backend dependencies ──────────────────────────
Write-Step "Installing backend dependencies (production only)..."
Set-Location $BackendDir
npm ci --omit=dev
Write-OK "Backend node_modules ready"

# ─── 4. Database migrations ───────────────────────────────────
Write-Step "Running Prisma migrations..."
npx prisma generate
npx prisma migrate deploy
Write-OK "Migrations applied"

if ($MigrateOnly) {
    Write-Host "`n[MigrateOnly] Done — skipping build and restart." -ForegroundColor Yellow
    exit 0
}

# ─── 5. Build frontend ────────────────────────────────────────
Write-Step "Building frontend (Vite)..."
Set-Location $FrontendDir
npm ci
npm run build
Write-OK "Frontend built → frontend/dist/"

# ─── 6. Start / Reload PM2 ────────────────────────────────────
Set-Location $ProjectRoot

Write-Step "Starting / reloading PM2..."

# Check if dms-backend is already in PM2
$pm2List = pm2 jlist 2>$null | ConvertFrom-Json
$existing = $pm2List | Where-Object { $_.name -eq 'dms-backend' }

if ($existing) {
    Write-Host "  dms-backend found in PM2 — performing zero-downtime reload..."
    pm2 reload $EcosystemCfg --env production
    Write-OK "Zero-downtime reload complete"
} else {
    Write-Host "  dms-backend not found — starting fresh..."
    pm2 start $EcosystemCfg --env production
    Write-OK "dms-backend started"
}

# Save PM2 process list so it survives reboots
pm2 save
Write-OK "PM2 process list saved"

# ─── 7. First-Run: Register PM2 as Windows Service ────────────
if ($FirstRun) {
    Write-Step "[FIRST RUN] Registering PM2 as a Windows Service..."
    pm2-service-install -n "PM2-DMS"
    Write-OK "PM2 registered as Windows Service 'PM2-DMS'"
    Write-Warn "Go to Services (services.msc) and set 'PM2-DMS' Startup Type to 'Automatic'"
}

# ─── 8. Final Status ──────────────────────────────────────────
Write-Step "PM2 Status"
pm2 status

Write-Host "`n✅ Deployment complete! DMS is running at http://localhost`n" -ForegroundColor Green
