@echo off
echo === Building Babylon Control Panel ===
cd /d "%~dp0"
if not exist "venv\Scripts\activate.bat" (
    echo Creating venv...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
echo Building executable...
pyinstaller --onefile --windowed --name "Babylon Control Panel" --icon=NONE panel.py
echo.
echo === Build complete! ===
echo Executable at: dist\Babylon Control Panel.exe
pause
