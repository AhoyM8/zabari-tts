'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

/**
 * Kokoro TTS Manager Component
 * Handles Kokoro-82M TTS for API mode by making HTTP requests to Kokoro server
 */
const KokoroTTSManager = forwardRef(function KokoroTTSManager({ messages, kokoroConfig, ttsConfig, enabled }, ref) {
  const lastProcessedIndexRef = useRef(0)
  const messageQueueRef = useRef([])
  const isProcessingRef = useRef(false)
  const queueTimerRef = useRef(null)

  // Expose cancel function to parent component
  useImperativeHandle(ref, () => ({
    cancelAll: () => {
      console.log('[Kokoro TTS] Canceling all speech')
      messageQueueRef.current = []
      isProcessingRef.current = false
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current)
        queueTimerRef.current = null
      }
      lastProcessedIndexRef.current = messages.length
    }
  }))

  useEffect(() => {
    if (!enabled || !kokoroConfig || !ttsConfig) {
      console.log('[Kokoro TTS] Disabled or no config:', { enabled, hasKokoroConfig: !!kokoroConfig, hasTtsConfig: !!ttsConfig })
      return
    }

    // Process new messages
    const newMessages = messages.slice(lastProcessedIndexRef.current)

    if (newMessages.length > 0) {
      console.log(`[Kokoro TTS] Processing ${newMessages.length} new messages with config:`, {
        announceUsername: ttsConfig.announceUsername,
        voice: kokoroConfig.voice,
        speed: kokoroConfig.speed,
        serverUrl: kokoroConfig.serverUrl
      })

      // Add new messages to queue
      newMessages.forEach(msg => {
        console.log(`[Kokoro TTS] Queuing message from ${msg.platform}:`, {
          username: msg.username,
          message: msg.message
        })

        messageQueueRef.current.push({
          username: msg.username,
          message: msg.message
        })
      })

      lastProcessedIndexRef.current = messages.length

      // Start processing queue if not already processing
      if (!isProcessingRef.current) {
        console.log('[Kokoro TTS] Starting queue processing')
        processQueue()
      }
    }
  }, [messages, enabled, kokoroConfig, ttsConfig])

  const processQueue = async () => {
    // Clear any existing timer
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current)
      queueTimerRef.current = null
    }

    if (messageQueueRef.current.length === 0) {
      isProcessingRef.current = false
      return
    }

    isProcessingRef.current = true
    const item = messageQueueRef.current.shift()

    try {
      const { username, message } = item

      // Build text to speak
      const textToSpeak = ttsConfig.announceUsername ? `${username} says: ${message}` : message

      // Call Kokoro server
      await synthesizeWithKokoro(textToSpeak, kokoroConfig)

    } catch (error) {
      console.error('[Kokoro TTS] Error:', error)
    }

    // Delay between messages to prevent overlap
    queueTimerRef.current = setTimeout(() => {
      queueTimerRef.current = null
      processQueue()
    }, 500)
  }

  const synthesizeWithKokoro = async (text, config) => {
    try {
      console.log(`[Kokoro TTS] Synthesizing: "${text}"`)
      console.log(`[Kokoro TTS] Server URL: ${config.serverUrl}/synthesize`)
      console.log(`[Kokoro TTS] Config:`, { voice: config.voice, speed: config.speed })

      const response = await fetch(`${config.serverUrl}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: config.voice,
          speed: config.speed
        })
      })

      console.log(`[Kokoro TTS] Response status: ${response.status}`)
      console.log(`[Kokoro TTS] Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`Kokoro server returned ${response.status}: ${response.statusText}`)
      }

      // Get audio blob
      const audioBlob = await response.blob()
      console.log(`[Kokoro TTS] Received audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`)

      // Play audio
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      console.log('[Kokoro TTS] Created audio element, attempting to play...')

      // Set volume to max for testing
      audio.volume = 1.0

      // Wait for audio to finish playing
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = () => {
          console.log(`[Kokoro TTS] Audio loaded, duration: ${audio.duration} seconds`)
        }

        audio.onplay = () => {
          console.log('[Kokoro TTS] Audio started playing')
        }

        audio.onended = () => {
          console.log('[Kokoro TTS] Audio playback finished')
          URL.revokeObjectURL(audioUrl)
          resolve()
        }

        audio.onerror = (error) => {
          console.error('[Kokoro TTS] Audio playback error:', error)
          console.error('[Kokoro TTS] Audio error details:', {
            error: audio.error,
            networkState: audio.networkState,
            readyState: audio.readyState
          })
          URL.revokeObjectURL(audioUrl)
          reject(error)
        }

        audio.play()
          .then(() => {
            console.log('[Kokoro TTS] Play promise resolved')
          })
          .catch((err) => {
            console.error('[Kokoro TTS] Play promise rejected:', err)
            reject(err)
          })
      })

      console.log('[Kokoro TTS] Finished speaking')

    } catch (error) {
      console.error('[Kokoro TTS] Synthesis error:', error)
      throw error
    }
  }

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current)
        queueTimerRef.current = null
      }
      messageQueueRef.current = []
      isProcessingRef.current = false
    }
  }, [])

  // Clear queue when disabled
  useEffect(() => {
    if (!enabled) {
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current)
        queueTimerRef.current = null
      }
      messageQueueRef.current = []
      isProcessingRef.current = false
    }
  }, [enabled])

  return null // This component doesn't render anything
})

export default KokoroTTSManager
