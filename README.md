# Chat Logger with TTS

Real-time chat monitoring and text-to-speech system for Twitch, YouTube, and Kick live streams. Features dual connection modes (Playwright/API), modern web interface, and advanced multi-language TTS support.

## Features

### Core Features
- **Multi-Platform Support**: Monitors Twitch, YouTube, and Kick chats simultaneously
- **Dual Connection Modes**:
  - **Playwright Mode**: Browser automation for local development
  - **API Mode**: Direct API connections (Vercel-compatible, no browser needed)
- **Modern Web Interface**: Next.js frontend with real-time chat display and configuration
- **Two TTS Engines**:
  - **Web Speech API**: Browser-based TTS (no server required)
  - **NeuTTS Air**: AI voice cloning with custom voices

### Advanced TTS Features
- **🌍 Multi-Language Auto-Detection**: Automatically detect Hebrew/English text and switch voices
- **🎤 Voice Selection**: Choose from all available system voices
- **🔊 Customizable Settings**: Adjust volume, rate, and pitch
- **📝 Username Announcement**: Optional username reading before messages
- **🚫 Smart Filtering**: Exclude bot commands, links, and specific users
- **💬 Live Chat Display**: See all messages in real-time with platform badges

## Project Structure

```
zabari-tts/
├── frontend/                        # Next.js web interface
│   ├── app/
│   │   ├── page.js                  # Main UI with TTS controls
│   │   ├── components/
│   │   │   └── TTSManager.js        # Browser TTS manager for API mode
│   │   └── api/
│   │       └── chat/                # API routes for chat management
│   └── lib/
│       └── chat-api/                # Direct API clients (API mode)
│           ├── twitch-client.js     # Twitch IRC client
│           ├── youtube-client.js    # YouTube Data API client
│           ├── kick-client.js       # Kick Pusher client
│           └── message-buffer.js    # Message storage
├── lib/
│   └── chat-api/                    # Shared chat API clients
├── chat-logger.js                   # Basic chat logger (no TTS)
├── chat-logger-webspeech.js         # Playwright + Web Speech API
├── chat-logger-tts.js               # Playwright + NeuTTS Air
├── neutts-air/                      # NeuTTS Air TTS engine
│   ├── tts-server.py                # HTTP server for TTS synthesis
│   ├── .venv/                       # Python virtual environment
│   └── samples/                     # Voice samples for cloning
├── audio_output/                    # Generated TTS audio files
└── dynamic-config.json              # Runtime configuration (generated)
```

## Setup Instructions

### Prerequisites

1. **Node.js** (v18+) - for Playwright and Next.js frontend
2. **Python** (3.11+) - for NeuTTS Air (optional)
3. **uv** - fast Python package installer (optional, for NeuTTS)
4. **espeak-ng** - phonemizer dependency (optional, for NeuTTS only)

**Note**: Web Speech API mode doesn't require Python, uv, or espeak-ng!

### Installing espeak-ng on Windows

**Option 1: Using Chocolatey (Administrator required)**
```bash
choco install espeak-ng
```

**Option 2: Manual Installation**
1. Download espeak-ng from: https://github.com/espeak-ng/espeak-ng/releases
2. Look for Windows installer (.msi or .exe)
3. Install and add to PATH

**Option 3: Using winget**
```bash
winget install --id=eSpeak-NG.eSpeak-NG -e
```

After installation, verify espeak is in your PATH:
```bash
espeak --version
```

### Installing Dependencies

#### 1. Install Node.js dependencies (Required)

**Root directory:**
```bash
npm install
```

**Frontend (Next.js):**
```bash
cd frontend
npm install
```

#### 2. Set up Python environment with uv (Optional - NeuTTS Air only)

Only needed if you want to use NeuTTS Air voice cloning:

```bash
cd neutts-air
uv venv
uv pip install -r requirements.txt
```

This creates a virtual environment at `neutts-air/.venv` and installs all Python dependencies quickly using uv.

**Note**: Skip this step if you're only using Web Speech API!

## Usage

### 🌟 Recommended: Web Interface

The easiest way to use Zabari TTS is through the web interface:

#### Step 1: Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Step 2: Open Browser

Navigate to **http://localhost:3000**

#### Step 3: Configure Settings

1. **Choose Connection Method**:
   - **Playwright Mode**: Best for local use with browser automation
   - **API Mode**: Best for deployment to Vercel/serverless (no browser needed)

2. **Enable Chat Platforms**:
   - Toggle on Twitch, YouTube, and/or Kick
   - Customize chat URLs for each platform

3. **Select TTS Engine**:
   - **Web Speech API** (Recommended): No server needed, uses system voices
   - **NeuTTS Air**: High-quality AI voice cloning (requires Python server)

4. **Configure TTS Settings**:
   - **Single Voice Mode**: Choose one voice for all messages
   - **Auto-Detect Language Mode**: 🌍 Enable Hebrew/English auto-detection
     - Select separate voices for English and Hebrew
     - System automatically detects language and switches voices
   - Adjust volume, rate, and pitch
   - Enable/disable username announcement
   - Filter unwanted messages (commands, links, specific users)

5. **Start Chat Logger**:
   - Click "Start Chat Logger" button
   - View live chat messages with platform badges
   - Hear messages spoken with automatic language detection

### Multi-Language TTS (Hebrew/English)

**NEW**: Automatically detect Hebrew and English text in usernames and messages!

**How it works:**
- Analyzes each message to detect Hebrew (עברית) or English characters
- Uses >30% Hebrew characters as threshold for Hebrew classification
- Username and message are detected separately for maximum accuracy
- Speaks each part with the appropriate voice

**Example scenarios:**
- `דניאל: hello everyone` → Hebrew voice + English "says:" + English voice
- `John: שלום לכולם` → English voice + English "says:" + Hebrew voice
- `דניאל: שלום!` → Hebrew voice + English "says:" + Hebrew voice

**Setup:**
1. Enable "Auto-detect Language (Hebrew/English)" toggle in TTS Settings
2. Select your preferred English voice (e.g., Microsoft George)
3. Select your preferred Hebrew voice (e.g., Microsoft Asaf)
4. Start chatting! 🎉

### Alternative: Command Line Usage

#### Option 1: Chat Logger Only (No TTS)

```bash
node chat-logger.js
```

#### Option 2: Chat Logger with Web Speech API

```bash
node chat-logger-webspeech.js
```

#### Option 3: Chat Logger with NeuTTS Air

**Terminal 1 - Start TTS Server:**
```bash
cd neutts-air
.venv/Scripts/python tts-server.py
```

**Terminal 2 - Start Chat Logger:**
```bash
node chat-logger-tts.js
```

### Configuring Chat URLs

Edit the URLs in `chat-logger-tts.js`:

```javascript
// Twitch
await twitchPage.goto('https://www.twitch.tv/popout/YOUR_CHANNEL/chat?popout=');

// YouTube
await youtubePage.goto('https://www.youtube.com/live_chat?is_popout=1&v=YOUR_VIDEO_ID');
```

### Changing Voice

Edit `chat-logger-tts.js` to change the voice:

```javascript
const TTS_VOICE = 'dave'; // Options: 'dave', 'jo', or any voice in samples/
```

To add custom voices, place `.wav` and `.txt` files in `neutts-air/samples/`:
- `myvoice.wav` - 3-15 seconds of clean speech
- `myvoice.txt` - transcript of the audio

## TTS Server API

The TTS server provides a simple HTTP API:

### POST /synthesize
Synthesize speech from text

```javascript
{
  "text": "Hello world",
  "voice": "dave"  // optional, defaults to "dave"
}
```

Returns: WAV audio file (24kHz)

### GET /health
Check server status

Returns: `{"status": "ok", "model": "neutts-air"}`

### GET /voices
List available voices

Returns: `{"voices": ["dave", "jo", ...]}`

## Audio Output

Generated audio files are saved to `audio_output/` with the format:
```
{platform}_{username}_{timestamp}.wav
```

Example:
```
twitch_johndoe_1704067200000.wav
youtube_janedoe_1704067201000.wav
```

## Troubleshooting

### "espeak not installed on your system"

Install espeak-ng (see Setup Instructions above) and ensure it's in your PATH.

### "TTS server is not running"

1. Make sure you started the TTS server first
2. Check that port 8765 is not in use
3. Look for error messages in the server terminal

### "Module not found" errors

Make sure you're using the virtual environment:
```bash
cd neutts-air
.venv/Scripts/python tts-server.py  # Windows
# or
source .venv/bin/activate && python tts-server.py  # Linux/Mac
```

### Slow TTS generation

- First generation is slow (model loading + voice encoding)
- Subsequent messages are faster (cached voice)
- Consider using GPU if available (change `codec_device="cuda"` in tts-server.py)

## Performance Notes

- **First Message**: 10-30 seconds (model loading + voice encoding)
- **Subsequent Messages**: 2-5 seconds per message
- **Memory Usage**: ~2-3GB RAM for the model
- **CPU**: Model is optimized for CPU inference

## Credits

- **NeuTTS Air**: https://github.com/neuphonic/neutts-air
- **Playwright**: Browser automation
- **Neuphonic**: NeuTTS Air TTS engine

## License

This project uses NeuTTS Air which is subject to its own license terms.
