@echo off
echo === Babylon Restart Fly (keeps media, resets DB) ===
pm2 stop all
del B:\Babylon\data\phase15.db 2>nul
cd /d B:\Babylon\app && git pull origin master && pnpm build && pm2 restart all
echo === Done ===
pause
