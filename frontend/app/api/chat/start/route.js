import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { addMessage, clearMessages, setConnectionMode } from '../messages/route.js'

// Store active Playwright process and TikTok hybrid client
let chatProcess = null
let tiktokClient = null // TikTok hybrid mode client (separate Playwright instance)

export async function POST(request) {
  try {
    const config = await request.json()

    // Clear old messages
    await clearMessages()

    // Always use Playwright mode (with TikTok hybrid)
    return await startPlaywrightMode(config)

  } catch (error) {
    console.error('Error starting chat logger:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * Start chat logger in Playwright mode
 * HYBRID MODE: TikTok uses separate Playwright client with session/bot detection avoidance
 */
async function startPlaywrightMode(config) {
  // If already running, stop it first
  if (chatProcess) {
    chatProcess.kill()
    chatProcess = null
  }

  // Disconnect TikTok hybrid client if exists
  if (tiktokClient) {
    try {
      await tiktokClient.disconnect()
    } catch (error) {
      console.error('Error disconnecting TikTok hybrid client:', error)
    }
    tiktokClient = null
  }

  // Set connection mode for message routing
  setConnectionMode('playwright')

  // HYBRID MODE: Initialize TikTok Playwright client if enabled
  // (TikTok uses session authentication and bot detection avoidance)
  if (config.platforms?.tiktok?.enabled) {
    try {
      console.log('[HYBRID MODE] Initializing TikTok client...')
      const { default: TikTokChatClient } = await import('../../../../../lib/chat-api/tiktok-client.js')

      const username = config.platforms.tiktok.username
      if (username) {
        const client = new TikTokChatClient({
          channelName: username,
          ttsConfig: config.ttsConfig, // Pass TTS config for built-in TTS support
          onMessage: (platform, username, message) => {
            // Log message in the format expected by chat-logger for TTS routing
            console.log(`[TIKTOK] ${username}: ${message}`)
            // Add to message buffer for frontend display
            addMessage({ platform, username, message })
          },
          onError: (error) => {
            console.error('[TIKTOK HYBRID ERROR]', error)
          }
        })

        await client.connect()
        tiktokClient = client // Store TikTok client
        console.log('[HYBRID MODE] TikTok client connected successfully')
      }
    } catch (error) {
      console.error('[HYBRID MODE] Failed to initialize TikTok client:', error)
      // Continue anyway - don't fail the entire startup
    }
  }

  // Determine base path (handle both dev and production)
  // In packaged Electron standalone server: process.cwd() = .../resources/app/frontend/.next/standalone
  //   chat-logger files are in: .../resources/app/
  // In dev Electron: process.cwd() = project root
  // In standalone Next.js: process.cwd() = .../frontend/.next/standalone

  const cwd = process.cwd();
  console.log('[Playwright Mode] process.cwd():', cwd);
  console.log('[Playwright Mode] __dirname:', __dirname);

  let basePath;

  // Check if running in standalone server (production or dev)
  if (cwd.includes('.next') && cwd.includes('standalone')) {
    // We're in .../frontend/.next/standalone/frontend or .../app/frontend/.next/standalone/frontend

    // Check if we're in a packaged Electron app (path contains resources/app)
    if (cwd.includes('resources') && cwd.includes('app')) {
      // Packaged Electron: .../resources/app/frontend/.next/standalone/frontend
      // Go up 4 levels to reach resources/app/
      basePath = path.join(cwd, '..', '..', '..', '..');
    } else {
      // Dev standalone: .../frontend/.next/standalone/frontend
      // Go up 4 levels to reach project root
      basePath = path.join(cwd, '..', '..', '..', '..');
    }
  } else {
    // Development mode: cwd might be project root or frontend directory
    basePath = cwd;
    // If we're in the frontend directory, go up one level to reach project root
    if (basePath.endsWith('frontend') || basePath.endsWith('frontend\\') || basePath.endsWith('frontend/')) {
      basePath = path.join(basePath, '..');
    }
  }

  console.log('[Playwright Mode] basePath:', basePath);

  // Create dynamic config file
  const configPath = path.join(basePath, 'dynamic-config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  // Determine which script to run
  const scriptName = 'chat-logger-webspeech.js'

  const scriptPath = path.join(basePath, scriptName)

  console.log('[Playwright Mode] scriptPath:', scriptPath);
  console.log('[Playwright Mode] script exists:', fs.existsSync(scriptPath));

  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json({
      success: false,
      error: `Chat logger script not found at: ${scriptPath}`
    }, { status: 500 })
  }

  // Start the chat logger process
  chatProcess = spawn('node', [scriptPath], {
    cwd: basePath,
    env: {
      ...process.env,
      ZABARI_CONFIG: configPath
    }
  })

  chatProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Chat Logger]: ${output}`)

    // Parse chat messages (format: PLATFORM:username:message)
    const lines = output.split('\n');
    lines.forEach(line => {
      // Match lines that contain PLATFORM:username:message pattern
      const match = line.match(/(TWITCH|YOUTUBE|KICK|TIKTOK):([^:]+):(.+)$/);
      if (match) {
        const [, platform, username, message] = match;
        console.log(`[MATCHED MESSAGE] Platform: ${platform}, User: ${username}, Message: ${message}`);
        addMessage({
          platform: platform.toLowerCase(),
          username: username.trim(),
          message: message.trim()
        });
      }
    });
  })

  chatProcess.stderr.on('data', (data) => {
    console.error(`[Chat Logger Error]: ${data.toString()}`)
  })

  chatProcess.on('close', (code) => {
    console.log(`Chat logger process exited with code ${code}`)
    chatProcess = null
  })

  return NextResponse.json({
    success: true,
    message: 'Chat logger started',
    engine: config.ttsEngine
  })
}

/**
 * Get active process (for status check)
 */
export function getActiveConnection() {
  if (chatProcess || tiktokClient) {
    return { active: true }
  }
  return { active: false }
}

/**
 * Stop all connections
 */
export async function stopAll() {
  if (chatProcess) {
    chatProcess.kill()
    chatProcess = null
  }

  if (tiktokClient) {
    // Disconnect TikTok hybrid client
    try {
      await tiktokClient.disconnect()
      console.log('[HYBRID MODE] TikTok client disconnected')
    } catch (error) {
      console.error('[HYBRID MODE] Error disconnecting TikTok:', error)
    }
    tiktokClient = null
  }

  // Reset connection mode
  setConnectionMode(null)

  await clearMessages()
}
