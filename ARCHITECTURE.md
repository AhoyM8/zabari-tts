# Vercel-Compatible Architecture Design

## Overview

This document outlines the dual-mode architecture for Zabari TTS that supports both:
1. **Playwright Mode** (Current) - Browser automation for chat capture
2. **API Mode** (New) - Direct chat API connections compatible with Vercel serverless

## Architecture Comparison

### Current (Playwright Mode)
```
Frontend (Next.js) → Spawns Child Process → chat-logger-*.js (Playwright) → Captures Chat
```

**Limitations:**
- Requires persistent child processes (not Vercel-compatible)
- Needs Playwright browser binaries (large deployment size)
- Can't run in serverless environment (stateless, short-lived functions)

### New (API Mode)
```
Frontend (Next.js) → API Routes (Serverless) → Chat API Libraries → Streams Chat
```

**Benefits:**
- Fully serverless-compatible
- No browser dependencies
- Works on Vercel, Netlify, AWS Lambda
- Smaller deployment size
- More reliable and efficient

## Implementation Plan

### 1. Frontend: Connection Mode Selection

Add a new setting in `frontend/app/page.js` to choose connection method:

```javascript
const [connectionMode, setConnectionMode] = useState('playwright') // 'playwright' or 'api'
```

**UI Location:** Below "TTS Engine" section, add "Chat Connection Method" card with:
- **Playwright Mode** - Browser automation (local only, requires installed browsers)
- **API Mode** - Direct API connection (works everywhere, including Vercel)

### 2. New Chat API Libraries

Install these npm packages for API-based chat connections:

```bash
npm install tmi.js @socket.io/client youtube-live-chat-parser
```

#### Platform-Specific Implementations:

**Twitch** - Use `tmi.js` (official IRC library):
```javascript
const tmi = require('tmi.js');
const client = new tmi.Client({
  channels: ['channelname']
});
client.on('message', (channel, tags, message, self) => {
  // Emit message event
});
```

**YouTube** - Use `youtube-live-chat-parser` or Puppeteer-lite:
```javascript
// Option A: youtube-live-chat-parser
// Scrapes chat without full browser

// Option B: Use YouTube Data API v3
// Requires API key, has quota limits
```

**Kick** - Use WebSocket connection:
```javascript
// Kick uses Pusher WebSockets
const Pusher = require('pusher-js');
const pusher = new Pusher('KICK_APP_KEY', {
  cluster: 'us2',
  encrypted: true
});
const channel = pusher.subscribe('channel.12345');
channel.bind('message', (data) => {
  // Process message
});
```

### 3. New File Structure

```
zabari-tts/
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   ├── start/route.js         # Updated to handle both modes
│   │   │   │   ├── stop/route.js          # Updated to handle both modes
│   │   │   │   ├── messages/route.js      # Same for both modes
│   │   │   │   └── stream/route.js        # NEW: SSE endpoint for API mode
│   │   │   └── platforms/
│   │   │       ├── twitch/route.js        # NEW: Twitch API connection
│   │   │       ├── youtube/route.js       # NEW: YouTube API connection
│   │   │       └── kick/route.js          # NEW: Kick API connection
│   │   └── page.js                        # Updated with connection mode selector
├── lib/
│   ├── chat-api/                          # NEW: API-based chat clients
│   │   ├── twitch-client.js
│   │   ├── youtube-client.js
│   │   ├── kick-client.js
│   │   └── message-buffer.js              # Shared message storage
│   └── chat-playwright/                   # Existing Playwright logic
│       └── logger.js                      # Refactored from chat-logger-*.js
├── chat-logger-webspeech.js               # Keep for local Playwright mode
├── chat-logger-tts.js                     # Keep for local Playwright mode
└── ARCHITECTURE.md                        # This file
```

### 4. API Route Implementation

#### `frontend/app/api/chat/start/route.js` (Updated)

```javascript
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { initializeChatClients } from '@/lib/chat-api/clients';

let chatClients = null; // For API mode
let chatLoggerProcess = null; // For Playwright mode

export async function POST(request) {
  const config = await request.json();
  const { connectionMode, platforms, ttsEngine, ttsConfig } = config;

  if (connectionMode === 'playwright') {
    // Existing Playwright logic
    const scriptPath = ttsEngine === 'webspeech'
      ? 'chat-logger-webspeech.js'
      : 'chat-logger-tts.js';

    chatLoggerProcess = spawn('node', [scriptPath]);
    // ... existing implementation

  } else if (connectionMode === 'api') {
    // NEW: API mode using direct connections
    try {
      chatClients = await initializeChatClients({
        platforms,
        ttsConfig,
        onMessage: (platform, username, message) => {
          // Store in message buffer
          messageBuffer.add({ platform, username, message, timestamp: Date.now() });

          // Optional: Trigger TTS here if needed
          if (ttsConfig.enabled) {
            // Handle TTS in serverless context
          }
        }
      });

      return NextResponse.json({ success: true, mode: 'api' });
    } catch (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }
}
```

#### `lib/chat-api/twitch-client.js` (NEW)

```javascript
const tmi = require('tmi.js');

class TwitchChatClient {
  constructor(options) {
    this.channel = options.channel;
    this.onMessage = options.onMessage;
    this.client = null;
  }

  async connect() {
    this.client = new tmi.Client({
      channels: [this.channel]
    });

    this.client.on('message', (channel, tags, message, self) => {
      if (self) return; // Ignore own messages

      this.onMessage('twitch', tags.username, message);
    });

    await this.client.connect();
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
  }
}

module.exports = TwitchChatClient;
```

#### `lib/chat-api/kick-client.js` (NEW)

```javascript
const Pusher = require('pusher-js');

class KickChatClient {
  constructor(options) {
    this.channelName = options.channelName;
    this.onMessage = options.onMessage;
    this.pusher = null;
    this.channel = null;
  }

  async connect() {
    // Kick uses Pusher for WebSocket connections
    // First, fetch channel ID from Kick API
    const channelId = await this.getChannelId(this.channelName);

    this.pusher = new Pusher('32cbd69e4b950bf97679', {
      cluster: 'us2',
      encrypted: true
    });

    this.channel = this.pusher.subscribe(`chatrooms.${channelId}.v2`);

    this.channel.bind('App\\Events\\ChatMessageEvent', (data) => {
      const username = data.sender?.username || 'Unknown';
      const message = data.content || '';
      this.onMessage('kick', username, message);
    });
  }

  async getChannelId(channelName) {
    const response = await fetch(`https://kick.com/api/v2/channels/${channelName}`);
    const data = await response.json();
    return data.chatroom.id;
  }

  async disconnect() {
    if (this.channel) {
      this.pusher.unsubscribe(this.channel.name);
    }
    if (this.pusher) {
      this.pusher.disconnect();
    }
  }
}

module.exports = KickChatClient;
```

#### `lib/chat-api/youtube-client.js` (NEW)

```javascript
// YouTube Live Chat - Multiple approaches possible

// Option 1: Use YouTube Data API v3 (requires API key)
class YouTubeChatClient {
  constructor(options) {
    this.videoId = options.videoId;
    this.apiKey = options.apiKey;
    this.onMessage = options.onMessage;
    this.liveChatId = null;
    this.pageToken = null;
    this.pollInterval = null;
  }

  async connect() {
    // Get live chat ID
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${this.videoId}&key=${this.apiKey}`
    );
    const videoData = await videoResponse.json();
    this.liveChatId = videoData.items[0]?.liveStreamingDetails?.activeLiveChatId;

    if (!this.liveChatId) {
      throw new Error('No active live chat found for this video');
    }

    // Poll for messages
    this.pollInterval = setInterval(() => this.pollMessages(), 2000);
  }

  async pollMessages() {
    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${this.liveChatId}&part=snippet,authorDetails&key=${this.apiKey}${this.pageToken ? `&pageToken=${this.pageToken}` : ''}`;

    const response = await fetch(url);
    const data = await response.json();

    data.items?.forEach(item => {
      const username = item.authorDetails.displayName;
      const message = item.snippet.displayMessage;
      this.onMessage('youtube', username, message);
    });

    this.pageToken = data.nextPageToken;
  }

  async disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}

module.exports = YouTubeChatClient;
```

#### `lib/chat-api/message-buffer.js` (NEW)

```javascript
// Shared message buffer for API mode (in-memory for now, could use Redis for multi-instance)
class MessageBuffer {
  constructor(maxSize = 100) {
    this.messages = [];
    this.maxSize = maxSize;
  }

  add(message) {
    this.messages.push({
      id: `${message.platform}-${Date.now()}-${Math.random()}`,
      ...message
    });

    // Keep only last N messages
    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize);
    }
  }

  getAll() {
    return this.messages;
  }

  clear() {
    this.messages = [];
  }
}

// Singleton instance
let instance = null;

function getMessageBuffer() {
  if (!instance) {
    instance = new MessageBuffer();
  }
  return instance;
}

module.exports = { getMessageBuffer };
```

### 5. Frontend UI Updates

Add new section in `frontend/app/page.js` after TTS Engine selection:

```jsx
{/* Connection Method Selection */}
<div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
  <h2 className="text-2xl font-bold mb-6">Chat Connection Method</h2>

  <div className="space-y-4">
    {/* Playwright Mode */}
    <button
      onClick={() => setConnectionMode('playwright')}
      className={`w-full p-4 rounded-lg border-2 transition-all ${
        connectionMode === 'playwright'
          ? 'border-green-500 bg-green-500/10'
          : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h3 className="font-semibold text-lg">Playwright (Browser Automation)</h3>
          <p className="text-sm text-gray-400">Local only - requires installed browsers</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 ${
          connectionMode === 'playwright' ? 'border-green-500 bg-green-500' : 'border-gray-600'
        }`}>
          {connectionMode === 'playwright' && (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
          )}
        </div>
      </div>
    </button>

    {/* API Mode */}
    <button
      onClick={() => setConnectionMode('api')}
      className={`w-full p-4 rounded-lg border-2 transition-all ${
        connectionMode === 'api'
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h3 className="font-semibold text-lg">Direct API Connection</h3>
          <p className="text-sm text-gray-400">Vercel-compatible - works everywhere</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 ${
          connectionMode === 'api' ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
        }`}>
          {connectionMode === 'api' && (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
          )}
        </div>
      </div>
    </button>
  </div>

  {/* API Mode Additional Config */}
  {connectionMode === 'api' && (
    <div className="mt-6 space-y-4 p-4 bg-gray-800 rounded-lg">
      <div className="flex items-start gap-2 text-sm text-yellow-400">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
        <div>
          <strong>YouTube API Note:</strong> Requires YouTube Data API v3 key (free tier: 10,000 units/day)
        </div>
      </div>
    </div>
  )}
</div>
```

### 6. Deployment Configuration

#### For Vercel Deployment (API Mode Only):

**`vercel.json`:**
```json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 60
    }
  },
  "env": {
    "YOUTUBE_API_KEY": "@youtube-api-key"
  }
}
```

**Environment Variables:**
```bash
# Add via Vercel Dashboard or CLI
vercel env add YOUTUBE_API_KEY
```

### 7. Migration Strategy

#### Phase 1: Keep Existing Playwright Mode (Current)
- All existing functionality remains unchanged
- Users can continue using local setup

#### Phase 2: Add API Mode (New)
- Implement new chat API libraries
- Add connection mode selector in frontend
- Test locally before Vercel deployment

#### Phase 3: Vercel Deployment
- Deploy only API mode to Vercel
- Playwright mode remains available for local development
- Update documentation with deployment instructions

### 8. TTS Handling in Serverless

**Challenge:** TTS requires persistent audio playback, but serverless functions are stateless.

**Solutions:**

1. **Browser-based TTS (Web Speech API)** - Move TTS to frontend:
   - Backend sends messages via SSE/WebSocket
   - Frontend plays TTS using `speechSynthesis` API
   - ✅ Works perfectly in serverless

2. **Pre-recorded TTS (NeuTTS)** - Generate and serve audio files:
   - API route generates TTS audio
   - Returns audio URL or base64
   - Frontend plays audio via `<audio>` element
   - ✅ Works but adds latency

3. **External TTS Service** - Use cloud TTS:
   - Google Cloud Text-to-Speech
   - Amazon Polly
   - ElevenLabs API
   - ✅ Production-ready but costs money

**Recommended:** Option 1 (Browser-based) for API mode.

## Feature Comparison Matrix

| Feature | Playwright Mode | API Mode |
|---------|----------------|----------|
| Vercel Compatible | ❌ No | ✅ Yes |
| Twitch Chat | ✅ Yes | ✅ Yes (tmi.js) |
| YouTube Chat | ✅ Yes | ⚠️ Requires API key |
| Kick Chat | ✅ Yes | ✅ Yes (Pusher WS) |
| Web Speech TTS | ✅ Yes | ✅ Yes (frontend) |
| NeuTTS Air | ✅ Yes | ⚠️ Limited (external service) |
| Setup Complexity | Medium | Easy |
| Resource Usage | High (browser) | Low (API only) |
| Reliability | Medium | High |
| Cost | Free | Free* |

*YouTube API has free tier limits

## Next Steps

1. ✅ Design architecture (this document)
2. ⏳ Implement chat API libraries (`lib/chat-api/`)
3. ⏳ Update frontend with connection mode selector
4. ⏳ Create new API routes for API mode
5. ⏳ Test locally with both modes
6. ⏳ Deploy to Vercel with API mode
7. ⏳ Update documentation

## Questions & Decisions Needed

1. **YouTube API Key:** Should users provide their own or use project-wide key?
   - **Recommendation:** User-provided for better quota management

2. **TTS in API Mode:** Which approach for NeuTTS?
   - **Recommendation:** Browser-based only for now, add external service later

3. **Message Storage:** In-memory or Redis for multi-instance support?
   - **Recommendation:** In-memory for MVP, Redis for production

4. **Real-time Updates:** SSE (Server-Sent Events) or WebSocket?
   - **Recommendation:** SSE for simplicity (Vercel supports it)

## References

- [tmi.js (Twitch)](https://github.com/tmijs/tmi.js)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [Kick Pusher Integration](https://pusher.com/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
