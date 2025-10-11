# Zabari TTS Frontend

Modern Next.js web interface for controlling the multi-platform chat logger with TTS.

## Features

- **Multi-Platform Support**: Toggle Twitch, YouTube, and Kick chats individually
- **Dual TTS Engines**:
  - Web Speech API (browser-based, no server required)
  - NeuTTS Air (high-quality AI voice cloning)
- **Real-time Configuration**: Adjust TTS settings on the fly
- **Message Filtering**: Exclude commands, links, and specific users
- **Responsive Design**: Built with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: JavaScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState)

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:3000 (or 3001 if 3000 is in use).

### Production Build

```bash
npm run build
npm start
```

## Configuration

### Chat Platforms

1. **Enable/Disable Platforms**: Use the toggle switches for Twitch, YouTube, and Kick
2. **Custom URLs**: When enabled, you can customize the chat URL for each platform
   - Default URLs are pre-filled
   - Useful for switching between different channels

### TTS Engine Selection

#### Web Speech API
- Browser-based TTS using system voices
- No external server required
- Configurable volume, rate, and pitch
- Best for: Quick setup, testing, low-latency

#### NeuTTS Air
- High-quality AI voice cloning
- Requires running `tts-server.py`
- Configurable voice name and server URL
- Best for: Production streams, custom voices

### TTS Settings

- **Volume**: 0.0 to 1.0 (Web Speech only)
- **Rate**: 0.5 to 2.0 - Speech speed (Web Speech only)
- **Pitch**: 0.5 to 2.0 - Voice pitch (Web Speech only)
- **Announce Username**: Prepend username to each message
- **Exclude Commands**: Skip messages starting with `!`
- **Exclude Links**: Skip messages containing URLs
- **Excluded Users**: Comma-separated list of usernames to ignore (e.g., bots)

## API Endpoints

The frontend communicates with these backend APIs:

### POST `/api/chat/start`
Starts the chat logger with the configured settings.

**Request Body:**
```json
{
  "platforms": {
    "twitch": { "enabled": true, "url": "..." },
    "youtube": { "enabled": false, "url": "..." },
    "kick": { "enabled": false, "url": "..." }
  },
  "ttsEngine": "webspeech",
  "ttsConfig": {
    "volume": 1.0,
    "rate": 1.0,
    "pitch": 1.0,
    "announceUsername": true,
    "excludeCommands": true,
    "excludeLinks": true,
    "excludeUsers": ["nightbot", "moobot"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat logger started",
  "engine": "webspeech"
}
```

### POST `/api/chat/stop`
Stops the running chat logger.

**Response:**
```json
{
  "success": true,
  "message": "Chat logger stopped"
}
```

### GET `/api/chat/status`
Check if the chat logger is running.

**Response:**
```json
{
  "running": true,
  "pid": 12345
}
```

## Architecture

```
┌─────────────────┐
│  Next.js UI     │
│  (React)        │
└────────┬────────┘
         │ HTTP API
         ▼
┌─────────────────┐
│  API Routes     │
│  (Node.js)      │
└────────┬────────┘
         │ Child Process
         ▼
┌─────────────────┐
│  Chat Logger    │
│  (Playwright)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Web Speech API │  or │  NeuTTS Air  │
│  (Browser)      │     │  (Python)    │
└─────────────────┘     └──────────────┘
```

## File Structure

```
frontend/
├── app/
│   ├── api/
│   │   └── chat/
│   │       ├── start/
│   │       │   └── route.js      # Start chat logger
│   │       ├── stop/
│   │       │   └── route.js      # Stop chat logger
│   │       └── status/
│   │           └── route.js      # Check status
│   ├── globals.css               # Global styles
│   ├── layout.js                 # Root layout
│   └── page.js                   # Main UI component
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

## Troubleshooting

### Port Already in Use
Next.js will automatically try the next available port (3001, 3002, etc.)

### Chat Logger Won't Start
1. Ensure at least one platform is enabled
2. Check that the backend Node.js server can spawn child processes
3. Verify Playwright is installed in the parent directory

### NeuTTS Server Not Available
1. Make sure the Python TTS server is running on the configured port
2. Default: http://localhost:8765
3. Start the server: `cd neutts-air && python tts-server.py`

## Development Tips

### Adding New Platforms
1. Add platform config to `platforms` state in `page.js`
2. Add platform colors to `tailwind.config.js`
3. Update chat logger scripts to support new platform selectors

### Customizing Styles
All colors and styling are in Tailwind CSS classes. Key colors:
- Twitch: `text-twitch` (#9146FF)
- YouTube: `text-youtube` (#FF0000)
- Kick: `text-kick` (#53FC18)

### Hot Reload
Next.js supports Fast Refresh. Changes to React components will update automatically.

## License

Same as parent project.
