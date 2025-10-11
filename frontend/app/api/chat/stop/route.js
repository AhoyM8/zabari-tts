import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    // Get the process from the start route
    // Note: In production, you'd want to use a process manager or database
    // For now, we'll create a PID file
    const pidPath = path.join(process.cwd(), '..', 'chat-logger.pid')

    if (fs.existsSync(pidPath)) {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf8'))

      try {
        process.kill(pid, 'SIGTERM')
        fs.unlinkSync(pidPath)

        return NextResponse.json({
          success: true,
          message: 'Chat logger stopped'
        })
      } catch (killError) {
        // Process might already be dead
        fs.unlinkSync(pidPath)
        return NextResponse.json({
          success: true,
          message: 'Chat logger was not running'
        })
      }
    } else {
      return NextResponse.json({
        success: true,
        message: 'No chat logger process found'
      })
    }

  } catch (error) {
    console.error('Error stopping chat logger:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
