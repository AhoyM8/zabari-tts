@echo off
REM Startup script for NeuTTS Air TTS Server

echo Starting NeuTTS Air TTS Server...
echo.

REM Set espeak environment variables
set "PHONEMIZER_ESPEAK_LIBRARY=C:\Program Files\eSpeak NG\libespeak-ng.dll"
set "PHONEMIZER_ESPEAK_PATH=C:\Program Files\eSpeak NG\espeak-ng.exe"

REM Navigate to neutts-air directory
cd neutts-air

REM Start the TTS server
.venv\Scripts\python tts-server.py

pause
