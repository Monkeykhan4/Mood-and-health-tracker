@echo off
echo Starting Neon Health System...

if not exist "llama-cpp\llama-server.exe" (
    echo WARNING: llama-server.exe not found in llama-cpp folder!
    echo A.R.I.A. neural link will not be available.
    echo.
    echo To fix: Extract llama.cpp CUDA files to llama-cpp\ folder
    timeout /t 3 >nul
)

if not exist "models" mkdir models

start http://localhost:5000
python app.py
pause