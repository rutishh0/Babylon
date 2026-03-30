@echo off
title Babylon AutoPull
echo ========================================
echo   Babylon AutoPull - Watching GitHub
echo ========================================
echo.

:loop
cd /d B:\Babylon\app
git fetch origin master 2>nul
for /f %%i in ('git rev-parse HEAD') do set LOCAL=%%i
for /f %%i in ('git rev-parse origin/master') do set REMOTE=%%i
if not "%LOCAL%"=="%REMOTE%" (
    echo [%date% %time%] New commits detected, deploying...
    git pull origin master
    call pnpm install --frozen-lockfile
    call pnpm build || echo [%date% %time%] BUILD FAILED - keeping old version
    call pm2 reload all
    echo [%date% %time%] Deploy complete.
) else (
    echo [%date% %time%] Up to date.
)
timeout /t 60 /nobreak >nul
goto loop
