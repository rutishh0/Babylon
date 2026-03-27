#!/usr/bin/env bash
# setup.sh — Idempotent VPS setup for Babylon (Ubuntu LTS, UpCloud Frankfurt)
# Run as root on first boot, safe to re-run.
set -euo pipefail

BABYLON_USER="babylon"
BABYLON_HOME="/opt/babylon"
DOWNLOAD_DIR="/downloads"

echo "=== Babylon VPS Setup ==="

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------
apt-get update -qq

# Node.js 22 LTS
if ! command -v node &>/dev/null || [[ "$(node --version)" != v22* ]]; then
  echo "Installing Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Python 3.12
if ! command -v python3.12 &>/dev/null; then
  echo "Installing Python 3.12..."
  add-apt-repository -y ppa:deadsnakes/ppa
  apt-get update -qq
  apt-get install -y python3.12 python3.12-venv python3.12-dev
fi

# FFmpeg (latest from apt)
if ! command -v ffmpeg &>/dev/null; then
  echo "Installing FFmpeg..."
  apt-get install -y ffmpeg
fi

# qBittorrent-nox
if ! command -v qbittorrent-nox &>/dev/null; then
  echo "Installing qBittorrent-nox..."
  apt-get install -y qbittorrent-nox
fi

# Nginx + Certbot
if ! command -v nginx &>/dev/null; then
  echo "Installing Nginx..."
  apt-get install -y nginx
fi

if ! command -v certbot &>/dev/null; then
  echo "Installing Certbot..."
  apt-get install -y certbot python3-certbot-nginx
fi

# Misc tools
apt-get install -y git curl wget unzip sqlite3

echo "System packages installed."

# ---------------------------------------------------------------------------
# 2. babylon user
# ---------------------------------------------------------------------------
if ! id "${BABYLON_USER}" &>/dev/null; then
  echo "Creating user ${BABYLON_USER}..."
  useradd -r -m -d "${BABYLON_HOME}" -s /bin/bash "${BABYLON_USER}"
fi

# ---------------------------------------------------------------------------
# 3. Directory layout
# ---------------------------------------------------------------------------
echo "Creating directories..."
mkdir -p "${BABYLON_HOME}"/{api,ingest,data}
mkdir -p "${DOWNLOAD_DIR}"/{raw,processed/subs}

chown -R "${BABYLON_USER}:${BABYLON_USER}" "${BABYLON_HOME}"
chown -R "${BABYLON_USER}:${BABYLON_USER}" "${DOWNLOAD_DIR}"

# ---------------------------------------------------------------------------
# 4. qBittorrent-nox initial config
# ---------------------------------------------------------------------------
QB_CONFIG_DIR="/home/${BABYLON_USER}/.config/qBittorrent"
QB_CONFIG="${QB_CONFIG_DIR}/qBittorrent.conf"

if [[ ! -f "${QB_CONFIG}" ]]; then
  echo "Configuring qBittorrent-nox..."
  mkdir -p "${QB_CONFIG_DIR}"
  cat > "${QB_CONFIG}" <<'QBCONF'
[LegalNotice]
Accepted=true

[Preferences]
WebUI\Address=127.0.0.1
WebUI\Port=8080
WebUI\Username=admin
WebUI\Password_PBKDF2="@ByteArray(...);"
WebUI\LocalHostAuth=false
Downloads\SavePath=/downloads/raw
Downloads\TempPath=/downloads/raw
QBCONF
  chown -R "${BABYLON_USER}:${BABYLON_USER}" "${QB_CONFIG_DIR}"
  echo "NOTE: Change qBittorrent WebUI password after first start!"
fi

# ---------------------------------------------------------------------------
# 5. Python virtualenv for ingest daemon
# ---------------------------------------------------------------------------
VENV_DIR="${BABYLON_HOME}/ingest/venv"
if [[ ! -d "${VENV_DIR}" ]]; then
  echo "Creating Python virtualenv..."
  sudo -u "${BABYLON_USER}" python3.12 -m venv "${VENV_DIR}"
fi

if [[ -f "${BABYLON_HOME}/ingest/requirements.txt" ]]; then
  echo "Installing Python dependencies..."
  sudo -u "${BABYLON_USER}" "${VENV_DIR}/bin/pip" install --quiet -r "${BABYLON_HOME}/ingest/requirements.txt"
fi

# ---------------------------------------------------------------------------
# 6. .env template
# ---------------------------------------------------------------------------
if [[ ! -f "${BABYLON_HOME}/.env" ]]; then
  if [[ -f "${BABYLON_HOME}/deploy/.env.example" ]]; then
    cp "${BABYLON_HOME}/deploy/.env.example" "${BABYLON_HOME}/.env"
    chown "${BABYLON_USER}:${BABYLON_USER}" "${BABYLON_HOME}/.env"
    chmod 600 "${BABYLON_HOME}/.env"
    echo "Copied .env.example → .env — FILL IN YOUR CREDENTIALS!"
  fi
fi

# ---------------------------------------------------------------------------
# 7. systemd services
# ---------------------------------------------------------------------------
echo "Installing systemd services..."

# qBittorrent-nox
if [[ ! -f /etc/systemd/system/qbittorrent-nox.service ]]; then
  cat > /etc/systemd/system/qbittorrent-nox.service <<QBSVC
[Unit]
Description=qBittorrent-nox
After=network.target

[Service]
Type=exec
User=${BABYLON_USER}
ExecStart=/usr/bin/qbittorrent-nox
Restart=on-failure

[Install]
WantedBy=multi-user.target
QBSVC
fi

# Copy API and ingest service files if present
for SVC in babylon-api.service babylon-ingest.service; do
  SRC="${BABYLON_HOME}/ingest/${SVC}"
  if [[ -f "${SRC}" ]] && [[ ! -f "/etc/systemd/system/${SVC}" ]]; then
    cp "${SRC}" "/etc/systemd/system/${SVC}"
    echo "Installed ${SVC}"
  fi
done

systemctl daemon-reload
systemctl enable qbittorrent-nox babylon-api babylon-ingest

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Edit ${BABYLON_HOME}/.env with your credentials"
echo "  2. Copy your built API to ${BABYLON_HOME}/api/"
echo "  3. Copy ingest/ files to ${BABYLON_HOME}/ingest/"
echo "  4. Run: certbot --nginx -d api.internalrr.info"
echo "  5. Run: systemctl start qbittorrent-nox babylon-api babylon-ingest"
echo "  6. Change qBittorrent WebUI password at http://127.0.0.1:8080"
