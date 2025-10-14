import { NextResponse } from 'next/server';

/**
 * API route to request TTS server start
 * This is called by the frontend when running in Electron
 * The frontend will use window.electron.tts.startServer()
 */
export async function POST(request) {
  try {
    const { engine, options } = await request.json();

    // This route just validates the request
    // Actual server start happens via Electron IPC in the browser
    if (!engine || !['neutts', 'kokoro'].includes(engine)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid TTS engine specified'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `TTS server start requested for engine: ${engine}`,
      requiresElectronIPC: true
    });

  } catch (error) {
    console.error('Error in TTS start route:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
