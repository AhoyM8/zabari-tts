# Zabari TTS Setup Guide

## Prerequisites

Before installing Zabari TTS, ensure you have the following installed on your system:

### Required

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Check version: `node --version`
   - Includes npm package manager

### Optional (for Kokoro TTS)

2. **Python** (3.10 or higher)
   - Download: https://www.python.org/downloads/
   - Check version: `python --version`
   - Make sure to check "Add Python to PATH" during installation

3. **espeak-ng** (for Kokoro phonemization)
   - Windows: Download from https://github.com/espeak-ng/espeak-ng/releases
   - Linux: `sudo apt install espeak-ng`
   - Mac: `brew install espeak-ng`

## Installation Steps

### 1. Install Zabari TTS

Download the latest release from GitHub:
- **Installer**: `Zabari-TTS-{version}-win-x64.exe` (recommended)
- **Portable**: `Zabari-TTS-{version}-portable.exe` (no installation needed)

Run the installer and follow the setup wizard.

### 2. Install Dependencies

**After installing the app, you need to install Node.js dependencies:**

Open Command Prompt or PowerShell in the Zabari TTS installation directory:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

**For Kokoro TTS (optional):**

```bash
# Navigate to kokoro-tts directory
cd kokoro-tts

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Launch the App

Double-click the Zabari TTS desktop shortcut or run from Start Menu.

The app will:
1. Start the Next.js frontend server (port 3000)
2. Open the web interface automatically
3. Ready to use!

## Troubleshooting

### "Node.js is not recognized"

**Problem:** Node.js is not in your PATH.

**Solution:**
1. Reinstall Node.js and check "Add to PATH"
2. Or add manually: System Properties > Environment Variables > Path > Add Node.js installation directory

### "Python is not recognized"

**Problem:** Python is not in your PATH.

**Solution:**
1. Reinstall Python and check "Add Python to PATH"
2. Or add manually: System Properties > Environment Variables > Path > Add Python installation directory

### "npm install" fails

**Problem:** Missing build tools or permissions.

**Solution:**
- Run as Administrator
- Install Windows Build Tools: `npm install -g windows-build-tools`

### Frontend doesn't start

**Problem:** Port 3000 is already in use.

**Solution:**
- Close other apps using port 3000
- Or change port in electron-main.js: `const NEXT_JS_PORT = 3001;`

### Kokoro TTS fails to start

**Problem:** Missing Python dependencies or espeak-ng.

**Solution:**
1. Verify Python installation: `python --version`
2. Install dependencies: `pip install -r kokoro-tts/requirements.txt`
3. Install espeak-ng from link above
4. Check logs in Electron console (Help > Toggle Developer Tools)

## Default Locations

**Installation Directory:**
- Program Files: `C:\Program Files\Zabari TTS\`
- Portable: Wherever you extracted the .exe

**User Data:**
- Config: `%APPDATA%\zabari-tts\`
- Logs: `%APPDATA%\zabari-tts\logs\`
- Audio Output: `{installation-dir}\audio_output\`

## First Run

1. **Launch app** - Desktop shortcut or Start Menu
2. **Configure platforms** - Add Twitch/YouTube/Kick/TikTok usernames
3. **Choose TTS engine** - Web Speech API (default) or Kokoro-82M
4. **Adjust settings** - Voice, volume, rate, pitch
5. **Start chat logging** - Click "Start" button
6. **Enjoy!** - Chat messages will be read aloud

## Updates

Zabari TTS has automatic updates:
- Checks for updates every 4 hours
- Notification appears when update available
- Download and install with one click
- No need to reinstall manually

## Need Help?

- **Documentation**: See `docs/` folder in installation directory
- **GitHub Issues**: https://github.com/AhoyM8/zabari-tts/issues
- **Check logs**: Help > Toggle Developer Tools > Console tab

---

**Zabari TTS** - Multi-platform chat logger with TTS for live streaming
