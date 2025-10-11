import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const pidPath = path.join(process.cwd(), '..', 'chat-logger.pid')

    if (fs.existsSync(pidPath)) {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf8'))

      try {
        // Check if process is still running
        process.kill(pid, 0)
        return NextResponse.json({
          running: true,
          pid
        })
      } catch (error) {
        // Process is not running
        fs.unlinkSync(pidPath)
        return NextResponse.json({
          running: false
        })
      }
    } else {
      return NextResponse.json({
        running: false
      })
    }

  } catch (error) {
    console.error('Error checking status:', error)
    return NextResponse.json({
      running: false,
      error: error.message
    })
  }
}
