# Debugging Guide - Zabari TTS Electron App

## 🔍 How to View Live Logs

### Method 1: System Tray Menu (Easiest)
1. Run the app: `./dist/win-unpacked/"Zabari TTS.exe"`
2. Right-click the system tray icon (bottom-right of screen)
3. Click **"Toggle DevTools"**
4. The Chrome DevTools panel will open showing:
   - **Console tab**: Frontend logs (React, API calls, TTS)
   - **Network tab**: HTTP requests
   - **Application tab**: Storage, cookies, etc.

### Method 2: Run from Command Line
Open the app from terminal to see backend logs:

```bash
cd dist/win-unpacked
./Zabari\ TTS.exe
```

You'll see logs like:
```
================================================================================
ZABARI TTS - ELECTRON APP STARTING
================================================================================
[Electron] isDev: false
[Electron] __dirname: C:\path\to\app\resources\app
[Electron] resourcesPath: C:\path\to\app\resources
[Electron] frontendPath: C:\path\to\app\resources\app\frontend
[Electron] standalonePath: C:\path\to\app\resources\app\frontend\.next\standalone
[Electron] process.cwd(): C:\path\to\app
================================================================================
[Electron] Starting Next.js server...
[Electron] Server path: C:\path\to\standalone\server.js
[Electron] Server exists: true
[Electron] Node path: C:\path\to\node.exe
[Next.js] Server started on http://localhost:3000
[Electron] Next.js server is ready!
[Electron] Loading app UI...
```

## 📋 What to Check

### 1. Check Server Startup
Look for these logs:
- ✅ `[Electron] Server path: ...` - Path to Next.js server
- ✅ `[Electron] Server exists: true` - Server file found
- ✅ `[Next.js] Server started on http://localhost:3000` - Server running
- ❌ `[Electron] Server file not found!` - Missing server.js

### 2. Check TTS Engine Selection
Open DevTools (right-click tray → Toggle DevTools):
- Go to **Console** tab
- Select TTS engine in UI
- Look for logs like:
  - `[TTS] Selected engine: kokoro`
  - `[TTS] Starting Kokoro TTS server...`
  - Or errors if something fails

### 3. Check Playwright Mode
If using Playwright mode:
- Look for: `[Chat Logger] Starting in Playwright mode`
- Check for browser launch errors
- Playwright logs will show in console

### 4. Check API Mode
If using API mode:
- Look for: `[Chat Logger] Starting in API mode`
- Check connection logs for Twitch/YouTube/Kick
- API errors will show in console

## 🐛 Common Issues

### Issue: "All TTS is Web Speech API even though I picked Kokoro"

**Possible causes:**

1. **Kokoro server not bundled/accessible**
   - Check if `resources/kokoro-tts/` exists in the app folder
   - Python TTS servers are NOT bundled by default (source code only)
   - **Solution**: Use Web Speech API (works out of box) OR install Python separately

2. **Server path incorrect**
   - Open DevTools console
   - Look for errors like: `Failed to start Kokoro server`
   - Check if `tts-server.py` path is correct

3. **Python not installed**
   - Kokoro requires Python 3.10+
   - **Solution**: Install Python from python.org OR use Web Speech API

### Issue: "Playwright mode not working"

**Possible causes:**

1. **Playwright browsers not bundled**
   - Playwright browsers are ~300MB and not included by default
   - **Solution**: Use API mode (no browsers needed)

2. **chat-logger-webspeech.js not found**
   - Check if file exists in `resources/app/`
   - Look for error in console

3. **Missing dependencies**
   - Some Node modules might not be bundled
   - Check console for `Cannot find module` errors

## 🔧 Quick Fixes

### Reset Everything
1. Close the app completely (right-click tray → Quit)
2. Kill any remaining processes:
   ```bash
   taskkill /F /IM "Zabari TTS.exe"
   taskkill /F /IM node.exe
   ```
3. Restart the app

### Check Port 3000
If server won't start:
```bash
netstat -ano | findstr :3000
```
If something is using port 3000, kill it:
```bash
taskkill /F /PID <PID_NUMBER>
```

### View All Node Processes
```bash
tasklist | findstr node.exe
```

## 📝 What's Currently Working vs Not

### ✅ Works Out of the Box:
- Electron window and UI
- Next.js frontend
- API mode (Twitch, Kick, YouTube with API key)
- Web Speech API TTS (browser voices)
- Chat message display and filtering
- System tray integration

### ⚠️ Requires Additional Setup:
- **Kokoro TTS**: Requires Python + dependencies
- **NeuTTS Air**: Requires Python + dependencies
- **Playwright Mode**: May require browser download OR use API mode instead

### 🚧 Known Limitations:
- Python TTS servers are NOT compiled to .exe (source code included)
- Playwright browsers not pre-bundled (large size)
- No code signing (Windows SmartScreen warning)

## 💡 Recommended Configuration

For your friend (easiest setup):

1. **Connection Method**: API Mode
2. **TTS Engine**: Web Speech API
3. **Platforms**: Twitch + Kick (no API key needed)
4. **YouTube**: Requires API key (get from Google Cloud Console)

This configuration works immediately without any additional setup!

## 🔍 Advanced Debugging

### Enable Verbose Logging
Edit `electron-main.js` (requires rebuilding):
- Add more `console.log()` statements
- Check specific paths and variables
- Rebuild with `npm run dist`

### Check Bundled Files
Explore what's actually in the app:
```bash
cd dist/win-unpacked/resources/app
ls -la
```

Should see:
- `electron-main.js`
- `frontend/` folder
- `lib/` folder
- `chat-logger-*.js` files
- `assets/` folder

### Test Standalone Server Directly
```bash
cd dist/win-unpacked/resources/app/frontend/.next/standalone
node server.js
```

Open http://localhost:3000 in browser to test if Next.js works.

## 📞 Getting Help

If you see errors:
1. Open DevTools (Toggle DevTools from tray menu)
2. Copy error messages from Console tab
3. Copy terminal output if running from command line
4. Note what you were trying to do when it failed

This helps identify the exact issue!
