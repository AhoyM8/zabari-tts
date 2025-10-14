# Zabari TTS - Electron Desktop App

## 🎉 What Changed?

Your Zabari TTS project is now configured as an **Electron desktop application**! This means you can package it as a standalone Windows .exe installer that your friend can run without Docker, Node.js, or any manual setup.

## 🚀 Quick Overview

### What You Get
1. **NSIS Installer** - Professional Windows installer with desktop shortcuts
2. **Portable .exe** - No-installation version that runs from anywhere
3. **System Tray Integration** - Minimize to tray, easy start/stop controls
4. **Embedded Web Server** - Next.js frontend auto-starts when app launches
5. **All Dependencies Bundled** - Node.js, npm packages, browsers (optional)

### What Your Friend Gets
- Double-click .exe to install
- Professional installation wizard
- Desktop shortcut
- Start Menu entry
- System tray icon
- No technical setup required (for Web Speech API mode)

## 📁 New Files Added

### Core Electron Files
- `electron-main.js` - Main Electron process (manages windows, server)
- `electron-preload.js` - Security layer for Electron
- `assets/loading.html` - Loading screen while server starts
- `assets/error.html` - Error page if server fails

### Documentation
- `BUILD_GUIDE.md` - Complete guide to building and distributing
- `START_ELECTRON.md` - Quick start for Electron development
- `CHECKLIST.md` - Pre-build checklist and testing guide
- `ELECTRON_README.md` - This file

### Configuration
- Updated `package.json` with Electron scripts and build config
- Updated `frontend/next.config.js` for standalone output
- Updated `.gitignore` for Electron build artifacts

## 🛠️ How to Build

### 1. Test in Development Mode
```bash
# Terminal 1
cd frontend
npm run dev

# Terminal 2 (after Next.js starts)
npm run electron:dev
```

### 2. Build the Installer
```bash
npm run dist
```

This creates:
- `dist/Zabari TTS-1.0.0-win-x64.exe` (Installer)
- `dist/Zabari TTS-1.0.0-portable.exe` (Portable)

### 3. Test the Build
- Run the installer on your machine
- Verify everything works
- Test on clean Windows VM (recommended)

### 4. Send to Your Friend
- Upload .exe to Google Drive/Dropbox
- Share the link
- Include simple instructions (see CHECKLIST.md)

## 📚 Documentation Map

Confused? Here's what to read:

1. **First Time?** → Read `START_ELECTRON.md` for quick dev testing
2. **Ready to Build?** → Read `BUILD_GUIDE.md` for full instructions
3. **Before Distributing?** → Use `CHECKLIST.md` to verify everything
4. **Need Icons?** → See `assets/ICON_README.md`

## ⚙️ NPM Scripts Reference

```bash
# Development
npm run electron:dev         # Run Electron with Next.js dev server
npm run electron             # Run Electron with production Next.js build

# Building
npm run build:frontend       # Build Next.js frontend only
npm run pack                 # Package without creating installer (for testing)
npm run dist                 # Build full distribution (NSIS + Portable)
npm run dist:portable        # Build portable .exe only
```

## 🎯 Recommended Workflow

### For Your Friend (End User)
1. Receive `Zabari TTS-1.0.0-win-x64.exe`
2. Double-click to install
3. Launch from desktop shortcut
4. App opens in embedded window
5. Configure chat URLs and TTS
6. Start chatting!

**No Node.js, Python, or Docker needed!** (for Web Speech API mode)

### For You (Developer)
1. Make changes to your code
2. Test with `npm run electron:dev`
3. Build with `npm run dist`
4. Test the installer
5. Upload and share with friend
6. Update as needed

## 🔧 What's Bundled vs What's Not

### ✅ Bundled (Works Out of the Box)
- Node.js runtime
- All npm dependencies (tmi.js, playwright, pusher-js, etc.)
- Next.js frontend (pre-built)
- Chat logger scripts
- Electron framework
- Web Speech API TTS (browser-based)

### ⚠️ Optional / Requires Setup
- **Python TTS Engines**: Requires Python installation
  - NeuTTS Air (AI voice cloning)
  - Kokoro-82M (fast AI TTS)
- **Playwright Browsers**: May auto-download on first run
- **YouTube API Key**: User needs their own key for API mode

### 📝 Recommendation for Your Friend
Start with:
- **API Mode** (no browsers needed)
- **Web Speech API** (no Python needed)
- Works immediately after installation!

If they want AI voices later, they can install Python separately.

## 🎨 Customization

### Add Custom Icons
1. Create/find a logo (PNG, 512x512)
2. Convert to .ico format (https://icoconvert.com/)
3. Save as `assets/icon.ico`
4. Optionally create `assets/tray-icon.png` (32x32)
5. Rebuild with `npm run dist`

### Change App Name
Edit `package.json`:
```json
{
  "name": "your-app-name",
  "productName": "Your App Display Name",
  "version": "1.0.0"
}
```

### Change Port
Edit `electron-main.js` line 10:
```javascript
const NEXT_JS_PORT = 3000; // Change to your preferred port
```

## 🐛 Troubleshooting

### Build Issues
```bash
# Clean everything and rebuild
rm -rf node_modules dist frontend/.next frontend/node_modules
npm install
cd frontend && npm install && cd ..
npm run dist
```

### Runtime Issues
- **Port 3000 in use**: Change port in `electron-main.js`
- **App won't start**: Check Windows Event Viewer, try running as admin
- **TTS not working**: Ensure Web Speech API is selected (works everywhere)
- **Python TTS not working**: Python must be installed separately

### Testing Issues
- **Can't test in dev mode**: Ensure `npm run dev` in frontend/ succeeds first
- **Installer fails**: Ensure you have write permissions to dist/ folder
- **Antivirus blocking**: Add exception for your build folder

## 📊 Size Considerations

Typical sizes:
- **Source Code**: ~50 MB
- **node_modules**: ~300 MB
- **Built Installer**: ~200-400 MB
- **Installed App**: ~300-500 MB

This is normal for Electron apps (includes Chromium browser engine).

## 🎓 Learning More

- **Electron Docs**: https://www.electronjs.org/docs
- **electron-builder**: https://www.electron.build/
- **Next.js Standalone**: https://nextjs.org/docs/advanced-features/output-file-tracing

## 🎊 Benefits vs Other Methods

### vs Docker
✅ No Docker installation needed
✅ Native Windows .exe
✅ Better performance (no virtualization)
✅ Smaller download size
✅ System tray integration
❌ Larger than Docker image

### vs Manual Setup (npm install)
✅ No Node.js installation needed
✅ No npm install steps
✅ All dependencies bundled
✅ One-click installation
✅ Professional installer
❌ Larger download size

### vs Web Deployment (Vercel)
✅ Runs locally (no internet for app)
✅ System tray integration
✅ Native desktop experience
✅ No deployment costs
❌ Not accessible from anywhere
❌ Requires download/install

## ✨ Next Steps

1. Read `START_ELECTRON.md` for quick testing
2. Read `BUILD_GUIDE.md` for full build process
3. Use `CHECKLIST.md` before sending to friend
4. Build with `npm run dist`
5. Test the installer
6. Share with your friend!

Enjoy your new desktop app! 🚀
