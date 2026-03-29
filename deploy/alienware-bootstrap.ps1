#Requires -RunAsAdministrator
# Babylon Phase 2 - Alienware Bootstrap Script
# Run ONCE on the Alienware as Administrator PowerShell.
# Handles: Node 22 LTS install, C++ build tools, pnpm, PM2, git clone, build,
#          PM2 services, qBittorrent, OpenSSH, WSL2 ingest daemon setup.

# DO NOT use $ErrorActionPreference = "Stop" -- npm writes to stderr for
# informational notices which PowerShell treats as terminating errors.

function Check-Success($msg) {
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Host "  FAILED: $msg (exit code $LASTEXITCODE)" -ForegroundColor Red
        Write-Host "  Fix the issue above and re-run this script." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Babylon Phase 2 - Alienware Bootstrap"
Write-Host "========================================"
Write-Host ""

# ============================================================
# STEP 0: Pre-flight
# ============================================================

Write-Host "[0/11] Pre-flight checks..." -ForegroundColor Yellow

# Find target drive
$targetDrive = "B:"
if (-not (Test-Path "$targetDrive\")) {
    $targetDrive = "D:"
    if (-not (Test-Path "$targetDrive\")) {
        $targetDrive = "C:"
        Write-Host "  WARNING: B: and D: not found, using C:" -ForegroundColor Red
    }
}

$driveLetter = $targetDrive -replace ":", ""
$driveInfo = Get-PSDrive $driveLetter
$freeGB = [math]::Round($driveInfo.Free / 1GB, 1)
Write-Host "  Target drive: $targetDrive ($freeGB GB free)" -ForegroundColor Green

# LAN IP
$lanIP = "192.168.1.100"
$ethAdapter = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
    $_.InterfaceAlias -like "*Ethernet*" -and $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1
if ($ethAdapter) { $lanIP = $ethAdapter.IPAddress }
else {
    $wifiAdapter = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
        $_.InterfaceAlias -like "*Wi-Fi*" -and $_.PrefixOrigin -ne "WellKnown"
    } | Select-Object -First 1
    if ($wifiAdapter) { $lanIP = $wifiAdapter.IPAddress }
}
Write-Host "  LAN IP: $lanIP" -ForegroundColor Green

$basePath = "$targetDrive\Babylon"
$wslDrive = $driveLetter.ToLower()

# ============================================================
# STEP 1: Windows power settings
# ============================================================

Write-Host "[1/11] Power settings..." -ForegroundColor Yellow

powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /hibernate off 2>$null
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0 2>$null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0 2>$null
powercfg /setactive SCHEME_CURRENT 2>$null

Write-Host "  Never sleep, lid close = do nothing" -ForegroundColor Green

# ============================================================
# STEP 2: Directory structure
# ============================================================

Write-Host "[2/11] Creating directories..." -ForegroundColor Yellow

foreach ($dir in @("$basePath\app","$basePath\media","$basePath\data","$basePath\downloads\raw","$basePath\downloads\processed")) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}
Write-Host "  $basePath\{app,media,data,downloads} created" -ForegroundColor Green

# ============================================================
# STEP 3: Install Node.js 22 LTS (MUST be v22, not v24)
# ============================================================

Write-Host "[3/11] Ensuring Node.js 22 LTS..." -ForegroundColor Yellow

$nodeOK = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    $currentVersion = (node --version 2>$null)
    if ($currentVersion -match "^v22\.") {
        Write-Host "  Node.js $currentVersion already installed" -ForegroundColor Green
        $nodeOK = $true
    } else {
        Write-Host "  Found $currentVersion but need v22 LTS. Installing..." -ForegroundColor Red
    }
} else {
    Write-Host "  Node.js not found. Installing..." -ForegroundColor Red
}

if (-not $nodeOK) {
    $nodeMsi = "$env:TEMP\node-v22.16.0-x64.msi"
    Write-Host "  Downloading Node.js 22.16.0 LTS..."

    # Remove old download if exists
    if (Test-Path $nodeMsi) { Remove-Item $nodeMsi -Force }

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi" -OutFile $nodeMsi -UseBasicParsing

    if (-not (Test-Path $nodeMsi)) {
        Write-Host "  ERROR: Failed to download Node.js MSI" -ForegroundColor Red
        exit 1
    }

    Write-Host "  Installing Node.js 22 LTS (will replace any existing version)..."
    # /quiet with ADDLOCAL=ALL forces full install including PATH update
    $proc = Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /quiet /norestart ADDLOCAL=ALL" -Wait -PassThru
    if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 3010) {
        Write-Host "  ERROR: Node.js MSI install failed with code $($proc.ExitCode)" -ForegroundColor Red
        Write-Host "  Try installing manually from: https://nodejs.org/en/download/" -ForegroundColor Yellow
        exit 1
    }

    # Refresh PATH so the current session sees the new Node
    $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH = "$machinePath;$userPath"

    # Also add common Node paths explicitly
    $nodePaths = @("C:\Program Files\nodejs", "$env:APPDATA\npm")
    foreach ($p in $nodePaths) {
        if ($env:PATH -notlike "*$p*") { $env:PATH = "$p;$env:PATH" }
    }

    # Verify
    $newVersion = & "C:\Program Files\nodejs\node.exe" --version 2>$null
    if ($newVersion -match "^v22\.") {
        Write-Host "  Node.js $newVersion installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: node --version reports '$newVersion', expected v22.x" -ForegroundColor Red
        Write-Host "  You may need to CLOSE THIS POWERSHELL, reopen as Admin, and re-run the script." -ForegroundColor Yellow
        Write-Host "  The Node 22 MSI has been installed but the current session still sees the old version." -ForegroundColor Yellow
        Read-Host "  Press Enter to try continuing anyway, or Ctrl+C to abort"
    }
}

# ============================================================
# STEP 4: Install Visual Studio Build Tools (insurance for native modules)
# ============================================================

Write-Host "[4/11] Checking C++ build tools..." -ForegroundColor Yellow

# Check if build tools are already present
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasBuildTools = $false

if (Test-Path $vsWhere) {
    $vsInstalls = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($vsInstalls) { $hasBuildTools = $true }
}

if ($hasBuildTools) {
    Write-Host "  Visual Studio C++ build tools found" -ForegroundColor Green
} else {
    Write-Host "  Installing Visual Studio Build Tools (for native npm modules)..."
    Write-Host "  This may take 5-10 minutes..."

    $vsbtUrl = "https://aka.ms/vs/17/release/vs_BuildTools.exe"
    $vsbtInstaller = "$env:TEMP\vs_BuildTools.exe"

    Invoke-WebRequest -Uri $vsbtUrl -OutFile $vsbtInstaller -UseBasicParsing
    $proc = Start-Process $vsbtInstaller -ArgumentList "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet --wait --norestart" -Wait -PassThru

    if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 3010) {
        Write-Host "  Build tools installed" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Build tools install returned code $($proc.ExitCode)" -ForegroundColor Yellow
        Write-Host "  Continuing -- Node 22 has prebuilt binaries for better-sqlite3 so this may not matter" -ForegroundColor Yellow
    }
}

# ============================================================
# STEP 5: Install pnpm and PM2
# ============================================================

Write-Host "[5/11] Installing pnpm and PM2..." -ForegroundColor Yellow

# Use the Node we just installed explicitly
$npmCmd = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $npmCmd)) { $npmCmd = "npm" }

# pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing pnpm..."
    & $npmCmd install -g pnpm 2>&1 | Out-Null
}

# PM2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing PM2..."
    & $npmCmd install -g pm2 2>&1 | Out-Null
}

# Refresh PATH again after global installs
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User") + ";$env:APPDATA\npm"

$pnpmVer = pnpm --version 2>$null
$pm2Ver = pm2 --version 2>$null
Write-Host "  pnpm $pnpmVer, PM2 $pm2Ver" -ForegroundColor Green

# ============================================================
# STEP 6: Clone repo and build
# ============================================================

Write-Host "[6/11] Cloning and building..." -ForegroundColor Yellow

$repoUrl = "https://github.com/rutishh0/Babylon.git"

if (-not (Test-Path "$basePath\app\.git")) {
    Write-Host "  Cloning repo..."
    git clone $repoUrl "$basePath\app" 2>&1
    Check-Success "git clone"
} else {
    Write-Host "  Repo exists, pulling latest..."
    Push-Location "$basePath\app"
    git pull origin master 2>&1
    Pop-Location
}

Push-Location "$basePath\app"

Write-Host "  Running pnpm install..."
pnpm install 2>&1
Check-Success "pnpm install"

Write-Host "  Running pnpm build..."
# Use npx turbo as fallback in case turbo isn't in PATH
pnpm build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  pnpm build failed, trying npx turbo build..."
    npx turbo build 2>&1
    Check-Success "npx turbo build"
}

Pop-Location
Write-Host "  Build successful" -ForegroundColor Green

# ============================================================
# STEP 7: Create .env
# ============================================================

Write-Host "[7/11] Creating .env..." -ForegroundColor Yellow

$envContent = @"
LOCAL_MEDIA_PATH=$basePath\media
PORT=3000
DATABASE_URL=file:$basePath\data\babylon.db
BABYLON_PIN=
ALLOWED_ORIGINS=http://localhost:3001,http://${lanIP}:3001
TMDB_API_KEY=bab4f1103df2e22a6e5d472944163962
TMDB_READ_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYWI0ZjExMDNkZjJlMjJhNmU1ZDQ3Mjk0NDE2Mzk2MiIsIm5iZiI6MTc3NDYxNTE4Mi4zOTgwMDAyLCJzdWIiOiI2OWM2N2E4ZWQ3NDE1NTMzNGU0MjFmMWIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.cQl9vnKyBeyVsmEa801pn3dcwkRNCG06BLiPWNI8E1w
INGEST_STATE_DIR=$basePath\app\ingest
"@

[System.IO.File]::WriteAllText("$basePath\app\.env", $envContent, (New-Object System.Text.UTF8Encoding $false))
Write-Host "  .env written" -ForegroundColor Green

# ============================================================
# STEP 8: PM2 services
# ============================================================

Write-Host "[8/11] Starting PM2 services..." -ForegroundColor Yellow

Push-Location "$basePath\app"

# Fix drive letter in ecosystem config
$ecoPath = "$basePath\app\deploy\ecosystem.config.cjs"
$ecoContent = [System.IO.File]::ReadAllText($ecoPath)
$ecoContent = $ecoContent -replace "B:/Babylon", ($targetDrive + "/Babylon")
[System.IO.File]::WriteAllText($ecoPath, $ecoContent, (New-Object System.Text.UTF8Encoding $false))

pm2 delete all 2>$null
pm2 start deploy\ecosystem.config.cjs 2>&1
pm2 save 2>&1

Pop-Location

schtasks /create /tn "PM2 Startup" /tr "cmd /c pm2 resurrect" /sc onlogon /rl highest /f 2>$null

Write-Host "  PM2 running, Task Scheduler auto-start created" -ForegroundColor Green

# ============================================================
# STEP 9: OpenSSH Server
# ============================================================

Write-Host "[9/11] Enabling SSH server..." -ForegroundColor Yellow

try {
    $sshCap = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
    if ($sshCap.State -ne 'Installed') {
        Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0' | Out-Null
    }
    Start-Service sshd -ErrorAction SilentlyContinue
    Set-Service -Name sshd -StartupType Automatic -ErrorAction SilentlyContinue
    $fwRule = Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue
    if (-not $fwRule) {
        New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
    }
    Write-Host "  SSH enabled on port 22" -ForegroundColor Green
} catch {
    Write-Host "  SSH setup skipped: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================================
# STEP 10: WSL2 setup
# ============================================================

Write-Host "[10/11] WSL2 setup..." -ForegroundColor Yellow

$wslInstalled = $false
try {
    $wslOut = wsl --list --quiet 2>$null
    if ($wslOut -match "Ubuntu") { $wslInstalled = $true }
} catch {}

if (-not $wslInstalled) {
    Write-Host "  WSL2 Ubuntu not found. Run 'wsl --install -d Ubuntu' manually." -ForegroundColor Yellow
    Write-Host "  Then re-run this script." -ForegroundColor Yellow
} else {
    Write-Host "  WSL2 Ubuntu found" -ForegroundColor Green

    # Write the WSL setup script with proper escaping
    $wslScriptContent = @"
#!/bin/bash
set -e
echo "=== WSL2 Ingest Setup ==="
if ! grep -q "systemd=true" /etc/wsl.conf 2>/dev/null; then
    printf "[boot]\nsystemd=true\n" | sudo tee /etc/wsl.conf
    echo "systemd will be enabled after wsl --shutdown"
fi
sudo apt-get update -qq
sudo apt-get install -y python3 python3-venv python3-pip ffmpeg 2>/dev/null || true
IDIR="/mnt/$wslDrive/Babylon/app/ingest"
if [ -d "`$IDIR" ]; then
    cd "`$IDIR"
    python3 -m venv venv 2>/dev/null || true
    if [ -f "venv/bin/activate" ]; then
        . venv/bin/activate
        pip install -r requirements.txt 2>/dev/null || true
        pip install beautifulsoup4 lxml 2>/dev/null || true
    fi
fi
echo "=== Done ==="
"@

    $wslScriptPath = "$basePath\app\deploy\wsl-setup.sh"
    [System.IO.File]::WriteAllText($wslScriptPath, $wslScriptContent.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))

    Write-Host "  Running WSL2 setup (apt install, python venv)..."
    wsl bash "/mnt/$wslDrive/Babylon/app/deploy/wsl-setup.sh" 2>&1
    Write-Host "  WSL2 configured" -ForegroundColor Green
}

# ============================================================
# STEP 11: Summary
# ============================================================

$macAddr = $null
try {
    $macAddr = (Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.Name -like "*Ethernet*" } | Select-Object -First 1).MacAddress
} catch {}

# Quick health check
Write-Host ""
Write-Host "[11/11] Verifying..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "  API health check: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "  API not responding yet (may need a few seconds to start)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  API:  http://localhost:3000" -ForegroundColor White
Write-Host "  Web:  http://${lanIP}:3001" -ForegroundColor White
Write-Host "  SSH:  ssh $env:USERNAME@$lanIP" -ForegroundColor White
Write-Host ""
Write-Host "  MANUAL STEPS REMAINING:" -ForegroundColor Yellow
Write-Host "  1. Close PowerShell, run: wsl --shutdown" -ForegroundColor White
Write-Host "     Then reopen WSL Ubuntu and run:" -ForegroundColor White
Write-Host "     sudo systemctl start babylon-ingest" -ForegroundColor White
Write-Host "  2. Open qBittorrent, enable WebUI (port 8080)" -ForegroundColor White
Write-Host "  3. Set static IP in router for this machine" -ForegroundColor White
Write-Host "  4. Auto-login: Win+R > netplwiz > uncheck password" -ForegroundColor White
Write-Host ""
if ($macAddr) {
    Write-Host "  Ethernet MAC (for router): $macAddr" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  After those steps, close the lid. It runs forever." -ForegroundColor Green
Write-Host ""
