# Chat Logger with TTS

Real-time chat monitoring and text-to-speech system for Twitch and YouTube live streams using Playwright and NeuTTS Air.

## Features

- **Multi-Platform Support**: Monitors both Twitch and YouTube chat simultaneously
- **Real-Time TTS**: Converts chat messages to speech using NeuTTS Air (on-device TTS)
- **Voice Cloning**: Supports instant voice cloning with 3+ seconds of audio
- **Audio Saving**: Saves all generated TTS audio files locally
- **Browser Automation**: Uses Playwright to monitor chat windows

## Project Structure

```
zabari-tts/
├── chat-logger.js           # Basic chat logger (no TTS)
├── chat-logger-tts.js       # Chat logger with TTS integration
├── neutts-air/              # NeuTTS Air TTS engine
│   ├── tts-server.py        # HTTP server for TTS synthesis
│   ├── .venv/               # Python virtual environment (created by uv)
│   └── samples/             # Voice samples (dave.wav, jo.wav, etc.)
└── audio_output/            # Generated TTS audio files
```

## Setup Instructions

### Prerequisites

1. **Node.js** (v18+) - for Playwright
2. **Python** (3.11+) - for NeuTTS Air
3. **uv** - fast Python package installer
4. **espeak-ng** - phonemizer dependency (REQUIRED)

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

#### 1. Install Node.js dependencies

```bash
npm install
```

#### 2. Set up Python environment with uv

```bash
cd neutts-air
uv venv
uv pip install -r requirements.txt
```

This creates a virtual environment at `neutts-air/.venv` and installs all Python dependencies quickly using uv.

## Usage

### Option 1: Chat Logger Only (No TTS)

Just monitor and log chat messages:

```bash
node chat-logger.js
```

### Option 2: Chat Logger with TTS

#### Step 1: Start the TTS Server

```bash
cd neutts-air
.venv/Scripts/python tts-server.py
```

Wait for the message: `🎤 TTS Server running at http://localhost:8765`

The server will:
- Load the NeuTTS Air model
- Listen on port 8765
- Cache voice references for faster generation

#### Step 2: Start the Chat Logger

In a new terminal:

```bash
node chat-logger-tts.js
```

The script will:
- Open Twitch and YouTube chat windows
- Monitor incoming messages
- Send messages to TTS server
- Save audio files to `audio_output/`

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
