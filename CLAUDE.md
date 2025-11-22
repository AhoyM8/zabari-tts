# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-platform chat logger with real-time text-to-speech (TTS) for live streaming. Monitors Twitch, YouTube, Kick, and TikTok chats using **Playwright browser automation**. Features a modern Next.js web interface with live chat display and supports two TTS engines: Web Speech API (browser-based) and Kokoro-82M (lightweight & fast AI TTS).

**HYBRID MODE**: TikTok uses a separate API client with session authentication and bot detection avoidance while other platforms use standard Playwright automation.

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
- Toggle Twitch, YouTube, Kick, and TikTok chats individually
- Configure custom usernames/channels for each platform
- Choose between Web Speech API and Kokoro-82M TTS engines
- Adjust TTS settings (volume, rate, pitch, speed, voice selection, filters)
- View live chat messages from all platforms in real-time
- **TikTok Note**: Requires `tiktok_session.json` file (run `npm run tiktok:login` first)

### Option 2: Command Line

**Chat Logger with Web Speech API TTS:**
```bash
node chat-logger-webspeech.js
```

**Chat Logger with Kokoro-82M:**
**Terminal 1 - Start Kokoro TTS Server:**
```bash
cd kokoro-tts
# Windows - CPU
.venv/Scripts/python tts-server.py

# Windows - GPU (NVIDIA CUDA)
.venv/Scripts/python tts-server.py --device cuda

# Linux/Mac - CPU
source .venv/bin/activate && python tts-server.py

# Linux/Mac - GPU (NVIDIA CUDA)
source .venv/bin/activate && python tts-server.py --device cuda
```

### Dependencies
```bash
# Node.js (root directory)
npm install

# Frontend (Next.js)
cd frontend
npm install

# Python TTS Server (optional - only for Kokoro)
# Kokoro-82M
cd kokoro-tts
uv venv
.venv/Scripts/activate  # Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
# Also install espeak-ng (see kokoro-tts/README.md)
```

## Architecture

### Connection Mode: Playwright with TikTok Hybrid

**Playwright Browser Automation**:
- Uses Playwright to open chat pages in browser windows
- Monitors DOM for new chat messages via MutationObserver
- Works for: Twitch, YouTube, Kick
- Requires Playwright browser binaries
- TTS runs in browser context (Web Speech API) or via HTTP (Kokoro)

**TikTok Hybrid Mode**:
- TikTok uses separate API client with session authentication
- Avoids bot detection with stealth Playwright setup
- Requires `tiktok_session.json` file (created via `npm run tiktok:login`)
- Has built-in TTS support (Web Speech API)
- Runs in independent browser instance

### Three-Tier Architecture
1. **Next.js Frontend** (`frontend/`) - Modern web UI for configuration and live chat display
2. **Chat Connection Layer**:
   - **Playwright**: `chat-logger-webspeech.js` - Browser automation for Twitch/YouTube/Kick
   - **TikTok Hybrid**: `lib/chat-api/tiktok-client.js` - Session-based client with bot detection avoidance
3. **TTS Engine** - Web Speech API (browser) or Kokoro-82M (`kokoro-tts/tts-server.py`)

### Chat Message Flow (Playwright Mode - Twitch/YouTube/Kick)
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

**TikTok (Hybrid Mode):**
- Uses separate Playwright browser with session authentication
- Selector: `div.w-full.pt-4[data-index]`
- Username/Message: Extracted from `innerText` (first line = username, rest = message)
- Polling interval: 3 seconds
- Built-in TTS support (Web Speech API only)

### TTS Implementation Details

**Web Speech API (chat-logger-webspeech.js):**
- Browser-native `speechSynthesis` API
- Uses system voices (configurable via frontend)
- No external server or dependencies required
- Real-time synthesis with adjustable volume, rate, and pitch
- Speaks directly in browser context via `page.evaluate()`
- **Voice Selection**: Choose from all available system voices
- **Multi-Language Support**: Auto-detect Hebrew/English and switch voices dynamically

**Kokoro-82M:**
- **Model**: Kokoro-82M (82 million parameter lightweight TTS model)
- **Built-in Voices**: 12 pre-trained voices (American/British, Male/Female)
- **Voice Options**:
  - American Female: af, af_bella, af_heart, af_nicole, af_sarah, af_sky
  - American Male: am_adam, am_michael
  - British Female: bf_emma, bf_isabella
  - British Male: bm_george, bm_lewis
- **Speed Control**: Adjustable speed parameter (0.5x to 2x)
- **Fast Generation**: Optimized for real-time streaming
- **GPU Acceleration**: Supports both CPU and NVIDIA CUDA GPU (controlled via `--device` flag)
- **Output**: 24kHz WAV files saved to `audio_output/`
- **Server**: Port 8766 (default)
- **License**: Apache 2.0 (open-weight model)
- **Multi-Language**: Supports English (American/British), Spanish, French, Hindi, Italian, Japanese, Portuguese, Mandarin
- **Device Control**: Start server with `--device cpu` (default) or `--device cuda` for GPU acceleration

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

**Supported in Playwright Mode:**
- Lines 167-268 in `chat-logger-webspeech.js`
- TikTok client: Lines 155-249 in `lib/chat-api/tiktok-client.js`

## Configuration

### Web Interface (Recommended)
All configuration can be done through the web UI at http://localhost:3000:
- **Chat Platforms**: Enable/disable Twitch, YouTube, Kick, and TikTok individually
- **Platform Identifiers**: Enter usernames/channels for each platform
- **TTS Engine**: Switch between Web Speech API and Kokoro-82M
- **TTS Settings**:
  - **Single Voice Mode**: Select one voice for all messages
  - **Auto-Detect Language Mode**: Automatically switch between Hebrew and English voices (Web Speech only)
  - Adjust volume, rate, pitch (Web Speech) or voice/speed (Kokoro)
- **Voice Selection**:
  - **Web Speech API**: Choose from all available system voices, filter by language
  - **Kokoro-82M**: Select from 12 built-in voices via dropdown, adjust speed
- **Message Filtering**: Exclude commands, links, and specific usernames
- **Live Chat**: View all messages from enabled platforms in real-time

Configuration is dynamically passed to the chat logger via `dynamic-config.json`.

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

**Changing TTS Voice** for Kokoro in the web UI:
Select from 12 built-in voices and adjust speed (0.5x to 2x)

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

### Message Buffer
Messages are stored in an array-based buffer in `frontend/app/api/chat/messages/route.js`:
- Messages parsed from chat-logger process stdout (Twitch/YouTube/Kick)
- Format: `PLATFORM:username:message`
- TikTok messages added directly via `addMessage()` from hybrid client
- Last 100 messages kept in memory

### TTS Server Endpoints

**Kokoro-82M (Port 8766):**
- `POST /synthesize` - Accepts `{text, voice, speed}`, returns WAV audio
- `GET /health` - Server status check
- `GET /voices` - Lists 12 built-in voices
- **GPU Control**: Server started with `--device cpu` or `--device cuda` flag (not API endpoint)

### Frontend API Endpoints
- `POST /api/chat/start` - Starts Playwright chat logger and TikTok hybrid client
- `POST /api/chat/stop` - Stops chat logger and disconnects TikTok client
- `GET /api/chat/status` - Checks if chat logger is running
- `GET /api/chat/messages` - Returns buffered messages (last 100)

### TikTok Hybrid Client
- `lib/chat-api/tiktok-client.js` - TikTok session-based client with bot detection avoidance
  - Uses Playwright with session authentication (`tiktok_session.json`)
  - Polls for messages every 3 seconds
  - Built-in TTS support with Web Speech API
  - Message filtering (commands, links, excluded users)
  - Independent browser instance (doesn't interfere with other platforms)

### TikTok Session Setup
To use TikTok chat monitoring, you must create a session file first:

1. **Run the login script:**
   ```bash
   npm run tiktok:login
   # or: node scripts/login-tiktok.js
   ```

2. **Login process:**
   - Browser will open to TikTok login page
   - Login with your TikTok account
   - Press Enter in terminal once logged in
   - Session saved to `tiktok_session.json`

3. **Session contents:**
   - Cookies
   - localStorage
   - sessionStorage

4. **Session validity:**
   - Usually lasts weeks/months
   - Regenerate if connection fails (run login script again)

5. **Security notes:**
   - Keep `tiktok_session.json` private (already in `.gitignore`)
   - Contains authentication tokens for your TikTok account

### Debugging Scripts
- `scripts/debug/inspect-kick.js` - Analyzes Kick DOM structure
- `scripts/debug/inspect-kick-detailed.js` - Detailed HTML inspection
- `scripts/debug/debug-kick-mutations.js` - Logs mutation observer events

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
