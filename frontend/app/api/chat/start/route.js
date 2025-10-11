import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { addMessage, clearMessages } from '../messages/route.js'

// Store the active process
let chatProcess = null

export async function POST(request) {
  try {
    const config = await request.json()

    // If already running, stop it first
    if (chatProcess) {
      chatProcess.kill()
      chatProcess = null
    }

    // Clear old messages
    clearMessages()

    // Create dynamic config file
    const configPath = path.join(process.cwd(), '..', 'dynamic-config.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    // Determine which script to run
    const scriptName = config.ttsEngine === 'neutts'
      ? 'chat-logger-tts.js'
      : 'chat-logger-webspeech.js'

    const scriptPath = path.join(process.cwd(), '..', scriptName)

    // Start the chat logger process
    chatProcess = spawn('node', [scriptPath], {
      cwd: path.join(process.cwd(), '..'),
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
      message: 'Chat logger started',
      engine: config.ttsEngine
    })

  } catch (error) {
    console.error('Error starting chat logger:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
