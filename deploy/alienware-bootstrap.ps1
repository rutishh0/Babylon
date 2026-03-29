#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Babylon Phase 2 — Alienware Bootstrap Script
    Run this ONCE on the Alienware laptop as Administrator.
    After this, your dev laptop can SSH in and manage everything remotely.

.USAGE
    1. Copy this file to the Alienware
    2. Right-click PowerShell → Run as Administrator
    3. Run: Set-ExecutionPolicy Bypass -Scope Process -Force; .\alienware-bootstrap.ps1
    4. Follow the prompts
#>

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Babylon Phase 2 — Alienware Bootstrap" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ──────────────────────────────────────
# 0. Pre-flight checks
# ──────────────────────────────────────

Write-Host "[0/10] Pre-flight checks..." -ForegroundColor Yellow

# Check if B: drive exists
$targetDrive = "D:"
if (-not (Test-Path "$targetDrive\")) {
    $targetDrive = "C:"
    Write-Host "  WARNING: B: drive not found. Using C: instead." -ForegroundColor Red
}

# Check disk space
$drive = Get-PSDrive ($targetDrive -replace ":", "")
$freeGB = [math]::Round($drive.Free / 1GB, 1)
Write-Host "  Drive $targetDrive — $freeGB GB free"

if ($freeGB -lt 200) {
    Write-Host "  CRITICAL: Less than 200GB free! You will run out of space." -ForegroundColor Red
    Write-Host "  Consider using an external drive." -ForegroundColor Red
    $continue = Read-Host "  Continue anyway? (y/n)"
    if ($continue -ne "y") { exit 1 }
}

# Get LAN IP
$ethernet = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -like "*Ethernet*" -and $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1

if ($ethernet) {
    $lanIP = $ethernet.IPAddress
    Write-Host "  Ethernet LAN IP: $lanIP"
} else {
    $wifi = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.InterfaceAlias -like "*Wi-Fi*" -and $_.PrefixOrigin -ne "WellKnown"
    } | Select-Object -First 1
    $lanIP = if ($wifi) { $wifi.IPAddress } else { "192.168.1.100" }
    Write-Host "  No Ethernet found. Using: $lanIP (you may need to update this)"
}

# Get git repo URL
$repoUrl = Read-Host "`n  Enter your GitHub repo URL (e.g. https://github.com/rutishh0/Babylon.git)"
if (-not $repoUrl) { $repoUrl = "https://github.com/rutishh0/Babylon.git" }

$basePath = "$targetDrive\Babylon"

Write-Host "`n  Base path: $basePath"
Write-Host "  LAN IP: $lanIP"
Write-Host "  Repo: $repoUrl`n"

# ──────────────────────────────────────
# 1. Windows power settings
# ──────────────────────────────────────

Write-Host "[1/10] Configuring Windows power settings..." -ForegroundColor Yellow

# High performance power plan
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null
# Never sleep on AC
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
# Disable hibernate
powercfg /hibernate off
# Lid close = do nothing (AC and DC)
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setactive SCHEME_CURRENT

Write-Host "  Power plan: High Performance, never sleep, lid close = do nothing" -ForegroundColor Green

# ──────────────────────────────────────
# 2. Create directory structure
# ──────────────────────────────────────

Write-Host "[2/10] Creating directory structure..." -ForegroundColor Yellow

$dirs = @(
    "$basePath\app",
    "$basePath\media",
    "$basePath\data",
    "$basePath\downloads\raw",
    "$basePath\downloads\processed"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "  Created: $basePath\{app,media,data,downloads}" -ForegroundColor Green

# ──────────────────────────────────────
# 3. Install Node.js, pnpm, PM2
# ──────────────────────────────────────

Write-Host "[3/10] Installing Node.js, pnpm, PM2..." -ForegroundColor Yellow

# Check if Node is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing Node.js 22 LTS..."
    $nodeInstaller = "$env:TEMP\node-setup.msi"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi" -OutFile $nodeInstaller
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait
    # Refresh PATH
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    Write-Host "  Node.js installed: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "  Node.js already installed: $(node --version)" -ForegroundColor Green
}

# Install pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    npm install -g pnpm 2>$null
}
Write-Host "  pnpm: $(pnpm --version)" -ForegroundColor Green

# Install PM2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    npm install -g pm2 2>$null
}
Write-Host "  PM2: $(pm2 --version 2>$null)" -ForegroundColor Green

# ──────────────────────────────────────
# 4. Clone repo and build
# ──────────────────────────────────────

Write-Host "[4/10] Cloning repo and building..." -ForegroundColor Yellow

if (-not (Test-Path "$basePath\app\.git")) {
    git clone $repoUrl "$basePath\app"
} else {
    Set-Location "$basePath\app"
    git pull origin master
}

Set-Location "$basePath\app"
pnpm install
pnpm build

Write-Host "  Build complete" -ForegroundColor Green

# ──────────────────────────────────────
# 5. Create .env file
# ──────────────────────────────────────

Write-Host "[5/10] Creating environment config..." -ForegroundColor Yellow

$envContent = @"
# Babylon Phase 2 — Local Alienware
LOCAL_MEDIA_PATH=$basePath\media
PORT=3000
DATABASE_URL=file:$basePath\data\babylon.db
BABYLON_PIN=
ALLOWED_ORIGINS=http://localhost:3001,http://${lanIP}:3001

TMDB_API_KEY=bab4f1103df2e22a6e5d472944163962
TMDB_READ_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYWI0ZjExMDNkZjJlMjJhNmU1ZDQ3Mjk0NDE2Mzk2MiIsIm5iZiI6MTc3NDYxNTE4Mi4zOTgwMDAyLCJzdWIiOiI2OWM2N2E4ZWQ3NDE1NTMzNGU0MjFmMWIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.cQl9vnKyBeyVsmEa801pn3dcwkRNCG06BLiPWNI8E1w

INGEST_STATE_DIR=$basePath\app\ingest
"@

$envContent | Out-File -FilePath "$basePath\app\.env" -Encoding UTF8 -Force
Write-Host "  .env created at $basePath\app\.env" -ForegroundColor Green

# ──────────────────────────────────────
# 6. Start PM2 services
# ──────────────────────────────────────

Write-Host "[6/10] Starting PM2 services..." -ForegroundColor Yellow

Set-Location "$basePath\app"
pm2 start deploy\ecosystem.config.cjs
pm2 save

# Create Task Scheduler entry for auto-start on login
schtasks /create /tn "PM2 Startup" /tr "cmd /c pm2 resurrect" /sc onlogon /rl highest /f 2>$null
Write-Host "  PM2 running and configured to auto-start" -ForegroundColor Green

# ──────────────────────────────────────
# 7. Install and configure qBittorrent
# ──────────────────────────────────────

Write-Host "[7/10] Setting up qBittorrent..." -ForegroundColor Yellow

if (-not (Get-Command qbittorrent -ErrorAction SilentlyContinue)) {
    Write-Host "  Downloading qBittorrent..."
    $qbtInstaller = "$env:TEMP\qbt-setup.exe"
    Invoke-WebRequest -Uri "https://downloads.sourceforge.net/project/qbittorrent/qbittorrent-win32/qbittorrent-5.0.4/qbittorrent_5.0.4_x64_setup.exe" -OutFile $qbtInstaller
    Start-Process $qbtInstaller -ArgumentList "/S" -Wait
    Write-Host "  qBittorrent installed" -ForegroundColor Green
} else {
    Write-Host "  qBittorrent already installed" -ForegroundColor Green
}

# Add to startup
$startupFolder = [Environment]::GetFolderPath("Startup")
$qbtPath = "${env:ProgramFiles}\qBittorrent\qbittorrent.exe"
if (-not (Test-Path $qbtPath)) {
    $qbtPath = "${env:ProgramFiles(x86)}\qBittorrent\qbittorrent.exe"
}
if (Test-Path $qbtPath) {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut("$startupFolder\qBittorrent.lnk")
    $shortcut.TargetPath = $qbtPath
    $shortcut.Arguments = "--minimized"
    $shortcut.Save()
    Write-Host "  qBittorrent added to startup (minimized)" -ForegroundColor Green
}

# ──────────────────────────────────────
# 8. Enable OpenSSH Server (for remote access from dev laptop)
# ──────────────────────────────────────

Write-Host "[8/10] Enabling SSH server for remote access..." -ForegroundColor Yellow

# Install OpenSSH Server feature
$sshServer = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
if ($sshServer.State -ne 'Installed') {
    Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'
}

# Start and enable SSH service
Start-Service sshd -ErrorAction SilentlyContinue
Set-Service -Name sshd -StartupType Automatic

# Allow SSH through firewall
$rule = Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue
if (-not $rule) {
    New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server (sshd)" `
        -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
}

Write-Host "  SSH server enabled on port 22" -ForegroundColor Green
Write-Host "  From your dev laptop: ssh $env:USERNAME@$lanIP" -ForegroundColor Cyan

# ──────────────────────────────────────
# 9. Setup WSL2 + Python ingest daemon
# ──────────────────────────────────────

Write-Host "[9/10] Setting up WSL2 and ingest daemon..." -ForegroundColor Yellow

# Check if WSL2 is installed
$wslCheck = wsl --list --quiet 2>$null
if (-not $wslCheck -or $wslCheck -notcontains "Ubuntu") {
    Write-Host "  Installing WSL2 Ubuntu (this may require a reboot)..."
    wsl --install -d Ubuntu --no-launch 2>$null
    Write-Host "  WSL2 installed. You may need to reboot and re-run this script." -ForegroundColor Red
} else {
    Write-Host "  WSL2 Ubuntu already installed" -ForegroundColor Green
}

# Configure WSL2 ingest daemon
$wslScript = @'
#!/bin/bash
set -e

echo "=== Configuring WSL2 for Babylon ingest ==="

# Enable systemd
if ! grep -q "systemd=true" /etc/wsl.conf 2>/dev/null; then
    echo -e "[boot]\nsystemd=true" | sudo tee /etc/wsl.conf
    echo "WARNING: systemd enabled. Run 'wsl --shutdown' from PowerShell after this script, then reopen WSL2."
fi

# Install dependencies
sudo apt-get update -qq
sudo apt-get install -y python3.12 python3.12-venv python3-pip ffmpeg 2>/dev/null || \
sudo apt-get install -y python3 python3-venv python3-pip ffmpeg

# Setup Python venv
INGEST_DIR="/mnt/b/Babylon/app/ingest"
if [ -d "$INGEST_DIR" ]; then
    cd "$INGEST_DIR"
    python3 -m venv venv 2>/dev/null || python3.12 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install beautifulsoup4 lxml
    echo "Python venv created and deps installed"
fi

# Create .env for the ingest daemon
cat > /mnt/b/Babylon/app/ingest/.env << 'ENVEOF'
LOCAL_MEDIA_PATH=/mnt/b/Babylon/media
DOWNLOAD_DIR=/mnt/b/Babylon/downloads/raw
PROCESSED_DIR=/mnt/b/Babylon/downloads/processed
INGEST_STATE_DIR=/mnt/b/Babylon/app/ingest
INGEST_POLL_INTERVAL=300
BABYLON_API_URL=http://localhost:3000
BABYLON_PIN=
QBITTORRENT_HOST=http://localhost:8080
QBITTORRENT_USER=admin
QBITTORRENT_PASS=adminadmin
DATABASE_URL=file:///mnt/b/Babylon/data/babylon.db
TMDB_API_KEY=bab4f1103df2e22a6e5d472944163962
TMDB_READ_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYWI0ZjExMDNkZjJlMjJhNmU1ZDQ3Mjk0NDE2Mzk2MiIsIm5iZiI6MTc3NDYxNTE4Mi4zOTgwMDAyLCJzdWIiOiI2OWM2N2E4ZWQ3NDE1NTMzNGU0MjFmMWIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.cQl9vnKyBeyVsmEa801pn3dcwkRNCG06BLiPWNI8E1w
ENVEOF

# Install systemd service
if [ -f "/mnt/b/Babylon/app/deploy/babylon-ingest-wsl2.service" ]; then
    sudo cp /mnt/b/Babylon/app/deploy/babylon-ingest-wsl2.service /etc/systemd/system/babylon-ingest.service
    # Fix the EnvironmentFile path to point to the ingest .env
    sudo sed -i 's|EnvironmentFile=.*|EnvironmentFile=/mnt/b/Babylon/app/ingest/.env|' /etc/systemd/system/babylon-ingest.service
    sudo systemctl daemon-reload
    sudo systemctl enable babylon-ingest
    sudo systemctl start babylon-ingest || echo "Note: systemd may not be running yet. Restart WSL2 first."
fi

echo "=== WSL2 setup complete ==="
'@

$wslScriptPath = "$basePath\app\deploy\wsl-setup.sh"
$wslScript | Out-File -FilePath $wslScriptPath -Encoding UTF8 -NoNewline -Force
# Fix line endings for bash
(Get-Content $wslScriptPath -Raw) -replace "`r`n", "`n" | Set-Content $wslScriptPath -NoNewline -Force

Write-Host "  Running WSL2 setup..."
wsl bash "/mnt/$($targetDrive.ToLower() -replace ':', '')/Babylon/app/deploy/wsl-setup.sh" 2>$null

Write-Host "  WSL2 ingest daemon configured" -ForegroundColor Green

# ──────────────────────────────────────
# 10. Final summary
# ──────────────────────────────────────

Write-Host "`n[10/10] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Babylon is running!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  API:      http://localhost:3000/api/health" -ForegroundColor White
Write-Host "  Web:      http://${lanIP}:3001" -ForegroundColor White
Write-Host "  SSH:      ssh $env:USERNAME@$lanIP" -ForegroundColor White
Write-Host ""
Write-Host "  From your dev laptop:" -ForegroundColor Yellow
Write-Host "    ssh $env:USERNAME@$lanIP          # remote access" -ForegroundColor White
Write-Host "    http://${lanIP}:3001              # web UI" -ForegroundColor White
Write-Host ""
Write-Host "  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "    1. Run 'wsl --shutdown' then reopen WSL2 (for systemd)" -ForegroundColor White
Write-Host "    2. In WSL2: sudo systemctl start babylon-ingest" -ForegroundColor White
Write-Host "    3. Open qBittorrent and configure WebUI (port 8080)" -ForegroundColor White
Write-Host "    4. Set a static IP for this machine in your router" -ForegroundColor White
Write-Host "    5. Configure auto-login: Win+R → netplwiz → uncheck password" -ForegroundColor White
Write-Host ""
Write-Host "  MAC address (for router DHCP reservation):" -ForegroundColor Yellow
$mac = (Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.Name -like "*Ethernet*" } | Select-Object -First 1).MacAddress
if ($mac) { Write-Host "    $mac" -ForegroundColor White }
Write-Host ""
