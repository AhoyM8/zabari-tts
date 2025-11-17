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

  const detectLanguage = (text) => {
    // Hebrew Unicode range: \u0590-\u05FF
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length
    // Latin characters (English)
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length

    const totalChars = hebrewChars + latinChars

    console.log(`[Hybrid TTS DEBUG] Language detection for "${text}":`, {
      hebrewChars,
      latinChars,
      totalChars,
      hebrewRatio: totalChars > 0 ? (hebrewChars / totalChars).toFixed(2) : 0
    })

    // If less than 30% are identifiable characters, default to English
    if (totalChars === 0) {
      console.log('[Hybrid TTS DEBUG] No identifiable chars, defaulting to english')
      return 'english'
    }

    // If more than 30% Hebrew characters, consider it Hebrew
    const hebrewRatio = hebrewChars / totalChars
    const result = hebrewRatio > 0.3 ? 'hebrew' : 'english'
    console.log(`[Hybrid TTS DEBUG] Detected language: ${result}`)
    return result
  }

  const synthesizeWithWebSpeech = (text, voiceName) => {
    console.log(`[Hybrid TTS DEBUG] synthesizeWithWebSpeech called with:`, { text, voiceName })

    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        console.warn('[Hybrid TTS] Web Speech API not available')
        resolve()
        return
      }

      console.log('[Hybrid TTS DEBUG] Creating utterance...')
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.volume = ttsConfig.volume || 1.0
      utterance.rate = ttsConfig.rate || 1.0
      utterance.pitch = ttsConfig.pitch || 1.0

      console.log('[Hybrid TTS DEBUG] Utterance settings:', {
        volume: utterance.volume,
        rate: utterance.rate,
        pitch: utterance.pitch,
        text: utterance.text
      })

      const voices = window.speechSynthesis.getVoices()
      console.log(`[Hybrid TTS DEBUG] Available voices: ${voices.length}`)

      const selectedVoice = voices.find(v => v.name === voiceName)
      if (selectedVoice) {
        console.log('[Hybrid TTS DEBUG] Selected voice:', { name: selectedVoice.name, lang: selectedVoice.lang })
        utterance.voice = selectedVoice
      } else {
        console.warn('[Hybrid TTS DEBUG] Voice not found:', voiceName)
        console.log('[Hybrid TTS DEBUG] Available voice names:', voices.map(v => v.name).slice(0, 5))
      }

      utterance.onstart = () => {
        console.log('[Hybrid TTS DEBUG] Web Speech started speaking:', text)
      }

      utterance.onend = () => {
        console.log('[Hybrid TTS DEBUG] Web Speech finished speaking:', text)
        resolve()
      }

      utterance.onerror = (error) => {
        console.error('[Hybrid TTS DEBUG] Web Speech error:', error)
        resolve()
      }

      console.log('[Hybrid TTS DEBUG] Calling speechSynthesis.speak()...')
      window.speechSynthesis.speak(utterance)
      console.log('[Hybrid TTS DEBUG] speechSynthesis.speak() called')
    })
  }

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

      console.log('[Hybrid TTS DEBUG] ========================================')
      console.log('[Hybrid TTS DEBUG] Processing new message item:', { username, message })
      console.log('[Hybrid TTS DEBUG] Current config:', {
        announceUsername: ttsConfig.announceUsername,
        hebrewVoice: ttsConfig.hebrewVoice,
        englishVoice: ttsConfig.englishVoice
      })

      // Hybrid TTS: Detect language for username and message separately
      const usernameLanguage = detectLanguage(username)
      const messageLanguage = detectLanguage(message)

      console.log(`[Hybrid TTS] username="${username}" (${usernameLanguage}), message="${message}" (${messageLanguage})`)

      // OPTIMIZATION: If both username and message are English, use Kokoro for entire text
      if (usernameLanguage === 'english' && messageLanguage === 'english') {
        console.log('[Hybrid TTS] Both username and message are English - using Kokoro for entire text')
        const fullText = ttsConfig.announceUsername ? `${username} says: ${message}` : message
        console.log('[Hybrid TTS DEBUG] Full text:', fullText)
        await synthesizeWithKokoro(fullText, kokoroConfig)
        console.log('[Hybrid TTS DEBUG] English synthesis completed')
      } else {
        // At least one part is Hebrew - use hybrid mode
        console.log('[Hybrid TTS] Using hybrid mode (at least one part is Hebrew)')

        if (ttsConfig.announceUsername) {
          // Speak username - Hebrew uses Web Speech, English uses Kokoro
          if (usernameLanguage === 'hebrew') {
            console.log('[Hybrid TTS] Using Web Speech for Hebrew username')
            await synthesizeWithWebSpeech(username, ttsConfig.hebrewVoice)
            console.log('[Hybrid TTS DEBUG] Hebrew username synthesis completed')
          } else {
            console.log('[Hybrid TTS] Using Kokoro for English username')
            await synthesizeWithKokoro(username, kokoroConfig)
            console.log('[Hybrid TTS DEBUG] English username synthesis completed')
          }

          // Small delay
          console.log('[Hybrid TTS DEBUG] Waiting 100ms before "says:"...')
          await new Promise(resolve => setTimeout(resolve, 100))

          // Speak "says:" - always use Web Speech for this bridge word
          console.log('[Hybrid TTS DEBUG] Speaking "says:"...')
          await synthesizeWithWebSpeech('says:', ttsConfig.englishVoice)
          console.log('[Hybrid TTS DEBUG] "says:" synthesis completed')

          // Small delay
          console.log('[Hybrid TTS DEBUG] Waiting 100ms before message...')
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Speak message - Hebrew uses Web Speech, English uses Kokoro
        console.log('[Hybrid TTS DEBUG] About to speak message...')
        if (messageLanguage === 'hebrew') {
          console.log('[Hybrid TTS] Using Web Speech for Hebrew message')
          console.log('[Hybrid TTS DEBUG] Message text:', message)
          console.log('[Hybrid TTS DEBUG] Hebrew voice:', ttsConfig.hebrewVoice)
          await synthesizeWithWebSpeech(message, ttsConfig.hebrewVoice)
          console.log('[Hybrid TTS DEBUG] Hebrew message synthesis completed')
        } else {
          console.log('[Hybrid TTS] Using Kokoro for English message')
          console.log('[Hybrid TTS DEBUG] Message text:', message)
          await synthesizeWithKokoro(message, kokoroConfig)
          console.log('[Hybrid TTS DEBUG] English message synthesis completed')
        }
      }

      console.log('[Hybrid TTS DEBUG] ========================================')

    } catch (error) {
      console.error('[Hybrid TTS] Error:', error)
      console.error('[Hybrid TTS DEBUG] Error stack:', error.stack)
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
