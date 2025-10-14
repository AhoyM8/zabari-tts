import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { addMessage, clearMessages, setConnectionMode } from '../messages/route.js'

// Store active process (Playwright mode) or clients (API mode)
let chatProcess = null
let apiClients = null

export async function POST(request) {
  try {
    const config = await request.json()
    const { connectionMode = 'playwright' } = config

    // Clear old messages
    await clearMessages()

    // Handle based on connection mode
    if (connectionMode === 'playwright') {
      return await startPlaywrightMode(config)
    } else if (connectionMode === 'api') {
      return await startApiMode(config)
    } else {
      return NextResponse.json({
        success: false,
        error: `Unknown connection mode: ${connectionMode}`
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error starting chat logger:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * Start Playwright mode (existing functionality)
 */
async function startPlaywrightMode(config) {
  // If already running, stop it first
  if (chatProcess) {
    chatProcess.kill()
    chatProcess = null
  }

  // Set connection mode for message routing
  setConnectionMode('playwright')

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
    // We're in .../frontend/.next/standalone or .../app/frontend/.next/standalone

    // Check if we're in a packaged Electron app (path contains resources/app)
    if (cwd.includes('resources') && cwd.includes('app')) {
      // Packaged Electron: .../resources/app/frontend/.next/standalone
      // Go up 3 levels to reach resources/app/
      basePath = path.join(cwd, '..', '..', '..');
    } else {
      // Dev standalone: .../frontend/.next/standalone
      // Go up 3 levels to reach project root
      basePath = path.join(cwd, '..', '..', '..');
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
  // Both NeuTTS and Kokoro use external TTS servers
  const scriptName = (config.ttsEngine === 'neutts' || config.ttsEngine === 'kokoro')
    ? 'chat-logger-tts.js'
    : 'chat-logger-webspeech.js'

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
      const match = line.match(/(TWITCH|YOUTUBE|KICK):([^:]+):(.+)$/);
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
    message: 'Chat logger started (Playwright mode)',
    mode: 'playwright',
    engine: config.ttsEngine
  })
}

/**
 * Start API mode (new functionality)
 */
async function startApiMode(config) {
  try {
    // Set connection mode for message routing
    setConnectionMode('api')

    // Dynamically import the chat API module
    const chatApiModule = await import('../../../../lib/chat-api/index.js')
    const { initializeChatClients, disconnectAll } = chatApiModule

    // Disconnect existing clients if any
    if (apiClients) {
      await disconnectAll()
      apiClients = null
    }

    // Initialize chat clients
    apiClients = await initializeChatClients({
      platforms: config.platforms,
      ttsConfig: config.ttsConfig,
      youtubeApiKey: config.youtubeApiKey,
      onMessage: (platform, username, message) => {
        console.log(`[API MODE] ${platform.toUpperCase()}: ${username}: ${message}`)
        // Message already added to buffer by initializeChatClients
        // But we also add to the route's message buffer for consistency
        addMessage({
          platform,
          username,
          message
        })
      }
    })

    console.log(`Chat clients initialized in API mode. Active clients: ${apiClients.length}`)

    return NextResponse.json({
      success: true,
      message: 'Chat clients started (API mode)',
      mode: 'api',
      clientsCount: apiClients.length
    })

  } catch (error) {
    console.error('Error starting API mode:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

/**
 * Get active process/clients (for status check)
 */
export function getActiveConnection() {
  if (chatProcess) {
    return { mode: 'playwright', active: true }
  } else if (apiClients && apiClients.length > 0) {
    return { mode: 'api', active: true, clientsCount: apiClients.length }
  }
  return { mode: null, active: false }
}

/**
 * Stop all connections
 */
export async function stopAll() {
  if (chatProcess) {
    chatProcess.kill()
    chatProcess = null
  }

  if (apiClients) {
    const chatApiModule = await import('../../../../lib/chat-api/index.js')
    await chatApiModule.disconnectAll()
    apiClients = null
  }

  // Reset connection mode
  setConnectionMode(null)

  await clearMessages()
}
