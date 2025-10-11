# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-platform chat logger with real-time text-to-speech (TTS) for live streaming. Monitors Twitch, YouTube, and Kick chats simultaneously using Playwright browser automation. Features a modern Next.js web interface with live chat display and supports two TTS engines: Web Speech API (browser-based) and NeuTTS Air (AI voice cloning).

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

### Three-Tier Architecture
1. **Next.js Frontend** (`frontend/`) - Modern web UI for configuration and live chat display
2. **Node.js Chat Logger** (`chat-logger-webspeech.js` or `chat-logger-tts.js`) - Browser automation that captures chat messages
3. **TTS Engine** - Either Web Speech API (browser) or Python TTS Server (`neutts-air/tts-server.py`)

**Communication Flow:**
- Frontend API routes spawn and manage chat logger child processes
- Chat logger stdout parsed for `PLATFORM:username:message` format
- Messages stored in memory buffer and served via `/api/chat/messages`
- Frontend polls messages endpoint every 500ms to update live chat display
- For NeuTTS: Node.js sends HTTP POST to `localhost:8765/synthesize`

### Chat Message Flow
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

**NeuTTS Air (chat-logger-tts.js):**
- **Model**: NeuTTS Air (quantized GGUF format for CPU inference)
- **Voice Cloning**: Requires reference audio (3-15 seconds) + transcript in `neutts-air/samples/`
- **Caching**: Reference audio encoded once per voice and cached in memory
- **Queue System**: Messages queued to prevent overwhelming TTS server (100ms delay between requests)
- **Output**: 24kHz WAV files saved to `audio_output/`

## Configuration

### Web Interface (Recommended)
All configuration can be done through the web UI at http://localhost:3000:
- **Chat URLs**: Enable/disable platforms and customize URLs per platform
- **TTS Engine**: Switch between Web Speech API and NeuTTS Air
- **TTS Settings**: Adjust volume, rate, pitch (Web Speech) or voice name (NeuTTS)
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

### TTS Server Endpoints
- `POST /synthesize` - Accepts `{text, voice}`, returns WAV audio
- `GET /health` - Server status check
- `GET /voices` - Lists available voice samples

### Frontend API Endpoints
- `POST /api/chat/start` - Spawns chat logger child process with dynamic config
- `POST /api/chat/stop` - Kills running chat logger process via PID file
- `GET /api/chat/status` - Checks if chat logger is running
- `GET /api/chat/messages` - Returns buffered messages (last 100)

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
