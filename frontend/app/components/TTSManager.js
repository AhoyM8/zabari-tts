'use client'

import { useEffect, useRef } from 'react'

/**
 * TTS Manager Component
 * Handles browser-based TTS for API mode
 */
export default function TTSManager({ messages, ttsConfig, enabled }) {
  const lastProcessedIndexRef = useRef(0)
  const messageQueueRef = useRef([])
  const isProcessingRef = useRef(false)

  useEffect(() => {
    if (!enabled || !ttsConfig) return

    // Process new messages
    const newMessages = messages.slice(lastProcessedIndexRef.current)

    if (newMessages.length > 0) {
      // Add new messages to queue
      newMessages.forEach(msg => {
        const textToSpeak = ttsConfig.announceUsername
          ? `${msg.username} says: ${msg.message}`
          : msg.message

        messageQueueRef.current.push(textToSpeak)
      })

      lastProcessedIndexRef.current = messages.length

      // Start processing queue if not already processing
      if (!isProcessingRef.current) {
        processQueue()
      }
    }
  }, [messages, enabled, ttsConfig])

  const processQueue = async () => {
    if (messageQueueRef.current.length === 0) {
      isProcessingRef.current = false
      return
    }

    isProcessingRef.current = true
    const text = messageQueueRef.current.shift()

    try {
      await speak(text, ttsConfig)
    } catch (error) {
      console.error('TTS error:', error)
    }

    // Small delay between messages
    setTimeout(() => processQueue(), 100)
  }

  const speak = (text, config) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        console.error('Speech synthesis not available')
        resolve()
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.volume = config.volume || 1.0
      utterance.rate = config.rate || 1.0
      utterance.pitch = config.pitch || 1.0

      // Try to find the requested voice
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = voices.find(v => v.name === config.voice)

      if (selectedVoice) {
        utterance.voice = selectedVoice
      } else if (voices.length > 0) {
        utterance.voice = voices[0]
      }

      utterance.onend = () => resolve()
      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error)
        resolve()
      }

      window.speechSynthesis.speak(utterance)
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return null // This component doesn't render anything
}
