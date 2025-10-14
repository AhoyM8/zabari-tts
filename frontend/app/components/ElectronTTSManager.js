'use client'

import { useEffect, useState } from 'react'

/**
 * ElectronTTSManager - Auto-manages TTS servers when running in Electron
 *
 * This component:
 * 1. Detects if running in Electron
 * 2. Auto-starts TTS servers based on selected engine
 * 3. Shows server status in UI
 */
export default function ElectronTTSManager({ ttsEngine, onServerStatusChange }) {
  const [isElectron, setIsElectron] = useState(false)
  const [serverStatus, setServerStatus] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupProgress, setSetupProgress] = useState('')

  // Detect if running in Electron
  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && window.electron && window.electron.tts)
  }, [])

  // Check dependencies and auto-start server when engine changes
  useEffect(() => {
    if (!isElectron || !ttsEngine || ttsEngine === 'webspeech' || !window.electron?.tts) {
      setNeedsSetup(false)
      return // Web Speech API doesn't need a server or electron not available
    }

    const checkAndStart = async () => {
      try {
        // Safety check before calling electron API
        if (!window.electron?.tts?.checkDependencies) {
          console.warn('[Electron TTS] Electron TTS API not available')
          return
        }

        // First check dependencies
        console.log('[Electron TTS] Checking dependencies for:', ttsEngine)
        const depCheck = await window.electron.tts.checkDependencies(ttsEngine)
        console.log('[Electron TTS] Dependencies check result:', depCheck)

        if (depCheck.success && (!depCheck.exists || !depCheck.hasPackages)) {
          // Dependencies missing - show setup button
          console.log('[Electron TTS] Dependencies missing, showing setup button')
          setNeedsSetup(true)
          setIsStarting(false)
          return
        }

        // Dependencies OK - start server
        setNeedsSetup(false)
        setIsStarting(true)
        console.log('[Electron TTS] Dependencies OK, starting server for engine:', ttsEngine)

        const result = await window.electron.tts.startServer(ttsEngine, {
          useGPU: false // Can be made configurable later
        })

        console.log('[Electron TTS] Server start result:', result)

        if (result.success) {
          console.log(`[Electron TTS] ${ttsEngine} server started successfully`)
          if (onServerStatusChange) {
            onServerStatusChange({ engine: ttsEngine, running: true })
          }
        } else {
          console.error(`[Electron TTS] Failed to start ${ttsEngine} server:`, result.error)
        }

      } catch (error) {
        console.error('[Electron TTS] Error in checkAndStart:', error)
      } finally {
        setIsStarting(false)
      }
    }

    // Small delay to avoid race conditions
    const timer = setTimeout(checkAndStart, 500)
    return () => clearTimeout(timer)

  }, [isElectron, ttsEngine, onServerStatusChange])

  // Periodically check server status
  useEffect(() => {
    if (!isElectron || !window.electron?.tts?.getStatus) return

    const checkStatus = async () => {
      try {
        // Safety check before calling
        if (!window.electron?.tts?.getStatus) return

        const result = await window.electron.tts.getStatus()
        if (result.success) {
          setServerStatus(result.status)
        }
      } catch (error) {
        console.error('[Electron TTS] Error checking status:', error)
      }
    }

    // Check immediately
    checkStatus()

    // Then check every 5 seconds
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)

  }, [isElectron])

  // Listen for setup progress
  useEffect(() => {
    if (!isElectron || !window.electron?.tts?.onSetupProgress) return

    try {
      const cleanup = window.electron.tts.onSetupProgress((message) => {
        setSetupProgress(message)
      })

      return () => {
        if (typeof cleanup === 'function') {
          cleanup()
        }
      }
    } catch (error) {
      console.error('[Electron TTS] Error setting up progress listener:', error)
    }
  }, [isElectron])

  // Handle setup button click
  const handleSetup = async () => {
    if (!window.electron?.tts?.setupDependencies) {
      console.error('[Electron TTS] Setup API not available')
      return
    }

    setIsSettingUp(true)
    setSetupProgress('Starting setup...')

    try {
      const result = await window.electron.tts.setupDependencies(ttsEngine)

      if (result.success) {
        setSetupProgress('✓ Setup complete!')
        setNeedsSetup(false)

        // Recheck dependencies
        setTimeout(async () => {
          if (!window.electron?.tts?.checkDependencies) return
          const checkResult = await window.electron.tts.checkDependencies(ttsEngine)
          if (checkResult.success && checkResult.exists && checkResult.hasPackages) {
            setSetupProgress('')
          }
        }, 1000)
      } else {
        setSetupProgress(`❌ Setup failed: ${result.error}`)
      }
    } catch (error) {
      setSetupProgress(`❌ Error: ${error.message}`)
    } finally {
      setTimeout(() => setIsSettingUp(false), 2000)
    }
  }

  // Don't render anything if not in Electron
  if (!isElectron) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg text-xs max-w-xs z-50">
      <div className="font-semibold mb-2">🤖 TTS Server Status</div>

      {needsSetup && (
        <div className="mb-3 p-2 bg-yellow-900/50 border border-yellow-600 rounded">
          <div className="text-yellow-400 mb-2">
            ⚠️ {ttsEngine} needs Python dependencies
          </div>
          {!isSettingUp && (
            <button
              onClick={handleSetup}
              className="w-full px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-white font-semibold transition-colors"
            >
              Install Dependencies
            </button>
          )}
        </div>
      )}

      {isSettingUp && (
        <div className="mb-2 p-2 bg-blue-900/50 border border-blue-600 rounded">
          <div className="text-blue-400 mb-1">📦 Installing...</div>
          <div className="text-xs text-gray-300">{setupProgress}</div>
        </div>
      )}

      {isStarting && (
        <div className="text-yellow-400 mb-2">
          ⏳ Starting {ttsEngine} server...
        </div>
      )}

      {serverStatus && !needsSetup && !isSettingUp && (
        <div className="space-y-1">
          <div className={`flex items-center justify-between ${
            serverStatus.kokoro.reachable ? 'text-green-400' : 'text-gray-500'
          }`}>
            <span>Kokoro (8766):</span>
            <span>{serverStatus.kokoro.reachable ? '✓ Running' : '○ Stopped'}</span>
          </div>
        </div>
      )}

      {ttsEngine === 'webspeech' && (
        <div className="text-blue-400 mt-2">
          ℹ️ Using Web Speech API (no server needed)
        </div>
      )}
    </div>
  )
}
