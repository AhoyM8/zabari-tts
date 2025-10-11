import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { stopAll } from '../start/route.js'

export async function POST() {
  try {
    // Use the stopAll function from start route (handles both modes)
    await stopAll()

    // Also try to stop via PID file (for Playwright mode fallback)
    const pidPath = path.join(process.cwd(), '..', 'chat-logger.pid')

    if (fs.existsSync(pidPath)) {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf8'))

      try {
        process.kill(pid, 'SIGTERM')
        fs.unlinkSync(pidPath)
      } catch (killError) {
        // Process might already be dead
        try {
          fs.unlinkSync(pidPath)
        } catch (e) {
          // Ignore if file already deleted
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chat logger stopped'
    })

  } catch (error) {
    console.error('Error stopping chat logger:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
