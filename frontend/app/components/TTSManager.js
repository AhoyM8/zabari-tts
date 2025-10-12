'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

/**
 * TTS Manager Component
 * Handles browser-based TTS for API mode
 */
const TTSManager = forwardRef(function TTSManager({ messages, ttsConfig, enabled }, ref) {
  const lastProcessedIndexRef = useRef(0)
  const messageQueueRef = useRef([])
  const isProcessingRef = useRef(false)
  const queueTimerRef = useRef(null) // Track setTimeout for cancellation

  // Expose cancel function to parent component
  useImperativeHandle(ref, () => ({
    cancelAll: () => {
      console.log('[TTS] Canceling all speech')
      // Clear the queue
      messageQueueRef.current = []
      isProcessingRef.current = false
      // Cancel pending timer
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current)
        queueTimerRef.current = null
      }
      // Cancel any currently playing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      // Reset processed index to prevent reprocessing
      lastProcessedIndexRef.current = messages.length
    }
  }))

  useEffect(() => {
    if (!enabled || !ttsConfig) {
      console.log('[TTS] Disabled or no config:', { enabled, hasConfig: !!ttsConfig })
      return
    }

    // Process new messages
    const newMessages = messages.slice(lastProcessedIndexRef.current)

    if (newMessages.length > 0) {
      console.log(`[TTS] Processing ${newMessages.length} new messages with config:`, {
        announceUsername: ttsConfig.announceUsername,
        volume: ttsConfig.volume,
        rate: ttsConfig.rate,
        pitch: ttsConfig.pitch
      })

      // Add new messages to queue
      newMessages.forEach(msg => {
        console.log(`[TTS] Queuing message from ${msg.platform}:`, {
          username: msg.username,
          message: msg.message,
          autoDetectLanguage: ttsConfig.autoDetectLanguage,
          announceUsername: ttsConfig.announceUsername
        })

        // Queue as object to support language detection
        messageQueueRef.current.push({
          username: msg.username,
          message: msg.message
        })
      })

      lastProcessedIndexRef.current = messages.length

      // Start processing queue if not already processing
      if (!isProcessingRef.current) {
        console.log('[TTS] Starting queue processing')
        processQueue()
      }
    }
  }, [messages, enabled, ttsConfig])

  /**
   * Detect if text is primarily Hebrew or English
   * @param {string} text - Text to analyze
   * @returns {string} - 'hebrew' or 'english'
   */
  const detectLanguage = (text) => {
    // Hebrew Unicode range: \u0590-\u05FF
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length
    // Latin characters (English)
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length

    const totalChars = hebrewChars + latinChars

    // If no identifiable characters, default to English
    if (totalChars === 0) return 'english'

    // If more than 30% Hebrew characters, consider it Hebrew
    const hebrewRatio = hebrewChars / totalChars
    return hebrewRatio > 0.3 ? 'hebrew' : 'english'
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
      // Item can be either a string (old behavior) or an object with username/message
      if (typeof item === 'string') {
        await speak(item, ttsConfig)
      } else {
        // New behavior with language detection
        const { username, message } = item

        if (ttsConfig.autoDetectLanguage) {
          const usernameLanguage = detectLanguage(username)
          const messageLanguage = detectLanguage(message)

          console.log(`[TTS] Language detection: username="${username}" (${usernameLanguage}), message="${message}" (${messageLanguage})`)

          if (ttsConfig.announceUsername) {
            // Speak username with appropriate voice
            await speak(username, { ...ttsConfig, voice: usernameLanguage === 'hebrew' ? ttsConfig.hebrewVoice : ttsConfig.englishVoice })
            await new Promise(resolve => setTimeout(resolve, 100))

            // Speak "says:" in English
            await speak('says:', { ...ttsConfig, voice: ttsConfig.englishVoice })
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          // Speak message with appropriate voice
          await speak(message, { ...ttsConfig, voice: messageLanguage === 'hebrew' ? ttsConfig.hebrewVoice : ttsConfig.englishVoice })
        } else {
          // Original behavior
          const textToSpeak = ttsConfig.announceUsername ? `${username} says: ${message}` : message
          await speak(textToSpeak, ttsConfig)
        }
      }
    } catch (error) {
      console.error('TTS error:', error)
    }

    // Delay between messages to prevent overlap
    queueTimerRef.current = setTimeout(() => {
      queueTimerRef.current = null
      processQueue()
    }, 500)
  }

  const speak = (text, config) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        console.error('[TTS] Speech synthesis not available')
        resolve()
        return
      }

      console.log(`[TTS] Speaking: "${text}"`)

      // WORKAROUND 1: Ensure voices are loaded first
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) {
        console.warn('[TTS] No voices loaded yet, waiting...')
        // Try to trigger voice loading
        window.speechSynthesis.getVoices()
        setTimeout(() => speak(text, config).then(resolve), 100)
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.volume = config.volume || 1.0
      utterance.rate = config.rate || 1.0
      utterance.pitch = config.pitch || 1.0

      // WORKAROUND 2: Set language explicitly
      utterance.lang = 'en-US'

      // Try to find the requested voice
      const selectedVoice = voices.find(v => v.name === config.voice)

      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang
        console.log(`[TTS] Using selected voice: ${selectedVoice.name} (${selectedVoice.lang})`)
      } else {
        // Try to find an English voice
        const englishVoice = voices.find(v => v.lang.startsWith('en'))
        if (englishVoice) {
          utterance.voice = englishVoice
          utterance.lang = englishVoice.lang
          console.log(`[TTS] Using English voice: ${englishVoice.name} (${englishVoice.lang})`)
        } else if (voices.length > 0) {
          utterance.voice = voices[0]
          utterance.lang = voices[0].lang
          console.log(`[TTS] Using first available voice: ${voices[0].name} (${voices[0].lang})`)
        }
      }

      let resolved = false

      utterance.onstart = () => {
        console.log('[TTS] Started speaking')
      }

      utterance.onend = () => {
        console.log('[TTS] Finished speaking')
        if (!resolved) {
          resolved = true
          resolve()
        }
      }

      utterance.onerror = (error) => {
        console.error('[TTS] Speech synthesis error:', error)
        if (!resolved) {
          resolved = true
          resolve()
        }
      }

      // WORKAROUND 3: Resume speech synthesis (Chrome sometimes pauses it)
      if (window.speechSynthesis.paused) {
        console.log('[TTS] Speech synthesis was paused, resuming...')
        window.speechSynthesis.resume()
      }

      window.speechSynthesis.speak(utterance)

      // WORKAROUND 4: Force resume after a short delay (Chrome bug)
      setTimeout(() => {
        if (window.speechSynthesis.paused) {
          console.log('[TTS] Force resuming speech synthesis')
          window.speechSynthesis.resume()
        }
      }, 100)

      // WORKAROUND 5: Safety timeout in case onend never fires
      setTimeout(() => {
        if (!resolved) {
          console.warn('[TTS] Speech timeout, forcing completion')
          resolved = true
          resolve()
        }
      }, 30000) // 30 second timeout
    })
  }

  // Load voices (Chrome requires this)
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices()
        }
      }
    }
  }, [])

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current)
        queueTimerRef.current = null
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
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
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [enabled])

  return null // This component doesn't render anything
})

export default TTSManager
