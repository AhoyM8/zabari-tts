# Build Guide - Zabari TTS Electron App

This guide explains how to package the Zabari TTS application as a standalone Windows executable (.exe) for distribution.

## Overview

The app is now configured to build as an Electron desktop application with two distribution options:
1. **NSIS Installer** - Traditional Windows installer with install wizard
2. **Portable Executable** - Single .exe that runs without installation

## Prerequisites

Before building, ensure you have:
- Node.js 18+ installed
- npm installed
- All dependencies installed (`npm install` in root and `frontend/`)
- (Optional) Custom icon file at `assets/icon.ico`

## Quick Start

### 1. Install Dependencies

```bash
# Root directory
npm install

# Frontend directory
cd frontend
npm install
cd ..
```

### 2. Build the Electron App

```bash
# Build NSIS installer + Portable exe (recommended)
npm run dist

# Or build portable exe only
npm run dist:portable
```

The build process will:
1. Build the Next.js frontend in standalone mode
2. Bundle all Node.js dependencies
3. Bundle the Electron app
4. Include Python TTS servers (neutts-air, kokoro-tts)
5. Include Playwright browsers
6. Create Windows installer in `dist/` folder

### 3. Distribute to Your Friend

After the build completes, you'll find in the `dist/` folder:
- `Zabari TTS-1.0.0-win-x64.exe` - **NSIS Installer** (recommended for first-time users)
- `Zabari TTS-1.0.0-portable.exe` - **Portable version** (no installation needed)

**Send either file to your friend!**

## Installation Methods

### Method 1: NSIS Installer (Recommended)
1. Double-click `Zabari TTS-1.0.0-win-x64.exe`
2. Follow the installation wizard
3. Choose installation directory (or use default)
4. Creates desktop shortcut and Start Menu entry
5. Launch from desktop or Start Menu

**Advantages:**
- Professional installation experience
- Automatic shortcuts
- Easy uninstallation via Control Panel
- Associates with file types (if configured)

### Method 2: Portable Executable
1. Double-click `Zabari TTS-1.0.0-portable.exe`
2. App runs immediately (no installation)
3. All data stored in same directory
4. Can be run from USB drive

**Advantages:**
- No installation required
- Completely portable
- No registry modifications
- Good for testing

## What's Included in the Build

The packaged application includes:

### Core Application
- ✅ Electron runtime (embedded Chrome + Node.js)
- ✅ Next.js frontend (pre-built, standalone mode)
- ✅ Chat logger scripts (Playwright mode + API mode)
- ✅ All Node.js dependencies (Playwright, tmi.js, pusher-js, etc.)

### TTS Engines
- ✅ Web Speech API (browser-based, no files needed)
- ✅ Python source code for NeuTTS Air and Kokoro-82M
- ⚠️ Python TTS servers require Python runtime (see below)

### Browsers (Playwright)
- ✅ Chromium browser for Playwright mode (if available)
- Note: Playwright browsers are ~300MB - may be automatically downloaded on first run

## Python TTS Servers - Important Notes

The build includes Python source code for NeuTTS Air and Kokoro-82M TTS engines, but **Python must be installed separately** to use them.

### Option A: User Installs Python (Recommended for simplicity)
Your friend needs:
1. Python 3.10+ installed from https://www.python.org/
2. Run these commands in the app directory:
   ```bash
   # For NeuTTS Air
   cd resources/neutts-air
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt

   # For Kokoro-82M
   cd resources/kokoro-tts
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

### Option B: Bundle Python with PyInstaller (Advanced)
For a truly standalone build with TTS servers, you need to:

1. **Install PyInstaller** in each Python environment:
   ```bash
   cd neutts-air
   .venv\Scripts\activate
   pip install pyinstaller
   ```

2. **Compile TTS server to .exe**:
   ```bash
   # NeuTTS Air
   cd neutts-air
   pyinstaller --onefile --hidden-import=numpy --hidden-import=torch tts-server.py

   # Kokoro-82M
   cd kokoro-tts
   pyinstaller --onefile --hidden-import=numpy --hidden-import=torch --hidden-import=kokoro tts-server.py
   ```

3. **Update spawn paths** in `chat-logger-tts.js`:
   ```javascript
   // Before (development):
   const pythonProcess = spawn('python', ['neutts-air/tts-server.py']);

   // After (production):
   const pythonProcess = spawn(path.join(resourcesPath, 'neutts-air', 'dist', 'tts-server.exe'));
   ```

4. **Copy compiled .exe files** to `neutts-air/dist/` and `kokoro-tts/dist/`

5. **Rebuild the Electron app**:
   ```bash
   npm run dist
   ```

**Note**: This is advanced and optional. Web Speech API works without Python.

## Testing the Build

Before sending to your friend:

1. **Test on your machine:**
   ```bash
   # Test in dev mode first
   npm run electron:dev
   ```

2. **Test the built installer:**
   - Install on your machine using the NSIS installer
   - Verify it launches correctly
   - Test all TTS engines that are configured
   - Test Playwright mode and API mode

3. **Test on a clean VM (highly recommended):**
   - Use Windows 10/11 virtual machine
   - Install ONLY the .exe (no Node.js, no Python)
   - Verify what works and what needs manual setup

## File Size Considerations

Typical build sizes:
- **NSIS Installer**: ~200-400MB (depending on Playwright browsers)
- **Portable .exe**: ~200-400MB

Size breakdown:
- Electron + Chromium: ~150MB
- Node.js dependencies: ~50-100MB
- Playwright browsers: ~100MB (if bundled)
- Python TTS (source): ~10MB
- Python TTS (compiled with PyInstaller): ~300-500MB each

## Troubleshooting

### Build fails with "icon.ico not found"
- Create an icon at `assets/icon.ico` (see `assets/ICON_README.md`)
- Or the build should work without icons (uses default)

### App won't start after installation
- Check Windows Event Viewer for errors
- Try running as Administrator
- Ensure antivirus isn't blocking it

### "Port 3000 already in use"
- Close any other apps using port 3000
- Or change the port in `electron-main.js` (line 10)

### Python TTS doesn't work
- Python must be installed separately (see above)
- Or use Web Speech API instead (works out of the box)

### Playwright browsers not working
- Browsers may need to download on first run
- Or switch to API mode (no browsers needed)

## Advanced: Customization

### Change App Name/Version
Edit `package.json`:
```json
{
  "name": "your-app-name",
  "version": "2.0.0",
  "description": "Your custom description"
}
```

### Add Custom Icon
1. Create `assets/icon.ico` (256x256 recommended)
2. Create `assets/tray-icon.png` (32x32 for system tray)
3. Rebuild with `npm run dist`

### Change Port
Edit `electron-main.js` line 10:
```javascript
const NEXT_JS_PORT = 3000; // Change to your port
```

### Customize Installer
Edit `package.json` under `build.nsis`:
```json
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "shortcutName": "Your App Name"
}
```

## Development vs Production

### Development Mode
```bash
npm run electron:dev
```
- Uses `npm run dev` for Next.js (hot reload)
- Faster startup
- Easier debugging

### Production Mode
```bash
npm run electron
```
- Uses standalone Next.js build
- Similar to final packaged app

## Summary

For the **easiest distribution** to your friend:
1. Run `npm run dist`
2. Send `dist/Zabari TTS-1.0.0-win-x64.exe` (NSIS installer)
3. Friend double-clicks to install
4. App works with Web Speech API (no Python needed)
5. If they want AI voices, they install Python separately

This provides a smooth, professional installation experience!

## Additional Resources

- Electron documentation: https://www.electronjs.org/docs
- electron-builder docs: https://www.electron.build/
- PyInstaller docs: https://pyinstaller.org/en/stable/
