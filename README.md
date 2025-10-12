# Chat Logger with TTS

Real-time chat monitoring and text-to-speech system for Twitch, YouTube, and Kick live streams. Features dual connection modes (Playwright/API), modern web interface, and advanced multi-language TTS support.

## Features

### Core Features
- **Multi-Platform Support**: Monitors Twitch, YouTube, and Kick chats simultaneously
- **Dual Connection Modes**:
  - **Playwright Mode**: Browser automation for local development
  - **API Mode**: Direct API connections (Vercel-compatible, no browser needed)
- **Modern Web Interface**: Next.js frontend with real-time chat display and configuration
- **Three TTS Engines**:
  - **Web Speech API**: Browser-based TTS (no server required)
  - **NeuTTS Air**: AI voice cloning with custom voices
  - **Kokoro-82M**: Lightweight & fast AI TTS with 12 built-in voices

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
├── chat-logger-tts.js               # Playwright + NeuTTS Air / Kokoro
├── neutts-air/                      # NeuTTS Air TTS engine
│   ├── tts-server.py                # HTTP server for TTS synthesis
│   ├── .venv/                       # Python virtual environment
│   └── samples/                     # Voice samples for cloning
├── kokoro-tts/                      # Kokoro-82M TTS engine
│   ├── tts-server.py                # HTTP server for TTS synthesis
│   ├── .venv/                       # Python virtual environment
│   └── README.md                    # Kokoro setup & usage guide
├── audio_output/                    # Generated TTS audio files
└── dynamic-config.json              # Runtime configuration (generated)
```

## Setup Instructions

### Prerequisites

1. **Node.js** (v18+) - for Playwright and Next.js frontend
2. **Python** (3.11+) - for NeuTTS Air or Kokoro-82M (optional)
3. **uv** - fast Python package installer (optional, for TTS engines)
4. **espeak-ng** - phonemizer dependency (optional, for Kokoro only)

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

#### 2. Set up Python TTS Engines (Optional)

Choose one or both TTS engines based on your needs:

**Option A: NeuTTS Air (AI Voice Cloning)**
```bash
cd neutts-air
uv venv
uv pip install -r requirements.txt
```

**Option B: Kokoro-82M (Fast AI TTS with 12 Built-in Voices)**
```bash
cd kokoro-tts
uv venv
.venv/Scripts/activate  # Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

**Note**: Web Speech API doesn't require any Python setup!

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
   - **Kokoro-82M**: Lightweight & fast AI TTS with 12 built-in voices (requires Python server)

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

#### Option 4: Chat Logger with Kokoro-82M

**Terminal 1 - Start Kokoro TTS Server:**
```bash
cd kokoro-tts
# CPU mode (default)
.venv/Scripts/python tts-server.py

# GPU mode (NVIDIA CUDA)
.venv/Scripts/python tts-server.py --device cuda
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

Both TTS servers provide a simple HTTP API:

### NeuTTS Air (Port 8765)

**POST /synthesize**
```javascript
{
  "text": "Hello world",
  "voice": "dave"  // optional, defaults to "dave"
}
```
Returns: WAV audio file (24kHz)

**GET /health**
Returns: `{"status": "ok", "model": "neutts-air"}`

**GET /voices**
Returns: `{"voices": ["dave", "jo", ...]}`

### Kokoro-82M (Port 8766)

**POST /synthesize**
```javascript
{
  "text": "Hello world",
  "voice": "af_heart",  // optional, defaults to "af_heart"
  "speed": 1.0          // optional, 0.5-2.0, defaults to 1.0
}
```
Returns: WAV audio file (24kHz)

**GET /health**
Returns: `{"status": "ok", "model": "kokoro-82m"}`

**GET /voices**
Returns: `{"voices": ["af", "af_bella", "af_heart", ...]}`

**Server Options:**
- `--device cpu` (default) - Run on CPU
- `--device cuda` - Run on NVIDIA GPU for faster inference

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

**NeuTTS Air:**
- First generation is slow (model loading + voice encoding)
- Subsequent messages are faster (cached voice)

**Kokoro-82M:**
- Use GPU acceleration for faster inference: `python tts-server.py --device cuda`
- Requires NVIDIA GPU with CUDA support

## Performance Notes

### NeuTTS Air
- **First Message**: 10-30 seconds (model loading + voice encoding)
- **Subsequent Messages**: 2-5 seconds per message
- **Memory Usage**: ~2-3GB RAM for the model
- **CPU**: Model is optimized for CPU inference

### Kokoro-82M
- **First Message**: 3-5 seconds (model loading)
- **Subsequent Messages**: 1-2 seconds per message
- **Memory Usage**: ~500MB RAM (lightweight 82M parameters)
- **GPU Acceleration**: Significantly faster with NVIDIA CUDA (use `--device cuda`)

## Credits

- **NeuTTS Air**: https://github.com/neuphonic/neutts-air
- **Kokoro-82M**: https://github.com/hexgrad/kokoro
- **Playwright**: Browser automation
- **Neuphonic**: NeuTTS Air TTS engine

## License

This project uses:
- **NeuTTS Air**: Subject to its own license terms
- **Kokoro-82M**: Apache 2.0 license (open-weight model)
