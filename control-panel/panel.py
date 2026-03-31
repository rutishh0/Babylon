"""
Babylon Control Panel
Desktop management dashboard for the Babylon anime platform.
Built with customtkinter for a modern dark-themed UI.
"""

import os
import sys
import json
import socket
import subprocess
import threading
import webbrowser
import time
from pathlib import Path
from datetime import datetime

import customtkinter as ctk
import psutil
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BABYLON_ROOT = Path(r"B:\Babylon\app")
MEDIA_PATH = Path(r"B:\Babylon\media")
DATA_PATH = Path(r"B:\Babylon\data")
DOWNLOADS_RAW = Path(r"B:\Babylon\downloads\raw")
DOWNLOADS_PROCESSED = Path(r"B:\Babylon\downloads\processed")
PM2_LOG_DIR = Path(r"C:\Users\rutis\.pm2\logs")

API_HOST = "localhost"
API_PORT = 3000
WEB_PORT = 3001
ANIME_PORT = 5000
LAN_WEB_URL = "http://192.168.1.140:3001"

SERVICE_MAP = {
    "babylon-api": {"port": API_PORT, "health": f"http://localhost:{API_PORT}/api/health"},
    "babylon-web": {"port": WEB_PORT, "health": f"http://localhost:{WEB_PORT}"},
    "babylon-anime": {"port": ANIME_PORT, "health": f"http://localhost:{ANIME_PORT}/api/health"},
}

REFRESH_INTERVAL_MS = 5000
LOG_POLL_INTERVAL_MS = 2000

# ---------------------------------------------------------------------------
# Theme / Colours
# ---------------------------------------------------------------------------

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

CLR_BG = "#1a1a2e"
CLR_SIDEBAR = "#16213e"
CLR_CARD = "#1f2937"
CLR_CARD_BORDER = "#374151"
CLR_ACCENT = "#7c3aed"
CLR_ACCENT_HOVER = "#6d28d9"
CLR_GREEN = "#22c55e"
CLR_RED = "#ef4444"
CLR_YELLOW = "#eab308"
CLR_TEXT = "#e2e8f0"
CLR_TEXT_DIM = "#94a3b8"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def check_port(port: int, host: str = "localhost", timeout: float = 0.5) -> bool:
    """Return True if *port* is accepting connections."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, ConnectionRefusedError, TimeoutError):
        return False


def check_health(url: str, timeout: float = 1.0) -> bool:
    """Return True if a GET to *url* responds with 2xx."""
    try:
        r = requests.get(url, timeout=timeout)
        return r.ok
    except Exception:
        return False


def get_lan_ip() -> str:
    """Best-effort LAN IP detection."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "unknown"


def human_size(nbytes: float) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(nbytes) < 1024:
            return f"{nbytes:.1f} {unit}"
        nbytes /= 1024
    return f"{nbytes:.1f} PB"


def dir_size(path: Path) -> int:
    """Total size of a directory tree in bytes."""
    total = 0
    try:
        for entry in path.rglob("*"):
            if entry.is_file():
                total += entry.stat().st_size
    except Exception:
        pass
    return total


def run_cmd(cmd: str, cwd: str | None = None, shell: bool = True) -> str:
    """Run a shell command and return combined stdout+stderr."""
    try:
        result = subprocess.run(
            cmd, cwd=cwd, shell=shell,
            capture_output=True, text=True, timeout=10,
        )
        return (result.stdout + "\n" + result.stderr).strip()
    except subprocess.TimeoutExpired:
        return "[timeout]"
    except Exception as exc:
        return f"[error] {exc}"


def run_cmd_async(cmd: str, callback=None, cwd: str | None = None):
    """Run a command in a background thread; call *callback(output)* when done."""
    def _worker():
        output = run_cmd(cmd, cwd=cwd)
        if callback:
            callback(output)
    threading.Thread(target=_worker, daemon=True).start()


# ---------------------------------------------------------------------------
# Reusable Widgets
# ---------------------------------------------------------------------------


class StatusDot(ctk.CTkFrame):
    """Small coloured circle used as a status indicator."""

    def __init__(self, master, color: str = CLR_RED, size: int = 12, **kw):
        super().__init__(master, width=size, height=size, corner_radius=size // 2,
                         fg_color=color, **kw)
        self._size = size
        self.configure(width=size, height=size)

    def set_color(self, color: str):
        self.configure(fg_color=color)


class StatusCard(ctk.CTkFrame):
    """Card showing service name, status dot, and optional detail text."""

    def __init__(self, master, title: str, **kw):
        super().__init__(master, fg_color=CLR_CARD, corner_radius=12, **kw)
        self.grid_columnconfigure(1, weight=1)

        self.dot = StatusDot(self, color=CLR_RED)
        self.dot.grid(row=0, column=0, padx=(16, 8), pady=(16, 4))

        self.title_label = ctk.CTkLabel(self, text=title, font=ctk.CTkFont(size=15, weight="bold"),
                                        text_color=CLR_TEXT, anchor="w")
        self.title_label.grid(row=0, column=1, sticky="w", pady=(16, 4))

        self.detail_label = ctk.CTkLabel(self, text="Checking...", font=ctk.CTkFont(size=12),
                                         text_color=CLR_TEXT_DIM, anchor="w")
        self.detail_label.grid(row=1, column=1, sticky="w", padx=(0, 16), pady=(0, 16))

    def update_status(self, online: bool, detail: str = ""):
        self.dot.set_color(CLR_GREEN if online else CLR_RED)
        self.detail_label.configure(text=detail or ("Online" if online else "Offline"))


# ---------------------------------------------------------------------------
# Panel Pages
# ---------------------------------------------------------------------------


class DashboardPanel(ctk.CTkScrollableFrame):
    """Main dashboard overview."""

    def __init__(self, master, app: "BabylonControlPanel"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.grid_columnconfigure(0, weight=1)

        # --- Title ---
        ctk.CTkLabel(self, text="Dashboard", font=ctk.CTkFont(size=24, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, sticky="w", padx=20, pady=(20, 10))

        # --- Service status cards ---
        cards_frame = ctk.CTkFrame(self, fg_color="transparent")
        cards_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=5)
        cards_frame.grid_columnconfigure((0, 1, 2), weight=1)

        self.api_card = StatusCard(cards_frame, "API  :3000")
        self.api_card.grid(row=0, column=0, sticky="ew", padx=(0, 8), pady=4)

        self.web_card = StatusCard(cards_frame, "Web  :3001")
        self.web_card.grid(row=0, column=1, sticky="ew", padx=4, pady=4)

        self.anime_card = StatusCard(cards_frame, "Anime  :5000")
        self.anime_card.grid(row=0, column=2, sticky="ew", padx=(8, 0), pady=4)

        # --- Quick stats ---
        stats_frame = ctk.CTkFrame(self, fg_color=CLR_CARD, corner_radius=12)
        stats_frame.grid(row=2, column=0, sticky="ew", padx=20, pady=10)
        stats_frame.grid_columnconfigure((0, 1, 2), weight=1)

        self.stat_anime = ctk.CTkLabel(stats_frame, text="Anime: --", font=ctk.CTkFont(size=14),
                                        text_color=CLR_TEXT)
        self.stat_anime.grid(row=0, column=0, padx=16, pady=16)

        self.stat_episodes = ctk.CTkLabel(stats_frame, text="Episodes: --", font=ctk.CTkFont(size=14),
                                           text_color=CLR_TEXT)
        self.stat_episodes.grid(row=0, column=1, padx=16, pady=16)

        self.stat_disk = ctk.CTkLabel(stats_frame, text="Disk: --", font=ctk.CTkFont(size=14),
                                       text_color=CLR_TEXT)
        self.stat_disk.grid(row=0, column=2, padx=16, pady=16)

        # --- Quick actions ---
        actions_frame = ctk.CTkFrame(self, fg_color="transparent")
        actions_frame.grid(row=3, column=0, sticky="ew", padx=20, pady=10)

        ctk.CTkButton(actions_frame, text="Open Frontend in Browser", fg_color=CLR_ACCENT,
                       hover_color=CLR_ACCENT_HOVER, command=self._open_frontend
                       ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(actions_frame, text="Open Media Folder", fg_color="#374151",
                       hover_color="#4b5563",
                       command=lambda: os.startfile(str(MEDIA_PATH)) if MEDIA_PATH.exists() else None
                       ).pack(side="left", padx=(0, 10))

        # --- Git info ---
        git_frame = ctk.CTkFrame(self, fg_color=CLR_CARD, corner_radius=12)
        git_frame.grid(row=4, column=0, sticky="ew", padx=20, pady=10)
        git_frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(git_frame, text="Git", font=ctk.CTkFont(size=15, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, columnspan=2, sticky="w",
                                                  padx=16, pady=(12, 4))

        self.git_branch = ctk.CTkLabel(git_frame, text="Branch: --", font=ctk.CTkFont(size=12),
                                        text_color=CLR_TEXT_DIM, anchor="w")
        self.git_branch.grid(row=1, column=0, columnspan=2, sticky="w", padx=16, pady=2)

        self.git_commit = ctk.CTkLabel(git_frame, text="Last commit: --", font=ctk.CTkFont(size=12),
                                        text_color=CLR_TEXT_DIM, anchor="w", wraplength=600)
        self.git_commit.grid(row=2, column=0, columnspan=2, sticky="w", padx=16, pady=(2, 12))

    # --- Actions ---

    @staticmethod
    def _open_frontend():
        webbrowser.open(LAN_WEB_URL)

    # --- Refresh ---

    def refresh(self):
        # Service checks
        for card, name in [(self.api_card, "babylon-api"),
                           (self.web_card, "babylon-web"),
                           (self.anime_card, "babylon-anime")]:
            info = SERVICE_MAP[name]
            online = check_port(info["port"])
            card.update_status(online, f"Port {info['port']} {'open' if online else 'closed'}")

        # Disk
        try:
            usage = psutil.disk_usage("B:\\")
            self.stat_disk.configure(text=f"Disk B: {human_size(usage.used)} / {human_size(usage.total)}")
        except Exception:
            self.stat_disk.configure(text="Disk B: N/A")

        # Media stats
        anime_count = 0
        episode_count = 0
        if MEDIA_PATH.exists():
            for d in MEDIA_PATH.iterdir():
                if d.is_dir():
                    anime_count += 1
                    episode_count += sum(1 for f in d.iterdir() if f.is_file() and f.suffix in (".mkv", ".mp4"))
        self.stat_anime.configure(text=f"Anime: {anime_count}")
        self.stat_episodes.configure(text=f"Episodes: {episode_count}")

        # Git info
        branch = run_cmd("git rev-parse --abbrev-ref HEAD", cwd=str(BABYLON_ROOT))
        commit = run_cmd("git log -1 --pretty=format:%s", cwd=str(BABYLON_ROOT))
        self.git_branch.configure(text=f"Branch: {branch}")
        self.git_commit.configure(text=f"Last commit: {commit}")


class ServicesPanel(ctk.CTkScrollableFrame):
    """Manage PM2 services."""

    def __init__(self, master, app: "BabylonControlPanel"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(self, text="Services", font=ctk.CTkFont(size=24, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, sticky="w", padx=20, pady=(20, 10))

        self.service_frames: dict[str, dict] = {}
        for idx, name in enumerate(SERVICE_MAP):
            self._build_service_card(name, idx + 1)

        # Global actions
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.grid(row=len(SERVICE_MAP) + 1, column=0, sticky="ew", padx=20, pady=16)

        ctk.CTkButton(btn_frame, text="Restart All", fg_color=CLR_ACCENT,
                       hover_color=CLR_ACCENT_HOVER,
                       command=lambda: self._run_pm2("pm2 restart all")
                       ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(btn_frame, text="Stop All", fg_color="#991b1b", hover_color="#7f1d1d",
                       command=lambda: self._run_pm2("pm2 stop all")
                       ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(btn_frame, text="Pull & Rebuild", fg_color="#1e40af", hover_color="#1e3a8a",
                       command=self._pull_rebuild
                       ).pack(side="left", padx=(0, 10))

        # Output area
        self.output_box = ctk.CTkTextbox(self, height=180, fg_color="#111827",
                                          text_color=CLR_TEXT_DIM, font=ctk.CTkFont(family="Consolas", size=12))
        self.output_box.grid(row=len(SERVICE_MAP) + 2, column=0, sticky="ew", padx=20, pady=(0, 20))

    def _build_service_card(self, name: str, row: int):
        frame = ctk.CTkFrame(self, fg_color=CLR_CARD, corner_radius=12)
        frame.grid(row=row, column=0, sticky="ew", padx=20, pady=6)
        frame.grid_columnconfigure(1, weight=1)

        dot = StatusDot(frame, CLR_RED)
        dot.grid(row=0, column=0, rowspan=2, padx=(16, 8), pady=16)

        title = ctk.CTkLabel(frame, text=name, font=ctk.CTkFont(size=15, weight="bold"),
                              text_color=CLR_TEXT, anchor="w")
        title.grid(row=0, column=1, sticky="w", pady=(16, 2))

        detail = ctk.CTkLabel(frame, text="Checking...", font=ctk.CTkFont(size=12),
                               text_color=CLR_TEXT_DIM, anchor="w")
        detail.grid(row=1, column=1, sticky="w", pady=(0, 16))

        btn_box = ctk.CTkFrame(frame, fg_color="transparent")
        btn_box.grid(row=0, column=2, rowspan=2, padx=16, pady=16)

        ctk.CTkButton(btn_box, text="Start", width=70, fg_color="#166534", hover_color="#15803d",
                       command=lambda n=name: self._run_pm2(f"pm2 start {n}")
                       ).pack(side="left", padx=2)
        ctk.CTkButton(btn_box, text="Stop", width=70, fg_color="#991b1b", hover_color="#7f1d1d",
                       command=lambda n=name: self._run_pm2(f"pm2 stop {n}")
                       ).pack(side="left", padx=2)
        ctk.CTkButton(btn_box, text="Restart", width=70, fg_color="#1e40af", hover_color="#1e3a8a",
                       command=lambda n=name: self._run_pm2(f"pm2 restart {n}")
                       ).pack(side="left", padx=2)

        self.service_frames[name] = {"dot": dot, "detail": detail}

    def _run_pm2(self, cmd: str):
        self.output_box.insert("end", f"\n> {cmd}\n")
        self.output_box.see("end")

        def _cb(output):
            self.output_box.after(0, lambda: self._append_output(output))

        run_cmd_async(cmd, callback=_cb)

    def _append_output(self, text: str):
        self.output_box.insert("end", text + "\n")
        self.output_box.see("end")

    def _pull_rebuild(self):
        cmd = 'cd /d "{}" && git pull origin master && pnpm install && pnpm build && pm2 restart all'.format(
            BABYLON_ROOT)
        self._run_pm2(cmd)

    def refresh(self):
        # Try PM2 jlist for detailed info
        try:
            raw = run_cmd("pm2 jlist")
            pm2_data = json.loads(raw)
        except Exception:
            pm2_data = []

        pm2_lookup = {}
        for proc in pm2_data:
            pm2_lookup[proc.get("name", "")] = proc

        for name, widgets in self.service_frames.items():
            port = SERVICE_MAP[name]["port"]
            online = check_port(port)
            widgets["dot"].set_color(CLR_GREEN if online else CLR_RED)

            detail_parts = [f"Port {port}: {'open' if online else 'closed'}"]

            pm2_info = pm2_lookup.get(name)
            if pm2_info:
                env = pm2_info.get("pm2_env", {})
                status = env.get("status", "unknown")
                uptime_ms = env.get("pm_uptime", 0)
                if uptime_ms:
                    up_sec = (time.time() * 1000 - uptime_ms) / 1000
                    mins, secs = divmod(int(up_sec), 60)
                    hours, mins = divmod(mins, 60)
                    detail_parts.append(f"Up {hours}h {mins}m")
                mem = pm2_info.get("monit", {}).get("memory", 0)
                cpu = pm2_info.get("monit", {}).get("cpu", 0)
                if mem:
                    detail_parts.append(f"Mem {human_size(mem)}")
                if cpu:
                    detail_parts.append(f"CPU {cpu}%")
                detail_parts.insert(0, f"PM2: {status}")

            widgets["detail"].configure(text="  |  ".join(detail_parts))


class DownloadsPanel(ctk.CTkScrollableFrame):
    """View downloaded anime library."""

    def __init__(self, master, app: "BabylonControlPanel"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(self, text="Downloads", font=ctk.CTkFont(size=24, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, sticky="w", padx=20, pady=(20, 10))

        # Actions
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=(0, 10))

        ctk.CTkButton(btn_frame, text="Refresh Library", fg_color=CLR_ACCENT,
                       hover_color=CLR_ACCENT_HOVER, command=self.refresh
                       ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(btn_frame, text="Open Media Folder", fg_color="#374151", hover_color="#4b5563",
                       command=lambda: os.startfile(str(MEDIA_PATH)) if MEDIA_PATH.exists() else None
                       ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(btn_frame, text="Clear All Downloads", fg_color="#991b1b", hover_color="#7f1d1d",
                       command=self._confirm_clear).pack(side="left")

        # Library list container
        self.list_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.list_frame.grid(row=2, column=0, sticky="ew", padx=20, pady=5)
        self.list_frame.grid_columnconfigure(0, weight=1)

        self.status_label = ctk.CTkLabel(self, text="", font=ctk.CTkFont(size=12),
                                          text_color=CLR_TEXT_DIM)
        self.status_label.grid(row=3, column=0, sticky="w", padx=20, pady=10)

    def _confirm_clear(self):
        dialog = ctk.CTkInputDialog(
            text="Type DELETE to confirm clearing all media:",
            title="Confirm Clear Downloads",
        )
        val = dialog.get_input()
        if val and val.strip().upper() == "DELETE":
            self._clear_media()

    def _clear_media(self):
        def _work():
            import shutil
            count = 0
            if MEDIA_PATH.exists():
                for d in MEDIA_PATH.iterdir():
                    if d.is_dir():
                        shutil.rmtree(d, ignore_errors=True)
                        count += 1
                    elif d.is_file():
                        d.unlink(missing_ok=True)
                        count += 1
            self.status_label.after(0,
                                    lambda: self.status_label.configure(text=f"Cleared {count} items."))
            self.after(500, self.refresh)

        threading.Thread(target=_work, daemon=True).start()

    def refresh(self):
        # Clear existing list
        for w in self.list_frame.winfo_children():
            w.destroy()

        # First try Flask API
        library = []
        try:
            r = requests.get(f"http://localhost:{ANIME_PORT}/api/library", timeout=3)
            if r.ok:
                library = r.json() if isinstance(r.json(), list) else r.json().get("library", [])
        except Exception:
            pass

        # Fallback: scan filesystem
        if not library and MEDIA_PATH.exists():
            for idx, d in enumerate(sorted(MEDIA_PATH.iterdir())):
                if d.is_dir():
                    eps = [f for f in d.iterdir() if f.is_file() and f.suffix in (".mkv", ".mp4")]
                    size = dir_size(d)
                    library.append({
                        "title": d.name,
                        "episodes": len(eps),
                        "size": size,
                    })

        if not library:
            ctk.CTkLabel(self.list_frame, text="No anime found in library.",
                          text_color=CLR_TEXT_DIM, font=ctk.CTkFont(size=13)
                          ).grid(row=0, column=0, pady=20)
            self.status_label.configure(text="0 titles")
            return

        total_size = 0
        for idx, item in enumerate(library):
            title = item.get("title", "Unknown")
            eps = item.get("episodes", item.get("episode_count", 0))
            size = item.get("size", item.get("total_size", 0))
            total_size += size

            row = ctk.CTkFrame(self.list_frame, fg_color=CLR_CARD, corner_radius=8, height=48)
            row.grid(row=idx, column=0, sticky="ew", pady=2)
            row.grid_columnconfigure(0, weight=1)

            ctk.CTkLabel(row, text=title, font=ctk.CTkFont(size=13, weight="bold"),
                          text_color=CLR_TEXT, anchor="w").grid(row=0, column=0, sticky="w", padx=16, pady=(8, 2))

            info = f"{eps} episodes  |  {human_size(size)}" if size else f"{eps} episodes"
            ctk.CTkLabel(row, text=info, font=ctk.CTkFont(size=11),
                          text_color=CLR_TEXT_DIM, anchor="w").grid(row=1, column=0, sticky="w", padx=16, pady=(0, 8))

        self.status_label.configure(
            text=f"{len(library)} titles  |  Total: {human_size(total_size)}")


class StoragePanel(ctk.CTkScrollableFrame):
    """Disk usage and storage management."""

    def __init__(self, master, app: "BabylonControlPanel"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(self, text="Storage", font=ctk.CTkFont(size=24, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, sticky="w", padx=20, pady=(20, 10))

        # Disk usage bar
        disk_frame = ctk.CTkFrame(self, fg_color=CLR_CARD, corner_radius=12)
        disk_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=8)
        disk_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(disk_frame, text="B: Drive", font=ctk.CTkFont(size=15, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, sticky="w", padx=16, pady=(12, 4))

        self.disk_bar = ctk.CTkProgressBar(disk_frame, height=20, corner_radius=10,
                                            progress_color=CLR_ACCENT)
        self.disk_bar.grid(row=1, column=0, sticky="ew", padx=16, pady=4)
        self.disk_bar.set(0)

        self.disk_label = ctk.CTkLabel(disk_frame, text="--", font=ctk.CTkFont(size=12),
                                        text_color=CLR_TEXT_DIM)
        self.disk_label.grid(row=2, column=0, sticky="w", padx=16, pady=(2, 12))

        # Actions
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.grid(row=2, column=0, sticky="ew", padx=20, pady=8)

        ctk.CTkButton(btn_frame, text="Clean Temp Files", fg_color="#b45309", hover_color="#92400e",
                       command=self._clean_temp).pack(side="left", padx=(0, 10))

        ctk.CTkButton(btn_frame, text="Refresh", fg_color="#374151", hover_color="#4b5563",
                       command=self.refresh).pack(side="left")

        # Breakdown
        ctk.CTkLabel(self, text="Media Breakdown", font=ctk.CTkFont(size=16, weight="bold"),
                      text_color=CLR_TEXT).grid(row=3, column=0, sticky="w", padx=20, pady=(16, 6))

        self.breakdown_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.breakdown_frame.grid(row=4, column=0, sticky="ew", padx=20, pady=4)
        self.breakdown_frame.grid_columnconfigure(0, weight=1)

    def _clean_temp(self):
        import shutil
        cleaned = 0
        for p in (DOWNLOADS_RAW, DOWNLOADS_PROCESSED):
            if p.exists():
                for item in p.iterdir():
                    try:
                        if item.is_dir():
                            shutil.rmtree(item)
                        else:
                            item.unlink()
                        cleaned += 1
                    except Exception:
                        pass
        self.app.toast(f"Cleaned {cleaned} temp items.")
        self.refresh()

    def refresh(self):
        # Disk usage
        try:
            usage = psutil.disk_usage("B:\\")
            pct = usage.used / usage.total
            self.disk_bar.set(pct)
            color = CLR_GREEN if pct < 0.7 else (CLR_YELLOW if pct < 0.9 else CLR_RED)
            self.disk_bar.configure(progress_color=color)
            self.disk_label.configure(
                text=f"Used: {human_size(usage.used)}  |  Free: {human_size(usage.free)}  |  "
                     f"Total: {human_size(usage.total)}  ({pct * 100:.1f}%)")
        except Exception:
            self.disk_bar.set(0)
            self.disk_label.configure(text="B: drive not available")

        # Breakdown
        for w in self.breakdown_frame.winfo_children():
            w.destroy()

        if not MEDIA_PATH.exists():
            ctk.CTkLabel(self.breakdown_frame, text="Media path not found.",
                          text_color=CLR_TEXT_DIM).grid(row=0, column=0, pady=10)
            return

        dirs = []
        for d in sorted(MEDIA_PATH.iterdir()):
            if d.is_dir():
                size = dir_size(d)
                dirs.append((d.name, size))

        dirs.sort(key=lambda x: x[1], reverse=True)
        max_size = dirs[0][1] if dirs else 1

        for idx, (name, size) in enumerate(dirs):
            row = ctk.CTkFrame(self.breakdown_frame, fg_color=CLR_CARD, corner_radius=8, height=36)
            row.grid(row=idx, column=0, sticky="ew", pady=2)
            row.grid_columnconfigure(1, weight=1)

            ctk.CTkLabel(row, text=name, font=ctk.CTkFont(size=12), text_color=CLR_TEXT,
                          anchor="w", width=300).grid(row=0, column=0, sticky="w", padx=(12, 8), pady=8)

            bar = ctk.CTkProgressBar(row, height=12, corner_radius=6, progress_color=CLR_ACCENT,
                                      width=200)
            bar.grid(row=0, column=1, sticky="ew", padx=4, pady=8)
            bar.set(size / max_size if max_size else 0)

            ctk.CTkLabel(row, text=human_size(size), font=ctk.CTkFont(size=11),
                          text_color=CLR_TEXT_DIM, width=80).grid(row=0, column=2, padx=(8, 12), pady=8)


class LogsPanel(ctk.CTkFrame):
    """Live PM2 log viewer."""

    def __init__(self, master, app: "BabylonControlPanel"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self._auto_scroll = True
        self._current_source = "All PM2 Logs"
        self._last_size = 0
        self._polling = False

        # Header
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=20, pady=(20, 10))
        header.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(header, text="Logs", font=ctk.CTkFont(size=24, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, sticky="w")

        # Source selector
        sources = ["All PM2 Logs", "babylon-api-out", "babylon-api-error",
                   "babylon-web-out", "babylon-web-error",
                   "babylon-anime-out", "babylon-anime-error"]
        self.source_menu = ctk.CTkOptionMenu(header, values=sources, command=self._on_source_change,
                                              fg_color=CLR_CARD, button_color=CLR_ACCENT,
                                              button_hover_color=CLR_ACCENT_HOVER)
        self.source_menu.grid(row=0, column=1, sticky="w", padx=20)

        # Auto-scroll checkbox
        self.auto_scroll_var = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(header, text="Auto-scroll", variable=self.auto_scroll_var,
                         command=lambda: setattr(self, '_auto_scroll', self.auto_scroll_var.get()),
                         text_color=CLR_TEXT_DIM).grid(row=0, column=2, padx=10)

        ctk.CTkButton(header, text="Clear", width=70, fg_color="#374151", hover_color="#4b5563",
                       command=self._clear_log).grid(row=0, column=3)

        # Log textbox
        self.log_box = ctk.CTkTextbox(self, fg_color="#0f172a", text_color="#d1d5db",
                                       font=ctk.CTkFont(family="Consolas", size=11),
                                       wrap="word")
        self.log_box.grid(row=1, column=0, sticky="nsew", padx=20, pady=(0, 20))

    def _on_source_change(self, value: str):
        self._current_source = value
        self._last_size = 0
        self.log_box.delete("1.0", "end")
        self._load_log()

    def _clear_log(self):
        self.log_box.delete("1.0", "end")
        self._last_size = 0

    def _get_log_path(self) -> Path | None:
        src = self._current_source
        if src == "All PM2 Logs":
            return None  # Special: combine recent from all
        # Map name to PM2 log file
        filename = src + ".log"
        p = PM2_LOG_DIR / filename
        return p if p.exists() else None

    def _load_log(self):
        """Read log file and append new content."""
        if self._current_source == "All PM2 Logs":
            self._load_all_logs()
            return

        path = self._get_log_path()
        if not path or not path.exists():
            self.log_box.insert("end", f"[Log file not found: {self._current_source}]\n")
            return

        try:
            size = path.stat().st_size
            if size <= self._last_size:
                return
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                if self._last_size > 0:
                    f.seek(self._last_size)
                content = f.read()
                self._last_size = size
            if content:
                self.log_box.insert("end", content)
                if self._auto_scroll:
                    self.log_box.see("end")
        except Exception as exc:
            self.log_box.insert("end", f"[Error reading log: {exc}]\n")

    def _load_all_logs(self):
        """Load tail of all PM2 log files."""
        if not PM2_LOG_DIR.exists():
            self.log_box.insert("end", f"[PM2 log directory not found: {PM2_LOG_DIR}]\n")
            return

        lines = []
        for logfile in PM2_LOG_DIR.glob("*.log"):
            try:
                with open(logfile, "r", encoding="utf-8", errors="replace") as f:
                    # Read last 50 lines
                    all_lines = f.readlines()
                    tail = all_lines[-50:]
                    for ln in tail:
                        lines.append(f"[{logfile.stem}] {ln}")
            except Exception:
                pass

        if lines:
            # Show last 200 combined lines
            text = "".join(lines[-200:])
            self.log_box.delete("1.0", "end")
            self.log_box.insert("end", text)
            if self._auto_scroll:
                self.log_box.see("end")
        else:
            self.log_box.insert("end", "[No log content found]\n")

    def refresh(self):
        self._load_log()

    def start_polling(self):
        self._polling = True
        self._poll()

    def stop_polling(self):
        self._polling = False

    def _poll(self):
        if not self._polling:
            return
        self._load_log()
        self.after(LOG_POLL_INTERVAL_MS, self._poll)


class SettingsPanel(ctk.CTkScrollableFrame):
    """Configuration and maintenance actions."""

    def __init__(self, master, app: "BabylonControlPanel"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(self, text="Settings", font=ctk.CTkFont(size=24, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, sticky="w", padx=20, pady=(20, 10))

        # --- Info Section ---
        info_frame = ctk.CTkFrame(self, fg_color=CLR_CARD, corner_radius=12)
        info_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=8)
        info_frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(info_frame, text="System Info", font=ctk.CTkFont(size=15, weight="bold"),
                      text_color=CLR_TEXT).grid(row=0, column=0, columnspan=2, sticky="w",
                                                  padx=16, pady=(12, 8))

        self.info_rows: dict[str, ctk.CTkLabel] = {}
        info_items = [
            ("LAN IP", get_lan_ip()),
            ("Media Path", str(MEDIA_PATH)),
            ("Project Path", str(BABYLON_ROOT)),
            ("PM2 Logs", str(PM2_LOG_DIR)),
        ]

        # Git remote
        git_remote = run_cmd("git remote get-url origin", cwd=str(BABYLON_ROOT))
        info_items.append(("Git Remote", git_remote))

        for idx, (label, value) in enumerate(info_items):
            ctk.CTkLabel(info_frame, text=f"{label}:", font=ctk.CTkFont(size=12, weight="bold"),
                          text_color=CLR_TEXT_DIM, anchor="e", width=100
                          ).grid(row=idx + 1, column=0, sticky="e", padx=(16, 8), pady=3)
            val_label = ctk.CTkLabel(info_frame, text=value, font=ctk.CTkFont(size=12),
                                      text_color=CLR_TEXT, anchor="w")
            val_label.grid(row=idx + 1, column=1, sticky="w", pady=3)
            self.info_rows[label] = val_label

        # Bottom padding for info frame
        ctk.CTkLabel(info_frame, text="").grid(row=len(info_items) + 1, column=0, pady=4)

        # --- Actions Section ---
        actions_frame = ctk.CTkFrame(self, fg_color=CLR_CARD, corner_radius=12)
        actions_frame.grid(row=2, column=0, sticky="ew", padx=20, pady=8)

        ctk.CTkLabel(actions_frame, text="Maintenance", font=ctk.CTkFont(size=15, weight="bold"),
                      text_color=CLR_TEXT).pack(anchor="w", padx=16, pady=(12, 8))

        buttons_data = [
            ("Update from GitHub", "git pull origin master", "#1e40af", "#1e3a8a"),
            ("Full Rebuild", "pnpm install && pnpm build", "#7c3aed", "#6d28d9"),
            ("Restart Clean (wipes media + DB)", "__restart_clean__", "#991b1b", "#7f1d1d"),
            ("Restart Fly (keeps media, resets DB)", "__restart_fly__", "#b45309", "#92400e"),
        ]

        for text, cmd, fg, hover in buttons_data:
            btn = ctk.CTkButton(actions_frame, text=text, fg_color=fg, hover_color=hover,
                                 anchor="w", height=40,
                                 command=lambda c=cmd, t=text: self._run_action(c, t))
            btn.pack(fill="x", padx=16, pady=4)

        # Padding
        ctk.CTkLabel(actions_frame, text="").pack(pady=4)

        # --- Output ---
        self.output_box = ctk.CTkTextbox(self, height=200, fg_color="#111827",
                                          text_color=CLR_TEXT_DIM,
                                          font=ctk.CTkFont(family="Consolas", size=12))
        self.output_box.grid(row=3, column=0, sticky="ew", padx=20, pady=(8, 20))

    def _run_action(self, cmd: str, label: str):
        # Special commands that map to bat files
        if cmd == "__restart_clean__":
            bat_path = BABYLON_ROOT / "restart-clean.bat"
            if not bat_path.exists():
                # Inline equivalent
                cmd = (
                    f'pm2 stop all && '
                    f'(if exist "B:\\Babylon\\media" rmdir /s /q "B:\\Babylon\\media") && '
                    f'mkdir "B:\\Babylon\\media" && '
                    f'(if exist "B:\\Babylon\\data\\phase15.db" del /f /q "B:\\Babylon\\data\\phase15.db") && '
                    f'cd /d "{BABYLON_ROOT}" && git pull origin master && '
                    f'pnpm build && pm2 start all && pm2 save'
                )
            else:
                cmd = f'call "{bat_path}"'
        elif cmd == "__restart_fly__":
            bat_path = BABYLON_ROOT / "restart-fly.bat"
            if not bat_path.exists():
                cmd = (
                    f'pm2 stop all && '
                    f'(if exist "B:\\Babylon\\data\\phase15.db" del /f /q "B:\\Babylon\\data\\phase15.db") && '
                    f'cd /d "{BABYLON_ROOT}" && git pull origin master && '
                    f'pnpm build && pm2 start all && pm2 save'
                )
            else:
                cmd = f'call "{bat_path}"'
        else:
            cmd = f'cd /d "{BABYLON_ROOT}" && {cmd}'

        self.output_box.insert("end", f"\n--- {label} ---\n> {cmd}\n")
        self.output_box.see("end")

        def _cb(output):
            self.output_box.after(0, lambda: self._append(output))

        run_cmd_async(cmd, callback=_cb)

    def _append(self, text: str):
        self.output_box.insert("end", text + "\n")
        self.output_box.see("end")

    def refresh(self):
        pass  # Static info, no refresh needed


# ---------------------------------------------------------------------------
# Main Application
# ---------------------------------------------------------------------------


class BabylonControlPanel(ctk.CTk):
    """Top-level window and navigation controller."""

    def __init__(self):
        super().__init__()

        self.title("Babylon Control Panel")
        self.geometry("1200x800")
        self.minsize(900, 600)
        self.configure(fg_color=CLR_BG)

        # Layout: sidebar | content
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self._build_sidebar()
        self._build_content_area()
        self._create_panels()

        # Toast label (bottom notification)
        self.toast_label = ctk.CTkLabel(self, text="", fg_color=CLR_CARD, corner_radius=8,
                                         text_color=CLR_TEXT, font=ctk.CTkFont(size=12),
                                         height=0)
        self.toast_label.place(relx=0.5, rely=1.0, anchor="s", y=-10)
        self.toast_label.place_forget()

        # Show default panel
        self._show_panel("Dashboard")

        # Start auto-refresh
        self._auto_refresh()

    # --- Sidebar ---

    def _build_sidebar(self):
        self.sidebar = ctk.CTkFrame(self, width=200, fg_color=CLR_SIDEBAR, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_propagate(False)
        self.sidebar.grid_rowconfigure(10, weight=1)

        # Logo / Title
        logo_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        logo_frame.grid(row=0, column=0, sticky="ew", padx=16, pady=(24, 8))

        ctk.CTkLabel(logo_frame, text="BABYLON",
                      font=ctk.CTkFont(size=22, weight="bold"),
                      text_color=CLR_ACCENT).pack(anchor="w")
        ctk.CTkLabel(logo_frame, text="Control Panel",
                      font=ctk.CTkFont(size=12),
                      text_color=CLR_TEXT_DIM).pack(anchor="w")

        # Divider
        ctk.CTkFrame(self.sidebar, height=1, fg_color=CLR_CARD_BORDER).grid(
            row=1, column=0, sticky="ew", padx=16, pady=12)

        # Nav buttons
        self.nav_buttons: dict[str, ctk.CTkButton] = {}
        nav_items = [
            ("Dashboard", 2),
            ("Services", 3),
            ("Downloads", 4),
            ("Storage", 5),
            ("Logs", 6),
            ("Settings", 7),
        ]
        for name, row in nav_items:
            btn = ctk.CTkButton(
                self.sidebar, text=f"  {name}", anchor="w", height=40,
                fg_color="transparent", text_color=CLR_TEXT_DIM,
                hover_color="#1e293b",
                font=ctk.CTkFont(size=14),
                command=lambda n=name: self._show_panel(n),
            )
            btn.grid(row=row, column=0, sticky="ew", padx=8, pady=2)
            self.nav_buttons[name] = btn

        # Bottom status
        self.sidebar_status = ctk.CTkLabel(
            self.sidebar, text="", font=ctk.CTkFont(size=10),
            text_color=CLR_TEXT_DIM, anchor="w", wraplength=170)
        self.sidebar_status.grid(row=11, column=0, sticky="sw", padx=16, pady=12)

    # --- Content Area ---

    def _build_content_area(self):
        self.content_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.content_frame.grid(row=0, column=1, sticky="nsew")
        self.content_frame.grid_columnconfigure(0, weight=1)
        self.content_frame.grid_rowconfigure(0, weight=1)

    def _create_panels(self):
        self.panels: dict[str, ctk.CTkFrame] = {}
        panel_classes = {
            "Dashboard": DashboardPanel,
            "Services": ServicesPanel,
            "Downloads": DownloadsPanel,
            "Storage": StoragePanel,
            "Logs": LogsPanel,
            "Settings": SettingsPanel,
        }
        for name, cls in panel_classes.items():
            panel = cls(self.content_frame, app=self)
            panel.grid(row=0, column=0, sticky="nsew")
            self.panels[name] = panel

        self._current_panel = None

    def _show_panel(self, name: str):
        # Stop logs polling if leaving
        if self._current_panel == "Logs" and name != "Logs":
            self.panels["Logs"].stop_polling()

        # Update nav highlight
        for btn_name, btn in self.nav_buttons.items():
            if btn_name == name:
                btn.configure(fg_color=CLR_ACCENT, text_color="#ffffff")
            else:
                btn.configure(fg_color="transparent", text_color=CLR_TEXT_DIM)

        # Raise panel FIRST (instant UI switch)
        self.panels[name].tkraise()
        self._current_panel = name
        self.update_idletasks()  # Force UI redraw immediately

        # Start logs polling if entering
        if name == "Logs":
            self.panels["Logs"].start_polling()

        # Schedule refresh on main thread after a tiny delay (lets UI paint first)
        self.after(50, self._refresh_current)

    # --- Auto Refresh ---

    def _auto_refresh(self):
        """Refresh current panel on the main thread (safe for tkinter)."""
        self._refresh_current()
        self.after(REFRESH_INTERVAL_MS, self._auto_refresh)

    def _refresh_current(self):
        name = self._current_panel
        if not name:
            return
        panel = self.panels.get(name)
        if panel and hasattr(panel, "refresh"):
            try:
                panel.refresh()
            except Exception:
                pass

        # Update sidebar status
        online_count = sum(1 for s in SERVICE_MAP.values() if check_port(s["port"]))
        total = len(SERVICE_MAP)
        now = datetime.now().strftime("%H:%M:%S")
        try:
            self.sidebar_status.configure(
                text=f"{online_count}/{total} services online\nLast refresh: {now}")
        except Exception:
            pass

    # --- Toast notification ---

    def toast(self, message: str, duration_ms: int = 3000):
        """Show a brief notification at the bottom of the window."""
        self.toast_label.configure(text=f"  {message}  ", height=32)
        self.toast_label.place(relx=0.5, rely=1.0, anchor="s", y=-10)
        self.after(duration_ms, lambda: self.toast_label.place_forget())


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

def main():
    app = BabylonControlPanel()
    app.mainloop()


if __name__ == "__main__":
    main()
