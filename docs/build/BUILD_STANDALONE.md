# Quick Build Guide - Standalone App

## 🚀 Build Your Standalone App (with Kokoro TTS embedded)

### Prerequisites Check
```bash
# Run the test script to verify embedded Python
node scripts/test-embedded-python.js
```

Expected output: "🎉 ALL TESTS PASSED!"

### Build Steps

```bash
# Step 1: Build Next.js frontend (if not already built)
cd frontend
npm run build
cd ..

# Step 2: Prepare standalone files
node prepare-electron.js

# Step 3: Build the complete standalone app
npm run dist
```

### Build Time
- First build: ~5-10 minutes (includes packaging 1.9GB of Python)
- Subsequent builds: ~3-5 minutes

### Output Files
Location: `dist/`

- **`Zabari TTS-1.0.0-win-x64.exe`** - NSIS Installer (~2.1GB)
  - Professional installation wizard
  - Creates desktop and Start Menu shortcuts
  - **Recommended for distribution**

- **`Zabari TTS-1.0.0-portable.exe`** - Portable version (~2.1GB)
  - No installation needed
  - Run from USB drive
  - Good for testing

## What's Included in the Build

### ✅ Bundled (Works Out of the Box)
- Electron runtime with Node.js
- Next.js frontend (pre-built)
- All npm packages (tmi.js, playwright, pusher-js, etc.)
- **Python 3.11 embedded** (1.9GB)
- **All Python packages installed**:
  - PyTorch 2.2.0 (CPU-only)
  - Kokoro 0.7.16
  - numpy, soundfile, phonemizer
  - espeak-ng support
- Web Speech API TTS
- Kokoro TTS with 12 voices

### 📦 File Sizes
- python-embedded: ~1.9GB
- Node.js + dependencies: ~300MB
- Electron runtime: ~200MB
- **Total installed: ~2.5GB**

## Testing the Build

### Test on Your Machine
```bash
# Option 1: Run the portable exe
./dist/"Zabari TTS-1.0.0-portable.exe"

# Option 2: Install the NSIS installer
./dist/"Zabari TTS-1.0.0-win-x64.exe"
```

### Verify Kokoro Works
1. Launch the app
2. Select "Kokoro" as TTS engine
3. Choose a voice (e.g., "af_sky")
4. Enter a test chat URL
5. Start chat logger
6. Wait ~10 seconds for Kokoro to initialize (first time only)
7. Verify audio plays

### Test on Clean Machine (Recommended)
1. Create a Windows 10/11 virtual machine
2. Do NOT install Python, Node.js, or any dev tools
3. Copy the .exe to the VM
4. Install and run
5. Verify all features work

## Distribution

### Upload to File Sharing
```bash
# The installer is large (~2.1GB), use:
# - Google Drive
# - OneDrive
# - Dropbox
# - WeTransfer (free up to 2GB per transfer)
# - Mega.nz (free up to 5GB)
```

### User Instructions
Send this with the download link:

```
Zabari TTS - Chat Logger with AI Voices

Download: [Your Link Here] (2.1GB)

Installation:
1. Download the installer
2. Double-click "Zabari TTS-1.0.0-win-x64.exe"
3. Follow the installation wizard
4. Launch from desktop shortcut

First Run:
1. The app opens in a window
2. Choose Twitch/YouTube/Kick
3. Enter your channel URL
4. Select TTS engine:
   - "Web Speech API" - Instant, Windows voices
   - "Kokoro" - AI voices, 12 options (10sec startup first time)
5. Click "Start Chat Logger"
6. Done! Messages are spoken automatically

System Requirements:
- Windows 10/11 (64-bit)
- 3GB free disk space
- No Python or Node.js needed!

Note: First Kokoro use takes ~10 seconds to load AI models.
After that, it's instant.
```

## Troubleshooting Build Issues

### Build fails with "Cannot find module"
```bash
npm install
cd frontend && npm install && cd ..
```

### Build is stuck at "packaging"
- Be patient, packaging 1.9GB takes time
- Check Task Manager to see if it's still working
- Look for electron-builder or asar process

### Build fails with "out of memory"
```bash
# Increase Node.js memory limit
set NODE_OPTIONS=--max-old-space-size=8192
npm run dist
```

### Want to exclude Python (smaller build)?
Edit `package.json`, remove python-embedded from extraResources:
```json
"extraResources": [
  // Remove or comment out this block:
  // {
  //   "from": "python-embedded",
  //   "to": "python-embedded",
  //   ...
  // }
]
```
Then build normally. Users will need to install Python manually.

## Build Optimization

### Reduce Build Size (Optional)
If 2.1GB is too large, consider:

1. **Remove test/example files from PyTorch**:
   ```bash
   # Remove tests from site-packages (saves ~200MB)
   rm -rf python-embedded/Lib/site-packages/torch/test
   rm -rf python-embedded/Lib/site-packages/torch/_dynamo/test_*
   ```

2. **Remove unnecessary language models**:
   ```bash
   # Keep only English (saves ~50MB)
   rm -rf python-embedded/Lib/site-packages/spacy/lang/![en]*
   ```

3. **Create two versions**:
   - Lite (~400MB): No Python, Web Speech only
   - Full (~2.5GB): With Python + Kokoro

## Next Steps

After successful build:
- [x] Build completes without errors
- [ ] Test on your machine
- [ ] Test Kokoro TTS works
- [ ] Test on clean Windows VM
- [ ] Upload to file sharing service
- [ ] Share link with users
- [ ] Provide user instructions

## Success! 🎉

Your app is now a true standalone desktop application with embedded AI voices!

Users don't need to install:
- ❌ Python
- ❌ Node.js
- ❌ npm
- ❌ Any development tools

They just:
- ✅ Download the installer (one time)
- ✅ Double-click to install
- ✅ Launch and use immediately
- ✅ Get professional AI voices out of the box

Perfect for non-technical users!
