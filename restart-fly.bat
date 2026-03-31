@echo off
echo === Babylon Restart Fly (keeps media, resets DB) ===
echo.
echo [1/5] Stopping PM2...
call pm2 stop all
echo.
echo [2/5] Deleting DB...
if exist "B:\Babylon\data\phase15.db" del /f /q "B:\Babylon\data\phase15.db"
echo.
echo [3/5] Pulling latest...
cd /d B:\Babylon\app
call git pull origin master
echo.
echo [4/5] Building...
call pnpm build
echo.
echo [5/5] Starting PM2...
call pm2 start all
call pm2 save
echo.
echo === Done ===
pause
