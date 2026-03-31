@echo off
echo === Babylon Restart Clean (wipes media + DB) ===
pm2 stop all
rmdir /s /q B:\Babylon\media
mkdir B:\Babylon\media
del B:\Babylon\data\phase15.db 2>nul
cd /d B:\Babylon\app && git pull origin master && pnpm build && pm2 restart all
echo === Done ===
pause
