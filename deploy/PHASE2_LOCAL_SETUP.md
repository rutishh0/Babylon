# Babylon Phase 2 -- Local Alienware Setup Guide

> One-time setup. After completing every step below, the Alienware runs headless and deploys automatically on `git push`. You never touch it again.

---

## 1. Pre-flight: Disk Space Check

Open PowerShell on the Alienware and check available space:

```powershell
Get-PSDrive D
```

If you don't have a B: drive, check C: instead:

```powershell
Get-PSDrive C
```

| Free Space | Action |
|------------|--------|
| < 200 GB | **STOP.** Get an external drive or free up space before proceeding. |
| 200--300 GB | Proceed, but limit your watchlist to ~40 titles to avoid running out. |
| 300 GB+ | Full green light. No restrictions. |

---

## 2. Windows Configuration (do first -- requires restart)

These settings ensure the Alienware stays on 24/7 and boots straight to the desktop.

### Auto-login (skip the password screen on boot)

1. Press `Win+R`, type `netplwiz`, press Enter.
2. Uncheck **"Users must enter a user name and password to use this computer"**.
3. Click Apply. Enter your Windows password when prompted. Click OK.

### High Performance power plan

1. Open **Settings > System > Power & sleep** (or **Power & battery** on newer builds).
2. Set the power plan to **High Performance**.
   - If High Performance is not visible: open Control Panel > Power Options > Show additional plans.

### Never sleep

1. Open **Control Panel > Power Options > Change plan settings** (for your active plan).
2. Set **Turn off the display** to **Never** (both battery and plugged in, if applicable).
3. Set **Put the computer to sleep** to **Never** (both battery and plugged in).

### Lid close action

1. In Power Options, click **Choose what closing the lid does** (left sidebar).
2. Set **When I close the lid** to **Do nothing** for both "On battery" and "Plugged in".
3. Click **Save changes**.

### Disable hibernate

Open an **Administrator Command Prompt** and run:

```cmd
powercfg /hibernate off
```

### Disable USB selective suspend

1. Open **Control Panel > Power Options > Change plan settings > Change advanced power settings**.
2. Expand **USB settings > USB selective suspend setting**.
3. Set to **Disabled** (both battery and plugged in).

**Restart the Alienware now** to apply auto-login and power settings.

---

## 3. Network Static IP

A static LAN IP ensures the Alienware is always reachable at the same address.

### Find your Ethernet MAC address

Open Command Prompt on the Alienware:

```cmd
ipconfig /all
```

Look for **Ethernet adapter** (not Wi-Fi). Note the **Physical Address** (e.g. `A4-BB-6D-12-34-56`).

### Reserve a static IP in your router

1. Log into your router's admin panel (usually `http://192.168.1.1` or `http://192.168.0.1`).
2. Find **DHCP Reservation** or **Static Lease** settings (often under LAN or DHCP).
3. Add a new reservation:
   - **MAC Address**: the Ethernet MAC from above
   - **IP Address**: pick something outside the DHCP pool, e.g. `192.168.1.100`
4. Save the reservation.

### Apply the new IP

Either restart the Alienware's Ethernet adapter (disable/enable in Network Connections) or simply reboot.

### Verify

```cmd
ipconfig
```

The Ethernet adapter should now show your reserved IP (e.g. `192.168.1.100`).

---

## 4. WSL2 Setup (requires wsl --shutdown)

### Install WSL2

Open **PowerShell as Administrator**:

```powershell
wsl --install -d Ubuntu
```

Follow the prompts to create a Unix username and password. Once the Ubuntu terminal opens, proceed below.

### Enable systemd

Edit (or create) `/etc/wsl.conf` inside the Ubuntu terminal:

```bash
sudo nano /etc/wsl.conf
```

Add the following:

```ini
[boot]
systemd=true
```

Save and exit (`Ctrl+O`, Enter, `Ctrl+X`).

### CRITICAL: Restart WSL2 now

From **PowerShell** (not the Ubuntu terminal):

```powershell
wsl --shutdown
```

Then reopen the Ubuntu terminal from the Start menu.

### Verify systemd is running

```bash
systemctl status
```

You should see the system manager running with a tree of services. If you see "System has not been booted with systemd", the restart did not take effect -- repeat the shutdown step.

### Install Python and FFmpeg

```bash
sudo apt update && sudo apt install -y python3.12 python3.12-venv python3-pip ffmpeg
```

If `python3.12` is not available in your Ubuntu version's repos, use `python3` instead (Ubuntu 24.04+ ships 3.12 by default).

---

## 5. Windows Prerequisites

Install these on Windows (not inside WSL2).

### Node.js 22 LTS

Download and run the Windows installer from [https://nodejs.org](https://nodejs.org). Choose the LTS version (22.x).

After installation, open a **new** PowerShell window and verify:

```powershell
node --version   # should show v22.x.x
npm --version
```

### pnpm

```powershell
npm install -g pnpm
```

### PM2

```powershell
npm install -g pm2
```

### qBittorrent

1. Download and install from [https://www.qbittorrent.org](https://www.qbittorrent.org) (Windows native version).
2. Open qBittorrent. Go to **Tools > Preferences > Web UI**.
3. Check **"Web User Interface (Remote Control)"**.
4. Set port to `8080`.
5. Set username to `admin` and choose a password.
6. Click OK.

### Auto-start qBittorrent on login

1. Press `Win+R`, type `shell:startup`, press Enter. This opens the Startup folder.
2. Right-click inside the folder > **New > Shortcut**.
3. Browse to the qBittorrent executable (usually `C:\Program Files\qBittorrent\qbittorrent.exe`).
4. Click Next, name it "qBittorrent", click Finish.

---

## 6. Directory Structure

Open **PowerShell** on the Alienware and create the folder layout:

```powershell
mkdir B:\Babylon\app
mkdir B:\Babylon\media
mkdir B:\Babylon\data
mkdir B:\Babylon\downloads\raw
mkdir B:\Babylon\downloads\processed
mkdir B:\Babylon\repo.git
```

If you don't have a B: drive, substitute `C:\Babylon` everywhere (and update all paths in `.env` and `ecosystem.config.cjs` accordingly).

---

## 7. Git Remote Setup

### On the Alienware (WSL2 Ubuntu terminal)

```bash
cd /mnt/b/Babylon
git init --bare repo.git
```

### Deploy the app for the first time

On your **dev machine** (laptop, desktop -- not the Alienware):

```bash
# Add the Alienware as a git remote
git remote add alienware ssh://<your-username>@<ALIENWARE-LAN-IP>/mnt/b/Babylon/repo.git

# Push the code
git push alienware master
```

Replace `<your-username>` with your WSL2 Ubuntu username and `<ALIENWARE-LAN-IP>` with the static IP from step 3 (e.g. `192.168.1.100`).

### Install the post-receive hook

Back on the Alienware (WSL2 Ubuntu terminal):

```bash
cp /mnt/b/Babylon/app/deploy/post-receive /mnt/b/Babylon/repo.git/hooks/post-receive
chmod +x /mnt/b/Babylon/repo.git/hooks/post-receive
```

From now on, every `git push alienware master` will automatically deploy, build, and reload services.

---

## 8. Environment Setup

On the Alienware, copy the example env file and fill in your real values:

**PowerShell:**

```powershell
Copy-Item B:\Babylon\app\deploy\.env.phase2.example B:\Babylon\app\.env
```

**Then edit `B:\Babylon\app\.env`** with your actual values:

- `BABYLON_PIN` -- choose a PIN for the app
- `TMDB_API_KEY` -- your TMDB API key
- `TMDB_READ_ACCESS_TOKEN` -- your TMDB read access token
- `QBITTORRENT_PASS` -- the password you set in step 5
- `ALLOWED_ORIGINS` -- update the IP to match your Alienware's static IP (e.g. `http://localhost:3001,http://192.168.1.100:3001`)

---

## 9. Python Ingest Daemon (WSL2)

All of these commands run inside the **WSL2 Ubuntu terminal**.

### Create the virtual environment and install dependencies

```bash
cd /mnt/b/Babylon/app/ingest
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install beautifulsoup4 lxml
```

### Install and start the systemd service

```bash
sudo cp /mnt/b/Babylon/app/deploy/babylon-ingest-wsl2.service /etc/systemd/system/babylon-ingest.service
sudo systemctl daemon-reload
sudo systemctl enable babylon-ingest
sudo systemctl start babylon-ingest
```

### Verify the daemon is running

```bash
sudo systemctl status babylon-ingest
```

You should see `active (running)`. If it shows `failed`, check logs with:

```bash
sudo journalctl -u babylon-ingest -f
```

---

## 10. PM2 Setup (Windows)

Open **PowerShell** on the Alienware.

### Start the services

```powershell
cd B:\Babylon\app
pm2 start deploy\ecosystem.config.cjs
pm2 save
```

### Auto-start PM2 on login

Create a Task Scheduler entry so PM2 resurrects saved processes whenever Windows starts:

```powershell
schtasks /create /tn "PM2 Startup" /tr "cmd /c pm2 resurrect" /sc onlogon /rl highest /f
```

You can verify the scheduled task was created:

```powershell
schtasks /query /tn "PM2 Startup"
```

---

## 11. Verification Checklist

Run through each of these to confirm everything works.

### API health check (on the Alienware)

```bash
curl http://localhost:3000/api/health
```

Expected response: `{"status":"ok"}`

### Web UI from another device

Open a browser on your phone or another computer on the same Wi-Fi network and navigate to:

```
http://<ALIENWARE-IP>:3001
```

You should see the Babylon web interface.

### Ingest daemon (WSL2 Ubuntu terminal)

```bash
sudo systemctl status babylon-ingest
```

Should show `active (running)`.

### qBittorrent WebUI

Open a browser on the Alienware (or any device on the LAN):

```
http://localhost:8080
```

Log in with the credentials you set in step 5.

### Push-to-deploy (from your dev machine)

```bash
git push alienware master
```

Watch the output. It should show the post-receive hook running: installing deps, building, and reloading PM2. After it completes, refresh the web UI to confirm.

---

## 12. Post-Setup: Never Touch Again

Congratulations. The Alienware is now a headless, self-healing streaming server.

**Close the lid.** It stays running.

From this point forward:

| Task | How |
|------|-----|
| Deploy code changes | `git push alienware master` from your dev laptop |
| Monitor ingest status | Open `http://<ALIENWARE-IP>:3001` and check the Ingest Status panel |
| Check service health | `curl http://<ALIENWARE-IP>:3000/api/health` |
| View ingest logs | SSH into the Alienware, then `sudo journalctl -u babylon-ingest -f` in WSL2 |
| View API/web logs | SSH into the Alienware, then `pm2 logs` in PowerShell |
| Restart services manually | `pm2 restart all` (Windows) or `sudo systemctl restart babylon-ingest` (WSL2) |

The machine auto-starts all services on boot or crash without any intervention. You never need to open the lid, plug in a monitor, or manually start anything.
