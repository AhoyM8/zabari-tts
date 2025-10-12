# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-platform chat logger with real-time text-to-speech (TTS) for live streaming. Monitors Twitch, YouTube, and Kick chats using two connection methods: **Playwright browser automation** (local) or **Direct API connections** (Vercel-compatible). Features a modern Next.js web interface with live chat display and supports two TTS engines: Web Speech API (browser-based) and NeuTTS Air (AI voice cloning).

**NEW**: Dual connection mode allows deployment to Vercel and other serverless platforms without Playwright dependencies!

## Running the Application

### Option 1: Web Interface (Recommended)
**Terminal 1 - Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000 in your browser to access the web UI.

The web interface allows you to:
- **Choose connection method**: Playwright (browser automation) or API (direct connections)
- Toggle Twitch, YouTube, and Kick chats individually
- Configure custom chat URLs for each platform
- Choose between Web Speech API and NeuTTS Air TTS engines
- Adjust TTS settings (volume, rate, pitch, filters)
- View live chat messages from all platforms in real-time

### Option 2: Command Line

**Chat Logger with Web Speech API TTS:**
```bash
node chat-logger-webspeech.js
```

**Chat Logger with NeuTTS Air:**
**Terminal 1 - Start TTS Server:**
```bash
cd neutts-air
.venv/Scripts/python tts-server.py  # Windows
# OR
source .venv/bin/activate && python tts-server.py  # Linux/Mac
```

**Terminal 2 - Start Chat Logger:**
```bash
node chat-logger-tts.js
```

### Dependencies
```bash
# Node.js (root directory)
npm install

# Frontend (Next.js)
cd frontend
npm install

# Python TTS Server (optional - only for NeuTTS Air)
cd neutts-air
uv venv
uv pip install -r requirements.txt
```

## Architecture

### Dual Connection Mode

**Playwright Mode** (Local Development):
- Uses browser automation to capture chat messages
- Requires Playwright browser binaries
- Best for local development and testing
- Supports all TTS engines

**API Mode** (Vercel-Compatible):
- Direct IRC/WebSocket/HTTP connections to chat platforms
- No browser dependencies - smaller deployment size
- Works on serverless platforms (Vercel, Netlify, AWS Lambda)
- More reliable and efficient

### Three-Tier Architecture
1. **Next.js Frontend** (`frontend/`) - Modern web UI for configuration and live chat display
2. **Chat Connection Layer**:
   - **Playwright Mode**: `chat-logger-webspeech.js` or `chat-logger-tts.js` - Browser automation
   - **API Mode**: `lib/chat-api/` - Direct chat API clients (TMI.js for Twitch, Pusher for Kick, YouTube Data API)
3. **TTS Engine** - Either Web Speech API (browser) or Python TTS Server (`neutts-air/tts-server.py`)

### Chat Message Flow (API Mode)

**Twitch (TMI.js):**
1. Connect to Twitch IRC using `tmi.js` library
2. Subscribe to channel chat events
3. Receive messages in real-time via IRC protocol
4. No browser needed - pure WebSocket connection

**Kick (Pusher):**
1. Fetch chatroom ID from Kick API (`/api/v2/channels/{channel}`)
2. Connect to Pusher WebSocket (`wss://ws-us2.pusher.com`)
3. Subscribe to chatroom channel
4. Receive messages via Pusher events

**YouTube (Data API v3):**
1. Get live chat ID from video details
2. Poll `liveChatMessages` endpoint (2-second intervals)
3. Requires API key (free tier: 10,000 units/day)
4. Track processed message IDs to prevent duplicates

### Chat Message Flow (Playwright Mode)
1. Playwright opens three browser tabs (Twitch, YouTube, Kick) in headed mode
2. MutationObserver in each page's context watches for new DOM nodes
3. When chat message detected, logs to console with platform prefix (e.g., `TWITCH:username:message`)
4. Node.js console listener catches these logs, extracts username/message
5. If TTS enabled, message queued and sent to TTS server via HTTP
6. Audio saved to `audio_output/{platform}_{username}_{timestamp}.wav`

### Platform-Specific Chat Detection

**Twitch:**
- Selector: `[data-a-target="chat-line-message"]`
- Username: `[data-a-target="chat-message-username"]`
- Message: `[data-a-target="chat-line-message-body"]`

**YouTube:**
- Selector: `yt-live-chat-text-message-renderer`
- Username: `#author-name`
- Message: `#message`

**Kick:**
- No stable selectors - uses `querySelector('button')` to find username
- Extracts message by finding `username:` pattern in full text content
- Container: `[id*="channel-chatroom"]`

### TTS Implementation Details

**Web Speech API (chat-logger-webspeech.js):**
- Browser-native `speechSynthesis` API
- Uses system voices (configurable via frontend)
- No external server or dependencies required
- Real-time synthesis with adjustable volume, rate, and pitch
- Speaks directly in browser context via `page.evaluate()`
- **Voice Selection**: Choose from all available system voices
- **Multi-Language Support**: Auto-detect Hebrew/English and switch voices dynamically

**NeuTTS Air (chat-logger-tts.js):**
- **Model**: NeuTTS Air (quantized GGUF format for CPU inference)
- **Voice Cloning**: Requires reference audio (3-15 seconds) + transcript in `neutts-air/samples/`
- **Caching**: Reference audio encoded once per voice and cached in memory
- **Queue System**: Messages queued to prevent overwhelming TTS server (100ms delay between requests)
- **Output**: 24kHz WAV files saved to `audio_output/`

### Multi-Language TTS (Hebrew/English Auto-Detection)

**NEW FEATURE**: Automatic language detection for Hebrew and English content with dynamic voice switching.

**How It Works:**

1. **Language Detection Algorithm** (lines 137-150 in `chat-logger-webspeech.js`):
   - Counts Hebrew characters (Unicode range U+0590-U+05FF)
   - Counts Latin characters (a-z, A-Z)
   - Calculates Hebrew ratio: `hebrewChars / (hebrewChars + latinChars)`
   - If ratio > 30%, classifies as Hebrew; otherwise English
   - Defaults to English if no identifiable characters found

2. **Separate Detection for Username and Message**:
   - Username language is detected independently from message language
   - Example: Hebrew username "דניאל" can have English message "hello everyone"
   - Each part is spoken with the appropriate voice

3. **Multi-Utterance Speech Synthesis**:
   - When auto-detect is enabled and username announcement is on:
     - **Utterance 1**: Username (Hebrew or English voice based on detection)
     - **Utterance 2**: "says:" (always English voice as bridge)
     - **Utterance 3**: Message (Hebrew or English voice based on detection)
   - 100ms pause between utterances for natural flow

4. **Example Scenarios**:
   - `דניאל: hello everyone` → Hebrew voice + English "says:" + English voice
   - `John: שלום לכולם` → English voice + English "says:" + Hebrew voice
   - `דניאל: שלום!` → Hebrew voice + English "says:" + Hebrew voice

**Configuration Options:**
- **Auto-Detect Language**: Toggle to enable/disable (default: disabled)
- **English Voice**: Select from available English voices (en-*)
- **Hebrew Voice**: Select from available Hebrew voices (he-*)
- **Single Voice**: Used when auto-detect is disabled

**Supported in Both Modes:**
- Playwright Mode: Lines 167-268 in `chat-logger-webspeech.js`
- API Mode: Lines 83-155 in `frontend/app/components/TTSManager.js`

## Configuration

### Web Interface (Recommended)
All configuration can be done through the web UI at http://localhost:3000:
- **Connection Method**: Choose between Playwright (browser) or API (direct connections)
- **Chat URLs**: Enable/disable platforms and customize URLs per platform
- **TTS Engine**: Switch between Web Speech API and NeuTTS Air
- **TTS Settings**:
  - **Single Voice Mode**: Select one voice for all messages
  - **Auto-Detect Language Mode**: Automatically switch between Hebrew and English voices
  - Adjust volume, rate, pitch (Web Speech) or voice name (NeuTTS)
- **Voice Selection** (Web Speech API only):
  - Choose from all available system voices
  - Filter voices by language (English, Hebrew, etc.)
  - Separate voice selection for English and Hebrew when auto-detect is enabled
- **Message Filtering**: Exclude commands, links, and specific usernames
- **YouTube API Key**: Required for YouTube in API mode (optional in Playwright mode)
- **Live Chat**: View all messages from enabled platforms in real-time

Configuration is dynamically passed to the chat logger via `dynamic-config.json` (Playwright mode) or directly to API clients (API mode).

### Command Line Configuration
For standalone use without the web UI:

**Changing Chat URLs** in `chat-logger-webspeech.js` or `chat-logger-tts.js`:
```javascript
// Default configuration section (lines 60-65)
urls: {
  twitch: 'https://www.twitch.tv/popout/YOUR_CHANNEL/chat?popout=',
  youtube: 'https://www.youtube.com/live_chat?is_popout=1&v=YOUR_VIDEO_ID',
  kick: 'https://kick.com/popout/YOUR_CHANNEL/chat'
}
```

**Changing TTS Voice** for NeuTTS in `chat-logger-tts.js` line 8:
```javascript
const TTS_VOICE = 'dave'; // or 'jo', or any voice in samples/
```

**Adding Custom Voices** for NeuTTS - place files in `neutts-air/samples/`:
- `myvoice.wav` - 3-15 seconds of clean speech
- `myvoice.txt` - exact transcript of the audio

## Key Implementation Notes

### Playwright Context Evaluation
- MutationObserver code runs in browser context via `page.evaluate()`
- Console.log in browser context captured by `page.on('console')` in Node.js
- This architecture allows chat detection without complex Playwright selectors

### Kick Chat Complexity
Kick's dynamic class names required flexible selector strategy:
- Searches for any `<button>` element containing username
- Uses `fullText.lastIndexOf(username + ':')` to handle timestamps/duplicates
- Observes entire chatroom container with `subtree: true` due to nested structure

### Message Buffer Routing
The system uses two separate message buffers:
- **Playwright Mode Buffer**: Array-based buffer in `frontend/app/api/chat/messages/route.js`
  - Messages parsed from chat-logger process stdout
  - Format: `PLATFORM:username:message`
- **API Mode Buffer**: Class-based buffer in `lib/chat-api/message-buffer.js`
  - Messages added directly by chat API clients (Twitch, YouTube, Kick)
  - Singleton pattern for shared access

**Mode Tracking**: `setConnectionMode()` function tracks active mode to route GET requests to correct buffer:
- When mode is 'playwright', returns array buffer
- When mode is 'api', returns class-based buffer
- Prevents stale messages when switching between modes

### TTS Server Endpoints
- `POST /synthesize` - Accepts `{text, voice}`, returns WAV audio
- `GET /health` - Server status check
- `GET /voices` - Lists available voice samples

### Frontend API Endpoints
- `POST /api/chat/start` - Starts chat logger (Playwright mode) or API clients (API mode)
- `POST /api/chat/stop` - Stops chat logger or disconnects API clients
- `GET /api/chat/status` - Checks if chat logger is running
- `GET /api/chat/messages` - Returns buffered messages (last 100)

### Chat API Clients (API Mode)
- `lib/chat-api/twitch-client.js` - Twitch IRC client using tmi.js
- `lib/chat-api/kick-client.js` - Kick WebSocket client using Pusher
- `lib/chat-api/youtube-client.js` - YouTube polling client using Data API v3
- `lib/chat-api/message-buffer.js` - Shared message buffer
- `lib/chat-api/index.js` - Client manager and coordinator

### Debugging Scripts
- `inspect-kick.js` - Analyzes Kick DOM structure
- `inspect-kick-detailed.js` - Detailed HTML inspection
- `debug-kick-mutations.js` - Logs mutation observer events

## Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: JavaScript
- **Styling**: Tailwind CSS
- **Features**:
  - Real-time message display with 500ms polling
  - Platform-specific colored badges and styling
  - Auto-scroll to latest messages
  - Smooth fade-in animations
  - Dynamic configuration without code changes
  - Process management (start/stop chat logger)
