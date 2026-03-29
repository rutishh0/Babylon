#Requires -RunAsAdministrator
# Babylon Phase 2 - Alienware Bootstrap Script
# Run this ONCE on the Alienware laptop as Administrator.

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================"
Write-Host "  Babylon Phase 2 - Alienware Bootstrap"
Write-Host "========================================"
Write-Host ""

# ----------------------------------------
# 0. Pre-flight checks
# ----------------------------------------

Write-Host "[0/10] Pre-flight checks..."

$targetDrive = "B:"
if (-not (Test-Path "$targetDrive\")) {
    $targetDrive = "D:"
    if (-not (Test-Path "$targetDrive\")) {
        $targetDrive = "C:"
        Write-Host "  WARNING: B: and D: drives not found. Using C: instead."
    }
}

$driveLetter = $targetDrive -replace ":", ""
$driveInfo = Get-PSDrive $driveLetter
$freeGB = [math]::Round($driveInfo.Free / 1GB, 1)
Write-Host "  Drive $targetDrive has $freeGB GB free"

if ($freeGB -lt 200) {
    Write-Host "  CRITICAL: Less than 200GB free!"
    $cont = Read-Host "  Continue anyway? (y/n)"
    if ($cont -ne "y") { exit 1 }
}

# Get LAN IP
$ethernetIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -like "*Ethernet*" -and $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1

if ($ethernetIP) {
    $lanIP = $ethernetIP.IPAddress
    Write-Host "  Ethernet LAN IP: $lanIP"
} else {
    $wifiIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.InterfaceAlias -like "*Wi-Fi*" -and $_.PrefixOrigin -ne "WellKnown"
    } | Select-Object -First 1
    if ($wifiIP) {
        $lanIP = $wifiIP.IPAddress
    } else {
        $lanIP = "192.168.1.100"
    }
    Write-Host "  No Ethernet found. Using: $lanIP"
}

$repoUrl = Read-Host "  Enter GitHub repo URL (Enter for https://github.com/rutishh0/Babylon.git)"
if (-not $repoUrl) { $repoUrl = "https://github.com/rutishh0/Babylon.git" }

$basePath = "$targetDrive\Babylon"
$wslDrive = $driveLetter.ToLower()

Write-Host ""
Write-Host "  Base path: $basePath"
Write-Host "  WSL path:  /mnt/$wslDrive/Babylon"
Write-Host "  LAN IP:    $lanIP"
Write-Host "  Repo:      $repoUrl"
Write-Host ""

# ----------------------------------------
# 1. Windows power settings
# ----------------------------------------

Write-Host "[1/10] Configuring Windows power settings..."

powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /hibernate off
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setactive SCHEME_CURRENT

Write-Host "  Done: High Performance, never sleep, lid close = do nothing"

# ----------------------------------------
# 2. Create directory structure
# ----------------------------------------

Write-Host "[2/10] Creating directory structure..."

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

Write-Host "  Created: $basePath\{app,media,data,downloads}"

# ----------------------------------------
# 3. Install Node.js, pnpm, PM2
# ----------------------------------------

Write-Host "[3/10] Installing Node.js, pnpm, PM2..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  Downloading Node.js 22 LTS..."
    $nodeUrl = "https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi"
    $nodeInstaller = "$env:TEMP\node-setup.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    Write-Host "  Node.js installed"
} else {
    Write-Host "  Node.js already installed: $(node --version)"
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing pnpm..."
    npm install -g pnpm 2>$null
}

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing PM2..."
    npm install -g pm2 2>$null
}

Write-Host "  Node/pnpm/PM2 ready"

# ----------------------------------------
# 4. Clone repo and build
# ----------------------------------------

Write-Host "[4/10] Cloning repo and building..."

if (-not (Test-Path "$basePath\app\.git")) {
    git clone $repoUrl "$basePath\app"
} else {
    Push-Location "$basePath\app"
    git pull origin master
    Pop-Location
}

Push-Location "$basePath\app"
pnpm install
pnpm build
Pop-Location

Write-Host "  Build complete"

# ----------------------------------------
# 5. Create .env file
# ----------------------------------------

Write-Host "[5/10] Creating environment config..."

$envText = "# Babylon Phase 2 - Local Alienware`n"
$envText += "LOCAL_MEDIA_PATH=$basePath\media`n"
$envText += "PORT=3000`n"
$envText += "DATABASE_URL=file:$basePath\data\babylon.db`n"
$envText += "BABYLON_PIN=`n"
$envText += "ALLOWED_ORIGINS=http://localhost:3001,http://${lanIP}:3001`n"
$envText += "`n"
$envText += "TMDB_API_KEY=bab4f1103df2e22a6e5d472944163962`n"
$envText += "TMDB_READ_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYWI0ZjExMDNkZjJlMjJhNmU1ZDQ3Mjk0NDE2Mzk2MiIsIm5iZiI6MTc3NDYxNTE4Mi4zOTgwMDAyLCJzdWIiOiI2OWM2N2E4ZWQ3NDE1NTMzNGU0MjFmMWIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.cQl9vnKyBeyVsmEa801pn3dcwkRNCG06BLiPWNI8E1w`n"
$envText += "`n"
$envText += "INGEST_STATE_DIR=$basePath\app\ingest`n"

[System.IO.File]::WriteAllText("$basePath\app\.env", $envText.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))

Write-Host "  .env created"

# ----------------------------------------
# 6. Start PM2 services
# ----------------------------------------

Write-Host "[6/10] Starting PM2 services..."

Push-Location "$basePath\app"

$ecoContent = Get-Content "deploy\ecosystem.config.cjs" -Raw
$ecoContent = $ecoContent -replace "B:/Babylon", ($targetDrive + "/Babylon")
[System.IO.File]::WriteAllText("$basePath\app\deploy\ecosystem.config.cjs", $ecoContent, (New-Object System.Text.UTF8Encoding $false))

pm2 start deploy\ecosystem.config.cjs
pm2 save
Pop-Location

schtasks /create /tn "PM2 Startup" /tr "cmd /c pm2 resurrect" /sc onlogon /rl highest /f 2>$null

Write-Host "  PM2 running, auto-start configured"

# ----------------------------------------
# 7. Install qBittorrent
# ----------------------------------------

Write-Host "[7/10] Setting up qBittorrent..."

$qbtPath = "${env:ProgramFiles}\qBittorrent\qbittorrent.exe"
if (-not (Test-Path $qbtPath)) {
    Write-Host "  Please install qBittorrent manually from https://www.qbittorrent.org/download"
    Write-Host "  Then enable WebUI in Preferences on port 8080"
} else {
    Write-Host "  qBittorrent already installed"
    $startupFolder = [Environment]::GetFolderPath("Startup")
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut("$startupFolder\qBittorrent.lnk")
    $shortcut.TargetPath = $qbtPath
    $shortcut.Arguments = "--minimized"
    $shortcut.Save()
    Write-Host "  Added to startup"
}

# ----------------------------------------
# 8. Enable OpenSSH Server
# ----------------------------------------

Write-Host "[8/10] Enabling SSH server..."

try {
    $sshCap = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
    if ($sshCap.State -ne 'Installed') {
        Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'
    }
    Start-Service sshd -ErrorAction SilentlyContinue
    Set-Service -Name sshd -StartupType Automatic
    $fwRule = Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue
    if (-not $fwRule) {
        New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
    }
    Write-Host "  SSH server enabled on port 22"
} catch {
    Write-Host "  SSH setup failed: $($_.Exception.Message)"
    Write-Host "  You can install OpenSSH Server manually from Settings > Apps > Optional Features"
}

# ----------------------------------------
# 9. Setup WSL2 + Python ingest daemon
# ----------------------------------------

Write-Host "[9/10] Setting up WSL2..."

$wslList = wsl --list --quiet 2>$null
if (-not $wslList -or ($wslList -notmatch "Ubuntu")) {
    Write-Host "  WSL2 Ubuntu not found. Install it with: wsl --install -d Ubuntu"
    Write-Host "  Then re-run this script."
} else {
    Write-Host "  WSL2 Ubuntu found, configuring..."

    $wslSetup = "#!/bin/bash`nset -e`necho '=== WSL2 Setup ==='`n"
    $wslSetup += "if ! grep -q 'systemd=true' /etc/wsl.conf 2>/dev/null; then`n"
    $wslSetup += "  echo -e '[boot]\nsystemd=true' | sudo tee /etc/wsl.conf`n"
    $wslSetup += "  echo 'systemd enabled'`nfi`n"
    $wslSetup += "sudo apt-get update -qq`n"
    $wslSetup += "sudo apt-get install -y python3 python3-venv python3-pip ffmpeg 2>/dev/null`n"
    $wslSetup += "IDIR=/mnt/$wslDrive/Babylon/app/ingest`n"
    $wslSetup += "if [ -d `"`$IDIR`" ]; then`n"
    $wslSetup += "  cd `"`$IDIR`"`n"
    $wslSetup += "  python3 -m venv venv`n"
    $wslSetup += "  source venv/bin/activate`n"
    $wslSetup += "  pip install -r requirements.txt`n"
    $wslSetup += "  pip install beautifulsoup4 lxml`nfi`n"
    $wslSetup += "echo '=== WSL2 setup complete ==='`n"

    $wslScriptPath = "$basePath\app\deploy\wsl-setup.sh"
    [System.IO.File]::WriteAllText($wslScriptPath, $wslSetup.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))

    wsl bash "/mnt/$wslDrive/Babylon/app/deploy/wsl-setup.sh"
}

# ----------------------------------------
# 10. Final summary
# ----------------------------------------

$macAddr = (Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.Name -like "*Ethernet*" } | Select-Object -First 1).MacAddress

Write-Host ""
Write-Host "========================================"
Write-Host "  Babylon is running!"
Write-Host "========================================"
Write-Host ""
Write-Host "  API:  http://localhost:3000/api/health"
Write-Host "  Web:  http://${lanIP}:3001"
Write-Host "  SSH:  ssh $env:USERNAME@$lanIP"
Write-Host ""
Write-Host "  NEXT STEPS:"
Write-Host "    1. wsl --shutdown (PowerShell), then reopen WSL2"
Write-Host "    2. In WSL2: sudo systemctl start babylon-ingest"
Write-Host "    3. Open qBittorrent, enable WebUI on port 8080"
Write-Host "    4. Set static IP in router for this machine"
Write-Host "    5. Auto-login: Win+R > netplwiz > uncheck password"
Write-Host ""
if ($macAddr) {
    Write-Host "  Ethernet MAC: $macAddr"
}
Write-Host ""
