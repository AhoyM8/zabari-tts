# Kokoro TTS Server

This directory contains the Kokoro TTS server for generating high-quality speech from chat messages using the Kokoro-82M model.

## About Kokoro

Kokoro is an open-weight TTS model with 82 million parameters. Despite its lightweight architecture, it delivers comparable quality to larger models while being significantly faster and more cost-efficient. Licensed under Apache 2.0.

## Setup

### Windows

1. **Install Python dependencies:**
   ```bash
   cd kokoro-tts
   uv venv
   .venv\Scripts\activate
   uv pip install -r requirements.txt
   ```

2. **Install espeak-ng (required for phonemization):**
   - Go to [espeak-ng releases](https://github.com/espeak-ng/espeak-ng/releases)
   - Download the appropriate `.msi` file (e.g., `espeak-ng-20191129-b702b03-x64.msi`)
   - Run the installer

### Linux/Mac

1. **Install Python dependencies:**
   ```bash
   cd kokoro-tts
   uv venv
   source .venv/bin/activate
   uv pip install -r requirements.txt
   ```

2. **Install espeak-ng:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install espeak-ng

   # macOS
   brew install espeak-ng
   ```

## Running the Server

```bash
# Activate virtual environment first
# Windows: .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate

python tts-server.py
```

The server will start on port 8766 by default, running on CPU.

### Options

- `--port PORT` - Specify a different port (default: 8766)
- `--lang LANG` - Set language code (default: 'a' for American English)
- `--device DEVICE` - Set computation device: `cpu` or `cuda` (default: cpu)

Language codes:
- `a` - American English (default)
- `b` - British English
- `e` - Spanish
- `f` - French
- `h` - Hindi
- `i` - Italian
- `j` - Japanese (requires: `pip install misaki[ja]`)
- `p` - Brazilian Portuguese
- `z` - Mandarin Chinese (requires: `pip install misaki[zh]`)

Examples:
```bash
# British English on custom port
python tts-server.py --port 8800 --lang b

# Run with NVIDIA GPU acceleration
python tts-server.py --device cuda

# Combine options
python tts-server.py --device cuda --lang b --port 8800
```

## Available Voices

The server includes 12 built-in voices:

**American Female:**
- `af` - Default female voice
- `af_bella` - Bella
- `af_heart` - Heart (default)
- `af_nicole` - Nicole
- `af_sarah` - Sarah
- `af_sky` - Sky

**American Male:**
- `am_adam` - Adam
- `am_michael` - Michael

**British Female:**
- `bf_emma` - Emma
- `bf_isabella` - Isabella

**British Male:**
- `bm_george` - George
- `bm_lewis` - Lewis

## API Endpoints

### POST /synthesize
Synthesizes speech from text.

**Request:**
```json
{
  "text": "Hello, world!",
  "voice": "af_heart",
  "speed": 1.0
}
```

**Response:** WAV audio file (24kHz)

### GET /health
Check server status.

**Response:**
```json
{
  "status": "ok",
  "model": "kokoro-82m"
}
```

### GET /voices
List available voices.

**Response:**
```json
{
  "voices": ["af", "af_bella", "af_heart", ...]
}
```

## GPU Acceleration

### NVIDIA CUDA (Windows/Linux)

For significantly faster inference with NVIDIA GPUs:

```bash
python tts-server.py --device cuda
```

**Requirements:**
- NVIDIA GPU with CUDA support
- PyTorch with CUDA support (install with: `uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118`)

The server will automatically fall back to CPU if CUDA is not available.

### Apple Silicon (Mac M1/M2/M3/M4)

For Apple Silicon GPU acceleration:

```bash
PYTORCH_ENABLE_MPS_FALLBACK=1 python tts-server.py
```

**Note:** PyTorch MPS (Metal Performance Shaders) support is automatic on Mac with Apple Silicon.

## Troubleshooting

### "espeak-ng not found"
Make sure espeak-ng is installed and in your PATH. Restart your terminal after installation.

### Dependency conflicts
If you encounter dependency issues, try creating a fresh virtual environment:

```bash
rm -rf .venv  # or rmdir /s .venv on Windows
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
```

## Performance

- **Model size:** 82M parameters (lightweight)
- **Output format:** 24kHz WAV
- **Speed:** Very fast, suitable for real-time streaming
- **Quality:** Comparable to larger models
- **Device:** Runs efficiently on CPU, GPU optional

## License

Kokoro model weights are licensed under Apache 2.0.
