# TikTok Live Chat Integration - Research & Implementation Plan

## Executive Summary

✅ **Good News**: TikTok integration is **POSSIBLE** and **EASIER** than expected!

Instead of fighting TikTok's bot detection with Playwright, we can use the **TikTok-Live-Connector** library which connects directly to TikTok's WebSocket API without browser automation.

## Key Findings

### 1. Bot Detection Challenge (Playwright Approach)
- **Issue**: TikTok detects Playwright automation
- **Manifestation**: "Try another browser" error with robot icon
- **Inconsistent**: Sometimes loads successfully, sometimes blocked
- **Conclusion**: Playwright approach is unreliable for TikTok

### 2. Recommended Solution: TikTok-Live-Connector

**Library**: `tiktok-live-connector` (Node.js)
- **GitHub**: https://github.com/zerodytrash/TikTok-Live-Connector
- **NPM**: https://www.npmjs.com/package/tiktok-live-connector
- **Stars**: 1.8k+ (actively maintained)
- **License**: MIT

#### How It Works
1. Connects directly to TikTok's Webcast push service (WebSocket)
2. Uses only the username (@uniqueId) - no credentials needed
3. No browser automation required
4. Receives real-time events: comments, gifts, joins, follows, likes, etc.

#### Advantages Over Playwright
✅ No bot detection issues
✅ More reliable and efficient
✅ Lower resource usage (no browser)
✅ Works on serverless platforms (Vercel-compatible!)
✅ Supports all live stream events (not just chat)
✅ Actively maintained with 1.8k+ stars

## Implementation Strategy

### API Mode Integration (Recommended)

Add TikTok as a 4th platform alongside Twitch, YouTube, and Kick using the API connection method.

#### File Structure
```
lib/chat-api/
├── tiktok-client.js       (NEW - TikTok WebSocket client)
├── twitch-client.js       (existing)
├── youtube-client.js      (existing)
├── kick-client.js         (existing)
├── message-buffer.js      (existing - shared buffer)
└── index.js               (update - add TikTok)
```

#### Code Example

**lib/chat-api/tiktok-client.js** (new file):
```javascript
const { TikTokLiveConnection } = require('tiktok-live-connector');

class TikTokClient {
  constructor(username, messageCallback, config = {}) {
    this.username = username;
    this.messageCallback = messageCallback;
    this.connection = null;
    this.config = config;
  }

  async connect() {
    try {
      this.connection = new TikTokLiveConnection(this.username, {
        processInitialData: false, // Don't process old messages
        enableExtendedGiftInfo: false, // Not needed for chat
      });

      // Listen for chat messages
      this.connection.on('chat', (data) => {
        this.messageCallback({
          platform: 'tiktok',
          username: data.uniqueId,
          message: data.comment,
          timestamp: new Date().toISOString()
        });
      });

      // Connect to live stream
      const state = await this.connection.connect();
      console.log(`✓ Connected to TikTok live (roomId: ${state.roomId})`);

      return { success: true, roomId: state.roomId };
    } catch (error) {
      console.error('TikTok connection error:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.disconnect();
      console.log('✓ Disconnected from TikTok');
    }
  }

  isConnected() {
    return this.connection?.getState()?.isConnected || false;
  }
}

module.exports = TikTokClient;
```

### Frontend Integration

#### 1. Update Configuration UI
Add TikTok toggle and URL input in [frontend/app/page.js](frontend/app/page.js):
```javascript
platforms: {
  twitch: { enabled: true, url: '...' },
  youtube: { enabled: true, url: '...' },
  kick: { enabled: true, url: '...' },
  tiktok: { enabled: true, username: 'zabariyarin' } // NEW
}
```

#### 2. Update Chat Display
Add TikTok badge styling in [frontend/app/components/ChatDisplay.js](frontend/app/components/ChatDisplay.js):
```javascript
const platformColors = {
  twitch: 'bg-purple-600',
  youtube: 'bg-red-600',
  kick: 'bg-green-600',
  tiktok: 'bg-cyan-500' // NEW - TikTok brand color
};
```

#### 3. Update API Route
Modify [frontend/app/api/chat/start/route.js](frontend/app/api/chat/start/route.js):
```javascript
if (platforms.tiktok?.enabled) {
  const tiktokUsername = extractTikTokUsername(platforms.tiktok.username);
  clients.tiktok = new TikTokClient(
    tiktokUsername,
    (msg) => messageBuffer.addMessage(msg),
    config
  );
  await clients.tiktok.connect();
}
```

## Installation Steps

### 1. Install Package
```bash
npm install tiktok-live-connector
```

### 2. Create TikTok Client
Create `lib/chat-api/tiktok-client.js` (see code above)

### 3. Update Chat API Manager
Update `lib/chat-api/index.js` to include TikTok client

### 4. Update Frontend
- Add TikTok to platform configuration
- Add TikTok username input field
- Add TikTok badge styling
- Update API route to start TikTok client

### 5. Test
```bash
cd frontend
npm run dev
# Enable TikTok platform with username: zabariyarin
```

## Additional Features Available

The TikTok-Live-Connector library supports many events beyond chat:

- **chat** - Chat messages (comments)
- **gift** - Gifts sent to streamer
- **member** - New members joining
- **like** - Likes/hearts
- **follow** - New followers
- **share** - Stream shares
- **viewer** - Viewer count updates
- **questionNew** - Questions from viewers
- **subscribe** - New subscribers
- **streamEnd** - Stream ended

These can be added later for enhanced functionality!

## Comparison: Playwright vs API

| Aspect | Playwright (Old) | TikTok-Live-Connector (New) |
|--------|------------------|------------------------------|
| Bot Detection | ❌ Blocked frequently | ✅ No issues |
| Reliability | ⚠️ Inconsistent | ✅ Reliable |
| Resource Usage | 🔴 High (browser) | 🟢 Low (WebSocket only) |
| Serverless Support | ❌ No | ✅ Yes (Vercel-compatible) |
| Setup Complexity | 🔴 Complex | 🟢 Simple |
| Real-time Performance | ⚠️ DOM polling | ✅ WebSocket push |
| Additional Events | ❌ Only chat | ✅ Gifts, follows, likes, etc. |
| Authentication Required | ❌ No | ❌ No |

## URL Format & Username Extraction

TikTok uses usernames instead of full URLs:

**Live URL Format**: `https://www.tiktok.com/@username/live`

**Extract Username**:
```javascript
function extractTikTokUsername(input) {
  // Handle full URL
  const urlMatch = input.match(/tiktok\.com\/@([^\/\?]+)/);
  if (urlMatch) return urlMatch[1];

  // Handle @username
  if (input.startsWith('@')) return input.substring(1);

  // Handle plain username
  return input;
}

// Examples:
// 'https://www.tiktok.com/@zabariyarin/live' → 'zabariyarin'
// '@zabariyarin' → 'zabariyarin'
// 'zabariyarin' → 'zabariyarin'
```

## Testing Notes

From our investigation:
- ✅ Page loads successfully (sometimes)
- ⚠️ Bot detection is inconsistent with Playwright
- ✅ Stream appears offline when tested (blank video area)
- ℹ️ Chat only visible when stream is LIVE
- ✅ TikTok-Live-Connector bypasses all browser-based issues

## Next Steps

1. ✅ Research complete - API library found
2. ⬜ Install `tiktok-live-connector` package
3. ⬜ Create TikTok client implementation
4. ⬜ Update frontend configuration UI
5. ⬜ Test with live TikTok stream
6. ⬜ Add error handling for offline streams
7. ⬜ Update documentation (CLAUDE.md)

## Recommended Approach

**Use API Mode ONLY** - Don't implement Playwright mode for TikTok due to bot detection issues.

This follows your existing dual-mode architecture:
- **Twitch, YouTube, Kick**: Support both Playwright and API modes
- **TikTok**: API mode only (using tiktok-live-connector)

## References

- TikTok-Live-Connector: https://github.com/zerodytrash/TikTok-Live-Connector
- NPM Package: https://www.npmjs.com/package/tiktok-live-connector
- Example Project: https://tiktok-chat-reader.zerody.one/
- Python Alternative: https://github.com/isaackogan/TikTokLive (for reference)
