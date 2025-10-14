# Pre-Build Checklist

Use this checklist before building and distributing the app to your friend.

## 📋 Before Building

### Required Steps
- [ ] All dependencies installed (`npm install` in root and `frontend/`)
- [ ] Next.js frontend builds successfully (`cd frontend && npm run build`)
- [ ] Tested in Electron dev mode (`npm run electron:dev`)
- [ ] Tested in Electron production mode (`npm run electron`)

### Optional (Recommended)
- [ ] Custom icon added to `assets/icon.ico` (256x256 .ico file)
- [ ] Custom tray icon added to `assets/tray-icon.png` (32x32 PNG)
- [ ] Updated version number in `package.json` if needed
- [ ] Updated app name/description in `package.json` if desired

### Configuration
- [ ] Default chat URLs configured or left as placeholders
- [ ] Default TTS engine chosen (recommend Web Speech API for ease)
- [ ] Tested with API mode (doesn't require Playwright browsers)

## 🏗️ Build Process

### Build Commands
```bash
# Option 1: Build both installer and portable
npm run dist

# Option 2: Build portable only (faster)
npm run dist:portable
```

### Verify Build Output
After building, check `dist/` folder for:
- [ ] `Zabari TTS-1.0.0-win-x64.exe` (NSIS installer)
- [ ] `Zabari TTS-1.0.0-portable.exe` (Portable version)

File sizes should be approximately:
- NSIS Installer: 200-400 MB
- Portable: 200-400 MB

## 🧪 Testing the Build

### Test on Your Machine
- [ ] Run the NSIS installer
- [ ] App installs successfully
- [ ] Desktop shortcut created
- [ ] Start Menu entry created
- [ ] App launches from shortcut
- [ ] System tray icon appears
- [ ] Can connect to chat (API mode)
- [ ] TTS works (Web Speech API)
- [ ] Can minimize to tray
- [ ] Can quit from tray menu
- [ ] Uninstall works (Control Panel > Add/Remove Programs)

### Test Portable Version
- [ ] Double-click portable .exe
- [ ] App launches without installation
- [ ] All features work same as installed version

### Test on Clean Windows VM (Recommended)
- [ ] Create fresh Windows 10/11 VM
- [ ] Copy .exe to VM
- [ ] Run without installing Node.js, Python, or any dependencies
- [ ] Verify app launches
- [ ] Verify Web Speech API TTS works
- [ ] Note: Playwright mode may require browser download on first run

## 📦 Packaging for Distribution

### What to Send Your Friend

**Recommended: NSIS Installer**
- Send `Zabari TTS-1.0.0-win-x64.exe`
- Include simple instructions:
  1. Double-click the .exe
  2. Follow installation wizard
  3. Launch from desktop shortcut
  4. Use Web Speech API (no Python needed)

**Alternative: Portable Version**
- Send `Zabari TTS-1.0.0-portable.exe`
- Include instructions:
  1. Double-click to run (no installation)
  2. Use Web Speech API (no Python needed)
  3. To use AI voices, install Python separately

### Optional: Include Documentation
Consider sending these files along with the .exe:
- [ ] `BUILD_GUIDE.md` (for technical users)
- [ ] Quick start guide (create a simple Word doc or PDF)
- [ ] Known issues / limitations
- [ ] Your contact info for support

## 📝 User Instructions Template

Here's a simple instruction template for your friend:

```
Zabari TTS - Quick Start

1. Double-click "Zabari TTS-1.0.0-win-x64.exe"
2. Follow the installation wizard
3. Launch from desktop shortcut

How to Use:
- The app opens in your browser automatically
- Toggle on Twitch/YouTube/Kick as needed
- Enter your channel URLs
- Select "Web Speech API" for TTS (no setup needed)
- Choose a voice from the dropdown
- Click "Start Chat Logger"
- Done! Messages will be spoken automatically

Troubleshooting:
- If port 3000 is in use, close other apps
- To quit: Right-click system tray icon → Quit
- To restart: Right-click system tray icon → Restart Server

For AI voices (NeuTTS Air/Kokoro):
- Requires Python 3.10+ installation
- See BUILD_GUIDE.md for Python setup instructions
```

## ⚠️ Known Limitations

Document these for your friend:

### Out of the Box
✅ Works without Python: Web Speech API TTS
✅ Works without browsers: API mode (Twitch, Kick)
⚠️ YouTube requires API key in API mode

### Requires Additional Setup
❌ NeuTTS Air: Requires Python + dependencies
❌ Kokoro-82M: Requires Python + dependencies + espeak-ng
❌ Playwright mode: Requires Playwright browsers (may auto-download)

## 🎯 Final Check

Before sending to your friend:
- [ ] Tested on clean machine (no Node.js/Python/dev tools)
- [ ] Created simple user instructions
- [ ] Noted what works out-of-box vs needs setup
- [ ] Prepared to provide support if needed
- [ ] Comfortable with the file size (~200-400MB)

## 🚀 Ready to Distribute!

Once everything is checked:
1. Upload .exe to file sharing service (Google Drive, Dropbox, etc.)
2. Share link with your friend
3. Send user instructions
4. Be available for questions

Good luck! 🎉
