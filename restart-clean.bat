@echo off
echo === Babylon Restart Clean (wipes media + DB) ===
echo.
echo [1/6] Stopping PM2...
call pm2 stop all
echo.
echo [2/6] Wiping media...
if exist "B:\Babylon\media" rmdir /s /q "B:\Babylon\media"
mkdir "B:\Babylon\media"
echo.
echo [3/6] Deleting DB...
if exist "B:\Babylon\data\phase15.db" del /f /q "B:\Babylon\data\phase15.db"
echo.
echo [4/6] Pulling latest...
cd /d B:\Babylon\app
call git pull origin master
echo.
echo [5/6] Building...
call pnpm build
echo.
echo [6/6] Starting PM2...
call pm2 start all
call pm2 save
echo.
echo === Done ===
pause
