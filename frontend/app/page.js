'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { FaTwitch, FaYoutube, FaTiktok } from 'react-icons/fa'
import { SiKick } from 'react-icons/si'
import ElectronTTSManager from './components/ElectronTTSManager'

export default function Home() {
  // Chat platform states (now stores usernames/identifiers instead of full URLs)
  const [platforms, setPlatforms] = useState({
    twitch: { enabled: false, username: 'zabariyarin' },
    youtube: { enabled: false, videoId: 'zabariyarin' }, // Can be video ID or @username
    kick: { enabled: false, username: 'zabariyarin' },
    tiktok: { enabled: false, username: 'zabariyarin' }
  })

  // TTS engine selection
  const [ttsEngine, setTtsEngine] = useState('webspeech') // 'webspeech' or 'kokoro'

  // Connection mode - always Playwright (with TikTok hybrid mode)
  const connectionMode = 'playwright'

  // TTS configuration
  const [ttsConfig, setTtsConfig] = useState({
    voice: '',
    autoDetectLanguage: false,
    englishVoice: '',
    hebrewVoice: '',
    volume: 1.0,
    rate: 1.0,
    pitch: 1.0,
    announceUsername: true,
    excludeCommands: true,
    excludeLinks: true,
    excludeUsers: ['nightbot', 'moobot', 'streamelements', 'streamlabs', 'fossabot']
  })

  // Web Speech API voices
  const [availableVoices, setAvailableVoices] = useState([])
  const [englishVoices, setEnglishVoices] = useState([])
  const [hebrewVoices, setHebrewVoices] = useState([])

  // Kokoro specific config
  const [kokoroConfig, setKokoroConfig] = useState({
    voice: 'af_heart',
    speed: 1.0,
    serverUrl: 'http://localhost:8766'
  })

  // App state
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')

  // Track if user is at bottom (for smart auto-scroll)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Poll for messages - always active to show chat history
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if user is at bottom BEFORE fetching new messages
        const container = document.getElementById('chat-container')
        if (container) {
          const threshold = 100 // px from bottom to still consider "at bottom"
          const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
          setShouldAutoScroll(isAtBottom)
        }

        const response = await fetch('/api/chat/messages')
        const data = await response.json()
        setMessages(data.messages)
      } catch (error) {
        // Silently fail - no need to spam toasts for polling errors
        console.error('Error fetching messages:', error)
      }
    }, 500) // Poll every 500ms

    return () => clearInterval(interval)
  }, [])

  // Smart auto-scroll - only scroll to bottom if user was already at bottom
  useEffect(() => {
    const container = document.getElementById('chat-container')
    if (container && messages.length > 0 && shouldAutoScroll) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, shouldAutoScroll])

  // Fetch available Web Speech API voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        setAvailableVoices(voices)

        // Filter voices by language
        const english = voices.filter(v => v.lang.startsWith('en'))
        const hebrew = voices.filter(v => v.lang.startsWith('he'))
        setEnglishVoices(english)
        setHebrewVoices(hebrew)

        // Set default voices if none selected
        if (voices.length > 0) {
          if (!ttsConfig.voice) {
            const defaultVoice = english[0] || voices[0]
            if (defaultVoice) {
              setTtsConfig(prev => ({ ...prev, voice: defaultVoice.name }))
            }
          }
          if (!ttsConfig.englishVoice && english.length > 0) {
            setTtsConfig(prev => ({ ...prev, englishVoice: english[0].name }))
          }
          if (!ttsConfig.hebrewVoice && hebrew.length > 0) {
            setTtsConfig(prev => ({ ...prev, hebrewVoice: hebrew[0].name }))
          }
        }
      }

      // Load voices immediately
      loadVoices()

      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }

      return () => {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = null
        }
      }
    }
  }, [])

  // Toggle platform
  const togglePlatform = (platform) => {
    setPlatforms(prev => ({
      ...prev,
      [platform]: { ...prev[platform], enabled: !prev[platform].enabled }
    }))
  }

  // Update platform identifier (username or videoId)
  const updatePlatformIdentifier = (platform, value) => {
    setPlatforms(prev => {
      const field = platform === 'youtube' ? 'videoId' : 'username'
      return {
        ...prev,
        [platform]: { ...prev[platform], [field]: value }
      }
    })
  }

  // Start/Stop chat logger
  const toggleChatLogger = async () => {
    if (isRunning) {
      // Stop
      try {
        const response = await fetch('/api/chat/stop', { method: 'POST' })
        const data = await response.json()
        if (data.success) {
          setIsRunning(false)
          setStatus('stopped')
          toast.success('Chat logger stopped successfully')
        } else {
          toast.error(data.error || 'Failed to stop chat logger')
          setStatus('error')
        }
      } catch (error) {
        console.error('Error stopping chat logger:', error)
        toast.error('Failed to stop chat logger: ' + error.message)
        setStatus('error')
      }
    } else {
      // Start
      try {
        const enabledPlatforms = Object.keys(platforms).filter(p => platforms[p].enabled)

        if (enabledPlatforms.length === 0) {
          toast.warning('Please enable at least one chat platform')
          return
        }

        const config = {
          platforms,
          ttsEngine,
          connectionMode: 'playwright', // Always Playwright (with TikTok hybrid)
          // For Kokoro (hybrid mode), merge both configs to enable Hebrew/English voice switching
          ttsConfig: ttsEngine === 'webspeech' ? ttsConfig : {
            ...kokoroConfig,
            // Include Web Speech settings for hybrid Hebrew/English support
            hebrewVoice: ttsConfig.hebrewVoice,
            englishVoice: ttsConfig.englishVoice,
            volume: ttsConfig.volume,
            rate: ttsConfig.rate,
            pitch: ttsConfig.pitch,
            announceUsername: ttsConfig.announceUsername,
            excludeCommands: ttsConfig.excludeCommands,
            excludeLinks: ttsConfig.excludeLinks,
            excludeUsers: ttsConfig.excludeUsers
          }
        }

        const response = await fetch('/api/chat/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        })

        const data = await response.json()
        if (data.success) {
          setIsRunning(true)
          setStatus('running')
          toast.success('Chat logger started!')
        } else {
          toast.error(data.error || 'Failed to start chat logger')
          setStatus('error')
        }
      } catch (error) {
        console.error('Error starting chat logger:', error)
        toast.error('Failed to start chat logger: ' + error.message)
        setStatus('error')
      }
    }
  }

  // Add excluded user
  const addExcludedUser = (user) => {
    if (user && !ttsConfig.excludeUsers.includes(user.toLowerCase())) {
      setTtsConfig(prev => ({
        ...prev,
        excludeUsers: [...prev.excludeUsers, user.toLowerCase()]
      }))
    }
  }

  // Remove excluded user
  const removeExcludedUser = (user) => {
    setTtsConfig(prev => ({
      ...prev,
      excludeUsers: prev.excludeUsers.filter(u => u !== user)
    }))
  }


  // Memoized callback to prevent re-renders
  const handleServerStatusChange = useCallback((status) => {
    console.log('[TTS Server Status]', status)
  }, [])

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Electron TTS Server Manager - Auto-starts TTS servers in Electron */}
      <ElectronTTSManager
        ttsEngine={ttsEngine}
        onServerStatusChange={handleServerStatusChange}
      />


      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-transparent bg-clip-text">
            Zabari TTS
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">Multi-Platform Chat Logger with Text-to-Speech</p>
        </header>

        {/* Live Chat Display - At Top with Overlay */}
        <div className="mb-8 relative">
          <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">Live Chat</h2>
              <div className="flex items-center gap-2">
                {isRunning && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                <span className="text-sm text-gray-400">
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="bg-gray-950 rounded-lg p-3 sm:p-4 h-[400px] sm:h-[500px] overflow-y-auto relative" id="chat-container">
              {/* Disabled overlay when not running */}
              {!isRunning && (
                <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    <p className="text-lg font-semibold mb-2 text-gray-300">Chat Not Active</p>
                    <p className="text-sm text-gray-500">Configure settings below and start the chat logger</p>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <p className="text-lg font-medium mb-2">Waiting for messages...</p>
                    <p className="text-sm text-gray-600">Messages will appear here as they arrive</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg"
                    >
                      {/* Platform Badge */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        msg.platform === 'twitch' ? 'bg-twitch' :
                        msg.platform === 'youtube' ? 'bg-youtube' :
                        msg.platform === 'kick' ? 'bg-kick' :
                        'bg-tiktok'
                      }`}>
                        {msg.platform === 'twitch' && <FaTwitch className="w-5 h-5 text-white" />}
                        {msg.platform === 'youtube' && <FaYoutube className="w-5 h-5 text-white" />}
                        {msg.platform === 'kick' && <SiKick className="w-5 h-5 text-white" />}
                        {msg.platform === 'tiktok' && <FaTiktok className="w-5 h-5 text-white" />}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={`font-semibold ${
                            msg.platform === 'twitch' ? 'text-twitch' :
                            msg.platform === 'youtube' ? 'text-youtube' :
                            msg.platform === 'kick' ? 'text-kick' :
                            'text-tiktok'
                          }`}>
                            {msg.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-200 break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {/* Start/Stop Button */}
              <button
                onClick={toggleChatLogger}
                disabled={status === 'error'}
                className={`flex-1 py-3 rounded-lg font-bold text-base transition-colors shadow-md ${
                  isRunning
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                } ${status === 'error' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRunning ? '⏹ Stop Chat Logger' : '▶ Start Chat Logger'}
              </button>

            </div>

            {/* Status Indicator */}
            <div className={`mt-3 text-center py-2 rounded-lg text-sm ${
              status === 'running' ? 'bg-green-500/20 text-green-400' :
              status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-800 text-gray-400'
            }`}>
              Status: {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column - Chat Platforms */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 card-hover">
              <h2 className="text-xl sm:text-2xl font-bold mb-6">Chat Platforms</h2>

              {/* Twitch */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-twitch rounded-lg flex items-center justify-center">
                      <FaTwitch className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Twitch</h3>
                      <p className="text-sm text-gray-400">Live chat streaming</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePlatform('twitch')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      platforms.twitch.enabled ? 'bg-twitch' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        platforms.twitch.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {platforms.twitch.enabled && (
                  <input
                    type="text"
                    value={platforms.twitch.username}
                    onChange={(e) => updatePlatformIdentifier('twitch', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-twitch text-sm"
                    placeholder="Enter Twitch username (e.g., xqc)"
                  />
                )}
              </div>

              {/* YouTube */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-youtube rounded-lg flex items-center justify-center">
                      <FaYoutube className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">YouTube</h3>
                      <p className="text-sm text-gray-400">Live stream chat</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePlatform('youtube')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      platforms.youtube.enabled ? 'bg-youtube' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        platforms.youtube.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {platforms.youtube.enabled && (
                  <input
                    type="text"
                    value={platforms.youtube.videoId}
                    onChange={(e) => updatePlatformIdentifier('youtube', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-youtube text-sm"
                    placeholder="Video ID or channel username (e.g., dQw4w9WgXcQ or @username)"
                  />
                )}
              </div>

              {/* Kick */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-kick rounded-lg flex items-center justify-center">
                      <SiKick className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Kick</h3>
                      <p className="text-sm text-gray-400">Streaming platform chat</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePlatform('kick')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      platforms.kick.enabled ? 'bg-kick' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-gray-900 transition-transform ${
                        platforms.kick.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {platforms.kick.enabled && (
                  <input
                    type="text"
                    value={platforms.kick.username}
                    onChange={(e) => updatePlatformIdentifier('kick', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-kick text-sm"
                    placeholder="Enter Kick username (e.g., trainwreckstv)"
                  />
                )}
              </div>

              {/* TikTok */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-tiktok rounded-lg flex items-center justify-center">
                      <FaTiktok className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">TikTok</h3>
                      <p className="text-sm text-gray-400">Live stream chat</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePlatform('tiktok')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      platforms.tiktok.enabled ? 'bg-tiktok' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        platforms.tiktok.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {platforms.tiktok.enabled && (
                  <input
                    type="text"
                    value={platforms.tiktok.username}
                    onChange={(e) => updatePlatformIdentifier('tiktok', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-tiktok text-sm"
                    placeholder="Enter TikTok username (e.g., @username or username)"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - TTS Settings */}
          <div className="space-y-6">
            {/* TTS Engine Selection */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 card-hover">
              <h2 className="text-xl sm:text-2xl font-bold mb-6">TTS Engine</h2>

              <div className="space-y-4">
                {/* Web Speech API */}
                <button
                  onClick={() => setTtsEngine('webspeech')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    ttsEngine === 'webspeech'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">Web Speech API</h3>
                      <p className="text-sm text-gray-400">Browser-based TTS (No server required)</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      ttsEngine === 'webspeech' ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                    }`}>
                      {ttsEngine === 'webspeech' && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </button>

                {/* Kokoro TTS */}
                <button
                  onClick={() => setTtsEngine('kokoro')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    ttsEngine === 'kokoro'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">Kokoro-82M</h3>
                      <p className="text-sm text-gray-400">Lightweight & fast AI TTS (Requires server)</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      ttsEngine === 'kokoro' ? 'border-green-500 bg-green-500' : 'border-gray-600'
                    }`}>
                      {ttsEngine === 'kokoro' && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Kokoro Config */}
              {ttsEngine === 'kokoro' && (
                <div className="mt-6 space-y-4 p-4 bg-gray-800 rounded-lg">
                  {/* Hybrid TTS Info Banner */}
                  <div className="flex items-start gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <strong>Hybrid TTS Enabled:</strong> Hebrew text will use Web Speech API, English text will use Kokoro. Configure both below.
                    </div>
                  </div>

                  {/* Kokoro Voice (for English) */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Kokoro Voice (English)</label>
                    <select
                      value={kokoroConfig.voice}
                      onChange={(e) => setKokoroConfig(prev => ({ ...prev, voice: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                    >
                      <optgroup label="American Female">
                        <option value="af">af - Default Female</option>
                        <option value="af_bella">af_bella - Bella</option>
                        <option value="af_heart">af_heart - Heart</option>
                        <option value="af_nicole">af_nicole - Nicole</option>
                        <option value="af_sarah">af_sarah - Sarah</option>
                        <option value="af_sky">af_sky - Sky</option>
                      </optgroup>
                      <optgroup label="American Male">
                        <option value="am_adam">am_adam - Adam</option>
                        <option value="am_michael">am_michael - Michael</option>
                      </optgroup>
                      <optgroup label="British Female">
                        <option value="bf_emma">bf_emma - Emma</option>
                        <option value="bf_isabella">bf_isabella - Isabella</option>
                      </optgroup>
                      <optgroup label="British Male">
                        <option value="bm_george">bm_george - George</option>
                        <option value="bm_lewis">bm_lewis - Lewis</option>
                      </optgroup>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">Used for English messages</p>
                  </div>

                  {/* Hebrew Voice Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Web Speech Voice (Hebrew)</label>
                    <select
                      value={ttsConfig.hebrewVoice}
                      onChange={(e) => setTtsConfig(prev => ({ ...prev, hebrewVoice: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                    >
                      {hebrewVoices.length === 0 ? (
                        <option>No Hebrew voices available</option>
                      ) : (
                        hebrewVoices.map(voice => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))
                      )}
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      {hebrewVoices.length} Hebrew voice{hebrewVoices.length !== 1 ? 's' : ''} available - Used for Hebrew messages
                    </p>
                  </div>

                  {/* English Voice Selection for bridge words */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Web Speech Voice (English Bridge Words)</label>
                    <select
                      value={ttsConfig.englishVoice}
                      onChange={(e) => setTtsConfig(prev => ({ ...prev, englishVoice: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                    >
                      {englishVoices.length === 0 ? (
                        <option>No English voices available</option>
                      ) : (
                        englishVoices.map(voice => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))
                      )}
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      Used for "says:" and other bridge words
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Speed: {kokoroConfig.speed.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={kokoroConfig.speed}
                      onChange={(e) => setKokoroConfig(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Server URL</label>
                    <input
                      type="text"
                      value={kokoroConfig.serverUrl}
                      onChange={(e) => setKokoroConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                      placeholder="http://localhost:8766"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Start the Kokoro server manually with <code className="bg-gray-900 px-1 py-0.5 rounded">--device cpu</code> or <code className="bg-gray-900 px-1 py-0.5 rounded">--device cuda</code>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* TTS Settings */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800 card-hover">
              <h2 className="text-xl sm:text-2xl font-bold mb-6">TTS Settings</h2>

              <div className="space-y-6">
                {/* Voice Selection for Web Speech API */}
                {ttsEngine === 'webspeech' && (
                  <>
                    {/* Auto-detect Language Toggle */}
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ttsConfig.autoDetectLanguage}
                          onChange={(e) => setTtsConfig(prev => ({ ...prev, autoDetectLanguage: e.target.checked }))}
                          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                        />
                        <div>
                          <span className="font-semibold">Auto-detect Language (Hebrew/English)</span>
                          <p className="text-xs text-gray-400 mt-1">
                            Automatically switch between Hebrew and English voices based on message content
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Voice Selection - Single or Dual based on auto-detect */}
                    {ttsConfig.autoDetectLanguage ? (
                      <>
                        {/* English Voice */}
                        <div>
                          <label className="block text-sm font-medium mb-2">English Voice</label>
                          <select
                            value={ttsConfig.englishVoice}
                            onChange={(e) => setTtsConfig(prev => ({ ...prev, englishVoice: e.target.value }))}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                          >
                            {englishVoices.length === 0 ? (
                              <option>No English voices available</option>
                            ) : (
                              englishVoices.map(voice => (
                                <option key={voice.name} value={voice.name}>
                                  {voice.name} ({voice.lang})
                                </option>
                              ))
                            )}
                          </select>
                          <p className="mt-2 text-xs text-gray-500">
                            {englishVoices.length} English voice{englishVoices.length !== 1 ? 's' : ''} available
                          </p>
                        </div>

                        {/* Hebrew Voice */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Hebrew Voice</label>
                          <select
                            value={ttsConfig.hebrewVoice}
                            onChange={(e) => setTtsConfig(prev => ({ ...prev, hebrewVoice: e.target.value }))}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                          >
                            {hebrewVoices.length === 0 ? (
                              <option>No Hebrew voices available</option>
                            ) : (
                              hebrewVoices.map(voice => (
                                <option key={voice.name} value={voice.name}>
                                  {voice.name} ({voice.lang})
                                </option>
                              ))
                            )}
                          </select>
                          <p className="mt-2 text-xs text-gray-500">
                            {hebrewVoices.length} Hebrew voice{hebrewVoices.length !== 1 ? 's' : ''} available
                          </p>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-2">Voice</label>
                        <select
                          value={ttsConfig.voice}
                          onChange={(e) => setTtsConfig(prev => ({ ...prev, voice: e.target.value }))}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                        >
                          {availableVoices.length === 0 ? (
                            <option>Loading voices...</option>
                          ) : (
                            availableVoices.map(voice => (
                              <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                              </option>
                            ))
                          )}
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                          {availableVoices.length} voice{availableVoices.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    )}

                    {/* Volume */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Volume: {ttsConfig.volume.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={ttsConfig.volume}
                        onChange={(e) => setTtsConfig(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Rate: {ttsConfig.rate.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={ttsConfig.rate}
                        onChange={(e) => setTtsConfig(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Pitch: {ttsConfig.pitch.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={ttsConfig.pitch}
                        onChange={(e) => setTtsConfig(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </>
                )}

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsConfig.announceUsername}
                      onChange={(e) => setTtsConfig(prev => ({ ...prev, announceUsername: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span>Announce username before message</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsConfig.excludeCommands}
                      onChange={(e) => setTtsConfig(prev => ({ ...prev, excludeCommands: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span>Exclude bot commands (!)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsConfig.excludeLinks}
                      onChange={(e) => setTtsConfig(prev => ({ ...prev, excludeLinks: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span>Exclude messages with links</span>
                  </label>
                </div>

                {/* Excluded Users */}
                <div>
                  <label className="block text-sm font-medium mb-2">Excluded Users</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      id="excludeUserInput"
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
                      placeholder="Username to exclude"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addExcludedUser(e.target.value)
                          e.target.value = ''
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('excludeUserInput')
                        addExcludedUser(input.value)
                        input.value = ''
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ttsConfig.excludeUsers.map(user => (
                      <span
                        key={user}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full text-sm"
                      >
                        {user}
                        <button
                          onClick={() => removeExcludedUser(user)}
                          className="hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #a855f7;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #a855f7;
          cursor: pointer;
          border: none;
        }

        .slider-green::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          cursor: pointer;
        }

        .slider-green::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </main>
  )
}
