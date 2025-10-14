# Quick Start - Electron Development

## Testing the Electron App (Development Mode)

### Option 1: Quick Test (Uses dev server)
```bash
# Terminal 1 - Start Next.js dev server
cd frontend
npm run dev

# Terminal 2 - Start Electron (after Next.js is ready)
npm run electron:dev
```

This runs Electron with the Next.js dev server (hot reload enabled).

### Option 2: Test Production Mode (Before building)
```bash
# Build the Next.js frontend
cd frontend
npm run build
cd ..

# Start Electron in production mode
npm run electron
```

This simulates the final packaged app behavior.

## Building the Distribution

### Build Everything
```bash
npm run dist
```

This will:
1. Build Next.js frontend (`npm run build:frontend`)
2. Package Electron app with electron-builder
3. Create both NSIS installer and portable .exe
4. Output to `dist/` folder

### Build Portable Only
```bash
npm run dist:portable
```

Creates only the portable .exe (no installer).

## What to Test

Before building for your friend, test these features:

### 1. App Launches
- [ ] Electron window opens
- [ ] Shows loading screen briefly
- [ ] Loads Next.js UI successfully

### 2. System Tray
- [ ] App icon appears in system tray
- [ ] Right-click shows menu
- [ ] "Show App" / "Hide App" works
- [ ] "Restart Server" works
- [ ] "Quit" exits app

### 3. Chat Connection (API Mode)
- [ ] Toggle Twitch/YouTube/Kick on
- [ ] Enter valid chat URLs
- [ ] Click "Start Chat Logger"
- [ ] Messages appear in live feed

### 4. TTS (Web Speech)
- [ ] Select "Web Speech API" engine
- [ ] Choose a voice from dropdown
- [ ] Adjust volume/rate/pitch
- [ ] Messages are spoken correctly

### 5. TTS (AI Engines - Optional)
If you have Python TTS servers:
- [ ] Start NeuTTS Air or Kokoro server manually
- [ ] Select engine in UI
- [ ] Configure voice/speed
- [ ] TTS works correctly

### 6. Window Behavior
- [ ] Minimize to tray (close button hides window)
- [ ] Double-click tray icon shows window
- [ ] Can maximize/resize window

## Troubleshooting Dev Mode

### "Cannot find module" errors
```bash
# Reinstall dependencies
npm install
cd frontend && npm install && cd ..
```

### Port 3000 already in use
- Stop any other processes using port 3000
- Or change `NEXT_JS_PORT` in `electron-main.js`

### Loading screen never goes away
- Check Terminal 1 for Next.js errors
- Ensure `npm run dev` completed successfully
- Try restarting both terminals

### Electron won't start
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

## Next Steps

Once everything works in dev mode:
1. Run `npm run dist` to build installer
2. Test the built installer on your machine
3. Optionally test on a clean Windows VM
4. Send the .exe to your friend!

See [BUILD_GUIDE.md](BUILD_GUIDE.md) for full distribution instructions.
