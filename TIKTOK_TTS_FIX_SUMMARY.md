# TikTok TTS Integration Fix - Summary

## Problem
TikTok messages were being logged to the frontend but **NOT being read by TTS**.

## Root Cause
The TikTok implementation was using a Playwright client with session authentication and bot detection avoidance (`lib/chat-api/tiktok-client.js`), which is the correct approach. However:
1. The TikTok client sent messages to the message buffer for display
2. But **never sent messages to the TTS system**
3. The Playwright chat-logger has its own TTS queue, but TikTok runs separately

## Solution
**Added built-in TTS support directly to the TikTok client** (preserving session/bot detection):

### 1. Enhanced TikTok Client (`lib/chat-api/tiktok-client.js`)
- Added `ttsConfig` parameter to constructor (line 15)
- Added TTS message queue and processing flag (lines 21-22)
- **Added `shouldSpeak()` method** (lines 155-180):
  - Checks excluded users filter
  - Checks exclude commands filter (`!` prefix)
  - Checks exclude links filter
- **Added `queueMessage()` method** (lines 185-188):
  - Queues messages for TTS
  - Triggers queue processing
- **Added `processQueue()` method** (lines 193-249):
  - Processes TTS queue sequentially
  - Uses Web Speech API directly in the TikTok browser page
  - Applies username announcement settings
  - Applies voice, volume, rate, and pitch settings
  - Handles errors gracefully
- **Integrated TTS in pollMessages()** (lines 144-147):
  - Automatically queues messages that pass filters
  - Runs TTS independently of other platforms

### 2. Updated Route Handler (`frontend/app/api/chat/start/route.js`)
- Restored hybrid mode comment (line 42)
- Passes `ttsConfig` to TikTok client (line 76)
- TikTok client now has access to all TTS settings

### 3. Preserved TikTok URL Builder (`lib/url-builder.js`)
- Kept `buildTikTokUrl()` function for completeness
- **Not used** in current implementation (TikTok uses separate Playwright client)

## How It Works Now

### TikTok Message Flow (Hybrid Mode)
```
TikTok Playwright Client (Separate Browser with Session)
  ↓ (Polls for messages every 3 seconds)
  ↓ (Extracts username/message from DOM)
  ↓ (Calls onMessage callback → frontend buffer)
  ↓ (Checks filters with shouldSpeak())
  ↓ (Queues message for TTS)
  ↓ (Processes queue sequentially)
  ↓ (Speaks with Web Speech API in TikTok page)
```

### Why This Approach?
1. **Preserves session authentication** - Uses existing `tiktok_session.json`
2. **Avoids bot detection** - Uses stealth Playwright with cookies/storage
3. **Independent TTS** - TikTok has its own TTS queue and browser page
4. **Consistent filtering** - Uses same filters as other platforms
5. **No quotas or limits** - Direct browser automation

## Files Modified
1. ✓ `lib/chat-api/tiktok-client.js` - Added TTS queue and processing
2. ✓ `frontend/app/api/chat/start/route.js` - Pass ttsConfig to TikTok client
3. ✓ `lib/url-builder.js` - Added TikTok URL builder (for reference)

## TikTok Client Features
- ✓ Session-based authentication (bypasses login)
- ✓ Bot detection avoidance (webdriver removal, custom user agent)
- ✓ Message deduplication (tracks processed indexes)
- ✓ Built-in TTS with Web Speech API
- ✓ Message filtering (users, commands, links)
- ✓ Username announcement option
- ✓ Configurable voice, volume, rate, pitch
- ✓ Sequential TTS queue processing

## TTS Engines Supported
Currently, TikTok only supports **Web Speech API** because:
- TTS runs in the TikTok browser page context
- Kokoro requires separate HTTP server
- Web Speech API is browser-native and works instantly

Future enhancement could add Kokoro support by making HTTP requests to the Kokoro server.

## Testing
1. Run `npm run tiktok:login` to create session file (if not exists)
2. Start the frontend: `cd frontend && npm run dev`
3. Go to http://localhost:3000
4. Enable TikTok platform and enter a username
5. Start the chat logger (TikTok hybrid mode auto-activates)
6. Configure TTS settings (voice, volume, rate, filters)
7. Start the chat logger
8. TikTok messages will now be spoken by TTS!

## Session Management
- **Session file**: `tiktok_session.json` (project root)
- **Created by**: `npm run tiktok:login` or `node scripts/login-tiktok.js`
- **Contains**: Cookies, localStorage, sessionStorage
- **Validity**: Usually lasts weeks/months
- **Regenerate**: Run login script again if session expires

## Advantages Over Pure Playwright
- ✅ No manual login required during operation
- ✅ Bypasses TikTok's bot detection
- ✅ More reliable long-term connection
- ✅ Independent browser instance for TikTok
- ✅ Doesn't interfere with other platform's Playwright instances

## Next Steps
You can now use TikTok chat with TTS! Make sure to:
- Create a session file first: `npm run tiktok:login`
- Start the chat logger (TikTok auto-uses hybrid Playwright client with TTS)
- Configure TTS settings (voice selection, filters, etc.)
- Enjoy real-time TikTok chat with text-to-speech!
